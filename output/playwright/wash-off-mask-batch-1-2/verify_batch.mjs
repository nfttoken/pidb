import { readFile, writeFile } from "node:fs/promises";

const PIDB_BASE = process.env.PIDB_API_BASE || "https://pidb.oyct.eu.org/api/v1";
const IMAGE_HOST = "https://img.erc721.eu.org";
const DIR = new URL("./", import.meta.url);
const PASSWORD = process.env.PIDB_ADMIN_PASSWORD;
const EMAIL = process.env.PIDB_ADMIN_EMAIL || "david@pidb.oyct.eu.org";
const MANIFEST = JSON.parse(await readFile(new URL("./batch-manifest.json", DIR), "utf8"));
const SOURCE = JSON.parse(await readFile(new URL("./products.normalized.json", DIR), "utf8"));
if (!PASSWORD) throw new Error("PIDB_ADMIN_PASSWORD is required");

async function request(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const body = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status} ${body.slice(0, 200)}`);
    return body ? JSON.parse(body) : null;
  } finally { clearTimeout(timer); }
}

async function main() {
  let token = (await request(`${PIDB_BASE}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) })).data.access_token;
  const pidb = async (path) => request(`${PIDB_BASE}${path}`, { headers: { authorization: `Bearer ${token}` } });
  const sourceByUrl = new Map(SOURCE.products.map((item) => [item.url, item]));
  const products = [];
  for (const entry of MANIFEST.created_products) products.push((await pidb(`/products/${entry.pidb_product_id}`)).data);
  const textPairs = [["description_en", "description_zh"], ["how_to_use_en", "how_to_use_zh"], ["warnings_en", "warnings_zh"]];
  const missingTranslations = [];
  const literalEscapes = [];
  const imageMismatches = [];
  const lifecycleFailures = [];
  const missingCoreFields = [];
  const providers = new Set();
  const allSkus = [];
  const activeImages = [];
  for (const product of products) {
    const source = sourceByUrl.get(product.attributes?.source_url);
    if (!source) missingCoreFields.push({ id: product.id, field: "source_url" });
    for (const [english, chinese] of textPairs) if (product[english] && !product[chinese]) missingTranslations.push({ id: product.id, field: chinese });
    for (const field of textPairs.flat()) if (/\\n|`n/.test(product[field] || "")) literalEscapes.push({ id: product.id, field });
    for (const claim of product.claims || []) if (claim.claim_text_en && !claim.claim_text_zh) missingTranslations.push({ id: product.id, field: "claim_text_zh" });
    if (!product.description_en || !product.how_to_use_en || !product.source_inci) missingCoreFields.push({ id: product.id, field: "description/how_to_use/source_inci" });
    const active = (product.images || []).filter((image) => image.status === "active");
    activeImages.push(...active);
    if (!source || active.length !== (source.images || []).length) imageMismatches.push({ id: product.id, expected: source?.images?.length ?? null, actual: active.length });
    if (product.status !== "imported" || product.canada?.compliance_status !== "pending") lifecycleFailures.push({ id: product.id, status: product.status, compliance_status: product.canada?.compliance_status || null });
    providers.add(product.attributes?.zh_translation_provider || "missing");
    allSkus.push(...(product.skus || []).map((sku) => ({ sku: sku.sku, product_id: product.id })));
  }
  const skuCounts = new Map();
  for (const row of allSkus) skuCounts.set(row.sku, (skuCounts.get(row.sku) || 0) + 1);
  const duplicateSkus = allSkus.filter((row) => skuCounts.get(row.sku) > 1).map((row) => row.sku).filter((value, index, values) => values.indexOf(value) === index);
  const imageUrls = [...new Set(activeImages.map((image) => image.image_url))];
  let next = 0;
  const imageCheckResults = new Array(imageUrls.length);
  async function checkWorker() {
    while (true) {
      const index = next++;
      if (index >= imageUrls.length) return;
      const url = imageUrls[index];
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
        const bytes = response.ok ? (await response.arrayBuffer()).byteLength : 0;
        imageCheckResults[index] = { url, ok: response.ok && bytes > 0 };
      } catch { imageCheckResults[index] = { url, ok: false }; }
    }
  }
  await Promise.all(Array.from({ length: 4 }, checkWorker));
  const unreachableImages = imageCheckResults.filter((item) => !item.ok).map((item) => item.url);
  const report = {
    source_pages: SOURCE.source_pages,
    discovered: MANIFEST.discovered,
    extracted: MANIFEST.extracted,
    created: MANIFEST.created_products.length,
    skipped_existing_products: MANIFEST.skipped_existing_products.length,
    image_retry_failed: JSON.parse(await readFile(new URL("./image-retry-report.json", DIR), "utf8")).failed,
    active_images: activeImages.length,
    unique_active_image_urls: imageUrls.length,
    unreachable_images: unreachableImages.length,
    missing_translations: missingTranslations,
    literal_escape_fields: literalEscapes,
    image_mismatches: imageMismatches,
    lifecycle_failures: lifecycleFailures,
    missing_core_fields: missingCoreFields,
    duplicate_skus: duplicateSkus,
    translation_providers: [...providers],
    chinese_description_products: products.filter((item) => Boolean(item.description_zh)).length,
    chinese_how_to_use_products: products.filter((item) => Boolean(item.how_to_use_zh)).length,
    chinese_warning_products: products.filter((item) => Boolean(item.warnings_zh)).length,
    chinese_claims: products.reduce((sum, item) => sum + (item.claims || []).filter((claim) => Boolean(claim.claim_text_zh)).length, 0),
  };
  await writeFile(new URL("./verification-report.json", DIR), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ event: "verification_complete", products: report.created, active_images: report.active_images, unreachable_images: report.unreachable_images, missing_translations: report.missing_translations.length, literal_escape_fields: report.literal_escape_fields.length, image_mismatches: report.image_mismatches.length, lifecycle_failures: report.lifecycle_failures.length, duplicate_skus: report.duplicate_skus.length, report: "/D:/codex/PIDB/output/playwright/wash-off-mask-batch-1-2/verification-report.json" }));
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
