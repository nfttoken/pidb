import { readFile, writeFile } from "node:fs/promises";

const PIDB_BASE = process.env.PIDB_API_BASE || "https://pidb.oyct.eu.org/api/v1";
const TRANSLATE_BASE = process.env.DEEPL_API_BASE || "https://api-free.deepl.com/v2/translate";
const REPORT_PATH = new URL("./translation-report.json", import.meta.url);
const MANIFEST_PATH = new URL("./batch-manifest.json", import.meta.url);
const EMAIL = process.env.PIDB_ADMIN_EMAIL || "david@pidb.oyct.eu.org";
const PASSWORD = process.env.PIDB_ADMIN_PASSWORD;
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const TIMEOUT_MS = 15000;
const CHUNK_LIMIT = 450;

if (!PASSWORD) throw new Error("PIDB_ADMIN_PASSWORD is required");
if (!DEEPL_API_KEY) throw new Error("DEEPL_API_KEY is required");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithTimeout(url, options = {}, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); } finally { clearTimeout(timer); }
}

async function request(url, options = {}, label = url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, options);
      const body = await response.text();
      if (!response.ok) {
        lastError = new Error(`${label}: HTTP ${response.status} ${body.slice(0, 300)}`);
        if (response.status >= 400 && response.status < 500 && response.status !== 429) throw lastError;
        const retryAfter = Number(response.headers.get("retry-after") || body.match(/retry after\s+(\d+)/i)?.[1] || 0);
        lastError.retryAfter = retryAfter;
      } else {
        return body ? JSON.parse(body) : null;
      }
    } catch (error) {
      lastError = error;
      if (String(error.message).includes("HTTP 4") && !String(error.message).includes("HTTP 429")) throw error;
    }
    const retryAfter = Number(lastError?.retryAfter || 0);
    await sleep(retryAfter > 0 ? Math.min(retryAfter * 1000, 60000) : Math.min(10000, attempt * 2000));
  }
  throw lastError;
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

function cleanText(value) {
  if (value == null) return null;
  return String(value).replace(/\\n/g, "\n").replace(/`n/g, "\n").replace(/\r\n?/g, "\n").trim() || null;
}

const translationCache = new Map();
let translationRequests = 0;
async function translateChunk(text) {
  if (translationCache.has(text)) return translationCache.get(text);
  const promise = (async () => {
    const query = text;
    const url = new URL(TRANSLATE_BASE);
    url.searchParams.set("q", query);
    const data = await request(url, {
      method: "POST",
      headers: { accept: "application/json", authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ text: [query], source_lang: "EN", target_lang: "ZH-HANS" }),
    }, "DeepL translation");
    const translated = data?.translations?.[0]?.text || "";
    if (!translated) throw new Error("Translation service returned empty text");
    translationRequests += 1;
    await sleep(1200 + Math.floor(Math.random() * 601));
    return translated;
  })();
  translationCache.set(text, promise);
  try { return await promise; } catch (error) { translationCache.delete(text); throw error; }
}

function splitLongLine(line) {
  const chunks = [];
  let rest = line.trim();
  while (rest.length > CHUNK_LIMIT) {
    let cut = rest.lastIndexOf(" ", CHUNK_LIMIT);
    if (cut < Math.floor(CHUNK_LIMIT * 0.6)) cut = CHUNK_LIMIT;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

async function translateText(value) {
  const text = cleanText(value);
  if (!text) return null;
  const lines = text.split("\n");
  const translatedLines = [];
  for (const line of lines) {
    if (!line.trim()) { translatedLines.push(""); continue; }
    const chunks = splitLongLine(line);
    const translatedChunks = [];
    for (const chunk of chunks) translatedChunks.push(await translateChunk(chunk));
    translatedLines.push(translatedChunks.join(" "));
  }
  return translatedLines.join("\n").trim() || null;
}

async function translateProduct(product) {
  const translatedClaims = [];
  for (const claim of product.claims) translatedClaims.push(claim.claim_text_zh || await translateText(claim.claim_text_en));
  return {
    description_zh: product.description_zh || await translateText(product.description_en),
    how_to_use_zh: product.how_to_use_zh || await translateText(product.how_to_use_en),
    warnings_zh: product.warnings_zh || await translateText(product.warnings_en),
    claims: product.claims.map((claim, index) => ({ claim_type: claim.claim_type, claim_text_en: claim.claim_text_en, claim_text_zh: translatedClaims[index] || null, sort_order: claim.sort_order })),
  };
}

async function main() {
  const login = await request(`${PIDB_BASE}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) }, "PIDB login");
  let token = login.data.access_token;
  const loginAgain = async () => {
    token = (await request(`${PIDB_BASE}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) }, "PIDB re-login")).data.access_token;
  };
  const pidb = async (path, options = {}, label = path) => {
    const send = () => request(`${PIDB_BASE}${path}`, { ...options, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(options.headers || {}) } }, label);
    try { return await send(); } catch (error) {
      if (!String(error.message).includes("HTTP 401")) throw error;
      await loginAgain();
      return send();
    }
  };
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  const createdIds = manifest.created_products.map((item) => item.pidb_product_id);
  const sheetMasks = await mapLimit(createdIds, 3, async (id) => (await pidb(`/products/${id}`)).data);
  const results = [];
  for (const product of sheetMasks) {
    try {
      const translated = await translateProduct(product);
      const attributes = {
        ...(product.attributes || {}),
        zh_translation_status: "machine_translated_review_required",
        zh_translation_provider: "DeepL API",
        zh_translation_last_checked: new Date().toISOString().slice(0, 10),
        zh_translation_note: "Chinese fields were machine translated from the imported English source and require human review before publication.",
      };
      const payload = { ...translated, attributes };
      const updated = (await pidb(`/products/${product.id}`, { method: "PATCH", body: JSON.stringify(payload) }, `update Chinese fields ${product.product_name_en}`)).data;
      results.push({ id: updated.id, title: updated.product_name_en, status: updated.status, compliance_status: updated.canada?.compliance_status || null, description_zh: Boolean(updated.description_zh), how_to_use_zh: Boolean(updated.how_to_use_zh), warnings_zh: Boolean(updated.warnings_zh), claims: updated.claims.length, translated_claims: updated.claims.filter((claim) => Boolean(claim.claim_text_zh)).length, literal_escape_fields: ["description_zh", "how_to_use_zh", "warnings_zh"].filter((field) => /\\n|`n/.test(updated[field] || "")) });
      console.log(JSON.stringify({ event: "translated", title: updated.product_name_en, description_zh: Boolean(updated.description_zh), how_to_use_zh: Boolean(updated.how_to_use_zh), warnings_zh: Boolean(updated.warnings_zh), claims: updated.claims.length }));
      if (results.length % 3 === 0 && results.length < sheetMasks.length) await sleep(3000 + Math.floor(Math.random() * 5000));
    } catch (error) {
      results.push({ id: product.id, title: product.product_name_en, error: error.message });
      console.error(JSON.stringify({ event: "translation_error", title: product.product_name_en, error: error.message }));
    }
  }
  const report = { processed: results.length, translated: results.filter((item) => !item.error).length, translation_requests: translationRequests, errors: results.filter((item) => item.error), description_zh: results.filter((item) => item.description_zh).length, how_to_use_zh: results.filter((item) => item.how_to_use_zh).length, warnings_zh: results.filter((item) => item.warnings_zh).length, claims: results.reduce((sum, item) => sum + (item.translated_claims || 0), 0), literal_escape_products: results.filter((item) => item.literal_escape_fields?.length).length, products: results };
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ event: "complete", processed: report.processed, translated: report.translated, errors: report.errors.length, description_zh: report.description_zh, how_to_use_zh: report.how_to_use_zh, warnings_zh: report.warnings_zh, claims: report.claims, report: REPORT_PATH.pathname }));
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
