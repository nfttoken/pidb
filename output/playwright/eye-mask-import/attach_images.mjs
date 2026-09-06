import { readFile, writeFile } from "node:fs/promises";

const PIDB_BASE = process.env.PIDB_API_BASE || "https://pidb.oyct.eu.org/api/v1";
const IMAGE_HOST = process.env.IMAGE_HOST || "https://img.erc721.eu.org";
const INPUT = new URL("./products.normalized.json", import.meta.url);
const MAP_PATH = new URL("./image-map.json", import.meta.url);
const REPORT_PATH = new URL("./image-report.json", import.meta.url);
const EMAIL = process.env.PIDB_ADMIN_EMAIL || "david@pidb.oyct.eu.org";
const ENV_PATH = process.env.PIDB_ENV_FILE || "./.env.production";
const source = JSON.parse(await readFile(INPUT, "utf8"));
const envText = await readFile(ENV_PATH, "utf8").catch(() => "");
function envValue(name) {
  const match = envText.match(new RegExp(`^\\s*${name}\\s*=\\s*(?:["']([^"']*)["']|([^#\\r\\n]*?))\\s*$`, "m"));
  return match ? (match[1] ?? match[2] ?? "").trim() : "";
}
const PASSWORD = process.env.PIDB_ADMIN_PASSWORD || envValue("PIDB_ADMIN_PASSWORD");
if (!PASSWORD) throw new Error("PIDB_ADMIN_PASSWORD is required");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function canonical(value) { return String(value || "").replace("/collections/eye-mask", "/products"); }
function imageUrl(value) { const url = new URL(value); url.searchParams.delete("width"); return url.toString(); }

async function request(url, options = {}, label = url, timeoutMs = 60000) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      const body = await response.text();
      if (!response.ok) {
        lastError = new Error(`${label}: HTTP ${response.status} ${body.slice(0, 300)}`);
        if (response.status >= 400 && response.status < 500 && response.status !== 429) throw lastError;
      } else return body ? JSON.parse(body) : null;
    } catch (error) {
      lastError = error;
      if (String(error.message).includes("HTTP 4") && !String(error.message).includes("HTTP 429")) throw error;
    } finally { clearTimeout(timer); }
    await sleep(1000 * attempt);
  }
  throw lastError;
}

const login = await request(`${PIDB_BASE}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) }, "PIDB login");
let token = login.data.access_token;
async function api(path, options = {}, label = path) {
  const response = await request(`${PIDB_BASE}${path}`, { ...options, headers: { authorization: `Bearer ${token}`, ...(options.headers || {}) } }, label);
  return response;
}
const all = async (path) => (await api(path)).data;

const list = [];
for (let offset = 0; ; offset += 100) {
  const page = await all(`/products?offset=${offset}&limit=100`);
  list.push(...(page.items || []));
  if (list.length >= (page.total || 0) || !(page.items || []).length) break;
}
const details = [];
for (let i = 0; i < list.length; i += 4) details.push(...await Promise.all(list.slice(i, i + 4).map((item) => all(`/products/${item.id}`))));
const bySource = new Map();
for (const product of details) for (const key of ["source_url", "canonical_url"]) if (product.attributes?.[key]) bySource.set(canonical(product.attributes[key]), product);
const targets = [];
const missingProducts = [];
for (const item of source.products) {
  const product = bySource.get(canonical(item.canonical_url || item.url)) || details.find((row) => row.product_name_en === item.title);
  if (product) targets.push({ source: item, product });
  else missingProducts.push({ source_url: item.url, title: item.title });
}

let imageMap = {};
try { imageMap = JSON.parse(await readFile(MAP_PATH, "utf8")); } catch {}
const hostedBySource = new Map();
const uploadFailures = [];
const allSources = [...new Set(targets.flatMap(({ source }) => (source.images || []).map(imageUrl)))];
for (let index = 0; index < allSources.length; index += 1) {
  const url = allSources[index];
  try {
    let hosted = imageMap[url];
    if (!hosted || !(await reachable(hosted))) {
      const result = await request(`${IMAGE_HOST}/api/upload-from-url`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, storageMode: "local" }) }, `image upload ${index + 1}`);
      const src = Array.isArray(result) ? result[0]?.src : result?.src;
      if (!src) throw new Error("Image host returned no src");
      hosted = /^https?:\/\//i.test(src) ? src : `${IMAGE_HOST}${src.startsWith("/") ? "" : "/"}${src}`;
      if (!(await reachable(hosted))) throw new Error("Hosted image failed GET validation");
      imageMap[url] = hosted;
      await writeFile(MAP_PATH, JSON.stringify(imageMap, null, 2), "utf8");
    }
    hostedBySource.set(url, hosted);
  } catch (error) { uploadFailures.push({ source_url: url, error: error.message }); }
  await sleep(250);
}

const productResults = [];
for (let index = 0; index < targets.length; index += 1) {
  const { source: item, product } = targets[index];
  const desired = (item.images || []).map(imageUrl).map((url) => hostedBySource.get(url)).filter(Boolean);
  const detail = await all(`/products/${product.id}`);
  const active = detail.images.filter((image) => image.status === "active");
  const activeByUrl = new Map(active.map((image) => [image.image_url, image]));
  let attached = 0;
  for (const [sortOrder, hosted] of desired.entries()) {
    const existing = activeByUrl.get(hosted);
    if (existing) continue;
    await api(`/products/${product.id}/images`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image_url: hosted, image_type: "gallery", sort_order: sortOrder, alt_text_en: `${product.product_name_en} product image ${sortOrder + 1}`, alt_text_zh: `${product.product_name_zh || product.product_name_en} 产品图片 ${sortOrder + 1}` }) }, `attach image ${product.id}`);
    attached += 1;
  }
  const final = await all(`/products/${product.id}`);
  const finalActive = final.images.filter((image) => image.status === "active");
  const missing = desired.filter((url) => !finalActive.some((image) => image.image_url === url));
  productResults.push({ id: product.id, title: product.product_name_en, source_url: item.url, requested: (item.images || []).length, active: finalActive.length, attached, missing });
  console.log(JSON.stringify({ event: "images", title: product.product_name_en, requested: (item.images || []).length, active: finalActive.length, attached, missing: missing.length }));
  if ((index + 1) % 5 === 0 && index + 1 < targets.length) await sleep(5000);
}

const report = { discovered_products: source.discovered_count, matched_products: targets.length, missing_products: missingProducts, source_images: allSources.length, hosted_images: hostedBySource.size, upload_failures: uploadFailures, attached_images: productResults.reduce((sum, item) => sum + item.attached, 0), products: productResults };
await writeFile(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify({ event: "complete", matched_products: targets.length, source_images: allSources.length, hosted_images: hostedBySource.size, attached_images: report.attached_images, upload_failures: uploadFailures.length, report: REPORT_PATH.pathname }));

async function reachable(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return false;
    const body = await response.arrayBuffer();
    return body.byteLength > 0;
  } catch { return false; } finally { clearTimeout(timer); }
}
