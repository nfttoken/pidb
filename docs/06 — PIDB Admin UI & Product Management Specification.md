第 06 份文档。重点把 PIDB 后台到底怎么操作、产品如何从 CSV 进入系统、如何审核、如何发布到 Shopify、如何生成 QR 定义清楚，这份可以直接作为后续 Laravel 开发的 UI/功能规格。

# 06 — PIDB Admin UI & Product Management Specification
## PIDB 后台管理与产品管理系统规格 V1.0

**项目名称：** Canada Beauty Product Information Database  
**系统简称：** PIDB  
**版本：** V1.0  
**适用对象：** 产品管理员、内容编辑、审核人员、系统管理员  
**技术底座：** Laravel + PostgreSQL + Blade/Livewire 或 Vue  
**Commerce：** Shopify

---

# 1. 系统定位

PIDB Admin 是整个 Beauty Product Information Database 的内部运营后台。

它不是一个传统 ERP，也不是 Shopify Admin 的替代品。

系统核心职责：

> **管理 Beauty Product Knowledge，并将经过审核的产品信息发布到 Shopify。**

整体关系：

```text
供应商 / 1688 CSV / Excel
        │
        ▼
   CSV Import
        │
        ▼
  Data Validation
        │
        ▼
      PIDB
        │
 ┌──────┼───────────┐
 ▼      ▼           ▼
产品内容  Ingredients  QR
 │
 ▼
Review / Compliance
 │
 ▼
Ready
 │
 ▼
Shopify Sync
 │
 ▼
Shopify Store
 │
 ▼
消费者
```

---

# 2. 后台功能模块

V1.0 后台菜单建议：

```text
Dashboard

Catalog
├── Products
├── Brands
├── Product Types
├── Skin Types
└── Skin Concerns

Ingredients
└── Ingredients

Content
└── Claims

Import
├── CSV Import
├── Import History
└── Import Errors

Publishing
├── Shopify Sync
├── Sync Queue
└── Sync Errors

QR
└── QR Codes

Compliance
└── Canada Compliance

System
├── Users
├── Roles
└── System Settings
```

V1.0 不建议加入：

```text
ERP
CRM
WMS
Accounting
Procurement
AI Chatbot
Marketing Automation
Order Management
Customer Service
```

这些属于后续系统。

---

# 3. Dashboard

Dashboard 用于回答运营人员每天最重要的几个问题：

1. 有多少产品？
2. 有多少产品还没有完成？
3. 哪些产品等待审核？
4. 哪些产品无法发布？
5. Shopify 同步是否正常？
6. 哪些产品存在数据错误？

---

## 3.1 KPI Cards

首页显示：

```text
Total Products
1,248
```

```text
Active Products
936
```

```text
Pending Review
87
```

```text
Import Errors
23
```

```text
Shopify Sync Errors
6
```

```text
Compliance Pending
14
```

---

# 4. Product List

路径：

```text
Catalog → Products
```

这是后台最常用页面。

---

## 4.1 产品列表字段

建议：

| 字段 | 说明 |
|---|---|
| Product Code | 产品编号 |
| Product Name EN | 英文名称 |
| Product Name ZH | 中文名称 |
| Brand | 品牌 |
| Product Type | 产品类型 |
| Original Language | 原始语言 |
| Country | 原产国 |
| SKU | SKU |
| Barcode | 条码 |
| Status | 产品状态 |
| Compliance | 加拿大合规状态 |
| Shopify | Shopify 状态 |
| Updated | 最后更新时间 |
| Actions | 操作 |

---

## 4.2 Filter

必须支持筛选：

```text
Brand
Product Type
Original Language
Country
Skin Type
Skin Concern
Ingredient
Status
Compliance Status
Shopify Sync Status
```

例如：

```text
Brand = COSRX
Product Type = Serum
Skin Type = Sensitive
Concern = Redness
Status = Ready
```

可以快速找到：

> COSRX + Serum + Sensitive Skin + Redness + Ready

---

# 5. Product Search

搜索框支持：

```text
Product Code
SKU
Barcode
Original Name
English Name
Chinese Name
Brand
INCI
Ingredient
```

例如输入：

```text
Snail
```

可以找到：

```text
Snail Mucin 96
Snail Essence
Snail Cream
```

输入：

```text
8801234567890
```

可以直接找到对应 SKU。

---

# 6. Product Editor

这是整个 PIDB 最核心的页面。

路径：

```text
Products → Product → Edit
```

建议采用 Section / Tab 结构，而不是一个超长页面。

---

# 7. Product Editor 页面结构

建议：

```text
Product Editor

[Basic Information]
[Names]
[Description]
[Classification]
[Skin Profile]
[Ingredients]
[Claims]
[Usage]
[Warnings]
[Images]
[Canada Compliance]
[QR]
[Shopify]
[Change History]
```

---

# 8. Basic Information

字段：

| Field | 类型 | 必填 |
|---|---|---:|
| Product Code | text | Yes |
| Brand | select | Yes |
| Product Type | select | Yes |
| Original Language | select | Yes |
| Original Name | text | Yes |
| Country of Origin | select | Yes |
| Status | select | Yes |

---

## 8.1 Original Language

下拉菜单：

```text
Korean
Japanese
Chinese
English
French
Other
```

数据库保存：

```text
ko
ja
zh
en
fr
other
```

不能把系统设计成：

```text
Korean only
```

因为未来会加入：

```text
Japanese Beauty
Chinese Beauty
French Beauty
European Beauty
```

---

# 9. Names

产品名称分成：

```text
Original Name
English Name
Chinese Name
```

例如：

```text
Original:
어드밴스드 스네일 96 뮤신 파워 에센스

English:
Advanced Snail 96 Mucin Power Essence

Chinese:
高级蜗牛96黏液精华
```

原则：

> Original Name 永远保留，不覆盖。

标准化名称：

```text
product_name_en
product_name_zh
```

分别维护。

---

# 10. Description

后台同时维护：

```text
Description EN
Description ZH
```

禁止将两种语言写在一个字段：

```text
English / 中文混合
```

这样会严重影响：

- Shopify localization
- SEO
- 搜索
- QR 页面
- 后续 B2B
- 数据导出

---

# 11. Product Classification

产品分类使用标准化 Taxonomy。

例如：

```text
Skincare
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
 └── Sleeping Mask
```

后台不要让编辑人员自由输入：

```text
Serum
serum
SERUM
Face Serum
Facial Serum
```

必须从 Product Type 中选择。

这样才能保证：

```text
数据库
↓
Shopify Collection
↓
网站 Filter
↓
Quiz
```

数据一致。

---

# 12. Skin Profile

产品编辑页面：

```text
Skin Types

☐ Normal
☐ Dry
☐ Oily
☐ Combination
☐ Sensitive
```

可以多选。

例如：

```text
COSRX Snail Essence

☑ Normal
☑ Dry
☑ Combination
☑ Sensitive
```

---

# 13. Skin Concerns

支持多选：

```text
☐ Hydration
☐ Dryness
☐ Redness
☐ Sensitivity
☐ Acne-prone Skin
☐ Oil Control
☐ Dark Spots
☐ Dullness
☐ Uneven Skin Tone
☐ Fine Lines
☐ Wrinkles
☐ Skin Barrier
☐ Pores
```

产品可以关联多个 Concern。

例如：

```text
Skin Concerns

☑ Hydration
☑ Skin Barrier
☑ Dryness
```

---

# 14. Ingredients

产品编辑页面提供：

```text
Ingredients
```

支持搜索：

```text
Search ingredient...
```

例如输入：

```text
Niacinamide
```

选择：

```text
Niacinamide
```

然后：

```text
Key Ingredient ☑
Order: 3
```

---

## 14.1 Full INCI

另外保存完整原始 INCI：

```text
Water, Glycerin, Snail Secretion Filtrate,
Niacinamide, Butylene Glycol...
```

这里必须保留原始文本。

不要仅仅依赖结构化 Ingredient 数据。

原因：

> 原始 INCI 是产品原始信息；结构化 Ingredient 是数据库知识层。

两者用途不同。

---

# 15. Ingredient Matching

CSV 导入时可能出现：

```text
Niacinamide
```

数据库已经存在：

```text
Niacinamide
```

系统自动匹配。

如果出现：

```text
Unknown Ingredient XYZ
```

系统不要直接删除。

进入：

```text
Ingredient Review Queue
```

显示：

```text
Product:
ABC Serum

Raw Ingredient:
XYZ

Status:
Unmatched
```

管理员可以：

```text
[Create Ingredient]
[Map to Existing Ingredient]
[Ignore]
```

---

# 16. Claims

Claims 单独管理。

例如：

```text
Hydrating
Soothing
Brightening Appearance
Barrier Support
Oil Control
Appearance of Pores
```

后台：

```text
Claim EN
Claim ZH
Claim Type
Source
Approved
```

---

## 16.1 Claims 审核

系统不允许普通编辑人员直接把：

```text
Treats Acne
Cures Eczema
Removes Melasma
```

作为普通 cosmetic claim 发布。

如果发现类似内容：

```text
Claim Status = Review Required
```

产品不能进入：

```text
Ready
```

直到审核完成。

---

# 17. How to Use

分别维护：

```text
How to Use EN
How to Use ZH
```

例如：

```text
Apply an appropriate amount to the face
after cleansing and toning.
```

中文：

```text
洁面和爽肤后，取适量产品均匀涂抹于面部。
```

---

# 18. Warnings

分别维护：

```text
Warnings EN
Warnings ZH
```

例如：

```text
For external use only.
Avoid contact with eyes.
Keep out of reach of children.
```

---

# 19. Images

产品图片管理：

```text
Images
```

支持拖拽排序。

---

## 19.1 Image Types

```text
Primary
Gallery
Packaging
Ingredients
Usage
Lifestyle
QR
```

例如：

```text
01 Primary
02 Gallery
03 Packaging
04 Ingredients
05 Usage
06 Lifestyle
```

---

## 19.2 Alt Text

每张图片：

```text
Alt Text EN
Alt Text ZH
```

例如：

```text
EN:
COSRX Advanced Snail 96 Mucin Power Essence

ZH:
COSRX 高级蜗牛96黏液精华
```

这样有利于：

- SEO
- Accessibility
- Google Image Search

---

# 20. Canada Compliance

页面：

```text
Canada Compliance
```

字段：

```text
Importer
Distributor
Country of Origin
Canadian Label Status
Cosmetic Notification Status
Compliance Status
Reviewed At
Notes
```

---

## 20.1 Compliance Status

```text
Pending
Reviewing
Approved
Blocked
```

只有：

```text
Approved
```

才允许进入：

```text
Ready
```

并同步 Shopify。

---

# 21. QR Management

产品页面：

```text
QR Code
```

显示：

```text
Short Code:
A8K29

URL:
/p/A8K29
```

同时提供：

```text
[View QR Page]
[Generate QR]
[Download QR]
[Print]
```

---

## 21.1 QR 架构

二维码不要直接保存：

```text
https://shop.example.ca/products/cosrx-snail-96
```

而使用：

```text
https://yourdomain.ca/p/A8K29
```

访问流程：

```text
QR
 ↓
/p/A8K29
 ↓
PIDB
 ↓
Product
 ↓
当前 Product Page
```

这样即使 Shopify URL 改变：

```text
QR 不需要重新印刷
```

---

# 22. Shopify Section

产品页面显示：

```text
Shopify Status:
Published

Shopify Product ID:
987654321

Shopify Handle:
cosrx-snail-96-mucin-power-essence

Last Sync:
2026-09-01 15:30

Sync Status:
Success
```

按钮：

```text
[Sync Now]
[View Shopify Product]
[View Sync Logs]
```

---

# 23. Change History

产品必须记录修改历史。

例如：

```text
2026-09-01
David
Changed Skin Concern:
Dryness → Hydration

2026-09-01
Admin
Updated English Description

2026-08-30
Import
Created Product
```

至少记录：

```text
User
Timestamp
Action
Field
Old Value
New Value
```

V1.0 不需要做复杂版本控制。

---

# 24. Product Status Workflow

完整流程：

```text
Draft
  ↓
Imported
  ↓
Processing
  ↓
Review
  ↓
Ready
  ↓
Published
  ↓
Active
```

异常状态：

```text
Inactive
Discontinued
```

---

# 25. Status Definitions

### Draft

手工新建但信息不完整。

---

### Imported

刚从 CSV 导入。

数据已经进入数据库，但没有完成标准化。

---

### Processing

正在：

```text
标准化名称
分类
Ingredient Mapping
Skin Type
Skin Concern
Claims
Images
```

---

### Review

等待人工审核。

---

### Ready

产品数据完整，并且：

```text
Data Validation = PASS
Compliance = Approved
Review = Approved
```

---

### Published

已经同步到 Shopify。

---

### Active

当前正在销售。

---

### Inactive

暂时停止销售。

---

### Discontinued

产品永久停止销售。

---

# 26. Product Readiness Score

为了方便运营人员，产品页面可以显示：

```text
Product Readiness

████████████████░░ 85%
```

建议检查：

```text
Basic Information       ✓
Names                   ✓
Description EN          ✓
Description ZH          ✓
Product Type            ✓
Skin Type               ✓
Skin Concern            ✓
Ingredients              ✓
Claims                   ✓
How To Use EN            ✓
How To Use ZH            ✓
Warnings                 ✓
Images                   ✓
Canada Compliance        ✓
QR                       ✓
```

全部完成：

```text
100%
```

才能进入 Ready。

---

# 27. CSV Import UI

路径：

```text
Import → CSV Import
```

页面：

```text
Upload CSV

[Choose File]

Supported:
CSV UTF-8

[Upload]
```

---

# 28. CSV Import Workflow

完整流程：

```text
1. Upload
     ↓
2. Parse
     ↓
3. Validate
     ↓
4. Normalize
     ↓
5. Preview
     ↓
6. Confirm
     ↓
7. Import
     ↓
8. Result
```

---

# 29. CSV Preview

导入前显示：

```text
Import Preview

Total Rows:       500
New Products:     320
Existing Products: 160
Errors:            20
Warnings:          35
```

---

## 29.1 Error Example

```text
Row 28

Product Code:
KR-SERUM-028

Field:
product_type

Error:
Unknown product type

Value:
Facial Serum
```

操作：

```text
[Edit CSV]
[Map Value]
[Skip Row]
```

---

# 30. Import Rules

默认采用：

```text
UPSERT
```

依据：

```text
product_code
```

而不是：

```text
product_name
```

---

## 30.1 New Product

不存在：

```text
product_code
```

则：

```text
INSERT
```

---

## 30.2 Existing Product

已经存在：

```text
product_code
```

则：

```text
UPDATE
```

---

# 31. Import Transaction

每个 Product 独立处理。

例如：

```text
Product A
  ✓

Product B
  ✓

Product C
  ✗

Product D
  ✓
```

不能因为 Product C 出错而让整个 500 条 CSV 全部 rollback。

最终：

```text
Successful: 499
Failed: 1
```

---

# 32. Import Result

完成后：

```text
Import Completed

Total:      500
Created:    320
Updated:    160
Skipped:     20
Errors:       0
Warnings:    35
```

提供：

```text
[View Products]
[View Warnings]
[Download Error CSV]
```

---

# 33. Import History

页面：

```text
Import History
```

字段：

| 字段 | 说明 |
|---|---|
| Batch ID | 批次编号 |
| Filename | 文件名 |
| Total | 总数量 |
| Created | 新增 |
| Updated | 更新 |
| Failed | 失败 |
| User | 操作人 |
| Started | 开始时间 |
| Completed | 完成时间 |
| Status | 状态 |

例如：

```text
20260901_kbeauty_batch01.csv
500 rows
320 created
160 updated
20 failed
```

---

# 34. Shopify Sync Dashboard

路径：

```text
Publishing → Shopify Sync
```

显示：

```text
Products Ready:       420
Synced:               380
Pending:               30
Failed:                10
```

---

# 35. Sync Queue

系统可以使用简单 Queue：

```text
PIDB
 ↓
Sync Queue
 ↓
Shopify API
```

任务：

```text
Create Product
Update Product
Update Metafields
Update Images
Update Translation
```

V1.0 不需要：

```text
Kafka
RabbitMQ
Event Bus
Microservices
```

Laravel Queue 已经足够。

---

# 36. Sync Rules

只有以下条件全部满足：

```text
Product Status = Ready / Published / Active
AND
Compliance = Approved
AND
Validation = Passed
```

才能同步 Shopify。

---

# 37. Sync Error

例如：

```text
Shopify Sync Failed

Product:
KR-SERUM-028

Error:
Invalid product data

Shopify Response:
HTTP 422
```

显示：

```text
[Retry]
[View Product]
[View Log]
```

---

# 38. Prevent Duplicate Products

同步前检查：

```text
PIDB Product ID
```

是否已经映射：

```text
shopify_mapping
```

如果存在：

```text
UPDATE
```

不存在：

```text
CREATE
```

禁止因为重复点击：

```text
Sync Now
```

而创建两个 Shopify Product。

---

# 39. User Roles

V1.0 建议只有 3 个角色。

## Admin

权限：

```text
全部权限
```

包括：

```text
Users
Settings
Products
Import
Compliance
Shopify
QR
```

---

## Editor

可以：

```text
Products
Brands
Ingredients
Skin Types
Skin Concerns
CSV Import
QR
```

不能：

```text
Users
System Settings
```

---

## Reviewer

主要负责：

```text
Review
Compliance
Claims
Publish Approval
```

不能修改系统配置。

---

# 40. Product Review Page

Reviewer 打开：

```text
Products → Review
```

页面显示：

```text
Product Information
        ↓
Classification
        ↓
Skin Profile
        ↓
Ingredients
        ↓
Claims
        ↓
Canada Compliance
```

底部：

```text
[Approve]
[Reject]
[Request Changes]
```

---

# 41. Reject Reason

如果 Reject：

必须填写：

```text
Reason
```

例如：

```text
English description contains unsupported claim.

Please change:
"Treats acne"

To:
"Helps improve the appearance of blemishes."
```

这样编辑人员可以直接修改。

---

# 42. Bulk Operations

产品列表支持批量操作：

```text
☐ Product A
☐ Product B
☐ Product C
```

然后：

```text
Bulk Actions
├── Change Status
├── Assign Product Type
├── Assign Skin Type
├── Assign Skin Concern
├── Generate QR
├── Sync Shopify
└── Export CSV
```

---

# 43. Bulk Edit

例如选择：

```text
100 Products
```

批量：

```text
Skin Type:
Dry
Sensitive
```

系统显示：

```text
100 products will be updated.

[Confirm]
```

避免误操作。

---

# 44. Data Validation

每次：

```text
Import
Save
Review
Publish
Shopify Sync
```

都可以触发 Validation。

---

## 44.1 Required Validation

必须：

```text
Product Code
Brand
Product Type
Original Language
Original Name
Country
```

---

## 44.2 Publishing Validation

发布前：

```text
Product Name EN       ✓
Product Name ZH       ✓
Description EN        ✓
Description ZH        ✓
Product Type          ✓
Skin Type             ✓
Skin Concern          ✓
Ingredients           ✓
How To Use            ✓
Warnings              ✓
Images                ✓
Compliance            ✓
```

---

# 45. Data Quality Rules

例如：

```text
Barcode duplicate
```

结果：

```text
ERROR
```

---

```text
Unknown Ingredient
```

结果：

```text
WARNING / REVIEW
```

---

```text
Missing Chinese Description
```

结果：

```text
ERROR
```

---

```text
Missing Lifestyle Image
```

结果：

```text
WARNING
```

---

# 46. Search Architecture

V1.0 不需要 Elasticsearch。

PostgreSQL 已经足够支持：

```text
Product Name
SKU
Barcode
Brand
Ingredient
Product Type
Skin Type
Skin Concern
```

数据量：

```text
< 10,000 products
```

完全可以使用 PostgreSQL。

以后达到：

```text
50,000+
```

并且搜索需求复杂，再考虑：

```text
OpenSearch / Elasticsearch
```

---

# 47. Product Page Preview

后台 Product Editor 提供：

```text
[Preview English]
[Preview Chinese]
[Preview QR Page]
```

这样运营人员无需先发布 Shopify 就能检查最终效果。

---

# 48. QR Public Page

QR 页面不是 Shopify Product Page 的简单复制。

建议结构：

```text
Product
│
├── Product Name
├── Brand
├── Product Type
├── What It Does
├── Suitable For
├── Key Ingredients
├── Full Ingredients
├── How To Use
├── Warnings
└── Where To Buy
```

例如：

```text
COSRX
Advanced Snail 96 Mucin Power Essence

Suitable For:
Dry
Sensitive
Combination

Key Ingredients:
Snail Secretion Filtrate
Niacinamide
Glycerin

[Buy Online]
```

以后可以增加：

```text
[Take Beauty Quiz]
[Find Similar Products]
[Find Store]
```

---

# 49. Beauty Quiz Integration

Beauty Quiz 不直接修改 Product 数据。

架构：

```text
Beauty Quiz
      ↓
User Answers
      ↓
Recommendation Engine
      ↓
PIDB
      ↓
Matching Products
      ↓
Shopify Product
```

例如：

```text
Skin Type:
Oily

Concern:
Dark Spots

Sensitivity:
Low
```

查询：

```text
Product
WHERE
skin_type = Oily
AND
concern = Dark Spots
```

最终跳转：

```text
Shopify Product
```

---

# 50. Recommended Architecture

最终 V1.0：

```text
                  ┌─────────────────────┐
                  │ Supplier / CSV      │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ PIDB Admin          │
                  │                     │
                  │ Products            │
                  │ Ingredients         │
                  │ Skin Types          │
                  │ Concerns            │
                  │ Claims              │
                  │ Compliance          │
                  │ QR                  │
                  └──────────┬──────────┘
                             │
                       Review / Approval
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Shopify Integration │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Shopify             │
                  │                     │
                  │ Storefront          │
                  │ Cart                │
                  │ Checkout            │
                  │ Payment             │
                  │ Order               │
                  │ Customer            │
                  └──────────┬──────────┘
                             │
                 ┌───────────┴───────────┐
                 ▼                       ▼
          Consumer Website          QR Product Page
                 │
                 ▼
            Beauty Quiz
```

---

# 51. V1.0 开发优先级

不要一次开发所有功能。

建议按照以下顺序：

## Phase 1 — PIDB Core

```text
Users
Brands
Product Types
Products
SKUs
```

---

## Phase 2 — Product Knowledge

```text
Skin Types
Skin Concerns
Ingredients
Claims
Images
How To Use
Warnings
```

---

## Phase 3 — CSV

```text
CSV Upload
Validation
Preview
Import
Import History
Error Handling
```

---

## Phase 4 — Review

```text
Product Readiness
Review Queue
Approve
Reject
Compliance
```

---

## Phase 5 — Shopify

```text
Shopify Connection
Product Sync
Metafield Sync
Image Sync
Sync Queue
Sync Log
```

---

## Phase 6 — QR

```text
QR Generation
Short Code
Public Product Page
Shopify Link
```

---

## Phase 7 — Beauty Quiz

```text
Quiz Questions
Scoring
Product Matching
Recommendation
```

---

# 52. V1.0 不开发的功能

明确排除：

```text
AI Product Writer
AI Chatbot
AI Skin Diagnosis
AI Image Recognition
ERP
WMS
CRM
Accounting
POS
Warehouse Management
Native Mobile App
Microservices
Kubernetes
Elasticsearch
Kafka
RabbitMQ
```

这些功能现在都不是核心瓶颈。

---

# 53. 最重要的设计原则

整个 PIDB 必须遵守以下原则：

### 原则 1

**Product ID 永久不变。**

---

### 原则 2

**Original Product Data 永久保留。**

---

### 原则 3

**Original Language ≠ System Language。**

系统可以支持：

```text
ko
ja
zh
en
fr
other
```

---

### 原则 4

**英文和中文内容独立存储。**

不要：

```text
English / 中文
```

放在同一个字段。

---

### 原则 5

**Shopify 不作为 Product Knowledge Master。**

```text
PIDB = Product Knowledge Master
Shopify = Commerce Master
```

---

### 原则 6

**价格和库存由 Shopify 管理。**

PIDB 不覆盖：

```text
Price
Inventory
Order
Payment
Customer
```

---

### 原则 7

**CSV 是 Import/Export Format，不是数据库。**

---

### 原则 8

**QR 不绑定 Shopify URL。**

QR 永远指向：

```text
yourdomain.ca/p/{short_code}
```

---

### 原则 9

**先人工标准化，再考虑 AI。**

V1.0 不需要 AI。

---

### 原则 10

**数据库设计必须支持未来 B2B。**

因此 Product Data 不能只考虑消费者。

未来同一个 Product 可以服务：

```text
B2C Website
QR
TikTok
Instagram
B2B Portal
Wholesale Catalog
Sales Team
Marketplace
```

---

# 54. V1.0 最终后台菜单

最终建议收敛为：

```text
PIDB ADMIN
│
├── Dashboard
│
├── Catalog
│   ├── Products
│   ├── Brands
│   ├── Product Types
│   ├── Skin Types
│   └── Skin Concerns
│
├── Ingredients
│
├── Claims
│
├── Import
│   ├── CSV Import
│   ├── Import History
│   └── Import Errors
│
├── Review
│   ├── Product Review
│   └── Compliance Review
│
├── Publishing
│   ├── Shopify
│   ├── Sync Queue
│   └── Sync Errors
│
├── QR Codes
│
└── System
    ├── Users
    ├── Roles
    └── Settings
```

这已经足够支撑第一阶段的实际商业运营。

---

# 55. V1.0 完整业务闭环

最终一个产品从采购到销售：

```text
供应商产品
      ↓
CSV
      ↓
PIDB Import
      ↓
自动 Validation
      ↓
数据标准化
      ↓
Ingredient Mapping
      ↓
Skin Type
      ↓
Skin Concern
      ↓
EN / ZH Content
      ↓
Claims Review
      ↓
Canada Compliance Review
      ↓
Product Review
      ↓
READY
      ↓
Shopify Sync
      ↓
Shopify Product
      ↓
Online Store
      ↓
QR Product Page
      ↓
Beauty Quiz
      ↓
Product Discovery
      ↓
Purchase
```

这条链路就是整个项目第一阶段的核心业务流程。

---

# 56. 与下一阶段的关系

到目前为止，PIDB 的核心设计已经完成：

```text
01 Product Information Database Specification
        ↓
04 PIDB ↔ Shopify Integration
        ↓
05 Database Schema & CSV Import
        ↓
06 Admin UI & Product Management
```

下一份建议正式制定：

# 07 — PIDB Data Dictionary & CSV → PIDB → Shopify Mapping

这份会把**每一个字段**彻底对应起来，例如：

```text
CSV
product_code
      ↓
PIDB
products.product_code
      ↓
Shopify
custom.pidb_product_code
```

以及：

```text
CSV
skin_types
      ↓
PIDB
product_skin_types
      ↓
Shopify
custom.skin_types
      ↓
Website Filter
Skin Type Collection
      ↓
Beauty Quiz
Recommendation
```

这份 **07** 会成为以后开发、CSV 数据整理、Shopify Metafield 配置和数据迁移最重要的一张“数据地图”。