import { readFile, writeFile } from "node:fs/promises";

const base = process.env.PIDB_API_BASE || "https://pidb.oyct.eu.org/api/v1";
const email = process.env.PIDB_ADMIN_EMAIL || "david@pidb.oyct.eu.org";
const password = process.env.PIDB_ADMIN_PASSWORD;
const reportPath = new URL("./translation-verification-report.json", import.meta.url);
if (!password) throw new Error("PIDB_ADMIN_PASSWORD is required");

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  const login = await request(`${base}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  const token = login.data.access_token;
  const get = (path) => request(`${base}${path}`, { headers: { authorization: `Bearer ${token}` } });
  const list = (await get("/products?offset=0&limit=100")).data.items;
  const products = [];
  for (const item of list) {
    const detail = (await get(`/products/${item.id}`)).data;
    if (detail.attributes?.source_site === "Kiokii") products.push(detail);
  }
  const baseline = JSON.parse(await readFile(new URL("./import-report.json", import.meta.url), "utf8"));
  const baselineById = new Map(baseline.products.map((item) => [item.id, item]));
  const literal = /\\n|`n/;
  const checked = products.map((product) => {
    const expected = baselineById.get(product.id);
    const fields = ["description_zh", "how_to_use_zh", "warnings_zh"];
    const missing = fields.filter((field) => Boolean(product[`${field.slice(0, -3)}en`]) && !product[field]);
    const literalFields = fields.filter((field) => literal.test(product[field] || ""));
    const claimMissing = product.claims.filter((claim) => claim.claim_text_en && !claim.claim_text_zh).length;
    const skuValues = product.skus.map((sku) => sku.sku || sku.product_code).filter(Boolean);
    const barcodeValues = product.skus.map((sku) => sku.barcode).filter(Boolean);
    const activeImageCount = product.images.filter((image) => image.status !== "inactive").length;
    return {
      id: product.id,
      title: product.product_name_en,
      status: product.status,
      compliance_status: product.canada?.compliance_status || null,
      description_zh: Boolean(product.description_zh),
      how_to_use_zh: Boolean(product.how_to_use_zh),
      warnings_zh: Boolean(product.warnings_zh),
      claims: product.claims.length,
      translated_claims: product.claims.filter((claim) => Boolean(claim.claim_text_zh)).length,
      missing_translations: missing,
      missing_claims: claimMissing,
      literal_escape_fields: literalFields,
      provider: product.attributes?.zh_translation_provider || null,
      sku_count: product.skus.length,
      image_count: activeImageCount,
      total_image_records: product.images.length,
      sku_unique: new Set(skuValues).size === skuValues.length,
      barcode_unique: new Set(barcodeValues).size === barcodeValues.length,
      baseline_match: Boolean(expected) && expected.sku_count === product.skus.length && expected.image_count === activeImageCount,
    };
  });
  const report = {
    checked_at: new Date().toISOString(),
    product_count: products.length,
    expected_product_count: baseline.products.length,
    description_zh: checked.filter((item) => item.description_zh).length,
    how_to_use_zh: checked.filter((item) => item.how_to_use_zh).length,
    warnings_zh: checked.filter((item) => item.warnings_zh).length,
    claims: checked.reduce((sum, item) => sum + item.claims, 0),
    translated_claims: checked.reduce((sum, item) => sum + item.translated_claims, 0),
    missing_translation_products: checked.filter((item) => item.missing_translations.length).length,
    missing_claim_products: checked.filter((item) => item.missing_claims).length,
    literal_escape_products: checked.filter((item) => item.literal_escape_fields.length).length,
    status_failures: checked.filter((item) => item.status !== "imported" || item.compliance_status !== "pending").length,
    sku_image_baseline_failures: checked.filter((item) => !item.baseline_match).length,
    sku_uniqueness_failures: checked.filter((item) => !item.sku_unique || !item.barcode_unique).length,
    provider_counts: Object.fromEntries([...new Set(checked.map((item) => item.provider))].map((provider) => [provider || "missing", checked.filter((item) => item.provider === provider).length])),
    products: checked,
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({
    event: "verified",
    product_count: report.product_count,
    expected_product_count: report.expected_product_count,
    description_zh: report.description_zh,
    how_to_use_zh: report.how_to_use_zh,
    warnings_zh: report.warnings_zh,
    claims: report.claims,
    translated_claims: report.translated_claims,
    missing_translation_products: report.missing_translation_products,
    missing_claim_products: report.missing_claim_products,
    literal_escape_products: report.literal_escape_products,
    status_failures: report.status_failures,
    sku_image_baseline_failures: report.sku_image_baseline_failures,
    sku_uniqueness_failures: report.sku_uniqueness_failures,
    report: reportPath.pathname,
  }));
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
