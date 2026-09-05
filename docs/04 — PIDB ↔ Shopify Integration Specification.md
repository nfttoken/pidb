04 — PIDB ↔ Shopify Integration Specification。这一步完成后，整个系统的技术底座基本就清晰了，随后可以进一步设计 CSV 导入模板、数据库表结构和实际开发目录结构。
这里进入真正的系统落地层：把 PIDB 和 Shopify 之间的职责、字段映射、同步方向、SKU/Variant、图片、多语言、下架和错误处理全部定义清楚。

# 04 — PIDB ↔ Shopify Integration Specification
## K-Beauty Canada 电商平台 V1.0

**技术底座：** Shopify Commerce + Product Information Database（PIDB）  
**消费者语言：** English + 中文  
**原始产品语言：** Korean / Japanese / Other  
**Commerce Engine：** Shopify  
**Product Master Data：** PIDB

---

# 1. Integration 总体架构

系统采用：

> **Single Source of Truth + One-way Product Sync**

核心数据流：

```text
1688 CSV / Supplier Data
          │
          ▼
      PIDB Import
          │
          ▼
    Data Validation
          │
          ▼
    Product Review
          │
          ▼
       PIDB
   Product Master
          │
          │ Publish / Sync
          ▼
       Shopify
          │
    ┌─────┼──────┐
    ▼     ▼      ▼
 Storefront Cart  Checkout
```

核心原则：

```text
PIDB → Product Information
Shopify → Commerce Information
```

不要形成：

```text
PIDB ↔ Shopify
```

的无限双向修改。

---

# 2. 系统职责边界

## 2.1 PIDB 负责

| 数据 | PIDB |
|---|---:|
| Product Name EN | ✅ |
| Product Name ZH | ✅ |
| Original Name | ✅ |
| Original Language | ✅ |
| Brand | ✅ |
| Product Type | ✅ |
| Skin Type | ✅ |
| Skin Concern | ✅ |
| Key Ingredients | ✅ |
| INCI | ✅ |
| Description | ✅ |
| How to Use | ✅ |
| Warnings | ✅ |
| Cosmetic Claims | ✅ |
| Country of Origin | ✅ |
| Product Images Metadata | ✅ |
| QR Code | ✅ |
| Compliance Tracking | ✅ |
| Shopify Product ID | Mapping |
| Shopify Handle | Mapping |

---

# 3. Shopify 负责

| 数据 | Shopify |
|---|---:|
| Price | ✅ |
| Compare-at Price | ✅ |
| Inventory | ✅ |
| Variant | ✅ |
| SKU | Commerce |
| Barcode | Commerce |
| Cart | ✅ |
| Checkout | ✅ |
| Payment | ✅ |
| Order | ✅ |
| Customer | ✅ |
| Discount | ✅ |
| Shipping | ✅ |
| Tax | ✅ |
| Fulfillment | ✅ |

---

# 4. 一个重要原则：SKU 的归属

前面的 PIDB 中已经定义：

> Product ID、SKU、Barcode 是不同 Identifier。

实际实施时建议：

### PIDB

保存：

```text
product_id
sku
barcode
```

### Shopify

保存：

```text
variant.sku
variant.barcode
```

因此：

```text
PIDB SKU
     ↓
Shopify Variant SKU
```

但 SKU 不允许在两个系统中产生冲突。

---

# 5. Product 与 Variant

必须明确：

```text
Product
   │
   ├── Variant 1
   ├── Variant 2
   └── Variant 3
```

例如：

```text
Product:
Brand A Sheet Mask

Variants:
10 pcs
20 pcs
30 pcs
```

但是对于大部分 Sheet Mask：

```text
Product
└── Default Variant
```

即可。

不要为了数据库理论上的完整性，强行把每个产品拆成多个 Variant。

---

# 6. PIDB Product

核心：

```text
Product
────────────
product_id
brand_id
product_type_id

original_language
original_name

product_name_en
product_name_zh

description_en
description_zh

how_to_use_en
how_to_use_zh

warnings_en
warnings_zh

country_of_origin

status
```

---

# 7. PIDB Product SKU

```text
ProductSKU
────────────
sku_id
product_id
sku
barcode

variant_name_en
variant_name_zh

weight
weight_unit

status
```

如果产品没有 Variant：

```text
variant_name = Default
```

---

# 8. Shopify Product 映射

PIDB：

```text
product_id = P000123
```

Shopify：

```text
shopify_product_id = 123456789
shopify_handle = brand-product-name
```

Mapping：

```text
ProductShopifyMapping
─────────────────────
mapping_id
product_id
shopify_product_id
shopify_handle

sync_status
last_sync_at
last_sync_hash

last_error
```

---

# 9. 为什么需要 Mapping Table

不要把 Shopify ID 直接作为 PIDB Product ID。

错误设计：

```text
product_id = Shopify Product ID
```

正确设计：

```text
PIDB:
product_id = P000123

Shopify:
product_id = 123456789
```

因为以后如果 Shopify 更换：

```text
Store
Shopify Account
Platform
```

PIDB 产品身份仍然保持不变。

---

# 10. Product Handle

Shopify Handle：

```text
brand-product-name
```

例如：

```text
some-brand-hydrating-sheet-mask
```

建议由系统自动生成。

规则：

```text
Brand
+
Product Name
```

转换：

```text
Lowercase
Remove special characters
Replace spaces with "-"
```

---

# 11. Handle 不应该作为 Product Identity

例如：

```text
/products/abc-mask
```

未来可能变成：

```text
/products/abc-hydrating-mask
```

但：

```text
product_id = P000123
```

不变。

因此：

```text
Product ID = Identity
Handle = URL
```

---

# 12. Product Lifecycle

PIDB 状态：

```text
draft
   ↓
imported
   ↓
processing
   ↓
review
   ↓
ready
   ↓
published
   ↓
active
   ↓
inactive
   ↓
discontinued
```

只有：

```text
ready
published
active
```

允许同步到 Shopify。

---

# 13. 发布条件

Product 必须通过：

```text
Required Fields Validation
```

例如：

```text
✓ Product Name EN
✓ Product Name ZH
✓ Brand
✓ Product Type
✓ SKU
✓ Product Image
✓ Description EN
✓ Description ZH
✓ How to Use
✓ Ingredients
✓ Warnings
```

如果缺少：

```text
Product Name EN
```

则：

```text
sync_status = blocked
```

不能发布。

---

# 14. Compliance Gate

由于这是加拿大销售的 Cosmetics：

PIDB 应设置：

```text
canada_compliance_status
```

例如：

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

才允许进入：

```text
published
```

当前项目中的产品已经有 English/French compliant physical labels，因此这部分主要作为**内部审核状态控制**。

---

# 15. Sync Trigger

V1.0 支持 3 种方式。

## A. Manual Publish

管理员点击：

```text
[ Publish to Shopify ]
```

最安全。

---

## B. Batch Publish

例如：

```text
Select 50 Products
        ↓
[ Publish Selected ]
```

适合一次处理一批进口产品。

---

## C. Scheduled Sync

例如：

```text
Every 30 minutes
```

自动检查：

```text
PIDB updated products
```

然后同步 Shopify。

---

# 16. V1.0 推荐同步方式

最初：

> **Manual Publish + Scheduled Update**

即：

```text
新产品
 ↓
人工 Review
 ↓
Manual Publish
 ↓
Shopify
```

产品已经发布后：

```text
PIDB 修改
 ↓
Scheduled Sync
 ↓
Shopify Update
```

这样安全性最高。

---

# 17. Product Sync

PIDB：

```text
Product P000123
```

执行：

```text
Sync Product
```

系统：

```text
1. Find Shopify Product
2. If not exists → Create
3. If exists → Update
4. Update Metafields
5. Update Images
6. Update Mapping
7. Record Sync Log
```

---

# 18. Create Product

首次同步：

```text
PIDB
   ↓
Create Shopify Product
```

主要字段：

| PIDB | Shopify |
|---|---|
| product_name_en | title |
| description_en | description |
| brand | vendor |
| product_type | product_type |
| SKU | Variant SKU |
| barcode | Variant Barcode |
| image | Product Media |

---

# 19. English + Chinese

不要把：

```text
Product Name EN
Product Name ZH
```

硬塞进 Shopify Title。

例如：

```text
Shopify Title:
Brand Hydrating Sheet Mask
```

中文通过：

```text
Shopify Translation / Localization
```

实现。

因此：

```text
PIDB
├── product_name_en
└── product_name_zh

        ↓

Shopify
├── English Product
└── Chinese Translation
```

---

# 20. Product Description

PIDB：

```text
description_en
description_zh
```

同步到 Shopify 对应语言内容。

页面最终：

```text
EN
Product Description
```

或：

```text
中文
产品介绍
```

---

# 21. Metafield Mapping

推荐：

| PIDB | Shopify Metafield |
|---|---|
| product_type | custom.product_type |
| skin_types | custom.skin_types |
| skin_concerns | custom.skin_concerns |
| key_ingredients | custom.key_ingredients |
| ingredients_inci | custom.ingredients_inci |
| how_to_use_en | custom.how_to_use_en |
| how_to_use_zh | custom.how_to_use_zh |
| warnings_en | custom.warnings_en |
| warnings_zh | custom.warnings_zh |
| country_of_origin | custom.country_of_origin |
| pidb_product_id | custom.pidb_product_id |

---

# 22. Shopify Native Fields vs Metafields

不要所有数据都塞 Metafields。

### Shopify Native

使用：

```text
title
description
vendor
product_type
handle
status
variants
price
inventory
images
```

### Metafields

使用：

```text
skin_types
skin_concerns
ingredients
how_to_use
warnings
country_of_origin
pidb_product_id
```

原则：

> **Commerce Data → Shopify Native**

> **Extended Product Knowledge → Metafields**

---

# 23. Ingredient Mapping

PIDB：

```text
Product
   │
   ├── Ingredient A
   ├── Ingredient B
   └── Ingredient C
```

同步 Shopify：

```text
custom.key_ingredients
```

例如：

```text
Niacinamide
Hyaluronic Acid
Ceramide
```

完整 INCI：

```text
custom.ingredients_inci
```

---

# 24. Skin Type Mapping

PIDB：

```text
dry
combination
```

Shopify：

```text
custom.skin_types
```

值：

```text
Dry
Combination
```

用于：

```text
Collection
Filter
Quiz
Product Page
```

---

# 25. Skin Concern Mapping

例如：

```text
hydration
dullness
skin_barrier
```

Shopify：

```text
custom.skin_concerns
```

这样可以支持：

```text
Shop by Concern
```

---

# 26. Product Image Sync

PIDB 只保存：

```text
image_url
image_type
sort_order
alt_text_en
alt_text_zh
```

图片实际存储：

```text
Shopify CDN
```

同步：

```text
PIDB Image URL
       ↓
Shopify Product Media
```

---

# 27. Image 类型

```text
primary
gallery
packaging
ingredients
usage
lifestyle
qr
```

主图：

```text
primary
```

第一张。

然后：

```text
gallery
ingredients
usage
lifestyle
```

按 Sort Order 展示。

---

# 28. Image Alt Text

例如：

```text
alt_text_en:
Hydrating Korean sheet mask packaging

alt_text_zh:
韩国补水面膜包装
```

Alt Text 应该：

> 描述图片，而不是堆 SEO Keywords。

---

# 29. Price Sync

价格属于：

> Shopify Commerce Data

因此：

```text
PIDB → Shopify
```

**默认不自动覆盖 Shopify Price。**

例如：

```text
Shopify Price = $14.99 CAD
```

管理员可以直接调整。

PIDB 不负责：

```text
price
sale_price
discount
```

---

# 30. Inventory Sync

库存属于 Shopify。

例如：

```text
Toronto Warehouse
        ↓
Shopify Inventory
```

PIDB 不覆盖：

```text
inventory_quantity
```

如果未来建立 Warehouse / ERP：

```text
ERP/WMS
   ↓
Shopify
```

而不是：

```text
PIDB
   ↓
Inventory
```

---

# 31. SKU Sync

SKU 建议：

```text
PIDB → Shopify
```

例如：

```text
PIDB:
KR-MASK-000123

Shopify:
SKU = KR-MASK-000123
```

SKU 一旦进入销售体系：

> 不建议随意修改。

---

# 32. Barcode

Barcode 同样：

```text
PIDB → Shopify
```

例如：

```text
8801234567890
```

必须唯一。

Import 时检查：

```text
Duplicate Barcode
```

如果重复：

```text
Import Error
```

---

# 33. Product Deletion

**禁止自动 Delete Shopify Product。**

例如 PIDB：

```text
discontinued
```

不要：

```text
DELETE Shopify Product
```

而应该：

```text
Shopify Product
       ↓
Draft / Unpublished
```

原因：

- 历史订单仍然存在
- SEO URL 可能存在
- Customer Order History 需要保留
- Analytics 数据需要保留

---

# 34. Product Discontinued

PIDB：

```text
status = discontinued
```

同步：

```text
Shopify
status = draft
```

或者：

```text
Unpublished
```

而不是删除。

---

# 35. Out of Stock

如果：

```text
inventory = 0
```

Shopify 自己负责：

```text
Out of Stock
```

Product Page 可以显示：

```text
Sold Out
```

未来增加：

```text
Notify Me
```

但 V1.0 不需要。

---

# 36. Sync Hash

为了避免每次都更新 Shopify：

PIDB 生成：

```text
content_hash
```

例如：

```text
hash(
product_name_en
product_name_zh
description_en
description_zh
skin_types
skin_concerns
ingredients
how_to_use
warnings
)
```

保存：

```text
last_sync_hash
```

如果：

```text
current_hash == last_sync_hash
```

则：

```text
Skip
```

否则：

```text
Sync
```

---

# 37. Sync Log

建立：

```text
ShopifySyncLog
```

字段：

| Field | 说明 |
|---|---|
| sync_id | UUID |
| product_id | PIDB Product |
| shopify_product_id | Shopify ID |
| action | create/update/publish/unpublish |
| started_at | 开始时间 |
| completed_at | 完成时间 |
| status | success/failed |
| error_code | 错误代码 |
| error_message | 错误信息 |

---

# 38. Error Handling

例如 Shopify API 返回：

```text
Invalid SKU
```

系统：

```text
Sync Failed
```

不要：

```text
自动修改 SKU
```

而记录：

```text
Error:
INVALID_SKU
```

管理员进入：

```text
Sync Errors
```

处理后：

```text
[ Retry ]
```

---

# 39. Retry

临时错误：

```text
Network Timeout
API Rate Limit
Temporary Server Error
```

可以自动 Retry。

建议：

```text
Retry 1
↓
30 sec

Retry 2
↓
2 min

Retry 3
↓
10 min
```

如果仍失败：

```text
status = failed
```

等待人工处理。

---

# 40. Sync Dashboard

PIDB Admin 后台建议有：

```text
Shopify Sync Dashboard
```

显示：

```text
Products
────────────
Total: 320

Synced: 295
Pending: 18
Failed: 7
```

下面：

```text
Failed Products

Product        Error
Product A      Invalid SKU
Product B      Missing Image
Product C      API Error
```

按钮：

```text
[ Retry ]
```

---

# 41. Batch Sync

支持：

```text
☑ Product A
☑ Product B
☑ Product C

[ Sync Selected ]
```

也支持：

```text
[ Sync All Pending ]
```

---

# 42. Sync Direction

最终规则：

```text
                 PIDB
                  │
                  │ Product Information
                  ▼
               Shopify
```

反方向只允许读取：

```text
Shopify
   │
   ├── Price
   ├── Inventory
   ├── Orders
   └── Sales
```

如果未来 PIDB 需要统计：

```text
Shopify → Analytics
```

但不是反向覆盖 Product Master。

---

# 43. Product Data Ownership Matrix

最终确定：

| Field | PIDB | Shopify |
|---|---:|---:|
| Product ID | Master | Mapping |
| Product Name | Master | Display |
| Description | Master | Display |
| Brand | Master | Display |
| Product Type | Master | Display |
| Skin Type | Master | Display |
| Skin Concern | Master | Display |
| Ingredient | Master | Display |
| How to Use | Master | Display |
| Warning | Master | Display |
| Claims | Master | Display |
| QR | Master | Mapping |
| SKU | Master | Copy |
| Barcode | Master | Copy |
| Price | — | Master |
| Inventory | — | Master |
| Cart | — | Master |
| Order | — | Master |
| Customer | — | Master |
| Payment | — | Master |
| Shipping | — | Master |

---

# 44. 完整 Product Publish Flow

```text
CSV
 │
 ▼
PIDB Import
 │
 ▼
Validation
 │
 ├── Error → Fix
 │
 ▼
Product Review
 │
 ▼
Compliance Approved
 │
 ▼
Ready
 │
 ▼
Publish to Shopify
 │
 ├── Create Product
 ├── Create Variant
 ├── Upload Images
 ├── Set Metafields
 ├── Set Translation
 └── Create Mapping
 │
 ▼
Shopify Product
 │
 ▼
Storefront
```

---

# 45. 产品更新 Flow

例如修改中文产品描述：

```text
Admin
 ↓
PIDB
 ↓
description_zh updated
 ↓
content_hash changed
 ↓
Sync Queue
 ↓
Shopify
 ↓
Chinese Storefront Updated
```

无需重新创建 Product。

---

# 46. QR 与 Shopify Integration

QR Mapping：

```text
ProductQR
────────────
qr_id
product_id
short_code
status
```

例如：

```text
P000123
   ↓
A8K29
```

URL：

```text
/p/A8K29
```

最终：

```text
QR
 ↓
PIDB Product
 ↓
Shopify Product
```

如果 Shopify Handle 改变：

```text
QR 不变
```

---

# 47. Product ID 是整个系统的核心

最终整个生态围绕：

```text
PIDB Product ID
```

例如：

```text
P000123
```

关联：

```text
P000123
│
├── SKU
├── Barcode
├── Product Images
├── Ingredients
├── Skin Types
├── Skin Concerns
├── Claims
├── Canada Compliance
├── QR Code
├── Shopify Product
└── Analytics
```

因此：

> **Product ID 是内部永久 Identity。**

---

# 48. V1.0 不需要 Webhook Everywhere

不要一开始建立大量：

```text
Shopify Webhooks
Event Bus
Message Queue
Microservices
```

V1.0 可以：

```text
PIDB
 ↓
Sync Queue
 ↓
Shopify API
```

即可。

当 SKU 达到：

```text
1,000+
```

或者业务复杂度显著提高，再考虑：

```text
Queue
Worker
Webhook
Event-driven Architecture
```

---

# 49. V1.0 推荐技术实现

如果 PIDB 采用简单 Web Application：

```text
Frontend
   │
   ▼
PIDB Admin
   │
   ▼
Backend
   │
   ├── Database
   │
   ├── Shopify API Client
   │
   └── Sync Service
```

其中：

```text
Sync Service
```

负责：

```text
Create Product
Update Product
Update Metafields
Update Images
Publish
Unpublish
Retry
Log
```

---

# 50. 推荐 Sync API

内部 API 可以设计为：

```text
POST /api/products/{id}/publish
```

```text
POST /api/products/{id}/sync
```

```text
POST /api/products/{id}/unpublish
```

```text
POST /api/products/{id}/retry-sync
```

批量：

```text
POST /api/products/batch-sync
```

---

# 51. 不建议 PIDB 直接修改 Shopify 数据库

必须通过：

```text
Shopify Admin API
```

或官方支持的 API。

不要：

```text
Direct DB Access
```

Shopify 是 SaaS 平台，不能按自建电商系统方式直接操作数据库。

---

# 52. V1.0 Integration Security

Shopify API credentials：

```text
API Key
API Secret
Access Token
```

不得写入：

```text
Frontend JavaScript
Git Repository
CSV
Database Product Table
```

应该使用：

```text
Environment Variables
Secret Manager
```

---

# 53. Admin Permission

PIDB Admin：

```text
Admin
Editor
Reviewer
```

建议：

### Admin

可以：

```text
Import
Edit
Approve
Publish
Sync
```

### Editor

可以：

```text
Create
Edit
Import
```

不能：

```text
Publish
Delete
```

### Reviewer

可以：

```text
Review
Approve
Reject
```

---

# 54. V1.0 最终架构

```text
                       ┌────────────────────┐
                       │     PIDB Admin     │
                       │                    │
                       │ Product Master     │
                       │ Ingredient         │
                       │ Skin Type          │
                       │ Skin Concern       │
                       │ Claims             │
                       │ QR                 │
                       └─────────┬──────────┘
                                 │
                                 │ Publish / Sync
                                 ▼
                       ┌────────────────────┐
                       │   Shopify API      │
                       └─────────┬──────────┘
                                 │
                ┌────────────────┼────────────────┐
                ▼                ▼                ▼
          Shopify Product      Search          Storefront
                │                                 │
                ▼                                 ▼
             Cart                             Customer
                │
                ▼
             Checkout
                │
                ▼
              Order
```

---

# 55. V1.0 数据流最终定义

整个系统形成：

```text
                   Supplier
                      │
                      ▼
                 Original Data
                      │
                      ▼
                    CSV
                      │
                      ▼
                    PIDB
                      │
       ┌──────────────┼──────────────┐
       │              │              │
       ▼              ▼              ▼
 Product Data     Ingredient     Classification
       │              │              │
       └──────────────┼──────────────┘
                      ▼
                Product Master
                      │
                      ▼
              Shopify Integration
                      │
                      ▼
                   Shopify
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
      Storefront     QR        Beauty Quiz
          │           │           │
          └───────────┼───────────┘
                      ▼
                    Cart
                      ▼
                  Checkout
                      ▼
                    Order
```

---

# 56. 核心架构结论

到这里，整个系统的三个核心层已经明确：

### Layer 1 — Product Knowledge

```text
PIDB
```

负责：

> 产品是什么、适合谁、有什么成分、怎么使用。

### Layer 2 — Commerce

```text
Shopify
```

负责：

> 卖多少钱、有没有库存、怎么买、怎么付款、订单在哪里。

### Layer 3 — Discovery

```text
Storefront
+
Beauty Quiz
+
QR
+
Search
+
Social Traffic
```

负责：

> 用户如何找到产品、理解产品并产生购买。

---

# 57. 推荐最终技术架构

```text
                 ┌──────────────────────┐
                 │       PIDB           │
                 │ Product Master Data  │
                 └──────────┬───────────┘
                            │
                            │ API
                            ▼
                 ┌──────────────────────┐
                 │ Shopify Integration  │
                 │ Sync / Mapping       │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │       Shopify        │
                 │ Commerce Engine      │
                 └──────────┬───────────┘
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
        Storefront         QR           Quiz
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                        Consumer
                            │
                            ▼
                       Add to Cart
                            │
                            ▼
                         Checkout
```

这套架构可以从 **100 个 SKU**开始，也可以逐步扩展到 **1,000–10,000+ SKU**，而不需要把 Shopify、PIDB、Quiz、QR 做成复杂的微服务系统。

---

# 58. 下一份开发文档

下一步进入：

# **05 — PIDB Database Schema & CSV Import Specification**

这一份开始真正进入**程序员可以照着开发数据库**的层面。

重点定义：

```text
01. brands
02. products
03. product_skus
04. product_images
05. ingredients
06. product_ingredients
07. skin_types
08. product_skin_types
09. skin_concerns
10. product_concerns
11. product_claims
12. product_canada
13. product_qr
14. shopify_mapping
15. sync_logs
16. import_batches
17. import_errors
```

同时定义：

```text
CSV Header
    ↓
CSV Field
    ↓
PIDB Table
    ↓
Validation
    ↓
Import
```

最终可以直接拿这份 Schema 去选择具体的 **Laravel / PostgreSQL / MySQL** 实现，并开始开发 PIDB。