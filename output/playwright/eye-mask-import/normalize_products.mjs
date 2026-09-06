import { readFile, writeFile } from "node:fs/promises";

const sourcePath = new URL("./products.json", import.meta.url);
const outputPath = new URL("./products.normalized.json", import.meta.url);
const source = JSON.parse(await readFile(sourcePath, "utf8"));

function normalizeImageUrl(value) {
  const url = new URL(value.startsWith("//") ? `https:${value}` : value);
  url.searchParams.delete("width");
  return url.toString();
}

for (const product of source.products) {
  if (product.error) continue;
  const seen = new Set();
  product.images = product.images
    .map(normalizeImageUrl)
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
}

await writeFile(outputPath, JSON.stringify(source, null, 2), "utf8");
console.log(JSON.stringify({ products: source.products.length, images: source.products.reduce((sum, item) => sum + (item.images?.length || 0), 0), output: outputPath.pathname }));
