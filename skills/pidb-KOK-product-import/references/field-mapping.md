# PIDB Source Section Mapping

Use this mapping when the user has authorized reuse of the source content. If reuse rights cover images but not copy, keep the source text as internal evidence and use a reviewed rewrite in PIDB public-facing fields.

| Source section | PIDB field | Rule |
|---|---|---|
| `Why You'll Love It` | `description_en` | Preserve the complete section text and its meaningful headings/lists. Do not include unrelated page sections. |
| `Key Benefits` inside `Why You'll Love It` | `claims` | Store each benefit as a separate cosmetic claim. Keep compliance pending; do not turn marketing text into approved medical claims. |
| `How To Use` steps | `how_to_use_en` | Preserve the numbered steps as separate lines. |
| `How To Use` `Caution` | `warnings_en` | Store caution bullets separately from the usage steps. |
| `Ingredients` `Full Ingredients List` | `source_inci` / CSV `ingredients_inci` | Preserve the complete ingredient list as supplied. Keep the source warning that formulas can change when relevant. |
| `Ingredients` `Highlighted Ingredients` | `key_ingredients` and ProductIngredient links | Link only exact PIDB ingredient identities. A marketing label such as PDRN must be resolved to its declared INCI, for example `Sodium DNA`, before linking. |
| Source page title | `original_name`, `product_name_en` | Preserve the source title; add a neutral Chinese product name when required. |
| Source variant size | `variant_name_en`, `variant_name_zh`, `net_quantity`, `quantity_unit` | A package count such as `1pc` or `4pcs` is a count, not a weight. Do not invent grams or milliliters. |

## SKU encoding rule

Use the supplier SKU unchanged whenever the supplier provides one. When no supplier SKU is available, generate an internal PIDB SKU with:

```text
{CATEGORY}-{BRAND}-{PRODUCTNAME}-{COLOR}-{SIZE}
```

Use uppercase ASCII tokens and hyphens. For masks, `CATEGORY` is always `MASK`. Keep `PRODUCTNAME` to at most two semantic tokens, so it contains no more than one internal hyphen. Remove the brand, category word, size, color, and promotional wording from `PRODUCTNAME`. Normalize `COLOR` to one uppercase ASCII token; use `NA` when no color or shade applies.

Example:

```text
Source title: Medicube PDRN Pink Collagen Gel Mask 1pc
SKU:          MASK-MEDICUBE-PDRN-COLLAGEN-PINK-1PC
```

Normalize `1pc`, `4pcs`, `30 ml`, and `50 g` to `1PC`, `4PCS`, `30ML`, and `50G`. If the generated SKU conflicts with an existing SKU, append a numeric suffix after the size, such as `...-1PC-02`. Do not use a generated SKU as a barcode.

## Standardized taxonomy

Use the PIDB #08 taxonomy. Do not create new skin types from retailer copy. The five skin types are `normal`, `dry`, `oily`, `combination`, and `sensitive`. The standard concerns are:

```text
hydration
dryness
redness
sensitivity
acne_prone
oil_control
dark_spots
dullness
uneven_skin_tone
fine_lines
wrinkles
skin_barrier
pores
```

Map source phrases conservatively and record the source phrase in the description or claim when no exact standard code exists. For example, `Dehydration` may be reviewed as `hydration` or `dryness`, while `Loss of firmness` and `Uneven texture` must not silently become new taxonomy codes.

## Newline normalization

After decoding HTML and JSON, normalize field text as follows:

1. Convert the two-character sequence backslash + `n` (`\\n`) to a real newline.
2. Convert the two-character sequence backtick + `n` (`` `n ``) to a real newline. This can appear when PowerShell-generated payloads are escaped incorrectly.
3. Preserve paragraph/list boundaries; do not replace real newlines with visible escape text.
4. Read the saved record back and assert that no literal `\\n` or `` `n `` remains in either language or usage/warning field.

Do not use a blind global replacement that changes legitimate backslashes in URLs, chemical names, or source data. Apply it only to the text fields being normalized.

## Known PIDB implementation details

- CSV validation currently requires `product_code`, `brand_name`, `original_language`, `original_name`, `product_name_en`, `product_name_zh`, `product_type`, `sku`, `country_of_origin`, and `net_quantity`.
- CSV validation rejects duplicate product codes and duplicate SKUs within one file.
- CSV confirmation writes `ingredients_inci` to Product `source_inci`, but image URLs need the product image API.
- Product images are URL records; the current API does not upload binary image files itself.
- Keep product lifecycle and compliance state separate: `imported` is not the same as approved for Shopify publication.
