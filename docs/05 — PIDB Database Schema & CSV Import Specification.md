05 我们就不再停留在“系统应该有什么”的层面，而会开始定义具体数据库表、字段、类型、Primary Key、Foreign Key、Unique Index、CSV 格式以及导入规则。这一步完成后，基本就可以进入实际编码阶段。
05 — PIDB Database Schema & CSV Import Specification。这一份是前面架构真正落地的基础，我会把数据库设计控制在 “足够标准化，但不复杂” 的范围内，避免再次走向 Bagisto 那种过度复杂的方向。

# 05 — PIDB Database Schema & CSV Import Specification
## K-Beauty Canada 电商平台 V1.0

**系统名称：** Product Information Database（PIDB）  
**版本：** V1.0  
**数据库建议：** PostgreSQL  
**Backend 建议：** Laravel  
**Commerce：** Shopify  
**消费者语言：** English + 中文  
**原始产品语言：** Korean / Japanese / Other

---

# 1. 数据库设计目标

PIDB V1.0 只解决三个问题：

### ① 保存产品主数据

```text
Product Master Data
```

### ② 标准化产品属性

```text
Brand
Product Type
Skin Type
Skin Concern
Ingredient
Claims
```

### ③ 为 Shopify / QR / Beauty Quiz 提供统一数据源

```text
                 PIDB
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
    Shopify       QR        Quiz
```

---

# 2. 数据库设计原则

## 原则 1：Product 是核心实体

所有产品相关数据最终围绕：

```text
products.id
```

关联。

---

## 原则 2：不要重复存储

例如：

```text
Dry Skin
```

不要在每个产品表里保存一套完整的 Skin Type 定义。

而是：

```text
skin_types
```

统一维护。

---

## 原则 3：多选属性使用关联表

例如一个产品：

```text
Dry
Combination
Sensitive
```

使用：

```text
product_skin_types
```

而不是：

```text
products.skin_types = "dry,combination,sensitive"
```

---

# 3. Database ER Diagram

```text
brands
   │
   │ 1:N
   ▼
products
   │
   ├──────────────┬───────────────┬───────────────┐
   │              │               │               │
   ▼              ▼               ▼               ▼
product_skus  product_images  product_claims  product_canada
   │
   │
   ├───────────────┐
   │               │
   ▼               ▼
Shopify        Inventory*
Mapping

products
   │
   ├──── product_skin_types ──── skin_types
   │
   ├──── product_concerns ───── skin_concerns
   │
   └──── product_ingredients ── ingredients
```

`Inventory*` 不属于 PIDB V1.0 Master Data，库存由 Shopify 管理。

---

# 4. Tables 总览

V1.0：

```text
01 brands
02 products
03 product_skus
04 product_images
05 ingredients
06 product_ingredients
07 skin_types
08 product_skin_types
09 skin_concerns
10 product_concerns
11 product_claims
12 product_canada
13 product_qr
14 shopify_mapping
15 sync_logs
16 import_batches
17 import_errors
```

---

# 5. brands

品牌表。

```text
brands
```

| Field | Type | Required | Description |
|---|---|---:|---|
| id | BIGINT / UUID | ✓ | Primary Key |
| name | VARCHAR(150) | ✓ | Brand Name |
| slug | VARCHAR(180) | ✓ | URL Slug |
| country_code | CHAR(2) | | Country |
| website_url | VARCHAR(500) | | Official Website |
| description_en | TEXT | | English |
| description_zh | TEXT | | Chinese |
| logo_url | VARCHAR(500) | | Logo |
| status | VARCHAR(20) | ✓ | active/inactive |
| created_at | TIMESTAMP | ✓ | |
| updated_at | TIMESTAMP | ✓ | |

Unique：

```text
slug
```

---

# 6. products

这是整个 PIDB 的核心表。

```text
products
```

| Field | Type | Required | Description |
|---|---|---:|---|
| id | UUID | ✓ | Internal Product ID |
| product_code | VARCHAR(50) | ✓ | Internal Code |
| brand_id | UUID | ✓ | FK brands |
| product_type_id | UUID | ✓ | Product Type |
| original_language | VARCHAR(10) | ✓ | ko/ja/other |
| original_name | VARCHAR(500) | ✓ | Original Name |
| product_name_en | VARCHAR(500) | ✓ | English |
| product_name_zh | VARCHAR(500) | ✓ | Chinese |
| description_en | TEXT | | English |
| description_zh | TEXT | | Chinese |
| how_to_use_en | TEXT | | English |
| how_to_use_zh | TEXT | | Chinese |
| warnings_en | TEXT | | English |
| warnings_zh | TEXT | | Chinese |
| country_of_origin | CHAR(2) | | Country |
| status | VARCHAR(30) | ✓ | Lifecycle |
| created_at | TIMESTAMP | ✓ | |
| updated_at | TIMESTAMP | ✓ | |

---

# 7. Product ID

建议：

```text
id = UUID
```

例如：

```text
550e8400-e29b-41d4-a716-446655440000
```

但给管理员看的：

```text
product_code
```

例如：

```text
KRMASK000123
```

因此：

```text
Database Identity
        ↓
UUID

Business Identity
        ↓
product_code
```

---

# 8. 为什么 Product ID 使用 UUID

原因：

1. 不暴露产品数量
2. 不容易产生 ID 冲突
3. 未来系统拆分方便
4. Import / API 更安全
5. 不依赖数据库自增 ID

但是：

> **不要让运营人员直接使用 UUID 管理产品。**

运营人员使用：

```text
product_code
SKU
Barcode
```

---

# 9. Product Status

建议：

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

含义：

| Status | 含义 |
|---|---|
| draft | 手工创建 |
| imported | CSV 已导入 |
| processing | 数据处理中 |
| review | 等待审核 |
| ready | 可以发布 |
| published | 已发布 |
| active | 正常销售 |
| inactive | 暂停销售 |
| discontinued | 停产 |

---

# 10. Product Type

建议建立：

```text
product_types
```

虽然上一版核心表列表没有单独列出它，但实际开发必须增加。

字段：

| Field | Type |
|---|---|
| id | UUID |
| parent_id | UUID nullable |
| name_en | VARCHAR |
| name_zh | VARCHAR |
| slug | VARCHAR |
| status | VARCHAR |

结构：

```text
Skincare
│
├── Cleanser
├── Toner
├── Essence
├── Serum
├── Ampoule
├── Moisturizer
├── Cream
├── Eye Cream
├── Sunscreen
├── Sheet Mask
├── Wash-off Mask
└── Sleeping Mask
```

---

# 11. product_skus

一个 Product 可以有一个或多个 SKU。

```text
product_skus
```

| Field | Type | Required |
|---|---|---:|
| id | UUID | ✓ |
| product_id | UUID | ✓ |
| sku | VARCHAR(100) | ✓ |
| barcode | VARCHAR(50) | |
| variant_name_en | VARCHAR(200) | |
| variant_name_zh | VARCHAR(200) | |
| net_quantity | DECIMAL(10,2) | |
| quantity_unit | VARCHAR(20) | |
| status | VARCHAR(20) | ✓ |
| created_at | TIMESTAMP | ✓ |
| updated_at | TIMESTAMP | ✓ |

Unique：

```text
sku
```

如果 Barcode 存在：

```text
UNIQUE(barcode)
```

---

# 12. 一个产品一个 SKU

最常见：

```text
Product
└── SKU
```

例如：

```text
Product:
ABC Hydrating Sheet Mask

SKU:
ABC-MASK-001
```

---

# 13. 多 Variant 产品

例如：

```text
Product:
ABC Sheet Mask

SKU 1:
ABC-MASK-001
10 pcs

SKU 2:
ABC-MASK-002
20 pcs
```

Shopify：

```text
Product
├── Variant 10 pcs
└── Variant 20 pcs
```

PIDB 与 Shopify 对应：

```text
product_skus
       ↓
Shopify Variants
```

---

# 14. product_images

```text
product_images
```

| Field | Type |
|---|---|
| id | UUID |
| product_id | UUID |
| image_url | VARCHAR(1000) |
| image_type | VARCHAR(30) |
| alt_text_en | VARCHAR(500) |
| alt_text_zh | VARCHAR(500) |
| sort_order | INT |
| status | VARCHAR(20) |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

Image Type：

```text
primary
gallery
packaging
ingredients
usage
lifestyle
qr
```

---

# 15. Images 不存数据库 Binary

不要：

```text
image_data BLOB
```

推荐：

```text
image_url
```

实际图片存储：

```text
Shopify CDN
Cloud Storage
Object Storage
```

PIDB 只管理 Metadata。

---

# 16. ingredients

```text
ingredients
```

| Field | Type | Description |
|---|---|---|
| id | UUID | PK |
| inci_name | VARCHAR(255) | INCI |
| common_name_en | VARCHAR(255) | English |
| common_name_zh | VARCHAR(255) | Chinese |
| common_name_ko | VARCHAR(255) | Korean |
| common_name_ja | VARCHAR(255) | Japanese |
| description_en | TEXT | Description |
| description_zh | TEXT | Description |
| cosmetic_functions | TEXT | Functions |
| search_keywords | TEXT | Search |
| status | VARCHAR(20) | Status |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

# 17. Ingredient Identity

Ingredient 最重要的 Identity：

```text
INCI Name
```

例如：

```text
Niacinamide
```

不要使用：

```text
Vitamin B3
```

作为唯一 Identity。

可以：

```text
INCI:
Niacinamide

Common Name:
Vitamin B3
烟酰胺
```

---

# 18. product_ingredients

Product ↔ Ingredient 是 Many-to-Many。

```text
product_ingredients
```

| Field | Type |
|---|---|
| product_id | UUID |
| ingredient_id | UUID |
| ingredient_order | INT |
| is_key_ingredient | BOOLEAN |
| created_at | TIMESTAMP |

Composite Unique：

```text
UNIQUE(product_id, ingredient_id)
```

---

# 19. ingredient_order

例如产品完整成分：

```text
1 Water
2 Glycerin
3 Niacinamide
4 Panthenol
5 ...
```

数据库：

```text
ingredient_order
```

保存：

```text
1
2
3
4
```

这样可以保持原始 INCI 顺序。

---

# 20. skin_types

```text
skin_types
```

V1.0：

| Code | EN | ZH |
|---|---|---|
| normal | Normal | 中性肌 |
| dry | Dry | 干性肌 |
| oily | Oily | 油性肌 |
| combination | Combination | 混合性肌 |
| sensitive | Sensitive | 敏感肌 |

---

# 21. product_skin_types

```text
product_skin_types
```

| Field | Type |
|---|---|
| product_id | UUID |
| skin_type_id | UUID |

Composite Unique：

```text
UNIQUE(product_id, skin_type_id)
```

---

# 22. skin_concerns

```text
skin_concerns
```

V1.0：

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

每个 Concern：

```text
code
name_en
name_zh
description_en
description_zh
status
```

---

# 23. product_concerns

```text
product_concerns
```

| Field | Type |
|---|---|
| product_id | UUID |
| concern_id | UUID |

Composite Unique：

```text
UNIQUE(product_id, concern_id)
```

---

# 24. product_claims

Claims 必须独立。

```text
product_claims
```

| Field | Type |
|---|---|
| id | UUID |
| product_id | UUID |
| claim_en | TEXT |
| claim_zh | TEXT |
| claim_type | VARCHAR |
| source | VARCHAR |
| approved | BOOLEAN |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

---

# 25. Claim Type

例如：

```text
hydrating
brightening_appearance
soothing
barrier_support
oil_control
appearance_of_pores
```

不要使用：

```text
disease_treatment
medical_claim
```

如果发现产品资料包含明显 Therapeutic Claim：

```text
approved = false
```

产品进入 Review。

---

# 26. product_canada

加拿大销售内部信息。

```text
product_canada
```

| Field | Type |
|---|---|
| id | UUID |
| product_id | UUID |
| importer_name | VARCHAR |
| distributor_name | VARCHAR |
| canadian_label_status | VARCHAR |
| cosmetic_notification_status | VARCHAR |
| compliance_status | VARCHAR |
| notes | TEXT |
| reviewed_at | TIMESTAMP |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

---

# 27. Compliance Status

```text
pending
reviewing
approved
blocked
```

只有：

```text
approved
```

才能进入：

```text
ready
```

---

# 28. product_qr

```text
product_qr
```

| Field | Type |
|---|---|
| id | UUID |
| product_id | UUID |
| short_code | VARCHAR(50) |
| destination_type | VARCHAR |
| status | VARCHAR |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

Unique：

```text
short_code
```

---

# 29. QR URL

例如：

```text
https://yourdomain.ca/p/A8K29
```

数据库：

```text
short_code = A8K29
```

不要保存完整 URL 作为唯一 Identity。

---

# 30. shopify_mapping

```text
shopify_mapping
```

| Field | Type |
|---|---|
| id | UUID |
| product_id | UUID |
| shopify_product_id | VARCHAR(100) |
| shopify_handle | VARCHAR(255) |
| sync_status | VARCHAR(20) |
| last_sync_at | TIMESTAMP |
| last_sync_hash | VARCHAR(128) |
| last_error | TEXT |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

Unique：

```text
product_id
```

---

# 31. sync_logs

```text
sync_logs
```

记录每一次 Shopify 同步。

| Field | Type |
|---|---|
| id | UUID |
| product_id | UUID |
| action | VARCHAR |
| status | VARCHAR |
| error_code | VARCHAR |
| error_message | TEXT |
| started_at | TIMESTAMP |
| completed_at | TIMESTAMP |

---

# 32. import_batches

CSV 每次导入形成一个 Batch。

```text
import_batches
```

| Field | Type |
|---|---|
| id | UUID |
| filename | VARCHAR |
| total_rows | INT |
| success_rows | INT |
| failed_rows | INT |
| status | VARCHAR |
| started_at | TIMESTAMP |
| completed_at | TIMESTAMP |

---

# 33. import_errors

记录 CSV 每一行错误。

```text
import_errors
```

| Field | Type |
|---|---|
| id | UUID |
| batch_id | UUID |
| row_number | INT |
| product_code | VARCHAR |
| field_name | VARCHAR |
| error_code | VARCHAR |
| error_message | TEXT |
| raw_value | TEXT |

---

# 34. CSV Import Architecture

完整流程：

```text
CSV
 │
 ▼
Upload
 │
 ▼
Parse
 │
 ▼
Validate
 │
 ├──────── Error ────────┐
 │                       ▼
 │                  import_errors
 │
 ▼
Normalize
 │
 ▼
Preview
 │
 ▼
Confirm
 │
 ▼
Import
 │
 ▼
PIDB
```

---

# 35. CSV 不直接写数据库

错误：

```text
CSV
 ↓
INSERT products
```

正确：

```text
CSV
 ↓
Parser
 ↓
Validator
 ↓
Normalizer
 ↓
Importer
 ↓
Database
```

这样可以防止脏数据进入 PIDB。

---

# 36. V1.0 CSV Template

建议第一版使用：

```text
product_code
brand_name
original_language
original_name

product_name_en
product_name_zh

product_type
country_of_origin

sku
barcode

net_quantity
quantity_unit

skin_types
skin_concerns

key_ingredients
ingredients_inci

description_en
description_zh

how_to_use_en
how_to_use_zh

warnings_en
warnings_zh
```

---

# 37. CSV Example

```text
product_code,brand_name,original_language,original_name,product_name_en,product_name_zh,product_type,country_of_origin,sku,barcode,net_quantity,quantity_unit,skin_types,skin_concerns,key_ingredients,ingredients_inci,description_en,description_zh,how_to_use_en,how_to_use_zh,warnings_en,warnings_zh
KRMASK0001,Brand A,ko,韩文原名,Hydrating Sheet Mask,补水面膜,Sheet Mask,KR,KRMASK0001,8801234567890,25,ml,dry|combination,hydration|dryness,Niacinamide|Hyaluronic Acid,"Water, Glycerin, Niacinamide,...","Hydrating sheet mask","补水面膜","Apply for 15–20 minutes.","敷 15–20 分钟。","For external use only.","仅供外用。"
```

---

# 38. Multi-value CSV Fields

不要使用：

```text
dry,combination
```

因为 CSV 本身使用 comma。

推荐：

```text
dry|combination
```

例如：

```text
skin_types:
dry|combination
```

解析为：

```text
[
  dry,
  combination
]
```

---

# 39. key_ingredients

例如：

```text
Niacinamide|Hyaluronic Acid|Ceramide
```

Importer：

```text
key_ingredients
        ↓
Split "|"
        ↓
Find Ingredient
        ↓
Create if allowed
        ↓
product_ingredients
```

---

# 40. ingredients_inci

完整 INCI：

```text
Water, Glycerin, Niacinamide, ...
```

Importer 不应该简单地：

```text
split ","
```

然后认为每个都是标准 Ingredient。

原因是实际 INCI 数据可能包含：

- Complex names
- Parentheses
- CI colourants
- Compound ingredients
- Formatting differences

因此 V1.0：

> **Full INCI 保存原始字符串。**

结构化 Ingredient Mapping 单独处理。

---

# 41. Ingredient Matching

流程：

```text
Raw INCI
   ↓
Normalize
   ↓
Find Existing Ingredient
   ↓
Matched?
 ┌─┴─┐
Yes No
 │   │
 ▼   ▼
Link  Review Queue
```

不要因为无法匹配一个 Ingredient 就直接阻止整个产品导入。

但：

```text
Compliance Review
```

可以继续要求人工确认。

---

# 42. CSV Validation

Import 前必须检查：

### Required

```text
product_code
brand_name
original_language
product_name_en
product_name_zh
product_type
sku
```

### Recommended

```text
barcode
description_en
description_zh
how_to_use_en
how_to_use_zh
warnings_en
warnings_zh
ingredients_inci
```

---

# 43. Duplicate Validation

检查：

```text
Duplicate product_code
Duplicate SKU
Duplicate Barcode
Duplicate Brand
```

例如：

```text
KRMASK0001
```

已经存在：

```text
ERROR:
PRODUCT_CODE_EXISTS
```

---

# 44. Update vs Create

CSV Import 必须支持：

```text
Create
Update
```

判断：

```text
product_code
```

如果不存在：

```text
CREATE
```

如果存在：

```text
UPDATE
```

不要用 Product Name 判断。

---

# 45. Import Mode

建议三种模式：

```text
Create Only
Update Only
Upsert
```

默认：

> **Upsert**

即：

```text
Exists → Update
Not Exists → Create
```

---

# 46. Import Preview

上传 CSV 后：

```text
Import Preview
```

显示：

```text
Total Rows: 100

New Products: 70
Updates: 25
Errors: 5
```

例如：

```text
Row 17
SKU duplicated

Row 35
Unknown product type

Row 62
Missing product name EN
```

管理员确认：

```text
[ Cancel ]
[ Import 95 Valid Rows ]
```

---

# 47. Error 不应阻止全部 Import

例如：

```text
100 rows
```

其中：

```text
95 valid
5 invalid
```

推荐：

```text
Import 95
Skip 5
```

而不是：

```text
Rollback 100
```

但对于一个 Product 内部的数据完整性：

> 必须保持 Transaction Integrity。

---

# 48. Transaction

例如 Product：

```text
products
product_skus
product_skin_types
product_concerns
product_ingredients
```

必须作为一个 Transaction。

如果：

```text
product_skus
```

失败：

整个 Product Rollback。

避免：

```text
Product created
SKU failed
Skin Type failed
```

这种半成品。

---

# 49. Import Log

每次 Import：

```text
Batch #20260901001

File:
products_20260901.csv

Rows:
500

Created:
320

Updated:
160

Failed:
20
```

管理员可以下载：

```text
Import Errors CSV
```

---

# 50. Normalization

CSV 数据进入数据库之前进行：

```text
Trim
Lowercase
Whitespace cleanup
Unicode normalization
Country code normalization
Language code normalization
Product Type mapping
Skin Type mapping
Concern mapping
```

例如：

```text
" Dry Skin "
```

转换：

```text
dry
```

---

# 51. Language Code

统一：

```text
ko = Korean
ja = Japanese
zh = Chinese
en = English
fr = French
other
```

不要出现：

```text
Korean
korean
KR
ko-KR
한국어
```

多套混用。

---

# 52. Country Code

采用 ISO 3166-1 Alpha-2：

```text
KR = South Korea
JP = Japan
CN = China
CA = Canada
```

---

# 53. Product Code 规则

建议：

```text
KR + Category + Sequence
```

例如：

```text
KR-MASK-000001
KR-SERUM-000001
KR-CREAM-000001

JP-MASK-000001
JP-SERUM-000001
```

但是：

> Product Code 不应承担过多业务逻辑。

它主要是运营人员容易识别的 Code。

---

# 54. SKU 规则

建议独立：

```text
KR-MASK-000001
```

如果有 Variant：

```text
KR-MASK-000001-10
KR-MASK-000001-20
```

不过实际项目如果供应商已经有稳定 SKU：

> **优先保留供应商 SKU，不要强行重新编码。**

可以增加：

```text
supplier_sku
```

未来再扩展。

---

# 55. Supplier 信息

V1.0 如果存在多个供应商，建议增加：

```text
suppliers
```

以及：

```text
product_suppliers
```

但如果目前产品来源非常简单：

> V1.0 可以暂时不加入。

不要为了未来可能存在的供应商，把数据库提前复杂化。

---

# 56. Database Index

核心 Index：

```text
products.product_code UNIQUE
products.brand_id
products.product_type_id
products.status

product_skus.sku UNIQUE
product_skus.barcode UNIQUE

ingredients.inci_name UNIQUE

product_skin_types.product_id
product_skin_types.skin_type_id

product_concerns.product_id
product_concerns.concern_id

product_ingredients.product_id
product_ingredients.ingredient_id

product_qr.short_code UNIQUE

shopify_mapping.product_id UNIQUE
shopify_mapping.shopify_product_id
```

---

# 57. Soft Delete

Product：

> 不建议物理 DELETE。

使用：

```text
deleted_at
```

如果采用 Laravel：

```text
SoftDeletes
```

产品历史数据保持。

尤其：

```text
Order
QR
Shopify
Analytics
```

都有可能依赖历史 Product。

---

# 58. Audit Fields

核心表建议：

```text
created_at
updated_at
deleted_at
```

以后可以增加：

```text
created_by
updated_by
```

V1.0 如果 Admin 用户数量很少，可以先不复杂化。

---

# 59. V1.0 Database Final Structure

```text
                    brands
                       │
                       ▼
                    products
                       │
        ┌──────────────┼───────────────┐
        │              │               │
        ▼              ▼               ▼
 product_skus    product_images   product_claims
        │
        │
        ▼
 Shopify Mapping

products
   │
   ├── product_skin_types ─── skin_types
   │
   ├── product_concerns ───── skin_concerns
   │
   └── product_ingredients ── ingredients

products
   │
   ├── product_canada
   └── product_qr

import_batches
      │
      └── import_errors

products
      │
      └── sync_logs
```

---

# 60. V1.0 不应该增加的表

目前不需要：

```text
orders
customers
payments
inventory
warehouses
shipments
returns
discounts
reviews
loyalty_points
coupons
chat_messages
ai_conversations
```

原因：

这些已经由 Shopify 或其他专门系统处理。

PIDB 不应该变成：

> 一个重新实现 Shopify 的 ERP。

---

# 61. 推荐技术栈

V1.0：

```text
Backend:
Laravel

Database:
PostgreSQL

Frontend:
Laravel Blade / Livewire
or
Vue

Commerce:
Shopify

API:
Shopify Admin API

Storage:
Shopify CDN / Object Storage

Authentication:
Laravel Authentication
```

---

# 62. 为什么这里选择 PostgreSQL

PIDB 的数据特点：

```text
Relational
Many-to-Many
Structured
Searchable
JSON Metadata
CSV Import
API
```

PostgreSQL 非常适合。

同时可以使用：

```text
JSONB
Full Text Search
UUID
Array / JSON
```

但：

> **不要因为 PostgreSQL 支持 JSONB，就把整个 Product 存成一个 JSON。**

核心字段仍然保持 Relational Schema。

---

# 63. JSONB 只用于扩展字段

例如：

```text
products.extra_data
```

可以保存：

```json
{
  "texture": "gel",
  "fragrance_free": true
}
```

但：

```text
product_name
brand
skin_type
ingredient
SKU
```

不能全部放 JSON。

---

# 64. V1.0 API

未来 Storefront / Shopify / Quiz 可以使用：

```text
GET /api/products
GET /api/products/{id}
GET /api/products/{id}/ingredients
GET /api/products/{id}/skin-types
GET /api/products/{id}/concerns
```

搜索：

```text
GET /api/products/search?q=hydration
```

QR：

```text
GET /p/{short_code}
```

---

# 65. Admin API

```text
POST /api/products
PUT /api/products/{id}
POST /api/products/{id}/publish
POST /api/products/{id}/sync
POST /api/import
GET /api/import/{batch_id}
GET /api/sync/errors
```

---

# 66. 从 CSV 到 Shopify 的完整链路

最终：

```text
                 Supplier
                    │
                    ▼
                 CSV File
                    │
                    ▼
              CSV Importer
                    │
                    ▼
                Validator
                    │
                    ▼
                Normalizer
                    │
                    ▼
                  PIDB
                    │
              Human Review
                    │
                    ▼
              Compliance OK
                    │
                    ▼
              Publish Product
                    │
                    ▼
             Shopify Sync
                    │
                    ▼
                 Shopify
                    │
         ┌──────────┼──────────┐
         ▼          ▼          ▼
     Storefront     QR        Quiz
         │          │          │
         └──────────┼──────────┘
                    ▼
                 Customer
```

---

# 67. V1.0 开发优先级

### P0

```text
products
product_skus
brands
product_types
skin_types
skin_concerns
ingredients
```

### P1

```text
product_images
product_ingredients
product_skin_types
product_concerns
product_canada
```

### P2

```text
product_qr
shopify_mapping
sync_logs
```

### P3

```text
import_batches
import_errors
```

虽然 P3 是优先级较低，但：

> CSV Import 本身属于 MVP 核心能力。

---

# 68. 第一版真正需要开发的 Admin 页面

```text
Dashboard
│
├── Products
│   ├── Product List
│   ├── Product Create
│   ├── Product Edit
│   └── Product Review
│
├── Brands
├── Product Types
├── Skin Types
├── Skin Concerns
├── Ingredients
│
├── CSV Import
│   ├── Upload
│   ├── Preview
│   ├── Errors
│   └── History
│
├── Shopify
│   ├── Sync Dashboard
│   └── Sync Errors
│
└── QR Codes
```

---

# 69. 产品编辑页面

建议：

```text
Product
├── Basic Information
├── Names
├── Description
├── Product Type
├── Skin Type
├── Skin Concerns
├── Ingredients
├── Claims
├── How to Use
├── Warnings
├── Images
├── Canada Compliance
├── QR
└── Shopify
```

不要做成几十个独立页面。

---

# 70. 最终数据库定位

PIDB 不是：

```text
ERP
CRM
WMS
OMS
Payment System
```

PIDB 是：

> **Beauty Product Information Management System**

核心价值：

```text
Raw Product Data
        ↓
Standardization
        ↓
Product Knowledge
        ↓
Commerce Distribution
```

---

# 71. 最终 V1.0 架构

```text
                   ┌──────────────────┐
                   │    CSV / Data    │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │   PIDB Import    │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │      PIDB        │
                   │                  │
                   │ Product          │
                   │ Brand            │
                   │ Ingredient       │
                   │ Skin Type        │
                   │ Concern          │
                   │ Claims           │
                   │ QR               │
                   └────────┬─────────┘
                            │
                    Shopify Sync
                            │
                            ▼
                   ┌──────────────────┐
                   │     Shopify      │
                   │                  │
                   │ Product         │
                   │ Variant         │
                   │ Price            │
                   │ Inventory        │
                   │ Cart            │
                   │ Checkout        │
                   │ Order            │
                   └────────┬─────────┘
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
        Storefront          QR            Quiz
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                         Consumer
```

---

# 72. 本阶段结论

到现在为止，V1.0 的核心技术底座已经形成：

```text
        CSV
         ↓
       PIDB
         ↓
 Shopify Integration
         ↓
      Shopify
         ↓
 Storefront / QR / Quiz
         ↓
     Consumer
```

其中：

**PIDB = Product Knowledge**

**Shopify = Commerce**

**Storefront = Discovery + Conversion**

**Quiz = Recommendation**

**QR = Physical Product → Digital Product Information**

这五个角色彼此分工，不重复建设。

---

# 73. 下一阶段

下一份建议进入：

# **06 — PIDB Admin UI & Product Management Specification**

这一份将把数据库变成真正可操作的后台。

重点设计：

```text
Dashboard
Product List
Product Editor
Brand Management
Ingredient Management
Skin Type Management
Skin Concern Management
CSV Import
Import Preview
Data Validation
Product Review
Compliance Review
Shopify Sync
QR Management
```

尤其是：

> **Product Editor**

我会把一个产品从“CSV 导入”到“审核完成、发布 Shopify”的整个操作界面定义出来。

同时下一步还可以把 **CSV Template → Database Field → Shopify Field** 做成一张完整的 **Data Dictionary / Mapping Matrix**，这样以后你拿给程序员就可以直接开始开发。