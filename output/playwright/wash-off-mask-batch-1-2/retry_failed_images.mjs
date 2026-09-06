import { readFile, writeFile } from "node:fs/promises";

const PIDB_BASE = process.env.PIDB_API_BASE || "https://pidb.oyct.eu.org/api/v1";
const IMAGE_HOST = "https://img.erc721.eu.org";
const DIR = new URL("./", import.meta.url);
const INPUT = new URL("./products.normalized.json", DIR);
const REPORT = new URL("./import-report.json", DIR);
const MANIFEST = new URL("./batch-manifest.json", DIR);
const MAP = new URL("./image-map.json", DIR);
const OUTPUT = new URL("./image-retry-report.json", DIR);
const PASSWORD = process.env.PIDB_ADMIN_PASSWORD;
const EMAIL = process.env.PIDB_ADMIN_EMAIL || "david@pidb.oyct.eu.org";
if (!PASSWORD) throw new Error("PIDB_ADMIN_PASSWORD is required");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function request(url, options = {}, label = "request", timeoutMs = 60000) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      const body = await response.text();
      if (!response.ok) {
        lastError = new Error(`${label}: HTTP ${response.status} ${body.slice(0, 200)}`);
        if (response.status >= 400 && response.status < 500 && response.status !== 429) throw lastError;
      } else return body ? JSON.parse(body) : null;
    } catch (error) {
      lastError = error;
      if (String(error.message).includes("HTTP 4") && !String(error.message).includes("HTTP 429")) throw error;
    } finally { clearTimeout(timer); }
    await sleep(Math.min(10000, attempt * 2000));
  }
  throw lastError;
}

async function login() {
  return (await request(`${PIDB_BASE}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) }, "PIDB login")).data.access_token;
}

async function main() {
  const source = JSON.parse(await readFile(INPUT, "utf8"));
  const report = JSON.parse(await readFile(REPORT, "utf8"));
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  const imageMap = JSON.parse(await readFile(MAP, "utf8"));
  const productIdBySource = new Map(manifest.created_products.map((item) => [item.source_url, item.pidb_product_id]));
  const sourceProductByImage = new Map();
  for (const product of source.products) for (const image of product.images || []) sourceProductByImage.set(image, product);
  const failed = [...new Map((report.image_failures || []).filter((item) => item.source_url).map((item) => [item.source_url, item])).values()];
  let token = await login();
  const pidb = async (path, options = {}, label = path) => {
    const send = () => request(`${PIDB_BASE}${path}`, { ...options, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(options.headers || {}) } }, label);
    try { return await send(); } catch (error) {
      if (!String(error.message).includes("HTTP 401")) throw error;
      token = await login();
      return send();
    }
  };
  const validate = async (url) => {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) return false;
      return (await response.arrayBuffer()).byteLength > 0;
    } catch { return false; }
  };
  const directFromError = (value) => String(value || "").match(/https?:\/\/\S+/)?.[0] || null;
  const results = [];
  for (const entry of failed) {
    const product = sourceProductByImage.get(entry.source_url);
    const productId = productIdBySource.get(product?.url);
    if (!product || !productId) {
      results.push({ source_url: entry.source_url, result: "failed", reason: "product mapping missing" });
      continue;
    }
    try {
      let hosted = imageMap[entry.source_url] || directFromError(entry.error);
      let reused = Boolean(hosted && await validate(hosted));
      if (!reused) {
        const uploaded = await request(`${IMAGE_HOST}/api/upload-from-url`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: entry.source_url, storageMode: "local" }) }, "image retry");
        const src = Array.isArray(uploaded) ? uploaded[0]?.src : uploaded?.src;
        if (!src) throw new Error("image host returned no src");
        hosted = /^https?:\/\//i.test(src) ? src : `${IMAGE_HOST}${src.startsWith("/") ? "" : "/"}${src}`;
        if (!await validate(hosted)) throw new Error("image host URL failed retry validation");
      }
      imageMap[entry.source_url] = hosted;
      const detail = (await pidb(`/products/${productId}`)).data;
      const index = product.images.indexOf(entry.source_url);
      const existing = detail.images.find((image) => image.status === "active" && image.image_url === hosted);
      if (!existing) {
        await pidb(`/products/${productId}/images`, { method: "POST", body: JSON.stringify({ image_url: hosted, image_type: "gallery", sort_order: index < 0 ? detail.images.length : index, alt_text_en: `${detail.product_name_en} product image ${index + 1}`, alt_text_zh: `${detail.product_name_zh || detail.product_name_en} 产品图片 ${index + 1}` }) }, "attach retried image");
      }
      results.push({ source_url: entry.source_url, product_id: productId, result: "attached", reused_hosted_url: reused });
      console.log(JSON.stringify({ event: "image_retry", result: "attached", reused_hosted_url: reused }));
      await sleep(800);
    } catch (error) {
      results.push({ source_url: entry.source_url, product_id: productId, result: "failed", reason: String(error.message) });
      console.error(JSON.stringify({ event: "image_retry", result: "failed", reason: String(error.message) }));
    }
  }
  await writeFile(MAP, JSON.stringify(imageMap, null, 2), "utf8");
  const output = { attempted: failed.length, attached: results.filter((item) => item.result === "attached").length, failed: results.filter((item) => item.result === "failed").length, reused_hosted_urls: results.filter((item) => item.reused_hosted_url).length, results };
  await writeFile(OUTPUT, JSON.stringify(output, null, 2), "utf8");
  console.log(JSON.stringify({ event: "complete", attempted: output.attempted, attached: output.attached, failed: output.failed, reused_hosted_urls: output.reused_hosted_urls, report: OUTPUT.pathname }));
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
