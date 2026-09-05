# 07 — PIDB Data Dictionary & CSV → PIDB → Shopify Mapping
## 数据字典与 CSV → PIDB → Shopify 映射规格 V1.0

**项目：** Canada Beauty Product Information Database  
**系统简称：** PIDB  
**版本：** V1.0  
**数据库：** PostgreSQL  
**Commerce：** Shopify  
**数据输入：** Supplier CSV / 1688 CSV / Excel  
**主要前台语言：** English / Chinese  
**原始产品语言：** Korean / Japanese / Chinese / English / French / Other

---

# 1. 文档目的

本文件定义三个系统之间的数据关系：

```text
Supplier / 1688 CSV
        ↓
      PIDB
        ↓
 Shopify Product
        ↓
Consumer Website
```

核心原则：

> **CSV 是数据交换格式，PIDB 是 Product Knowledge Master，Shopify 是 Commerce Master。**

---

# 2. 三层数据架构

## Layer 1 — Source Data

供应商原始数据：

```text
Supplier CSV
1688 CSV
Manufacturer Excel
Product Catalog
Product Images
Original Product Information
```

原则：

> 原始数据尽可能保留，不直接覆盖。

---

## Layer 2 — PIDB

PIDB 是标准化后的产品知识数据库。

负责：

```text
Product
Brand
Product Type
Skin Type
Skin Concern
Ingredients
Claims
Description
Usage
Warnings
Images
Canada Compliance
QR
```

---

## Layer 3 — Shopify

Shopify 负责：

```text
Product
Variant
Price
Inventory
Cart
Checkout
Payment
Order
Customer
Shipping
Discount
```

---

# 3. 数据流

标准数据流：

```text
                    ┌──────────────────┐
                    │ Supplier / 1688  │
                    │ CSV / Excel      │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ CSV Import       │
                    └────────┬─────────┘
                             │
                       Validation
                             │
                       Normalization
                             │
                             ▼
                    ┌──────────────────┐
                    │ PIDB             │
                    │                  │
                    │ Master Product   │
                    │ Knowledge        │
                    └────────┬─────────┘
                             │
                      Review / Approve
                             │
                             ▼
                    ┌──────────────────┐
                    │ Shopify Sync     │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Shopify          │
                    │ Commerce         │
                    └──────────────────┘
```

---

# 4. Identifier Strategy

系统中必须区分：

```text
Product ID
Product Code
SKU
Barcode
Shopify Product ID
Shopify Variant ID
Shopify Handle
QR Short Code
```

不能混用。

---

## 4.1 Product ID

PIDB 内部永久 ID：

```text
UUID
```

例如：

```text
550e8400-e29b-41d4-a716-446655440000
```

用途：

```text
Primary Key
Foreign Key
API
Integration
```

---

## 4.2 Product Code

业务产品编号：

```text
KR-SERUM-001
```

用于：

```text
CSV
运营
搜索
数据导入
人工管理
```

建议：

```text
UNIQUE
```

---

## 4.3 SKU

真正可销售库存单位：

```text
COSRX-SNAIL96-100ML
```

一个 Product 可以有一个或多个 SKU。

---

## 4.4 Barcode

例如：

```text
8801234567890
```

如果供应商提供稳定条码：

> 保留供应商条码，不要随意修改。

---

## 4.5 Shopify Product ID

由 Shopify 创建。

例如：

```text
gid://shopify/Product/123456789
```

PIDB 只保存 Mapping。

---

## 4.6 Shopify Handle

例如：

```text
cosrx-advanced-snail-96-mucin-power-essence
```

Handle 可以变化。

因此：

> Handle 不能作为产品永久身份。

---

## 4.7 QR Short Code

例如：

```text
A8K29
```

对应：

```text
https://yourdomain.ca/p/A8K29
```

---

# 5. CSV → PIDB 总 Mapping

| CSV Field | PIDB Table | PIDB Field | Required |
|---|---|---|---:|
| product_code | products | product_code | Yes |
| brand_name | brands | name_en / source name | Yes |
| original_language | products | original_language | Yes |
| original_name | products | original_name | Yes |
| product_name_en | products | product_name_en | Yes |
| product_name_zh | products | product_name_zh | Yes |
| product_type | product_types | product_type_id | Yes |
| country_of_origin | products | country_of_origin | Yes |
| net_quantity | product_skus | net_quantity | Yes |
| quantity_unit | product_skus | quantity_unit | Yes |
| barcode | product_skus | barcode | No |
| sku | product_skus | sku | Yes |
| skin_types | product_skin_types | skin_type_id | No |
| skin_concerns | product_concerns | concern_id | No |
| key_ingredients | product_ingredients | is_key_ingredient | No |
| ingredients_inci | products | source/raw INCI | Yes |
| description_en | products | description_en | Yes |
| description_zh | products | description_zh | Yes |
| how_to_use_en | products | how_to_use_en | Yes |
| how_to_use_zh | products | how_to_use_zh | Yes |
| warnings_en | products | warnings_en | No |
| warnings_zh | products | warnings_zh | No |

---

# 6. CSV Standard Format

推荐最终 CSV Header：

```text
product_code,
brand_name,
sku,
barcode,
original_language,
original_name,
product_name_en,
product_name_zh,
product_type,
country_of_origin,
net_quantity,
quantity_unit,
skin_types,
skin_concerns,
key_ingredients,
ingredients_inci,
description_en,
description_zh,
how_to_use_en,
how_to_use_zh,
warnings_en,
warnings_zh
```

---

# 7. Multi-value Fields

CSV 中涉及多选的数据统一使用：

```text
|
```

而不是：

```text
,
```

例如：

```text
skin_types
Dry|Sensitive|Combination
```

---

## 7.1 Skin Types

CSV：

```text
Dry|Sensitive
```

PIDB：

```text
product
   │
   ├── Dry
   └── Sensitive
```

数据库：

```text
product_skin_types
```

---

# 8. Skin Concern Mapping

CSV：

```text
Hydration|Skin Barrier|Dryness
```

PIDB：

```text
product_concerns
```

对应：

```text
Hydration
Skin Barrier
Dryness
```

---

# 9. Ingredient Mapping

CSV：

```text
key_ingredients
Snail Secretion Filtrate|Niacinamide|Glycerin
```

PIDB：

```text
ingredients
```

然后：

```text
product_ingredients
```

建立关系。

---

# 10. INCI Mapping

CSV：

```text
ingredients_inci
Water, Glycerin, Snail Secretion Filtrate, Niacinamide...
```

必须保留完整原始字符串。

PIDB：

```text
products.ingredients_inci
```

或者建议进一步增加：

```text
products.ingredients_inci_raw
```

这样可以明确区分：

```text
Original INCI
Structured Ingredients
```

---

# 11. Ingredient Order

如果原始 INCI 为：

```text
Water,
Glycerin,
Snail Secretion Filtrate,
Niacinamide
```

结构化后：

| Ingredient | Order |
|---|---:|
| Water | 1 |
| Glycerin | 2 |
| Snail Secretion Filtrate | 3 |
| Niacinamide | 4 |

保存：

```text
ingredient_order
```

这样以后可以生成：

```text
Full Ingredients
Key Ingredients
Ingredient Search
```

---

# 12. Brand Mapping

CSV：

```text
brand_name
COSRX
```

PIDB：

```text
brands
```

如果已经存在：

```text
COSRX
```

则直接关联。

不存在：

```text
Create Brand
```

禁止创建：

```text
COSRX
Cosrx
COSRX Korea
COSRX Official
```

多个重复品牌。

---

# 13. Product Type Mapping

CSV：

```text
product_type
serum
```

标准化为：

```text
Serum
```

PIDB：

```text
product_types.id
```

Product：

```text
product_type_id
```

---

# 14. Product Type Alias

为了兼容供应商数据，建议增加 Alias 机制。

例如供应商：

```text
Facial Serum
Face Serum
Serum
Ampoule Serum
Facial Ampoule
```

都可以映射：

```text
Serum
```

因此可以增加：

```text
product_type_aliases
```

例如：

| Alias | Standard Type |
|---|---|
| Facial Serum | Serum |
| Face Serum | Serum |
| Ampoule Serum | Serum |

这对于处理大量供应商 CSV 非常重要。

---

# 15. Language Mapping

CSV：

```text
original_language
Korean
```

标准化：

```text
ko
```

Mapping：

| Input | Code |
|---|---|
| Korean | ko |
| 한국어 | ko |
| Korean Language | ko |
| Japanese | ja |
| 日本語 | ja |
| Chinese | zh |
| English | en |
| French | fr |

数据库最终只保存标准 Code。

---

# 16. Country Mapping

同理：

| Input | ISO Code |
|---|---|
| Korea | KR |
| South Korea | KR |
| Republic of Korea | KR |
| Japan | JP |
| China | CN |
| Canada | CA |

数据库：

```text
country_of_origin CHAR(2)
```

---

# 17. Product Name Mapping

CSV：

```text
original_name
```

进入：

```text
products.original_name
```

英文：

```text
product_name_en
```

中文：

```text
product_name_zh
```

原则：

```text
Original → 永久保留
EN → 标准化内容
ZH → 标准化内容
```

---

# 18. Description Mapping

CSV：

```text
description_en
description_zh
```

PIDB：

```text
products.description_en
products.description_zh
```

以后可以继续增加：

```text
description_ko
description_ja
```

但 V1.0 不需要。

---

# 19. Shopify Product Mapping

PIDB Product：

```text
product_id
product_code
product_name_en
product_name_zh
description_en
description_zh
```

Shopify：

```text
Product
Title
Description
Handle
Images
Variants
Metafields
```

---

# 20. Shopify Title

Shopify 主 Product Title 建议使用：

```text
English Product Name
```

例如：

```text
COSRX Advanced Snail 96 Mucin Power Essence
```

不要写成：

```text
COSRX Advanced Snail 96 Mucin Power Essence
COSRX 高级蜗牛96黏液精华
```

中英文通过 Shopify localization 处理。

---

# 21. Shopify Description

主 Description：

```text
English
```

中文通过：

```text
Shopify Translation / Localization
```

实现。

PIDB 保留：

```text
description_en
description_zh
```

---

# 22. Shopify Metafield Mapping

推荐：

| PIDB | Shopify Namespace | Key |
|---|---|---|
| product_code | custom | product_code |
| product_type | custom | product_type |
| skin_types | custom | skin_types |
| skin_concerns | custom | skin_concerns |
| key_ingredients | custom | key_ingredients |
| ingredients_inci | custom | ingredients_inci |
| how_to_use_en | custom | how_to_use_en |
| how_to_use_zh | custom | how_to_use_zh |
| warnings_en | custom | warnings_en |
| warnings_zh | custom | warnings_zh |
| country_of_origin | custom | country_of_origin |
| pidb_product_id | custom | pidb_product_id |
| qr_short_code | custom | qr_short_code |

---

# 23. Shopify Product Type

建议 Shopify Product Type 直接使用标准化 PIDB Product Type。

例如：

```text
Serum
```

不要让 Shopify 自己产生：

```text
Facial Serum
Face Serum
Serum
Beauty Serum
```

否则两个系统会逐渐产生数据漂移。

---

# 24. Shopify Tags

V1.0 可以使用 Shopify Tags 辅助搜索和运营。

例如：

```text
skin-dry
skin-sensitive
concern-hydration
concern-barrier
type-serum
brand-cosrx
```

但是：

> Tags 不是 PIDB Master Data。

PIDB 才是标准来源。

---

# 25. Skin Type → Shopify

PIDB：

```text
Dry
Sensitive
Combination
```

Shopify：

```text
custom.skin_types
```

同时可以生成 Tags：

```text
skin-dry
skin-sensitive
skin-combination
```

这样可以支持：

```text
Collection
Filter
Search
Quiz
```

---

# 26. Skin Concern → Shopify

PIDB：

```text
Hydration
Skin Barrier
Dryness
```

Shopify：

```text
custom.skin_concerns
```

Tags：

```text
concern-hydration
concern-skin-barrier
concern-dryness
```

---

# 27. Ingredient → Shopify

PIDB：

```text
Niacinamide
Snail Secretion Filtrate
Glycerin
```

Shopify：

```text
custom.key_ingredients
```

V1.0 不建议把所有 Ingredient 都生成 Shopify Product Tag。

原因：

> Ingredient 数量会非常大，Tag 会变得难以管理。

---

# 28. SKU Mapping

PIDB：

```text
product_skus.sku
```

Shopify：

```text
Variant SKU
```

因此：

```text
PIDB SKU
     ↓
Shopify Variant SKU
```

必须保持一致。

---

# 29. Barcode Mapping

PIDB：

```text
product_skus.barcode
```

Shopify：

```text
Variant Barcode
```

直接映射。

---

# 30. Quantity Mapping

PIDB：

```text
net_quantity = 100
quantity_unit = ml
```

Shopify 可以显示：

```text
100 ml
```

如果 Shopify 没有合适原生字段：

```text
custom.net_quantity
custom.quantity_unit
```

---

# 31. Price Mapping

这是一个非常重要的边界。

PIDB：

```text
NO PRICE MASTER
```

Shopify：

```text
Price Master
```

因此：

```text
Supplier Cost
Retail Price
Sale Price
Compare-at Price
```

不要从 PIDB 自动覆盖 Shopify。

---

# 32. Inventory Mapping

同理：

```text
PIDB
    ✗ Inventory

Shopify
    ✓ Inventory
```

库存只由 Shopify 或未来 WMS 管理。

---

# 33. Order Mapping

PIDB：

```text
✗ Orders
```

Shopify：

```text
✓ Orders
```

---

# 34. Customer Mapping

PIDB：

```text
✗ Customer
```

Shopify：

```text
✓ Customer
```

---

# 35. QR Mapping

PIDB：

```text
product_qr.short_code
```

例如：

```text
A8K29
```

Public URL：

```text
https://yourdomain.ca/p/A8K29
```

Shopify：

```text
custom.qr_short_code = A8K29
```

但二维码本身：

> 不依赖 Shopify URL。

---

# 36. QR → Product

关系：

```text
QR Short Code
      ↓
PIDB Product
      ↓
Current Product Data
      ↓
Shopify Buy Link
```

如果产品 URL 从：

```text
/products/snail-essence
```

变成：

```text
/products/cosrx-snail-96
```

QR 不需要变化。

---

# 37. Image Mapping

PIDB：

```text
product_images
```

保存：

```text
image_url
image_type
sort_order
alt_text_en
alt_text_zh
```

Shopify：

```text
Product Media
```

同步：

```text
Primary
Gallery
Packaging
Ingredients
Usage
Lifestyle
```

---

# 38. Image Ownership

V1.0：

```text
PIDB
    ↓
Image Metadata / Source URL

Shopify
    ↓
Commerce Image Storage / CDN
```

不要在 PostgreSQL 中保存图片二进制。

数据库只保存：

```text
URL
Metadata
Relationship
```

---

# 39. Canada Compliance Mapping

PIDB：

```text
product_canada
```

字段：

```text
importer_name
distributor_name
canadian_label_status
cosmetic_notification_status
compliance_status
notes
reviewed_at
```

Shopify：

通常不需要全部展示。

内部合规数据：

> 留在 PIDB。

---

# 40. Compliance Gate

Shopify Sync 前：

```text
IF compliance_status != approved
THEN
    BLOCK SYNC
```

也就是说：

```text
PIDB
  ↓
Validation
  ↓
Compliance Approved?
  │
  ├── NO → STOP
  │
  └── YES
        ↓
      Shopify
```

---

# 41. Product Lifecycle Mapping

PIDB：

```text
draft
imported
processing
review
ready
published
active
inactive
discontinued
```

Shopify：

```text
DRAFT
ACTIVE
ARCHIVED
```

不要强制一一对应。

PIDB 内部状态更详细。

---

# 42. 推荐映射

| PIDB Status | Shopify |
|---|---|
| Draft | DRAFT |
| Imported | DRAFT |
| Processing | DRAFT |
| Review | DRAFT |
| Ready | DRAFT |
| Published | ACTIVE |
| Active | ACTIVE |
| Inactive | DRAFT |
| Discontinued | ARCHIVED / DRAFT |

---

# 43. Data Ownership Matrix

这是整个系统最重要的表之一。

| Data | PIDB | Shopify |
|---|---:|---:|
| Product Identity | Master | Reference |
| Product Name EN | Master | Copy |
| Product Name ZH | Master | Translation |
| Description EN | Master | Copy |
| Description ZH | Master | Translation |
| Product Type | Master | Copy |
| Skin Type | Master | Copy |
| Skin Concern | Master | Copy |
| Ingredient | Master | Copy |
| INCI | Master | Copy |
| Claims | Master | Copy |
| Usage | Master | Copy |
| Warnings | Master | Copy |
| Canada Compliance | Master | — |
| QR | Master | Reference |
| Image Metadata | Master | Copy |
| SKU | Master | Commerce Copy |
| Barcode | Master | Commerce Copy |
| Price | — | Master |
| Inventory | — | Master |
| Cart | — | Master |
| Checkout | — | Master |
| Order | — | Master |
| Customer | — | Master |
| Discount | — | Master |
| Shipping | — | Master |

---

# 44. Source of Truth

最终定义：

```text
PIDB
├── Product Knowledge
├── Product Classification
├── Ingredient Knowledge
├── Skin Knowledge
├── Claims
├── Compliance
└── QR

Shopify
├── Price
├── Inventory
├── Checkout
├── Order
├── Customer
├── Discount
└── Fulfillment
```

---

# 45. CSV Data Transformation

实际导入：

```text
Raw CSV
   ↓
Trim
   ↓
Unicode Normalize
   ↓
Language Normalize
   ↓
Country Normalize
   ↓
Brand Normalize
   ↓
Product Type Mapping
   ↓
Skin Type Mapping
   ↓
Concern Mapping
   ↓
Ingredient Matching
   ↓
Validation
   ↓
PIDB
```

---

# 46. Example

原始 CSV：

```text
product_code:
KR001

brand_name:
COSRX

original_language:
Korean

original_name:
어드밴스드 스네일 96

product_type:
Facial Serum

skin_types:
Dry|Sensitive

skin_concerns:
Hydration|Skin Barrier

key_ingredients:
Snail Secretion Filtrate|Niacinamide

country_of_origin:
Korea
```

---

# 47. Transformation Result

PIDB：

```text
product_code:
KR001

original_language:
ko

country_of_origin:
KR

product_type:
Serum

skin_types:
Dry
Sensitive

skin_concerns:
Hydration
Skin Barrier

key_ingredients:
Snail Secretion Filtrate
Niacinamide
```

---

# 48. Shopify Result

Shopify：

```text
Product Type:
Serum

Metafields:

custom.product_code
KR001

custom.skin_types
Dry, Sensitive

custom.skin_concerns
Hydration, Skin Barrier

custom.key_ingredients
Snail Secretion Filtrate, Niacinamide

custom.country_of_origin
KR
```

---

# 49. CSV Update Example

第一次：

```text
KR001
```

第二次供应商 CSV：

```text
KR001
```

系统发现：

```text
product_code = existing
```

执行：

```text
UPSERT
```

更新：

```text
description
ingredients
images
```

但不修改：

```text
Shopify Price
Shopify Inventory
Orders
```

---

# 50. Data Conflict Rule

如果 CSV 中出现：

```text
price = $19.99
```

PIDB：

> 忽略。

Shopify：

> 不修改。

因为价格属于 Commerce。

---

# 51. Data Conflict Example

供应商 CSV：

```text
stock = 100
```

PIDB：

> 不保存为库存 Master。

Shopify：

> 不自动覆盖。

库存以后可以由：

```text
Shopify
```

或者未来：

```text
WMS
```

管理。

---

# 52. Recommended Additional Tables

根据实际开发，建议在现有 Schema 基础上增加：

```text
product_type_aliases
ingredient_aliases
data_sources
product_source_records
audit_logs
```

---

# 53. product_type_aliases

字段：

```text
id
product_type_id
alias
language
source
status
created_at
updated_at
```

例如：

```text
Facial Serum → Serum
Face Serum → Serum
Ampoule → Ampoule
```

---

# 54. ingredient_aliases

解决：

```text
Niacinamide
Nicotinamide
Niacinamide (Vitamin B3)
```

等供应商不同写法。

但必须注意：

> Alias 只能用于数据匹配，不能擅自改变官方 INCI。

---

# 55. data_sources

记录：

```text
Supplier
1688
Manufacturer
Manual
Imported CSV
```

字段：

```text
id
name
source_type
description
status
```

---

# 56. product_source_records

建议保留原始来源。

字段：

```text
id
product_id
source_id
source_product_code
source_url
raw_data
imported_at
```

如果允许：

```text
raw_data JSONB
```

可以保存供应商原始数据。

这样以后发生：

```text
“这个英文名称是从哪里来的？”
```

可以追溯。

---

# 57. Audit Logs

所有关键数据变化记录：

```text
user
action
table
record_id
field
old_value
new_value
timestamp
```

重点记录：

```text
Product
Ingredient
Claim
Compliance
Shopify Sync
```

---

# 58. SEO Mapping

PIDB：

```text
product_name_en
description_en
skin_types
skin_concerns
key_ingredients
```

可以用于 Shopify SEO 内容。

例如搜索：

```text
Sensitive Skin Serum
Hydrating Serum
Niacinamide Serum
Korean Serum
```

PIDB 的结构化数据可以帮助生成 Shopify：

```text
Collection
Product Description
Meta Description
Filters
Internal Search
```

---

# 59. Beauty Quiz Mapping

Quiz 不直接查询 Shopify。

查询：

```text
PIDB
```

例如：

```text
User:

Skin Type:
Sensitive

Concern:
Redness

Need:
Hydration
```

PIDB：

```text
Product
JOIN ProductSkinType
JOIN ProductConcern
```

获得：

```text
Product A
Product B
Product C
```

再通过：

```text
shopify_mapping
```

获得 Shopify Product。

---

# 60. B2B Mapping

未来 B2B：

```text
B2B Customer
      ↓
Product Search
      ↓
PIDB
      ↓
Product Knowledge
      ↓
Shopify / B2B Commerce
```

B2B 可以查询：

```text
Brand
Product Type
Skin Type
Concern
Ingredient
Country
```

因此现在的数据结构不能只保存：

```text
Product Name
Price
Image
```

而必须保留完整 Product Knowledge。

---

# 61. CSV Versioning

建议 CSV 格式增加版本号。

例如：

```text
PIDB-CSV-V1
```

文件第一行可以：

```text
# PIDB-CSV-V1
```

或者通过 Import UI 指定：

```text
Schema Version:
V1.0
```

这样以后 CSV 增加字段时：

```text
V1.0
V1.1
V2.0
```

不会破坏旧数据。

---

# 62. CSV Template

系统后台提供：

```text
[Download CSV Template]
```

模板：

```text
product_code,
brand_name,
sku,
barcode,
original_language,
original_name,
product_name_en,
product_name_zh,
product_type,
country_of_origin,
net_quantity,
quantity_unit,
skin_types,
skin_concerns,
key_ingredients,
ingredients_inci,
description_en,
description_zh,
how_to_use_en,
how_to_use_zh,
warnings_en,
warnings_zh
```

---

# 63. Data Quality Dashboard

未来 Dashboard 可以显示：

```text
Data Quality

Products: 1,248

Complete:
1,120

Missing EN:
31

Missing ZH:
42

Missing Images:
18

Unmatched Ingredients:
27

Compliance Pending:
10

Shopify Errors:
6
```

这样运营人员知道：

> 下一步应该处理什么。

---

# 64. 最终 Data Architecture

```text
                  SOURCE
                    │
        ┌───────────┴───────────┐
        │                       │
    Supplier CSV             1688 CSV
        │                       │
        └───────────┬───────────┘
                    ▼
              CSV Import
                    │
                    ▼
              Normalization
                    │
                    ▼
              Validation
                    │
                    ▼
        ┌─────────────────────┐
        │        PIDB         │
        │                     │
        │ Product             │
        │ Brand               │
        │ Product Type        │
        │ SKU                 │
        │ Ingredients         │
        │ Skin Type           │
        │ Skin Concern        │
        │ Claims              │
        │ Images              │
        │ Compliance          │
        │ QR                  │
        └──────────┬──────────┘
                   │
             Review / Approve
                   │
                   ▼
             Shopify Sync
                   │
                   ▼
        ┌─────────────────────┐
        │      Shopify        │
        │                     │
        │ Product             │
        │ Variant             │
        │ Price               │
        │ Inventory           │
        │ Cart                │
        │ Checkout            │
        │ Order               │
        │ Customer            │
        └──────────┬──────────┘
                   │
          ┌────────┼─────────┐
          ▼        ▼         ▼
       Website     QR       Quiz
```

---

# 65. 最终核心原则

整个项目必须遵守：

```text
Source Data
    ↓
PIDB Standardization
    ↓
Human Review
    ↓
Shopify Publishing
```

而不是：

```text
Supplier CSV
    ↓
Shopify
```

也不是：

```text
Shopify
    ↓
再反向建立数据库
```

PIDB 必须先建立。

---

# 66. 最终数据主权

最终定义如下：

```text
                    MASTER
                      │
          ┌───────────┴───────────┐
          │                       │
        PIDB                   Shopify
          │                       │
 Product Knowledge          Commerce Data
          │                       │
          │                  Price / Stock
          │                  Cart / Order
          │                  Customer
          │                  Checkout
          │
 Product Identity
 Product Content
 Ingredients
 Skin Profile
 Claims
 Compliance
 QR
```

一句话：

> **PIDB 管“这个产品是什么、适合谁、里面有什么、怎么使用”；Shopify 管“卖多少钱、有没有货、谁买了、怎么付款”。**

---

# 67. V1.0 开发结论

到这里，PIDB 已经具备完整的数据层定义：

```text
01 Product Information Database
02 System Architecture
03 Product Taxonomy
04 Shopify Integration
05 Database Schema & CSV Import
06 Admin UI
07 Data Dictionary & Mapping
```

实际开发时，可以直接按照：

```text
07 Data Dictionary
        ↓
05 Database Schema
        ↓
06 Admin UI
        ↓
04 Shopify Integration
```

的顺序实施。

**不建议继续扩大技术栈。**

V1.0：

```text
Laravel
+
PostgreSQL
+
Shopify
+
Shopify Admin API
+
Laravel Queue
```

已经足够支撑第一阶段商业运营。