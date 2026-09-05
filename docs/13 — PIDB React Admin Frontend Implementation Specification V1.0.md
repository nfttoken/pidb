# #13 — PIDB React Admin Frontend Implementation Specification V1.0

**项目名称：** Beauty Product Information Database（PIDB）  
**文档编号：** #13  
**版本：** V1.0  
**前端技术栈：** React + TypeScript + Vite + Ant Design  
**后端：** FastAPI  
**数据库：** PostgreSQL  
**API：** REST API `/api/v1`

---

# 1. 前端定位

PIDB 前端分为两个逻辑区域：

```text
React Application
│
├── Admin
│   ├── Dashboard
│   ├── Product Management
│   ├── Brand Management
│   ├── Taxonomy
│   ├── Ingredient Management
│   ├── Claims
│   ├── CSV Import
│   ├── Product Review
│   ├── Compliance Review
│   ├── QR Codes
│   ├── Shopify Sync
│   └── System
│
└── Consumer
    ├── Product Discovery
    ├── Beauty Quiz
    ├── Product Detail
    └── QR Landing Page
```

本文件重点规定 **Admin Frontend**。

Consumer Frontend 可以与 Admin 共用 React 项目，但必须在路由和组件层面保持清晰隔离。

---

# 2. 前端核心原则

## 2.1 PIDB 是后台 Product Knowledge Master

Admin UI 不应该围绕 Shopify 设计。

正确：

```text
Product
 ├── Basic Information
 ├── Original Information
 ├── English / Chinese Content
 ├── Product Type
 ├── Skin Type
 ├── Skin Concerns
 ├── Ingredients
 ├── Claims
 ├── Usage
 ├── Warnings
 ├── Canada Compliance
 ├── Images
 ├── QR
 └── Shopify Mapping
```

而不是：

```text
Shopify Product
 ├── Title
 ├── Price
 ├── Inventory
 └── ...
```

Shopify 只是 PIDB 的一个销售渠道。

---

# 3. 前端项目结构

推荐：

```text
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── products.ts
│   │   ├── brands.ts
│   │   ├── taxonomy.ts
│   │   ├── ingredients.ts
│   │   ├── claims.ts
│   │   ├── imports.ts
│   │   ├── compliance.ts
│   │   ├── qr.ts
│   │   └── shopify.ts
│   │
│   ├── components/
│   │   ├── common/
│   │   ├── product/
│   │   ├── ingredient/
│   │   ├── taxonomy/
│   │   ├── import/
│   │   ├── compliance/
│   │   ├── qr/
│   │   └── shopify/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── products/
│   │   ├── brands/
│   │   ├── ingredients/
│   │   ├── taxonomy/
│   │   ├── imports/
│   │   ├── compliance/
│   │   ├── qr/
│   │   └── shopify/
│   │
│   ├── layouts/
│   │   ├── AdminLayout.tsx
│   │   ├── AuthLayout.tsx
│   │   └── ConsumerLayout.tsx
│   │
│   ├── pages/
│   │   ├── auth/
│   │   ├── admin/
│   │   └── consumer/
│   │
│   ├── hooks/
│   ├── stores/
│   ├── routes/
│   ├── types/
│   ├── utils/
│   ├── constants/
│   ├── App.tsx
│   └── main.tsx
│
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env
```

---

# 4. 前端核心依赖

建议：

```text
react
react-dom
react-router-dom
typescript
vite

antd
@ant-design/icons

@tanstack/react-query

axios

zod

dayjs
```

如果项目已经采用原生 `fetch`，也可以不使用 Axios。

推荐：

```text
React Query
    ↓
API Client
    ↓
FastAPI
```

而不是在每一个 React Component 中直接调用 API。

---

# 5. API Client

统一：

```text
src/api/client.ts
```

负责：

- Base URL
- JWT Token
- Authorization Header
- JSON parsing
- Error handling
- 401 handling
- Request ID
- timeout

示例：

```text
API Client
│
├── GET
├── POST
├── PUT
├── PATCH
└── DELETE
```

业务模块：

```text
api/products.ts
api/brands.ts
api/ingredients.ts
api/imports.ts
...
```

只负责业务 API。

---

# 6. React Query

推荐使用：

```text
@tanstack/react-query
```

管理：

- Server State
- API Cache
- Loading
- Error
- Refetch
- Mutation
- Pagination

例如：

```text
useProducts()
useProduct(id)
useCreateProduct()
useUpdateProduct()
useProductStatus()
useShopifySync()
```

不要把产品数据库完整复制到 Redux/Zustand 等 Client State 中。

---

# 7. Client State

V1.0 实际需要的 Client State 很少。

主要：

```text
Auth State
UI State
Filter State
```

例如：

```text
AuthStore
 ├── currentUser
 ├── accessToken
 └── permissions
```

产品数据、品牌数据、Ingredient 数据等属于 Server State，应由 React Query 管理。

---

# 8. Admin Router

推荐：

```text
/login

/admin
/admin/dashboard

/admin/products
/admin/products/new
/admin/products/:id
/admin/products/:id/edit

/admin/brands
/admin/brands/new
/admin/brands/:id/edit

/admin/product-types
/admin/skin-types
/admin/skin-concerns

/admin/ingredients
/admin/ingredients/new
/admin/ingredients/:id/edit

/admin/claims

/admin/imports
/admin/imports/new
/admin/imports/:id

/admin/review/products
/admin/review/compliance

/admin/qr
/admin/catalog
/admin/review/products
/admin/review/compliance
/admin/qr/:id

/admin/shopify
/admin/shopify/sync
/admin/shopify/errors

/admin/users
/admin/settings
```

---

# 9. Admin Layout

整体：

```text
┌──────────────────────────────────────────────────────┐
│ Header                                               │
│ Logo   Search                         User / Logout   │
├──────────────┬───────────────────────────────────────┤
│              │                                       │
│ Dashboard    │                                       │
│              │                                       │
│ Catalog      │             Page Content              │
│  Products    │                                       │
│  Brands      │                                       │
│  Taxonomy    │                                       │
│              │                                       │
│ Ingredients  │                                       │
│              │                                       │
│ Import       │                                       │
│ Review       │                                       │
│ Publishing   │                                       │
│ QR Codes     │                                       │
│              │                                       │
│ System       │                                       │
└──────────────┴───────────────────────────────────────┘
```

使用：

```text
Ant Design Layout
Sider
Header
Content
Breadcrumb
```

---

# 10. Dashboard

Dashboard 不做复杂 BI。

V1.0 重点显示 PIDB 工作状态。

## KPI

```text
Total Products
Draft
Processing
Review
Ready
Published
Compliance Pending
Compliance Approved
Shopify Sync Errors
```

例如：

```text
Products       1,248
Ready            836
Review           102
Compliance       73
Published        791
Sync Errors       12
```

---

# 11. Product List

路径：

```text
/admin/products
```

使用 Ant Design `Table`。

字段：

```text
Product Code
Product Name EN
Product Name ZH
Brand
Product Type
Original Language
Country
SKU
Barcode
Status
Compliance
Shopify
Updated
Actions
```

---

# 12. Product Filters

必须支持：

```text
Keyword
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

Keyword 搜索：

```text
Product Code
SKU
Barcode
Original Name
English Name
Chinese Name
Brand
INCI
```

---

# 13. Product List 操作

单产品：

```text
View
Edit
Review
Change Status
Generate QR
Sync Shopify
```

批量：

```text
Change Status
Assign Taxonomy
Generate QR
Sync Shopify
Export CSV
```

危险操作必须二次确认。

---

# 14. Product Editor

这是整个 Admin 的核心页面。

推荐使用：

```text
Tabs
Form
Card
Select
AutoComplete
Upload
Tag
Alert
Descriptions
```

结构：

```text
Product Editor

├── Basic Information
├── Names
├── Description
├── Classification
├── Skin Profile
├── Ingredients
├── Claims
├── How To Use
├── Warnings
├── Images
├── Canada Compliance
├── QR
└── Shopify
```

---

# 15. Basic Information

字段：

```text
Product Code
Brand
Original Language
Original Name
Country of Origin
Status
```

Product Code：

```text
KR-SERUM-001
```

由 PIDB 管理，不允许 Shopify 修改。

---

# 16. Names

```text
Original Name
English Name
Chinese Name
```

例如：

```text
Original:
세럼

English:
Hydrating Serum

Chinese:
保湿精华液
```

Original Language 是独立字段。

不能通过 English/Chinese 字段推断原始语言。

---

# 17. Classification

字段：

```text
Product Type
Skin Types
Skin Concerns
```

Product Type：

```text
Serum
Moisturizer
Cleanser
...
```

Skin Type：

```text
Normal
Dry
Oily
Combination
Sensitive
```

Skin Concerns：

```text
Hydration
Dryness
Redness
Sensitivity
Acne-prone Skin
Oil Control
Dark Spots
Dullness
Uneven Skin Tone
Fine Lines
Wrinkles
Skin Barrier
Pores
```

全部来自 PIDB Taxonomy API。

不要在前端 hard-code taxonomy。

---

# 18. Ingredient Editor

Product 与 Ingredient 是：

```text
Many-to-Many
```

UI：

```text
Ingredient Search
       ↓
Select Ingredient
       ↓
Set Ingredient Order
       ↓
Set Key Ingredient
```

例如：

```text
01 Niacinamide      ★
02 Hyaluronic Acid  ★
03 Glycerin
04 Panthenol
```

Ingredient 顺序必须保存。

---

# 19. Ingredient Search

支持：

```text
INCI Name
Common English Name
Chinese Name
Korean Name
Japanese Name
Search Keywords
```

例如输入：

```text
niacinamide
```

返回：

```text
Niacinamide
Vitamin B3
烟酰胺
나이아신아마이드
```

---

# 20. Claims

Claims 单独管理。

Product Editor：

```text
Claims
 ├── Add Claim
 ├── Edit Claim
 └── Remove Claim
```

字段：

```text
Claim EN
Claim ZH
Claim Type
Source
Approved
```

必须显示：

```text
Approved
Pending
Rejected
```

未批准 Claim 不得自动发布到 Shopify。

---

# 21. Cosmetic Claim 防误用

Admin UI 应该提供提示。

例如：

```text
Allowed:
Helps improve the appearance of blemishes.

Avoid:
Treats acne.
```

前端提示不是法律判断系统。

最终 Compliance Review 决定是否批准。

---

# 22. How To Use

支持：

```text
English
Chinese
```

例如：

```text
How to Use EN
How to Use ZH
```

采用 TextArea。

后续如果需要富文本，可以升级 Rich Text Editor，但 V1.0 不需要。

---

# 23. Warnings

同样：

```text
Warnings EN
Warnings ZH
```

显示为独立 Card。

保存前进行：

```text
required validation
length validation
```

---

# 24. Images

Product Images 管理：

```text
Primary
Gallery
Packaging
Ingredients
Usage
Lifestyle
QR
```

字段：

```text
Image URL
Image Type
Alt Text EN
Alt Text ZH
Sort Order
Status
```

PIDB 只保存 Image URL 和 Metadata。

V1.0 不把图片二进制存入 PostgreSQL。

---

# 25. Canada Compliance UI

页面：

```text
Canada Compliance
```

字段：

```text
Importer
Distributor
Canadian Label Status
Cosmetic Notification Status
Compliance Status
Reviewed At
Notes
```

Compliance：

```text
Pending
Reviewing
Approved
Blocked
```

重要逻辑：

```text
Compliance != Approved
        ↓
Cannot Ready
        ↓
Cannot Shopify Publish
```

---

# 26. Readiness Score

Product Editor 显示：

```text
Readiness: 86%
```

检查项目：

```text
✓ Product Code
✓ Brand
✓ Product Type
✓ Original Language
✓ Original Name
✓ English Name
✓ Chinese Name
✓ Description EN
✓ Description ZH
✓ Ingredients
✓ Skin Profile
✓ Images
✓ Usage
✓ Warnings
✓ Canada Compliance
```

例如：

```text
86%

Missing:
- Chinese Description
- Primary Image
```

---

# 27. Status Transition

前端不能绕过后端状态机。

例如：

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

非法操作：

```text
Draft → Published
```

必须由 FastAPI 返回：

```text
INVALID_STATUS_TRANSITION
```

前端显示明确错误。

---

# 28. Product Review

路径：

```text
/admin/review/products
```

列表：

```text
Product
Readiness
Missing Fields
Reviewer
Review Status
Updated
```

操作：

```text
Open
Approve
Return
```

Return 时必须填写原因。

例如：

```text
Chinese description missing.
Primary image missing.
```

---

# 29. Compliance Review

路径：

```text
/admin/review/compliance
```

重点：

```text
Product
Label Status
Notification Status
Claims
Warnings
Compliance Status
Reviewer
```

操作：

```text
Approve
Block
Return for Correction
```

---

# 30. CSV Import UI

路径：

```text
/admin/imports
```

采用 Step Wizard：

```text
Step 1 Upload
      ↓
Step 2 Parse
      ↓
Step 3 Validate
      ↓
Step 4 Preview
      ↓
Step 5 Confirm
      ↓
Step 6 Import Result
```

---

# 31. CSV Upload

支持：

```text
.csv
```

显示：

```text
Filename
File Size
Rows
CSV Version
Upload Time
```

例如：

```text
PIDB-CSV-V1
```

---

# 32. Validation Result

显示：

```text
Total Rows: 1,000
Valid: 932
Warnings: 43
Errors: 25
```

Errors：

```text
Row 125
Field: barcode
Error: DUPLICATE_BARCODE
```

Warnings：

```text
Row 220
Field: ingredients_inci
Warning: UNKNOWN_INGREDIENT
```

---

# 33. Import Preview

必须让用户看到：

```text
New Products
Updated Products
Skipped Products
Errors
```

例如：

```text
New       650
Updated   282
Skipped    25
```

确认之前不写入正式 Product 数据。

---

# 34. Import Confirmation

按钮：

```text
Confirm Import
```

显示：

```text
You are about to import:

932 products

650 new
282 updates

25 invalid rows will be skipped.
```

需要明确确认。

---

# 35. Import History

字段：

```text
Batch ID
Filename
Total
Success
Failed
Status
Created At
```

状态：

```text
Uploaded
Validating
Validated
Importing
Completed
Failed
```

---

# 36. Import Errors

支持：

```text
Filter by Field
Filter by Error Code
Filter by Product Code
Export Errors
```

便于修正 CSV 后重新导入。

---

# 37. Brand Management

路径：

```text
/admin/brands
```

字段：

```text
Brand Name
Country
Website
Status
Product Count
```

操作：

```text
Create
Edit
Deactivate
View Products
```

---

# 38. Taxonomy Management

包括：

```text
Product Types
Skin Types
Skin Concerns
```

原则：

```text
Database Master Data
        ↓
FastAPI
        ↓
React
```

前端不保存一份独立 taxonomy。

---

# 39. Ingredient Management

路径：

```text
/admin/ingredients
```

列表：

```text
INCI Name
Common Name EN
Common Name ZH
Common Name KO
Common Name JA
Functions
Status
Product Count
```

操作：

```text
Create
Edit
Deactivate
View Products
```

---

# 40. QR Management

路径：

```text
/admin/qr
```

字段：

```text
Short Code
Product
Destination
Status
Created At
```

例如：

```text
A8K29
```

QR：

```text
https://yourdomain.ca/p/A8K29
```

当前实现：`/admin/qr` 提供产品选择、QR 生成、短码/公开 URL 展示、复制 URL、打开公开页和 SVG 下载。生成操作由 FastAPI 强制限制为 Admin/Editor；Reviewer 可查看但不能生成。二维码始终指向 PIDB 动态 URL，公开解析时继续执行产品发布状态与加拿大合规门禁。

二维码生成后，实际二维码指向动态 URL。

---

# 41. QR 页面操作

支持：

```text
Generate
View
Download
Deactivate
Regenerate
```

重要原则：

**不要让 QR 直接指向 Shopify Product URL。**

正确：

```text
QR
 ↓
PIDB /p/A8K29
 ↓
Product
 ↓
Shopify / Product Discovery
```

---

# 42. Shopify Management

路径：

```text
/admin/shopify
```

Dashboard：

```text
Connected
Products Synced
Pending
Failed
Last Sync
```

---

# 43. Shopify Sync Queue

显示：

```text
Product
PIDB Status
Compliance
Readiness
Shopify Status
Sync Status
Last Sync
Error
```

状态：

```text
Pending
Processing
Success
Failed
```

---

# 44. Shopify Sync 操作

支持：

```text
Sync Product
Retry
Sync Selected
Sync All Ready
View Error
```

但：

```text
Compliance Approved
+
Readiness 100%
```

才允许进入正式 Shopify Publish 流程。

---

# 45. Shopify Error UI

例如：

```text
SHOPIFY_API_ERROR

HTTP 422

Invalid product data.
```

提供：

```text
Retry
View Product
View Sync Log
```

不要在前端直接暴露：

```text
SHOPIFY_ADMIN_ACCESS_TOKEN
```

---

# 46. Authentication

登录：

```text
/login
```

字段：

```text
Email
Password
```

登录成功：

```text
POST /api/v1/auth/login
        ↓
JWT
        ↓
Auth Store
        ↓
Admin
```

---

# 47. Role Based Access Control

V1.0：

```text
Admin
Editor
Reviewer
```

权限：

| 功能 | Admin | Editor | Reviewer |
|---|---:|---:|---:|
| View Products | ✓ | ✓ | ✓ |
| Create Product | ✓ | ✓ | - |
| Edit Product | ✓ | ✓ | - |
| Review Product | ✓ | - | ✓ |
| Compliance Review | ✓ | - | ✓ |
| CSV Import | ✓ | ✓ | - |
| Shopify Sync | ✓ | ✓ | - |
| QR | ✓ | ✓ | - |
| User Management | ✓ | - | - |
| Settings | ✓ | - | - |

最终权限判断必须由 FastAPI 完成。

React 的权限控制只是 UI 层保护。

---

# 48. Route Guard

例如：

```text
RequireAuth
RequireAdmin
RequireEditor
RequireReviewer
```

用户没有权限：

```text
403 Forbidden
```

而不是仅仅隐藏按钮。

---

# 49. Form Validation

前端负责：

```text
Required
Format
Length
Basic consistency
```

后端负责最终验证。

例如 Barcode：

```text
Frontend:
format validation

Backend:
uniqueness validation
business validation
```

原则：

**Frontend Validation ≠ Backend Validation**

---

# 50. Error Handling

统一处理：

```text
401
403
404
409
422
429
500
502
```

例如：

```text
409 DUPLICATE_RESOURCE
```

显示：

```text
This SKU already exists.
```

而不是：

```text
HTTP 409
```

---

# 51. Loading / Empty / Error State

所有列表页面必须处理：

```text
Loading
Empty
Error
Success
```

例如：

```text
Loading:
Skeleton

Empty:
No products found.

Error:
Failed to load products.
Retry
```

---

# 52. Pagination

统一：

```text
page
per_page
```

最大：

```text
100
```

Product List 默认：

```text
20 / page
```

大型数据不允许前端一次加载全部 Product。

---

# 53. Search Debounce

Keyword Search 使用：

```text
300–500ms debounce
```

避免：

```text
每输入一个字符
        ↓
请求一次 API
```

---

# 54. URL Query State

列表过滤条件建议同步到 URL：

```text
/admin/products?
status=review
&brand=cosrx
&product_type=serum
&page=2
```

优点：

- 浏览器刷新不丢失
- 可以复制 URL
- Back/Forward 正常
- 方便运营工作

---

# 55. Product Detail 页面

建议采用：

```text
Header
Status Bar
Readiness
Basic Information
Classification
Ingredients
Claims
Images
Compliance
QR
Shopify
Audit
```

右侧操作：

```text
Edit
Review
Generate QR
Sync Shopify
```

---

# 56. Unsaved Changes

Product Editor 离开页面时：

```text
You have unsaved changes.
Leave?
```

防止误操作。

---

# 57. Optimistic Update

V1.0 对重要数据：

```text
Product
Compliance
Status
Shopify
```

不建议大量使用 Optimistic Update。

采用：

```text
Mutation
 ↓
Backend
 ↓
Success
 ↓
Invalidate Query
 ↓
Reload
```

数据一致性优先。

---

# 58. React Query Cache Strategy

例如：

```text
products
products/{id}
brands
ingredients
product-types
skin-types
skin-concerns
```

Product 修改成功：

```text
invalidate:
products
products/{id}
```

避免显示旧数据。

---

# 59. API Type Definition

前端 `types/` 必须定义：

```text
Product
ProductSKU
ProductImage
Ingredient
Brand
ProductType
SkinType
SkinConcern
Claim
Compliance
QRCode
ShopifyMapping
ImportBatch
ImportError
User
```

API Response 不能使用：

```text
any
```

尽可能使用 TypeScript strict mode。

---

# 60. TypeScript

推荐：

```text
"strict": true
```

禁止：

```text
any
```

除非有明确技术原因。

API DTO 与 UI Model 可以分离。

例如：

```text
ProductResponse
ProductFormData
ProductListItem
```

不要所有页面共用一个巨大 Product interface。

---

# 61. Component Design

推荐组件：

```text
ProductStatusTag
ComplianceStatusTag
ShopifySyncStatusTag
ReadinessProgress
IngredientSelector
SkinTypeSelector
SkinConcernSelector
ProductTypeSelector
ImageManager
ClaimEditor
ProductHeader
ProductBasicInfo
ProductCompliance
ProductShopify
```

这样 Product Editor 不会成为一个几千行的 React Component。

---

# 62. Common Components

公共：

```text
PageHeader
SearchBar
FilterPanel
ConfirmModal
StatusTag
EmptyState
ErrorState
LoadingState
Pagination
DataTable
PermissionGuard
```

---

# 63. Mobile Admin

Admin 主要面向 Desktop。

推荐：

```text
Desktop-first
Responsive
```

Product Editor 在平板可以使用。

手机不作为主要后台工作平台。

---

# 64. Consumer Frontend

虽然本文件重点是 Admin，但架构必须预留：

```text
/product/:slug
/p/:short_code
/quiz
```

Consumer 页面：

```text
Mobile-first
English
Chinese
```

不直接使用 Admin Layout。

---

# 65. Consumer Product Page

数据来源：

```text
PIDB Public API
```

页面：

```text
Product Image
Brand
Product Name
Product Type
Skin Type
Skin Concerns
Key Ingredients
Description
How To Use
Warnings
Shop Now
```

Shop Now：

```text
Shopify
```

---

# 66. QR Flow

消费者扫描：

```text
QR
 ↓
/p/A8K29
 ↓
PIDB API
 ↓
Product
 ↓
Consumer Product Page
 ↓
Shopify
```

二维码 URL 永久稳定。

---

# 67. Beauty Quiz Frontend

路径：

```text
/quiz
```

流程：

```text
Start
 ↓
Skin Type
 ↓
Main Concern
 ↓
Product Type
 ↓
Routine
 ↓
Sensitivity
 ↓
Ingredient Preference
 ↓
Avoidance
 ↓
Results
```

---

# 68. Quiz Results

显示：

```text
Top 3–6 Products
```

例如：

```text
92% Match
Hydrating Serum

Why:
✓ Suitable for Dry Skin
✓ Matches Hydration
✓ Contains preferred ingredient
```

这些解释由 PIDB Recommendation Service 返回。

前端不自行计算推荐分数。

---

# 69. Security

前端：

```text
Never hard-code secrets
Never store Shopify Admin Token
Never expose database credentials
```

`.env` 只允许：

```text
VITE_API_BASE_URL
```

类似：

```text
SHOPIFY_ADMIN_ACCESS_TOKEN
DATABASE_URL
JWT_SECRET_KEY
```

必须在 Backend。

---

# 70. XSS / HTML

Product Description V1.0：

```text
Plain Text
```

如果未来允许 Rich Text：

必须经过：

```text
sanitize
```

不能直接：

```text
dangerouslySetInnerHTML
```

渲染未经清洗的数据。

---

# 71. Internationalization

Consumer：

```text
English
Chinese
```

Admin V1.0：

```text
English
```

后续可以增加：

```text
Chinese
```

Product 内容本身保持：

```text
EN
ZH
Original
```

不要把多语言 Product 内容依赖前端 i18n。

---

# 72. Frontend Environment

`.env`：

```text
VITE_API_BASE_URL=https://yourdomain.ca/api/v1
```

Development：

```text
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Production：

```text
Nginx
 ↓
/api
 ↓
FastAPI
```

避免浏览器直接访问 FastAPI 内网地址。

---

# 73. Development Commands

推荐：

```bash
npm install
npm run dev
```

Build：

```bash
npm run build
```

Preview：

```bash
npm run preview
```

Lint：

```bash
npm run lint
```

Type Check：

```bash
npm run typecheck
```

---

# 74. Testing

前端 V1.0 至少测试：

```text
Login
Route Guard
Product List
Product Form
Product Validation
CSV Import Flow
Compliance Status
Shopify Sync
QR
Quiz
```

重点测试业务规则，而不是只测试 UI。

---

# 75. E2E Testing

后续推荐：

```text
Playwright
```

核心流程：

```text
Login
 ↓
Create Product
 ↓
Assign Ingredients
 ↓
Compliance Approval
 ↓
Readiness 100%
 ↓
Shopify Sync
```

以及：

```text
CSV Upload
 ↓
Validate
 ↓
Preview
 ↓
Confirm
 ↓
Import
```

---

# 76. Frontend 与 Backend 边界

必须严格：

```text
React
    ↓
展示 + 用户交互 + 基础验证

FastAPI
    ↓
业务规则 + 权限 + 状态机 + 数据验证

PostgreSQL
    ↓
持久化
```

不要把核心业务逻辑复制到 React。

例如：

错误：

```text
if compliance === approved
    publish()
```

正确：

```text
POST /shopify/products/{id}/sync

Backend:
check compliance
check readiness
check status
execute sync
```

---

# 77. V1.0 页面优先级

## P0

必须首先完成：

```text
Login
Dashboard
Products
Product Editor
Brands
Taxonomy
Ingredients
CSV Import
Compliance Review
Shopify Sync
```

## P1

随后：

```text
Claims
QR
Product Review
Users
```

## P2

以后：

```text
Consumer Product Discovery
Beauty Quiz
Analytics
PWA
Advanced Search
```

---

# 78. 推荐开发顺序

前端不要一开始全部开发。

推荐：

```text
Phase 1
├── Vite
├── React
├── TypeScript
├── Ant Design
├── Router
└── API Client

Phase 2
├── Login
├── Auth
├── AdminLayout
└── Permission

Phase 3
├── Product List
├── Product Detail
└── Product Editor

Phase 4
├── Brand
├── Product Type
├── Skin Type
├── Skin Concern
└── Ingredient

Phase 5
├── CSV Import
├── Review
└── Compliance

Phase 6
├── QR
└── Shopify

Phase 7
├── Consumer Product
└── Beauty Quiz
```

---

# 79. 第一阶段真正需要写的代码

不要先开发所有页面。

第一批代码建议只有：

```text
frontend/
├── src/
│   ├── api/
│   │   └── client.ts
│   ├── layouts/
│   │   └── AdminLayout.tsx
│   ├── pages/
│   │   ├── auth/
│   │   │   └── Login.tsx
│   │   └── admin/
│   │       └── Dashboard.tsx
│   ├── routes/
│   │   └── index.tsx
│   ├── stores/
│   │   └── auth.ts
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts
```

先确保：

```text
React
 ↓
Login
 ↓
JWT
 ↓
Admin Layout
 ↓
Dashboard
 ↓
FastAPI
 ↓
PostgreSQL
```

完整跑通。

然后再开发 Product。

---

# 80. MVP 完成标准

当以下流程全部跑通：

```text
CSV
 ↓
PIDB
 ↓
Admin
 ↓
Product Review
 ↓
Compliance Approved
 ↓
Readiness 100%
 ↓
Shopify Sync
 ↓
Shopify Product
```

以及：

```text
QR
 ↓
PIDB Product
 ↓
Consumer Page
 ↓
Shopify
```

以及：

```text
Beauty Quiz
 ↓
PIDB Recommendation Engine
 ↓
Product Results
 ↓
Shopify
```

则 PIDB + Shopify MVP 基础平台完成。

---

# 81. 最终前端架构

```text
                    ┌─────────────────────┐
                    │      Consumer       │
                    │  EN / ZH / Mobile   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    React Frontend   │
                    │                     │
                    │ Admin + Consumer    │
                    └──────────┬──────────┘
                               │
                         REST / JSON
                               │
                               ▼
                    ┌─────────────────────┐
                    │      FastAPI        │
                    │                     │
                    │ Auth                │
                    │ Product             │
                    │ Taxonomy            │
                    │ Ingredient          │
                    │ Import              │
                    │ Compliance          │
                    │ QR                  │
                    │ Quiz                │
                    │ Shopify             │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     PostgreSQL      │
                    │     PIDB Master     │
                    └──────────┬──────────┘
                               │
                               │ API
                               ▼
                    ┌─────────────────────┐
                    │       Shopify       │
                    │ Commerce Master     │
                    └─────────────────────┘
```

---

# 82. V1.0 最终技术结论

最终采用：

```text
Frontend
React
TypeScript
Vite
Ant Design
React Router
TanStack React Query

Backend
FastAPI
Pydantic
SQLAlchemy
Alembic

Database
PostgreSQL

Infrastructure
Nginx
Uvicorn
Ubuntu

External
Shopify Admin API

Testing
Pytest
Playwright
```

V1.0 明确不采用：

```text
Next.js
Nuxt
GraphQL
Redux-heavy architecture
Microservices
API Gateway
Redis
Kafka
RabbitMQ
Elasticsearch
AI Recommendation
```

核心原则：

> **先把 Product Data → PIDB → Admin → Compliance → Shopify 这条数据链跑通，再扩展 Consumer Discovery 和 Beauty Quiz。**

---

# 83. 下一份文档

按照目前的实施顺序，下一步进入：

**#14 — PIDB 前端 UI 页面设计 + React Component Specification V1.0**

重点把实际开发时每个页面进一步固定下来，包括：

```text
Product List
Product Editor
Ingredient Selector
CSV Import Wizard
Compliance Review
Shopify Sync Dashboard
QR Management
Dashboard
Admin Layout
```

并进一步确定：

```text
页面布局
Ant Design Components
字段
按钮
Modal
Table Columns
Form Schema
API 调用
React Query Hook
```

这样下一步就可以从“架构设计”进入**实际写 React 代码**。

---

## 当前实现状态（#15）

已实现的 Admin 页面：

```text
/admin/products
/admin/imports
/admin/shopify
/admin/qr
```

QR Management 已接入产品选择、QR 列表、查看、生成、复制公开 URL、公开页跳转、SVG 下载、停用和再生成。QR 生成、停用和再生成由 FastAPI 强制限制为 Admin/Editor，Reviewer 仅可查看。

Catalog Management 已接入品牌、产品类型、肤质、肤质问题和成分的列表、新增、编辑和停用。目录主数据的写操作由 FastAPI 强制限制为 Admin/Editor，Reviewer 仅可查看。

Review Queue 已接入产品审核和加拿大合规审核入口，复用 Product Editor 的 readiness、生命周期和 compliance 控件。审核状态变更由 FastAPI 强制限制为 Admin/Reviewer。

CSV Import 页面已接入：

```text
Upload → Server Validation → Preview → Confirm → Result
```

确认导入使用已有 FastAPI ImportBatch API，前端不直接处理数据库或导入业务逻辑。
