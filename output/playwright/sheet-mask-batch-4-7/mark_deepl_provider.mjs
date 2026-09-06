import { readFile } from "node:fs/promises";
const base = process.env.PIDB_API_BASE || "https://pidb.oyct.eu.org/api/v1";
const email = process.env.PIDB_ADMIN_EMAIL || "david@pidb.oyct.eu.org";
const password = process.env.PIDB_ADMIN_PASSWORD;
async function request(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : null;
}
const login = await request(`${base}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
const token = login.data.access_token;
const manifest = JSON.parse(await readFile(new URL("./batch-manifest.json", import.meta.url), "utf8"));
let updated = 0;
for (const row of manifest.created_products) {
  const detail = (await request(`${base}/products/${row.pidb_product_id}`, { headers: { authorization: `Bearer ${token}` } })).data;
  const attributes = { ...(detail.attributes || {}), zh_translation_provider: "DeepL API" };
  await request(`${base}/products/${row.pidb_product_id}`, { method: "PATCH", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ attributes }) });
  updated += 1;
}
console.log(JSON.stringify({ updated }));
