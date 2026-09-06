import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const PIDB_BASE = process.env.PIDB_API_BASE || "https://pidb.oyct.eu.org/api/v1";
const INPUT = new URL("./products.normalized.json", import.meta.url);
const CSV_PATH = new URL("./eye-mask-import.csv", import.meta.url);
const MANIFEST_PATH = new URL("./batch-manifest.json", import.meta.url);
const EMAIL = process.env.PIDB_ADMIN_EMAIL || "david@pidb.oyct.eu.org";
const ENV_PATH = process.env.PIDB_ENV_FILE || "./.env.production";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const source = JSON.parse(await readFile(INPUT, "utf8"));
const envText = await readFile(ENV_PATH, "utf8").catch(() => "");
function envValue(name) {
  const match = envText.match(new RegExp(`^\\s*${name}\\s*=\\s*(?:["']([^"']*)["']|([^#\\r\\n]*?))\\s*$`, "m"));
  return match ? (match[1] ?? match[2] ?? "").trim() : "";
}
const PASSWORD = process.env.PIDB_ADMIN_PASSWORD || envValue("PIDB_ADMIN_PASSWORD");
if (!PASSWORD) throw new Error("PIDB_ADMIN_PASSWORD is required");

async function request(url, options = {}, label = url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, options);
      const body = await response.text();
      if (!response.ok) {
        lastError = new Error(`${label}: HTTP ${response.status} ${body.slice(0, 300)}`);
        if (response.status >= 400 && response.status < 500 && response.status !== 429) throw lastError;
      } else return body ? JSON.parse(body) : null;
    } catch (error) {
      lastError = error;
      if (String(error.message).includes("HTTP 4") && !String(error.message).includes("HTTP 429")) throw error;
    }
    await sleep(1000 * attempt);
  }
  throw lastError;
}

function clean(value) {
  if (value == null) return null;
  return String(value).replace(/\\n/g, "\n").replace(/`n/g, "\n").replace(/\r\n?/g, "\n").trim() || null;
}
function norm(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, ""); }
function ascii(value) { return String(value || "").normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toUpperCase(); }
function canonical(value) { return String(value || "").replace("/collections/eye-mask", "/products"); }
function csv(value) { const text = value == null ? "" : String(value); return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }

function chineseName(vendor, title) {
  let value = String(title || "");
  for (const word of String(vendor || "").split(/\s+/).filter(Boolean)) value = value.replace(new RegExp(`\\b${word.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`, "i"), "");
  value = value.replace(/\b(eye\s+mask|eye\s+patch|under\s+eye\s+patch|mask)\b/gi, "眼膜");
  return `${vendor} ${value}`.trim();
}

function country(product, vendor) {
  const text = `${product.sections?.["About the Product"] || ""} ${product.sections?.["Why You'll Love It"] || ""}`;
  if (/\b(japan|japanese)\b/i.test(text)) return "JP";
  if (/\b(korea|korean|south korea)\b/i.test(text)) return "KR";
  return new Map([
    ["Kao", "JP"], ["Quality 1st", "JP"], ["Mediheal", "KR"], ["Abib", "KR"], ["Goodal", "KR"],
    ["Beauty of Joseon", "KR"], ["COSRX", "KR"], ["KSECRET", "KR"], ["Biodance", "KR"], ["numbuzin", "KR"],
    ["Anua", "KR"], ["Dr.Melaxin", "KR"], ["VELLA", "KR"], ["Centellian24", "KR"], ["PUREDERM", "KR"], ["d'Alba", "KR"],
  ]).get(vendor) || "KR";
}

const COLORS = ["pink", "blue", "yellow", "green", "red", "white", "black", "purple", "orange", "brown", "clear", "beige", "gold", "silver", "rose", "peach", "lavender", "coral", "mint", "multi"];
const STOP = new Set(["MASK", "SHEET", "FACE", "FACIAL", "GEL", "HYDROGEL", "PATCH", "PACK", "BOX", "PCS", "PC", "SHEETS", "REAL", "DEEP", "ADVANCED", "INTENSIVE", "ESSENTIAL", "ORIGINAL", "NEW", "PREMIUM", "MOISTURE", "SOLUTION", "CARE", "SKIN", "THE", "AND", "FOR", "UNDER", "EYE"]);
function quantity(product, variant) {
  const text = `${variant.public_title || ""} ${variant.name || ""} ${product.title}`;
  const count = text.match(/(\d+(?:\.\d+)?)\s*(?:sheets?|pcs?|pieces?|piece|pc|ea|patches?|pairs?)\b/i);
  if (count) return { value: Number(count[1]), unit: "pc" };
  const weight = text.match(/(\d+(?:\.\d+)?)\s*(ml|mg|g|oz)\b/i);
  return weight ? { value: Number(weight[1]), unit: weight[2].toLowerCase() } : { value: 1, unit: "pc" };
}
function size(q) { return `${Number.isInteger(q.value) ? q.value : String(q.value).replace(".", "_")}${q.unit.toUpperCase()}`; }
function color(product, variant) {
  const text = `${product.title} ${variant.public_title || ""}`.toLowerCase();
  return COLORS.find((item) => new RegExp(`\\b${item}\\b`, "i").test(text))?.toUpperCase() || "NA";
}
function productTokens(product, vendor) {
  const brands = new Set(ascii(vendor).split("-"));
  const raw = product.title.normalize("NFKD").toUpperCase().replace(/[^A-Z0-9]+/g, " ").split(/\s+/).filter(Boolean);
  const tokens = raw.filter((item) => !brands.has(item) && !STOP.has(item) && !COLORS.includes(item.toLowerCase()) && !/^\d+(?:PC|PCS|ML|MG|G|OZ)?$/.test(item));
  return (tokens.length ? tokens : ["CARE"]).slice(0, 2);
}
function offer(product, variant) {
  const offers = Array.isArray(product.json_ld?.offers) ? product.json_ld.offers : [];
  return offers.find((item) => variant.sku && String(item.sku || "") === String(variant.sku)) || offers[0] || {};
}
function buildSku(product, vendor, variant, usedSkus, usedBarcodes) {
  const q = quantity(product, variant);
  const sourceSku = variant.sku && !/^\d{8,14}$/.test(String(variant.sku).trim()) ? String(variant.sku).trim() : null;
  const base = ["MASK", ascii(vendor).slice(0, 24), ...productTokens(product, vendor), color(product, variant), size(q)].filter(Boolean).join("-");
  let generated = base; let suffix = 2;
  while (usedSkus.has(generated)) generated = `${base}-${String(suffix++).padStart(2, "0")}`;
  const sku = sourceSku || generated;
  usedSkus.add(sku);
  const barcode = sourceSku ? "" : (offer(product, variant).gtin13 || offer(product, variant).gtin || "");
  const usableBarcode = barcode && !usedBarcodes.has(String(barcode)) ? String(barcode) : "";
  if (usableBarcode) usedBarcodes.add(usableBarcode);
  const price = Number(offer(product, variant).price);
  return { sku, barcode: usableBarcode, q, price: Number.isFinite(price) ? price : null };
}

const login = await request(`${PIDB_BASE}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) }, "PIDB login");
let token = login.data.access_token;
const api = (path, options = {}, label = path) => request(`${PIDB_BASE}${path}`, { ...options, headers: { authorization: `Bearer ${token}`, ...(options.headers || {}) } }, label);
const all = async (path) => (await api(path)).data;

const types = await all("/product-types");
const eyeType = types.find((item) => /eye\s*mask/i.test(item.name_en) || /eye[_-]?mask/i.test(item.code));
if (!eyeType) throw new Error("Eye Mask product type is missing");
const brands = await all("/brands");
const brandByName = new Map(brands.map((item) => [norm(item.name), item]));
const pages = [];
for (let offset = 0; ; offset += 100) {
  const page = await all(`/products?offset=${offset}&limit=100`);
  pages.push(...(page.items || []));
  if (pages.length >= (page.total || 0) || !(page.items || []).length) break;
}
const details = [];
for (let i = 0; i < pages.length; i += 4) {
  details.push(...await Promise.all(pages.slice(i, i + 4).map(async (item) => (await api(`/products/${item.id}`)).data)));
}
const existingSource = new Map();
for (const item of details) for (const key of ["source_url", "canonical_url"]) if (item.attributes?.[key]) existingSource.set(canonical(item.attributes[key]), item);
const existingSkus = new Set(details.flatMap((item) => item.skus.map((sku) => sku.sku)));
const existingBarcodes = new Set(details.flatMap((item) => item.skus.map((sku) => sku.barcode).filter(Boolean)));
const rows = []; const skipped = []; const candidates = [];
for (const product of source.products) {
  const stableUrl = canonical(product.canonical_url || product.url);
  const current = existingSource.get(stableUrl) || details.find((item) => item.product_name_en === product.title);
  if (current) {
    skipped.push({ source_url: product.url, canonical_url: stableUrl, pidb_product_id: current.id, title: product.title, reason: existingSource.has(stableUrl) ? "source_identity" : "stable_product_identity" });
    continue;
  }
  const vendor = clean(product.vendor) || "Unknown Brand";
  let brand = brandByName.get(norm(vendor));
  if (!brand) {
    brand = (await api("/brands", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ brand_code: ascii(vendor).slice(0, 80) || null, name: vendor, name_en: vendor, slug: ascii(vendor).toLowerCase() || `brand-${Date.now()}`, country_of_origin: country(product, vendor) }) }, `create brand ${vendor}`)).data;
    brandByName.set(norm(vendor), brand);
  }
  const stableCode = `MASK-${ascii(vendor).slice(0, 18)}-${createHash("sha1").update(stableUrl).digest("hex").slice(0, 8).toUpperCase()}`.slice(0, 50);
  const variant = product.shopify_product?.variants?.[0] || { name: product.title };
  const sku = buildSku(product, vendor, variant, existingSkus, existingBarcodes);
  const why = clean(product.sections?.["Why You'll Love It"]);
  const howText = clean(product.sections?.["How To Use"]) || "";
  const caution = howText.match(/\n?\s*caution\s*[:：]\s*/i);
  const usage = caution ? clean(howText.slice(0, caution.index)) : howText;
  const warnings = caution ? clean(howText.slice(caution.index + caution[0].length)) : null;
  const productForCsv = {
    product_code: stableCode, brand_name: vendor, original_language: "en", original_name: product.title,
    product_name_en: product.title, product_name_zh: chineseName(vendor, product.title), product_type: eyeType.name_en,
    country_of_origin: country(product, vendor), net_quantity: sku.q.value, quantity_unit: sku.q.unit,
    sku: sku.sku, barcode: sku.barcode, skin_types: "", skin_concerns: "", key_ingredients: "", ingredients_inci: "",
    claims: "", description_en: why || "", description_zh: "", how_to_use_en: usage || "", how_to_use_zh: "",
    warnings_en: warnings || "", warnings_zh: "", image_urls: "", status: "imported", compliance_status: "pending",
    canadian_label_status: "pending", cosmetic_notification_status: "pending", compliance_notes: "Awaiting supplier confirmation and Canadian review.",
    suggested_price: sku.price, suggested_price_currency: "CAD", suggested_price_status: "pending", suggested_price_note: "Kiokii CAD price captured for review; verify against current supplier pricing.",
  };
  rows.push(productForCsv);
  candidates.push({ product, row: productForCsv, source_inci: clean(product.sections?.Ingredients), claims: clean(product.sections?.["Why You'll Love It"]) });
}

const fields = ["product_code", "brand_name", "original_language", "original_name", "product_name_en", "product_name_zh", "product_type", "country_of_origin", "net_quantity", "quantity_unit", "sku", "barcode", "skin_types", "skin_concerns", "key_ingredients", "ingredients_inci", "claims", "description_en", "description_zh", "how_to_use_en", "how_to_use_zh", "warnings_en", "warnings_zh", "image_urls", "status", "compliance_status", "canadian_label_status", "cosmetic_notification_status", "compliance_notes", "suggested_price", "suggested_price_currency", "suggested_price_status", "suggested_price_note"];
const csvText = `${fields.map(csv).join(",")}\n${rows.map((row) => fields.map((field) => csv(row[field])).join(",")).join("\n")}\n`;
await writeFile(CSV_PATH, csvText, "utf8");
if (rows.length) {
  const form = new FormData();
  form.append("file", new Blob([csvText], { type: "text/csv" }), "eye-mask-import.csv");
  const preview = (await api("/imports/upload", { method: "POST", body: form }, "upload eye mask CSV")).data;
  if (preview.error_rows) throw new Error(`CSV validation failed with ${preview.error_rows} rows: ${preview.errors?.map((e) => `${e.row_number}:${e.field_name}:${e.error_code}`).join(", ")}`);
  const confirmed = (await api(`/imports/${preview.id}/confirm`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "create_only" }) }, "confirm eye mask CSV")).data;
  if (confirmed.created !== rows.length) throw new Error(`CSV created ${confirmed.created} of ${rows.length} new products`);
}

const created = [];
for (const candidate of candidates) {
  const productCode = candidate.row.product_code;
  const item = (await all(`/products?offset=0&limit=100&search=${encodeURIComponent(productCode)}`)).items?.[0];
  if (!item) throw new Error(`Created product not found: ${productCode}`);
  const product = (await api(`/products/${item.id}`)).data;
  const why = clean(candidate.product.sections?.["Why You'll Love It"]);
  const howText = clean(candidate.product.sections?.["How To Use"]) || "";
  const caution = howText.match(/\n?\s*caution\s*[:：]\s*/i);
  const usage = caution ? clean(howText.slice(0, caution.index)) : howText;
  const warnings = caution ? clean(howText.slice(caution.index + caution[0].length)) : null;
  const attrs = { ...(product.attributes || {}), source_url: candidate.product.url, canonical_url: candidate.product.canonical_url || candidate.product.url, source_site: "Kiokii", source_collection_pages: source.source_pages, source_last_checked: new Date().toISOString().slice(0, 10), source_note: "Public page content imported for PIDB review; verify against manufacturer packaging and supplier documentation.", sku_status: "temporary_internal_sku", image_status: "rights_confirmed", source_shopify_product_id: candidate.product.shopify_product?.id || null };
  const payload = { original_name: candidate.product.title, product_name_en: candidate.product.title, product_name_zh: product.product_name_zh, description_en: why || null, how_to_use_en: usage || null, warnings_en: warnings || null, source_inci: clean(candidate.product.sections?.Ingredients), attributes: attrs, claims: extractClaims(candidate.product) };
  const updated = (await api(`/products/${product.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }, `patch ${candidate.product.title}`)).data;
  created.push({ source_url: candidate.product.url, pidb_product_id: updated.id, title: updated.product_name_en });
  console.log(JSON.stringify({ event: "product", title: updated.product_name_en, id: updated.id, sku: updated.skus[0]?.sku, suggested_price: updated.skus[0]?.suggested_price, currency: updated.skus[0]?.suggested_price_currency, price_status: updated.skus[0]?.suggested_price_status }));
  if (created.length % 5 === 0 && created.length < candidates.length) await sleep(5000);
}
const manifest = { source_pages: source.source_pages, discovered: source.discovered_count, extracted: source.extracted_count, skipped_existing_products: skipped, created_products: created, failed: [] };
await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
console.log(JSON.stringify({ event: "complete", discovered: source.discovered_count, skipped_existing_products: skipped.length, created: created.length, csv: CSV_PATH.pathname, manifest: MANIFEST_PATH.pathname }));

function extractClaims(product) {
  const text = clean(product.sections?.["Why You'll Love It"]) || "";
  const match = text.match(/key benefits\s*[:：]?\s*/i);
  if (!match) return [];
  const rest = text.slice(match.index + match[0].length);
  return rest.split("\n").map((line) => line.trim().replace(/^[-*•]\s*/, "")).filter(Boolean).map((claim_text_en, sort_order) => ({ claim_type: "cosmetic", claim_text_en, claim_text_zh: null, sort_order }));
}
