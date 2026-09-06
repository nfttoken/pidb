import { writeFile } from "node:fs/promises";

const collectionUrls = [
  "https://kiokii.com/collections/wash-off-masks",
  "https://kiokii.com/collections/wash-off-masks?page=2",
];

const outputPath = new URL("./products.json", import.meta.url);
const headers = { "user-agent": "Mozilla/5.0 (compatible; PIDB authorized catalog import)" };
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function decodeHtml(value) {
  return (value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&ndash;|&mdash;/gi, "-");
}

function htmlToText(value) {
  return decodeHtml(value)
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|li|div|h[1-6]|ul|ol|tr|td|th|section)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function firstMatch(html, pattern) {
  return html.match(pattern)?.[1] || "";
}

function parseMeta(html) {
  const text = firstMatch(html, /var meta = (\{.*?\});/s);
  if (!text) return null;
  try {
    return JSON.parse(text).product || null;
  } catch {
    return null;
  }
}

function parseJsonLd(html) {
  for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(decodeHtml(match[1]));
      const values = Array.isArray(parsed) ? parsed : [parsed];
      const product = values.find((value) => value && (value["@type"] === "Product" || value["@type"]?.includes?.("Product")));
      if (product) return product;
    } catch {
      // Ignore unrelated or malformed third-party JSON-LD blocks.
    }
  }
  return null;
}

function parseSections(html) {
  const sections = {};
  for (const match of html.matchAll(/<details\b[^>]*>[\s\S]*?<\/details>/gi)) {
    const block = match[0];
    const label = htmlToText(firstMatch(block, /<summary\b[^>]*>([\s\S]*?)<\/summary>/i));
    if (!["About the Product", "Why You'll Love It", "How To Use", "Ingredients"].includes(label)) continue;
    const afterSummary = block.split(/<\/summary>/i)[1]?.replace(/<\/details>\s*$/i, "") || "";
    const text = htmlToText(afterSummary);
    if (!sections[label] || text.length > sections[label].length) sections[label] = text;
  }
  return sections;
}

function parseImages(html, title, jsonLd) {
  const normalizeUrl = (url) => url.startsWith("//") ? `https:${url}` : url;
  const candidates = [];
  const jsonImages = Array.isArray(jsonLd?.image) ? jsonLd.image : jsonLd?.image ? [jsonLd.image] : [];
  candidates.push(...jsonImages.map(normalizeUrl));
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const alt = decodeHtml(firstMatch(tag, /\balt=["']([^"']*)["']/i));
    const src = decodeHtml(firstMatch(tag, /\b(?:data-src|src)=["']([^"']+)["']/i));
    if (src && alt && title && alt.includes(title)) candidates.push(normalizeUrl(src));
  }
  return Array.from(new Set(candidates.filter((url) => /^https?:\/\//i.test(url))));
}

function parseProduct(html, url) {
  const meta = parseMeta(html);
  const jsonLd = parseJsonLd(html);
  const title = htmlToText(firstMatch(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i)) || jsonLd?.name || meta?.handle || "";
  const vendor = meta?.vendor || htmlToText(firstMatch(html, /href=["'][^"']*\/collections\/vendors[^"']*["'][^>]*>([\s\S]*?)<\/a>/i));
  const productType = meta?.type || htmlToText(firstMatch(html, /href=["'][^"']*\/collections\/types[^"']*["'][^>]*>([\s\S]*?)<\/a>/i));
  return {
    url,
    canonical_url: jsonLd?.url || url,
    title,
    vendor,
    product_type: productType,
    shopify_product: meta,
    json_ld: jsonLd,
    sections: parseSections(html),
    images: parseImages(html, title, jsonLd),
  };
}

async function fetchText(url) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(45000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt === 4) throw lastError;
      await delay(attempt * 5000);
    }
  }
  throw lastError;
}

const productLinks = new Map();
for (const collectionUrl of collectionUrls) {
  const html = await fetchText(collectionUrl);
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']*\/collections\/wash-off-masks\/products\/[^"']*)["'][^>]*>/gi)) {
    const href = decodeHtml(match[1]).split("?")[0];
    productLinks.set(new URL(href, collectionUrl).href, new URL(href, collectionUrl).href);
  }
  await delay(1000);
}

const products = [];
for (const [index, url] of Array.from(productLinks.values()).entries()) {
  try {
    const html = await fetchText(url);
    const product = parseProduct(html, url);
    products.push(product);
    console.error(`EXTRACTED ${index + 1}/${productLinks.size} ${product.title || url}`);
    await delay(1000);
  } catch (error) {
    products.push({ url, error: error.message });
    console.error(`FAILED ${index + 1}/${productLinks.size} ${url}: ${error.message}`);
  }
}

const result = {
  source_pages: collectionUrls,
  discovered_count: productLinks.size,
  extracted_count: products.filter((product) => !product.error).length,
  products,
};
await writeFile(outputPath, JSON.stringify(result, null, 2), "utf8");
console.log(JSON.stringify({ discovered_count: result.discovered_count, extracted_count: result.extracted_count, output: outputPath.pathname }));
