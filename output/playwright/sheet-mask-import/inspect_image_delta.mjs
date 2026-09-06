const base = process.env.PIDB_API_BASE || "https://pidb.oyct.eu.org/api/v1";
const email = process.env.PIDB_ADMIN_EMAIL || "david@pidb.oyct.eu.org";
const password = process.env.PIDB_ADMIN_PASSWORD;
const id = "f588190c-0703-4158-b680-9ee60fd81820";
async function request(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
const login = await request(`${base}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
const product = (await request(`${base}/products/${id}`, { headers: { authorization: `Bearer ${login.data.access_token}` } })).data;
const urls = product.images.map((image) => image.url || image.image_url || image.src || null);
const counts = new Map(urls.map((url) => [url, urls.filter((item) => item === url).length]));
console.log(JSON.stringify({ id, title: product.product_name_en, image_count: product.images.length, duplicate_urls: [...counts].filter(([, count]) => count > 1), images: product.images }, null, 2));
