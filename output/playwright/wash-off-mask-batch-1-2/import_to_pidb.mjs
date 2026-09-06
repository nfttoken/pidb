import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const PIDB_BASE = process.env.PIDB_API_BASE || "https://pidb.oyct.eu.org/api/v1";
const IMAGE_HOST = process.env.IMAGE_HOST || "https://img.erc721.eu.org";
const INPUT = new URL("./products.normalized.json", import.meta.url);
const MAP_PATH = new URL("./image-map.json", import.meta.url);
const REPORT_PATH = new URL("./import-report.json", import.meta.url);
const MANIFEST_PATH = new URL("./batch-manifest.json", import.meta.url);
const REQUEST_TIMEOUT_MS = 30000;
const IMAGE_UPLOAD_TIMEOUT_MS = 60000;
const EMAIL = process.env.PIDB_ADMIN_EMAIL || "david@pidb.oyct.eu.org";
const PASSWORD = process.env.PIDB_ADMIN_PASSWORD;

if (!PASSWORD) throw new Error("PIDB_ADMIN_PASSWORD is required");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cleanText(value) {
  if (value == null) return null;
  return String(value)
    .replace(/\\n/g, "\n")
    .replace(/`n/g, "\n")
    .replace(/\r\n?/g, "\n")
    .trim() || null;
}

function asciiToken(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
}

function norm(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function sourceCountry(product) {
  const text = `${product.sections?.["About the Product"] || ""} ${product.sections?.["Why You'll Love It"] || ""}`;
  if (/\b(japan|japanese)\b/i.test(text)) return "JP";
  if (/\b(korea|korean|south korea)\b/i.test(text)) return "KR";
  return null;
}

function chineseName(vendor, title) {
  let value = String(title || "");
  for (const word of String(vendor || "").split(/\s+/).filter(Boolean)) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    value = value.replace(new RegExp(`\\b${escaped}\\b`, "i"), "");
  }
  value = value
    .replace(/\b(sheet\s+mask|face\s+mask|hydrogel\s+mask|gel\s+mask|mask)\b/gi, "\u9762\u819c")
    .replace(/\b(pink|blue|yellow|green|red|white|black|purple|orange|peach|rose|lavender|clear)\b/gi, (m) => ({
      pink: "\u7c89\u8272", blue: "\u84dd\u8272", yellow: "\u9ec4\u8272", green: "\u7eff\u8272", red: "\u7ea2\u8272",
      white: "\u767d\u8272", black: "\u9ed1\u8272", purple: "\u7d2b\u8272", orange: "\u6a59\u8272", peach: "\u6843\u8272",
      rose: "\u73ab\u7470\u8272", lavender: "\u6de1\u7d2b\u8272", clear: "\u900f\u660e",
    }[m.toLowerCase()] || m));
  const replacements = [
    [/\bcollagen\b/gi, "\u80f6\u539f\u86cb\u767d"], [/\bsoothing\b/gi, "\u8212\u7f13"],
    [/\bcalming\b/gi, "\u8212\u7f13"], [/\bhydrating\b/gi, "\u8865\u6c34"],
    [/\bbrightening\b/gi, "\u63d0\u4eae"], [/\bvitamin\b/gi, "\u7ef4\u751f\u7d20"],
    [/\bglow\b/gi, "\u5149\u6cfd"], [/\bdeep\b/gi, "\u6df1\u5c42"],
  ];
  for (const [pattern, replacement] of replacements) value = value.replace(pattern, replacement);
  return `${vendor} ${value}`.trim();
}

function sectionText(product, name) {
  return cleanText(product.sections?.[name]) || "";
}

function splitUsageAndWarnings(value) {
  const text = cleanText(value) || "";
  const explicit = text.match(/\n?\s*caution\s*[:：]\s*/i);
  if (explicit) {
    return { usage: cleanText(text.slice(0, explicit.index)), warnings: cleanText(text.slice(explicit.index + explicit[0].length)) };
  }
  const implicit = text.match(/\n?\s*(for external use only|patch testing is recommended|discontinue use if irritation occurs|avoid contact with eyes|keep out of reach of children)\b/i);
  if (implicit) {
    return { usage: cleanText(text.slice(0, implicit.index)), warnings: cleanText(text.slice(implicit.index)) };
  }
  return { usage: text || null, warnings: null };
}

function listItems(value) {
  const text = cleanText(value) || "";
  const lines = text.split("\n").map((line) => line.trim().replace(/^[-*•]\s*/, "")).filter(Boolean);
  if (lines.length > 1) return lines;
  const bullets = text.split(/\s+[•▪]\s+|\s+;\s+/).map((item) => item.trim()).filter(Boolean);
  if (bullets.length > 1) return bullets;
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/).map((item) => item.trim()).filter(Boolean);
  return sentences.length > 1 ? sentences : (text ? [text] : []);
}

function labeledBlock(value, label, nextLabels = []) {
  const text = cleanText(value) || "";
  const start = text.match(new RegExp(`${label}\\s*[:：]?\\s*`, "i"));
  if (!start) return "";
  const rest = text.slice(start.index + start[0].length);
  if (!nextLabels.length) return rest.trim();
  const end = rest.search(new RegExp(`(?:${nextLabels.join("|")})\\s*[:：]`, "i"));
  return (end < 0 ? rest : rest.slice(0, end)).trim();
}

function concernCodes(product, concernByCode) {
  const why = sectionText(product, "Why You'll Love It");
  const explicit = labeledBlock(why, "Skin Concerns", ["Key Benefits", "Details"]);
  const text = `${explicit} ${why}`.toLowerCase();
  const rules = [
    ["hydration", /hydration|hydrating|moisturiz|moisture|dehydrat/], ["dryness", /dryness|dry skin|dehydrat/],
    ["redness", /redness|red skin/], ["sensitivity", /sensitiv|irritat/], ["acne_prone", /acne|blemish/],
    ["oil_control", /oily skin|oil control|sebum/], ["dark_spots", /dark spot|hyperpigment/],
    ["dullness", /dull|radiance|brighten/], ["uneven_skin_tone", /uneven skin tone|uneven tone/],
    ["fine_lines", /fine line/], ["wrinkles", /wrinkle/], ["skin_barrier", /skin barrier|barrier/], ["pores", /pore/],
  ];
  return rules.filter(([, pattern]) => pattern.test(text)).map(([code]) => concernByCode.get(code)).filter(Boolean);
}

function skinTypeCodes(product, typeByCode) {
  const text = `${sectionText(product, "About the Product")} ${sectionText(product, "Why You'll Love It")}`.toLowerCase();
  const patterns = [["normal", /normal skin/], ["dry", /dry skin|dry and dehydrated/], ["oily", /oily skin/], ["combination", /combination skin/], ["sensitive", /sensitive skin|sensitive or irritated/]];
  const explicitAll = /all skin types|suitable for all skin types/.test(text);
  const codes = explicitAll ? patterns.map(([code]) => code) : patterns.filter(([, pattern]) => pattern.test(text)).map(([code]) => code);
  return codes.map((code) => typeByCode.get(code)).filter(Boolean);
}

function extractInci(product) {
  const value = sectionText(product, "Ingredients");
  const match = value.match(/full ingredients list\s*[:：]?\s*/i);
  return cleanText(match ? value.slice(match.index + match[0].length) : value);
}

function extractClaims(product) {
  const why = sectionText(product, "Why You'll Love It");
  const block = labeledBlock(why, "Key Benefits", ["Skin Concerns", "Details"]);
  return listItems(block).map((claim, index) => ({ claim_type: "cosmetic", claim_text_en: claim, claim_text_zh: null, sort_order: index }));
}

const COLORS = ["pink", "blue", "yellow", "green", "red", "white", "black", "purple", "orange", "brown", "clear", "beige", "gold", "silver", "rose", "peach", "lavender", "coral", "mint", "multi"];
const STOP_WORDS = new Set(["MASK", "SHEET", "FACE", "FACIAL", "GEL", "HYDROGEL", "PATCH", "PACK", "BOX", "PCS", "PC", "SHEETS", "SHEET", "REAL", "DEEP", "ADVANCED", "INTENSIVE", "ESSENTIAL", "ORIGINAL", "NEW", "PREMIUM", "MOISTURE", "SOLUTION", "CARE", "SKIN", "THE", "AND", "FOR"]);

function variantColor(product, variant) {
  const text = `${product.title} ${variant.public_title || ""}`.toLowerCase();
  return COLORS.find((color) => new RegExp(`\\b${color}\\b`, "i").test(text))?.toUpperCase() || "NA";
}

function quantityFor(product, variant) {
  const text = `${variant.public_title || ""} ${variant.name || ""} ${product.title}`;
  let match = text.match(/(\d+(?:\.\d+)?)\s*(?:sheets?|pcs?|pieces?|piece|pc|ea)\b/i);
  if (match) return { value: Number(match[1]), unit: "pc" };
  match = text.match(/(\d+(?:\.\d+)?)\s*(ml|mg|g|oz)\b/i);
  if (match) return { value: Number(match[1]), unit: match[2].toLowerCase() };
  return { value: 1, unit: "pc" };
}

function sizeToken(quantity) {
  const value = Number.isInteger(quantity.value) ? String(quantity.value) : String(quantity.value).replace(".", "_");
  return `${value}${quantity.unit.toUpperCase()}`;
}

function productNameTokens(product, vendor) {
  const brandWords = new Set(asciiToken(vendor).split("-"));
  const raw = product.title.normalize("NFKD").toUpperCase().replace(/[^A-Z0-9]+/g, " ").split(/\s+/).filter(Boolean);
  const colors = new Set(COLORS.map((item) => item.toUpperCase()));
  const tokens = raw.filter((token) => !brandWords.has(token) && !STOP_WORDS.has(token) && !colors.has(token) && !/^\d+(?:PC|PCS|ML|MG|G|OZ)?$/.test(token));
  return (tokens.length ? tokens : ["CARE"]).slice(0, 2);
}

function makeSku(product, vendor, variant, used) {
  const quantity = quantityFor(product, variant);
  const base = ["MASK", asciiToken(vendor).slice(0, 24), ...productNameTokens(product, vendor), variantColor(product, variant), sizeToken(quantity)].filter(Boolean).join("-");
  let sku = base;
  let suffix = 2;
  while (used.has(sku)) sku = `${base}-${String(suffix++).padStart(2, "0")}`;
  used.add(sku);
  return { sku, quantity, size: sizeToken(quantity) };
}

function offerBarcode(product, variant, usedBarcodes) {
  const offers = Array.isArray(product.json_ld?.offers) ? product.json_ld.offers : [];
  const offer = offers.find((item) => variant.sku && String(item.sku || "") === String(variant.sku));
  const barcode = offer?.gtin13 || offer?.gtin || null;
  if (!barcode || usedBarcodes.has(String(barcode))) return null;
  usedBarcodes.add(String(barcode));
  return String(barcode);
}

function buildSkus(product, vendor, usedSkus, usedBarcodes) {
  const variants = product.shopify_product?.variants?.length ? product.shopify_product.variants : [{ public_title: "Default Title", name: product.title }];
  return variants.map((variant) => {
    const generated = makeSku(product, vendor, variant, usedSkus);
    const sourceSku = variant.sku && !/^\d{8,14}$/.test(String(variant.sku).trim()) ? String(variant.sku).trim() : null;
    const quantity = generated.quantity;
    return {
      sku: sourceSku || generated.sku,
      barcode: sourceSku ? null : offerBarcode(product, variant, usedBarcodes),
      variant_name_en: cleanText(variant.public_title || variant.name || product.title),
      variant_name_zh: quantity.unit === "pc" ? `${quantity.value}\u7247\u88c5` : `${quantity.value}${quantity.unit}`,
      net_quantity: quantity.value,
      quantity_unit: quantity.unit,
    };
  });
}

function imageUrl(value) {
  const url = new URL(value);
  url.searchParams.delete("width");
  return url.toString();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); } finally { clearTimeout(timer); }
}

async function request(url, options = {}, label = url, timeoutMs = REQUEST_TIMEOUT_MS) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);
      const body = await response.text();
      if (!response.ok) {
        const error = new Error(`${label}: HTTP ${response.status} ${body.slice(0, 300)}`);
        if (response.status >= 400 && response.status < 500 && response.status !== 429) throw error;
        lastError = error;
      } else {
        if (!body) return null;
        try { return JSON.parse(body); } catch { return body; }
      }
    } catch (error) {
      lastError = error;
      if (String(error.message).includes("HTTP 4") && !String(error.message).includes("HTTP 429")) throw error;
    }
    const retryAfter = Number(lastError?.message.match(/retry after\s+(\d+)/i)?.[1] || 0);
    await sleep(retryAfter > 0 ? Math.min(retryAfter * 1000, 120000) : 500 * attempt);
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

async function main() {
  const source = JSON.parse(await readFile(INPUT, "utf8"));
  let token = (await request(`${PIDB_BASE}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) }, "PIDB login")).data.access_token;
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
  const data = async (path) => (await pidb(path)).data;
  const listAllProducts = async () => {
    const items = [];
    let offset = 0;
    let total = null;
    while (true) {
      const page = await data(`/products?offset=${offset}&limit=100`);
      const pageItems = page.items || [];
      items.push(...pageItems);
      total = page.total ?? total;
      if (!pageItems.length || items.length >= (total ?? items.length) || pageItems.length < 100) break;
      offset += pageItems.length;
    }
    return { items, total: total ?? items.length };
  };

  const [brands, productTypes, skinTypes, skinConcerns, ingredients, productList] = await Promise.all([
    data("/brands"), data("/product-types"), data("/skin-types"), data("/skin-concerns"), data("/ingredients"), listAllProducts(),
  ]);
  const typeByName = new Map(productTypes.map((item) => [norm(item.name_en || item.name), item]));
  const fallbackType = productTypes.find((item) => /wash\s*-?\s*off\s*mask/i.test(item.name_en || item.name) || /wash[_-]?off/i.test(item.code));
  if (!fallbackType) throw new Error("Wash-Off Mask product type is missing from PIDB");
  const brandByName = new Map(brands.map((item) => [norm(item.name), item]));
  const skinTypeByCode = new Map(skinTypes.map((item) => [item.code, item.id]));
  const concernByCode = new Map(skinConcerns.map((item) => [item.code, item.id]));
  const ingredientRows = ingredients;
  const existingDetails = await mapLimit(productList.items || [], 4, async (item) => (await pidb(`/products/${item.id}`)).data);
  const productByCode = new Map(existingDetails.map((item) => [item.product_code, item]));
  const existingSkus = new Set(existingDetails.flatMap((item) => item.skus.map((sku) => sku.sku)));
  const existingBarcodes = new Set(existingDetails.flatMap((item) => item.skus.map((sku) => sku.barcode).filter(Boolean)));
  const existingSource = new Map();
  for (const item of existingDetails) {
    const attrs = item.attributes || {};
    for (const key of ["source_url", "canonical_url"]) if (attrs[key]) existingSource.set(String(attrs[key]).replace(/\/collections\/[^/]+(?=\/products\/)/i, ""), item);
  }

  const productRows = [];
  const skippedExistingProducts = [];
  for (const product of source.products) {
    if (product.error) continue;
    const vendor = cleanText(product.vendor) || "Unknown Brand";
    const stableUrl = (product.canonical_url || product.url).replace(/\/collections\/[^/]+(?=\/products\/)/i, "");
    const current = existingSource.get(stableUrl) || existingDetails.find((item) => item.product_name_en === product.title);
    if (current) {
      skippedExistingProducts.push({ source_url: product.url, canonical_url: product.canonical_url || product.url, pidb_product_id: current.id, title: product.title, reason: existingSource.has(stableUrl) ? "source_identity" : "stable_product_identity" });
      continue;
    }
    let brand = brandByName.get(norm(vendor));
    if (!brand) {
      brand = await pidb("/brands", { method: "POST", body: JSON.stringify({ brand_code: asciiToken(vendor).slice(0, 80) || null, name: vendor, name_en: vendor, slug: asciiToken(vendor).toLowerCase().replace(/-/g, "-") || `brand-${Date.now()}`, country_of_origin: sourceCountry(product), website_url: null }) }, `create brand ${vendor}`);
      brand = brand.data;
      brandByName.set(norm(vendor), brand);
    }
    const codeHash = createHash("sha1").update(stableUrl).digest("hex").slice(0, 8).toUpperCase();
    const productCode = `MASK-${asciiToken(vendor).slice(0, 18)}-${codeHash}`.slice(0, 50);
    const sourceType = typeByName.get(norm(product.product_type));
    const type = sourceType || fallbackType;
    const why = sectionText(product, "Why You'll Love It");
    const how = splitUsageAndWarnings(sectionText(product, "How To Use"));
    const inci = extractInci(product);
    const sourceTokens = new Set((inci || "").split(/[,\n]/).map((item) => norm(item.replace(/^\[[^\]]+\]$/, ""))).filter(Boolean));
    const highlighted = `${sectionText(product, "Ingredients")} ${sectionText(product, "Why You'll Love It")}`.toLowerCase();
    const ingredientLinks = ingredientRows.filter((item) => {
      const declared = sourceTokens.has(norm(item.inci_name));
      const highlightedMatch = [item.inci_name, item.common_name_en, item.common_name_zh, item.search_keywords].filter(Boolean).some((value) => highlighted.includes(String(value).toLowerCase()));
      return declared && highlightedMatch;
    }).map((item, index) => ({ ingredient_id: item.id, position: index + 1, is_key_ingredient: true }));
    const typeIds = skinTypeCodes(product, skinTypeByCode);
    const concernIds = concernCodes(product, concernByCode);
    const usedForProduct = new Set([...existingSkus].filter((sku) => !current || !current.skus.some((row) => row.sku === sku)));
    const usedBarcodesForProduct = new Set(existingBarcodes);
    if (current) for (const sku of current.skus) if (sku.barcode) usedBarcodesForProduct.delete(sku.barcode);
    const skus = buildSkus(product, vendor, usedForProduct, usedBarcodesForProduct);
    for (const sku of skus) {
      existingSkus.add(sku.sku);
      if (sku.barcode) existingBarcodes.add(sku.barcode);
    }
    const attributes = {
      source_url: product.url, canonical_url: product.canonical_url || product.url,
      source_site: "Kiokii", source_collection_pages: source.source_pages, source_last_checked: new Date().toISOString().slice(0, 10),
      source_note: "Public page content imported for PIDB review; verify against manufacturer packaging and supplier documentation.",
      sku_status: skus.some((item) => item.sku === product.shopify_product?.variants?.find((v) => v.sku)?.sku) ? "supplier_sku" : "temporary_internal_sku",
      image_status: "rights_confirmed", source_shopify_product_id: product.shopify_product?.id || null,
    };
    productRows.push({ source: product, current, payload: {
      product_code: productCode, brand_id: brand.id, product_type_id: type.id, original_language: "en", original_name: product.title,
      product_name_en: product.title, product_name_zh: chineseName(vendor, product.title), description_en: why || null, description_zh: null,
      how_to_use_en: how.usage, how_to_use_zh: null, warnings_en: how.warnings, warnings_zh: null, country_of_origin: sourceCountry(product),
      source_inci: inci, attributes, skus, skin_type_ids: typeIds, skin_concern_ids: concernIds, ingredients: ingredientLinks,
      claims: extractClaims(product),
    } });
  }

  const results = [];
  for (const row of productRows) {
    let product;
    if (process.env.SKIP_PRODUCT_SYNC === "1" && row.current) {
      product = row.current;
    } else if (row.current) {
      product = (await pidb(`/products/${row.current.id}`, { method: "PATCH", body: JSON.stringify(Object.fromEntries(Object.entries(row.payload).filter(([key]) => key !== "product_code"))) }, `update ${row.payload.product_name_en}`)).data;
    } else {
      product = (await pidb("/products", { method: "POST", body: JSON.stringify(row.payload) }, `create ${row.payload.product_name_en}`)).data;
    }
    if (product.status === "draft") product = (await pidb(`/products/${product.id}/status`, { method: "POST", body: JSON.stringify({ status: "imported" }) }, `import ${product.product_name_en}`)).data;
    if (!product.canada || product.canada.compliance_status === "pending") {
      await pidb(`/products/${product.id}/compliance`, { method: "PUT", body: JSON.stringify({ canadian_label_status: "pending", cosmetic_notification_status: "pending", compliance_status: "pending", notes: "Awaiting supplier confirmation of official SKUs, packaging, current INCI, Canadian label and cosmetic notification. Source images authorized for PIDB staging." }) }, `compliance ${product.product_name_en}`);
    }
    results.push({ source: row.source, product, created: !row.current, imageSources: [...new Set((row.source.images || []).map(imageUrl))] });
    console.log(JSON.stringify({ event: "product", title: product.product_name_en, id: product.id, created: !row.current, skus: product.skus.length, claims: product.claims.length, ingredients: product.ingredients.length }));
  }

  let imageMap = {};
  try { imageMap = JSON.parse(await readFile(MAP_PATH, "utf8")); } catch {}
  const allImageSources = [...new Set(results.flatMap((item) => item.imageSources))];
  let completedImages = 0;
  let saveMapChain = Promise.resolve();
  const saveImageMap = () => {
    saveMapChain = saveMapChain.then(() => writeFile(MAP_PATH, JSON.stringify(imageMap, null, 2), "utf8"));
    return saveMapChain;
  };
  const uploaded = await mapLimit(allImageSources, 1, async (url, index) => {
    try {
      if (imageMap[url] && await validateDirectUrl(imageMap[url])) {
        completedImages += 1;
        if (completedImages % 10 === 0) console.log(JSON.stringify({ event: "images", completed: completedImages, total: allImageSources.length }));
        return { url, hosted: imageMap[url], reused: true };
      }
      const uploadedImage = await request(`${IMAGE_HOST}/api/upload-from-url`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, storageMode: "local" }) }, `image upload ${index + 1}`, IMAGE_UPLOAD_TIMEOUT_MS);
      const src = Array.isArray(uploadedImage) ? uploadedImage[0]?.src : uploadedImage?.src;
      if (!src) throw new Error(`Image host returned no src for ${url}`);
      const hosted = /^https?:\/\//i.test(src) ? src : `${IMAGE_HOST}${src.startsWith("/") ? "" : "/"}${src}`;
      if (!await validateDirectUrl(hosted)) throw new Error(`Image host URL failed GET validation: ${hosted}`);
      imageMap[url] = hosted;
      await saveImageMap();
      completedImages += 1;
      if (completedImages % 10 === 0) console.log(JSON.stringify({ event: "images", completed: completedImages, total: allImageSources.length }));
      return { url, hosted, reused: false };
    } catch (error) {
      return { url, error: error.message };
    }
  });
  await saveImageMap();
  const hostedBySource = new Map(uploaded.filter((item) => item.hosted).map((item) => [item.url, item.hosted]));
  const uploadFailures = uploaded.filter((item) => item.error).map((item) => ({ source_url: item.url, error: item.error }));
  let imageAttached = 0;
  let imageFailures = [...uploadFailures];
  for (const item of results) {
    const desired = item.imageSources.map((url) => hostedBySource.get(url)).filter(Boolean);
    const detail = (await pidb(`/products/${item.product.id}`)).data;
    const active = detail.images.filter((image) => image.status === "active");
    const complete = desired.length === item.imageSources.length && desired.length > 0;
    if (complete) {
      for (const image of active) {
        if (!desired.includes(image.image_url)) await pidb(`/products/${item.product.id}/images/${image.id}/deactivate`, { method: "POST" }, `deactivate old image ${item.product.id}`);
      }
    }
    const refreshed = complete ? (await pidb(`/products/${item.product.id}`)).data : detail;
    const activeByUrl = new Map(refreshed.images.filter((image) => image.status === "active").map((image) => [image.image_url, image]));
    for (const [index, imageUrlValue] of desired.entries()) {
      const altEn = `${item.product.product_name_en} product image ${index + 1}`;
      const altZh = `${item.product.product_name_zh || item.product.product_name_en} \u4ea7\u54c1\u56fe\u7247 ${index + 1}`;
      const existing = activeByUrl.get(imageUrlValue);
      if (existing) {
        if (existing.sort_order !== index || existing.alt_text_en !== altEn || existing.alt_text_zh !== altZh) {
          await pidb(`/products/${item.product.id}/images/${existing.id}`, { method: "PATCH", body: JSON.stringify({ image_url: imageUrlValue, image_type: "gallery", sort_order: index, alt_text_en: altEn, alt_text_zh: altZh }) }, `update image ${item.product.id}`);
        }
      } else {
        await pidb(`/products/${item.product.id}/images`, { method: "POST", body: JSON.stringify({ image_url: imageUrlValue, image_type: "gallery", sort_order: index, alt_text_en: altEn, alt_text_zh: altZh }) }, `attach image ${item.product.id}`);
        imageAttached += 1;
      }
    }
    const finalDetail = (await pidb(`/products/${item.product.id}`)).data;
    const finalActive = finalDetail.images.filter((image) => image.status === "active");
    const missing = desired.filter((url) => !finalActive.some((image) => image.image_url === url));
    if (missing.length) imageFailures.push({ id: item.product.id, title: item.product.product_name_en, missing });
    item.final = finalDetail;
  }

  const report = {
    source_pages: source.source_pages, discovered: source.discovered_count, extracted: source.extracted_count,
    processed: results.length, created: results.filter((item) => item.created).length, skipped_existing_products: skippedExistingProducts.length,
    hosted_images: allImageSources.length, reused_hosted_images: uploaded.filter((item) => item.reused).length,
    attached_images: imageAttached, image_failures: imageFailures,
    products: results.map((item) => ({ id: item.final.id, product_code: item.final.product_code, product_name_en: item.final.product_name_en, status: item.final.status, compliance_status: item.final.canada?.compliance_status || null, sku_count: item.final.skus.length, image_count: item.final.images.filter((image) => image.status === "active").length, claim_count: item.final.claims.length, ingredient_link_count: item.final.ingredients.length, literal_escape_fields: ["description_en", "description_zh", "how_to_use_en", "how_to_use_zh", "warnings_en", "warnings_zh"].filter((field) => /\\n|`n/.test(item.final[field] || "")) })),
  };
  await writeFile(MANIFEST_PATH, JSON.stringify({ source_pages: source.source_pages, discovered: source.discovered_count, extracted: source.extracted_count, skipped_existing_products: skippedExistingProducts, created_products: results.map((item) => ({ source_url: item.source.url, pidb_product_id: item.final?.id || item.product.id, title: item.product.product_name_en })), failed: imageFailures }, null, 2), "utf8");
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ event: "complete", processed: report.processed, created: report.created, skipped_existing_products: report.skipped_existing_products, hosted_images: report.hosted_images, reused_hosted_images: report.reused_hosted_images, attached_images: report.attached_images, image_failures: report.image_failures.length, report: REPORT_PATH.pathname, manifest: MANIFEST_PATH.pathname }));
}

async function validateDirectUrl(url) {
  try {
    const response = await fetchWithTimeout(url, {}, REQUEST_TIMEOUT_MS);
    if (!response.ok) return false;
    const buffer = await response.arrayBuffer();
    return buffer.byteLength > 0;
  } catch { return false; }
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
