import { readFile, writeFile } from "node:fs/promises";
const base = process.env.PIDB_API_BASE || "https://pidb.oyct.eu.org/api/v1";
const email = process.env.PIDB_ADMIN_EMAIL || "david@pidb.oyct.eu.org";
const password = process.env.PIDB_ADMIN_PASSWORD;
const reportPath = new URL("./translation-verification-report.json", import.meta.url);
async function request(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : null;
}
const login = await request(`${base}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
const token = login.data.access_token;
const manifest = JSON.parse(await readFile(new URL("./batch-manifest.json", import.meta.url), "utf8"));
const details = [];
for (const row of manifest.created_products) details.push((await request(`${base}/products/${row.pidb_product_id}`, { headers: { authorization: `Bearer ${token}` } })).data);
const content = ["description_zh", "how_to_use_zh", "warnings_zh"];
const baseline = JSON.parse(await readFile(new URL("./import-report.json", import.meta.url), "utf8"));
const baselineById = new Map(baseline.products.map((item) => [item.id, item]));
const allSkus = details.flatMap((item) => item.skus.map((sku) => sku.sku).filter(Boolean));
const allBarcodes = details.flatMap((item) => item.skus.map((sku) => sku.barcode).filter(Boolean));
const literal = /\\n|`n/;
const productChecks = details.map((item) => {
  const expected = baselineById.get(item.id);
  const activeImages = item.images.filter((image) => image.status !== "inactive");
  return {
    id: item.id,
    title: item.product_name_en,
    status: item.status,
    compliance_status: item.canada?.compliance_status || null,
    description_zh: Boolean(item.description_zh),
    how_to_use_zh: Boolean(item.how_to_use_zh),
    warnings_zh: Boolean(item.warnings_zh),
    claims: item.claims.length,
    translated_claims: item.claims.filter((claim) => Boolean(claim.claim_text_zh)).length,
    missing_translation: content.filter((field) => item[`${field.slice(0, -3)}en`] && !item[field]),
    missing_claims: item.claims.filter((claim) => claim.claim_text_en && !claim.claim_text_zh).length,
    literal_escape_fields: [...content, "description_en", "how_to_use_en", "warnings_en"].filter((field) => literal.test(item[field] || "")),
    sku_count: item.skus.length,
    active_image_count: activeImages.length,
    total_image_records: item.images.length,
    image_host_failures: activeImages.filter((image) => !String(image.image_url || "").startsWith("https://img.web3er.eu.org/")),
    baseline_match: Boolean(expected) && expected.sku_count === item.skus.length && expected.image_count === activeImages.length,
  };
});
const result = {
  checked_at: new Date().toISOString(),
  products: details.length,
  expected_products: baseline.products.length,
  description_zh: details.filter((item) => item.description_zh).length,
  how_to_use_zh: details.filter((item) => item.how_to_use_zh).length,
  warnings_zh: details.filter((item) => item.warnings_zh).length,
  translated_claims: details.reduce((sum, item) => sum + item.claims.filter((claim) => claim.claim_text_zh).length, 0),
  claims: details.reduce((sum, item) => sum + item.claims.length, 0),
  translated_claims: details.reduce((sum, item) => sum + item.claims.filter((claim) => claim.claim_text_zh).length, 0),
  missing_products: details.filter((item) => content.some((field) => item[`${field.slice(0, -3)}en`] && !item[field]) || item.claims.some((claim) => claim.claim_text_en && !claim.claim_text_zh)).length,
  literal_escape_products: details.filter((item) => [...content, "description_en", "how_to_use_en", "warnings_en"].some((field) => /\\n|`n/.test(item[field] || ""))).length,
  lifecycle_failures: details.filter((item) => item.status !== "imported" || item.canada?.compliance_status !== "pending").length,
  sku_image_baseline_failures: productChecks.filter((item) => !item.baseline_match).length,
  sku_uniqueness_failures: new Set(allSkus).size !== allSkus.length || new Set(allBarcodes).size !== allBarcodes.length,
  image_host_failures: productChecks.reduce((sum, item) => sum + item.image_host_failures.length, 0),
  provider_counts: Object.fromEntries([...new Set(details.map((item) => item.attributes?.zh_translation_provider || "missing"))].map((provider) => [provider, details.filter((item) => (item.attributes?.zh_translation_provider || "missing") === provider).length])),
  product_checks: productChecks,
};
await writeFile(reportPath, JSON.stringify(result, null, 2), "utf8");
console.log(JSON.stringify({ ...result, product_checks: undefined, report: reportPath.pathname }));
