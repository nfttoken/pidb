import fs from "node:fs/promises";
import { Workbook } from "@oai/artifact-tool";

const outputPath = "D:/codex/PIDB/templates/pidb_product_import_template.csv";
const headers = [
  "product_code",
  "brand_name",
  "original_language",
  "original_name",
  "product_name_en",
  "product_name_zh",
  "product_type",
  "country_of_origin",
  "sku",
  "barcode",
  "net_quantity",
  "quantity_unit",
  "skin_types",
  "skin_concerns",
  "key_ingredients",
  "ingredient_names",
  "ingredients_inci",
  "claims",
  "description_en",
  "description_zh",
  "how_to_use_en",
  "how_to_use_zh",
  "warnings_en",
  "warnings_zh",
  "importer_name",
  "distributor_name",
  "canadian_label_status",
  "cosmetic_notification_status",
  "compliance_status",
  "compliance_notes",
];

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Product Import");
sheet.getRangeByIndexes(0, 0, 1, headers.length).values = [headers];
const inspection = await workbook.inspect({
  kind: "table",
  range: "Product Import!A1:AD2",
  include: "values",
  tableMaxRows: 2,
  tableMaxCols: headers.length,
  maxChars: 5000,
});
console.log(inspection.ndjson);

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

await fs.writeFile(outputPath, `${headers.map(csvEscape).join(",")}\r\n`, "utf8");
console.log(`Wrote ${outputPath}`);
