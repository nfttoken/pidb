# #14 — PIDB 前端 UI 页面设计 + React Component Specification V1.0

**项目名称：** Beauty Product Information Database（PIDB）  
**文档编号：** #14  
**版本：** V1.0  
**前端：** React + TypeScript + Vite + Ant Design + TanStack React Query  
**后端：** FastAPI  
**数据库：** PostgreSQL

---

## 1. 文档目的

本文件将 #13 React Admin Frontend Implementation Specification 进一步落到 UI 和组件实现层。

目标是让开发人员可以依据本文件直接开始编写 React 前端，而不需要再次决定：

- 页面结构
- Table Columns
- Form Fields
- Buttons
- Modal
- Drawer
- API 调用
- React Query Hooks
- 权限控制
- 页面状态
- Product Editor 组件拆分

核心原则：

> React 负责 UI、交互和展示；FastAPI 负责业务规则、权限和最终数据验证。

---

# 2. Admin UI 总体结构

```text
Admin Application
│
├── Auth
│   └── Login
│
└── AdminLayout
    │
    ├── Dashboard
    │
    ├── Catalog
    │   ├── Products
    │   ├── Brands
    │   └── Taxonomy
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

---

# 3. UI Design System

## 3.1 Layout

使用 Ant Design：

```text
Layout
Sider
Header
Content
Breadcrumb
```

推荐：

- Desktop：固定左侧 Sidebar
- Tablet：Sidebar 可折叠
- Mobile：Sidebar Drawer

---

## 3.2 Page Header

所有后台页面统一：

```text
Breadcrumb
Page Title
Description
Primary Action
Secondary Actions
```

例如：

```text
Catalog / Products

Products
Manage beauty product information.

[Import CSV] [Create Product]
```

---

# 4. 通用组件

建议建立：

```text
src/components/common/
├── PageHeader.tsx
├── SearchBar.tsx
├── FilterPanel.tsx
├── StatusTag.tsx
├── ComplianceTag.tsx
├── ShopifyStatusTag.tsx
├── ReadinessProgress.tsx
├── ConfirmModal.tsx
├── EmptyState.tsx
├── ErrorState.tsx
├── LoadingState.tsx
├── PermissionGuard.tsx
└── DataTable.tsx
```

---

# 5. Dashboard

## Route

```text
/admin/dashboard
```

## Layout

```text
PageHeader
│
├── Product Statistics
├── Compliance Statistics
├── Shopify Statistics
└── Recent Activity
```

## KPI Cards

```text
Total Products
Draft
Review
Ready
Published
Compliance Pending
Compliance Approved
Shopify Errors
```

## Components

```text
DashboardKpiCard
ProductStatusChart
ComplianceStatusChart
RecentImportTable
RecentSyncTable
```

## API

```text
GET /api/v1/dashboard/summary
GET /api/v1/dashboard/recent-imports
GET /api/v1/dashboard/recent-syncs
```

如果 Dashboard API 在 V1.0 暂未实现，可以先由前端调用已有列表 API 组合，但最终建议增加专用 Dashboard API。

---

# 6. Product List

## Route

```text
/admin/products
```

## Page Structure

```text
PageHeader
│
├── SearchBar
├── FilterPanel
├── BulkActionBar
└── ProductTable
```

## Table Columns

```text
Product Code
Product
Brand
Product Type
Original Language
Country
SKU
Barcode
Status
Compliance
Shopify
Readiness
Updated
Actions
```

## Product Column

显示：

```text
Primary Image
Product Name EN
Product Name ZH
Original Name
```

## Status

使用：

```text
ProductStatusTag
```

## Compliance

使用：

```text
ComplianceTag
```

## Shopify

使用：

```text
ShopifyStatusTag
```

## Readiness

使用：

```text
Progress
```

例如：

```text
86%
```

---

# 7. Product Search

SearchBar 支持：

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

API：

```text
GET /api/v1/products
```

Query：

```text
page
per_page
search
brand_id
product_type_id
skin_type_id
skin_concern_id
ingredient_id
original_language
country_of_origin
status
compliance_status
shopify_sync_status
```

---

# 8. Product Filters

使用：

```text
Select
Multiple Select
AutoComplete
```

Filters：

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
Shopify Status
```

Taxonomy 数据来自 API：

```text
GET /api/v1/brands
GET /api/v1/product-types
GET /api/v1/skin-types
GET /api/v1/skin-concerns
GET /api/v1/ingredients
```

前端禁止硬编码 taxonomy。

---

# 9. Product Actions

单产品：

```text
View
Edit
Review
Change Status
Generate QR
Sync Shopify
```

Bulk：

```text
Change Status
Generate QR
Sync Shopify
Export CSV
```

危险操作必须使用：

```text
Modal.confirm()
```

---

# 10. Product Detail

## Route

```text
/admin/products/:id
```

## Layout

```text
ProductHeader
│
├── Status
├── Readiness
├── Compliance
└── Actions

Tabs
├── Overview
├── Classification
├── Ingredients
├── Claims
├── Images
├── Usage
├── Warnings
├── Canada Compliance
├── QR
└── Shopify
```

---

# 11. Product Header

显示：

```text
Product Name EN
Product Name ZH
Product Code
Brand
Status
Compliance
Readiness
```

操作：

```text
Edit
Review
Generate QR
Sync Shopify
```

---

# 12. Product Editor

## Route

```text
/admin/products/new
/admin/products/:id/edit
```

核心组件：

```text
ProductForm
├── BasicInfoSection
├── NameSection
├── ClassificationSection
├── SkinProfileSection
├── IngredientSection
├── ClaimSection
├── UsageSection
├── WarningSection
├── ImageSection
├── ComplianceSection
├── QRSection
└── ShopifySection
```

---

# 13. Basic Information Form

字段：

```text
product_code
brand_id
original_language
original_name
country_of_origin
```

UI：

```text
Input
Select
```

Product Code：

```text
KR-SERUM-001
```

建议新建 Product 时由后端生成或允许管理员输入。

修改已有 Product 时 Product Code 默认不可修改。

---

# 14. Name Section

字段：

```text
original_name
product_name_en
product_name_zh
```

UI：

```text
Input
Input
Input
```

原始语言：

```text
ko
ja
zh
en
fr
other
```

---

# 15. Description Section

字段：

```text
description_en
description_zh
```

V1.0：

```text
Input.TextArea
```

不要在第一版引入复杂 Rich Text Editor。

---

# 16. Classification Section

字段：

```text
product_type_id
```

API：

```text
GET /api/v1/product-types
```

组件：

```text
ProductTypeSelector
```

---

# 17. Skin Profile Section

字段：

```text
skin_types
skin_concerns
```

组件：

```text
SkinTypeSelector
SkinConcernSelector
```

均为 Multiple Select。

---

# 18. Ingredient Section

组件：

```text
IngredientManager
```

UI：

```text
┌─────────────────────────────────────┐
│ Search Ingredient                   │
│ [ Niacinamide              ] [Add] │
├─────────────────────────────────────┤
│ Order │ Ingredient │ Key │ Action  │
│  1    │ Niacinamide│  ✓  │ Delete  │
│  2    │ Glycerin   │     │ Delete  │
└─────────────────────────────────────┘
```

功能：

```text
Add
Delete
Reorder
Set Key Ingredient
```

---

# 19. Ingredient Selector

组件：

```text
IngredientSelector
```

搜索：

```text
INCI Name
Common Name EN
Common Name ZH
KO
JA
```

API：

```text
GET /api/v1/ingredients?search=...
```

使用 debounce。

---

# 20. Claims Section

组件：

```text
ClaimManager
ClaimEditor
```

字段：

```text
claim_en
claim_zh
claim_type
source
approved
```

显示：

```text
Approved
Pending
Rejected
```

只有 approved claim 可以进入 Shopify Publish 数据。

---

# 21. Usage Section

字段：

```text
how_to_use_en
how_to_use_zh
```

组件：

```text
Input.TextArea
```

---

# 22. Warning Section

字段：

```text
warnings_en
warnings_zh
```

显示为独立 Card。

---

# 23. Image Manager

组件：

```text
ImageManager
```

支持：

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
image_url
image_type
alt_text_en
alt_text_zh
sort_order
status
```

V1.0：

- 保存 URL
- 不保存图片 binary 到 PostgreSQL

---

# 24. Canada Compliance Section

组件：

```text
CompliancePanel
```

字段：

```text
importer_name
distributor_name
canadian_label_status
cosmetic_notification_status
compliance_status
reviewed_at
notes
```

状态：

```text
Pending
Reviewing
Approved
Blocked
```

---

# 25. Compliance UI Safety Gate

前端必须明显显示：

```text
Compliance: Approved
```

或者：

```text
Compliance: Pending
```

当 Compliance 不是 Approved：

```text
Shopify Publish
```

按钮应该 disabled。

但是：

> disabled 只是 UI 层保护；后端仍必须重新验证。

---

# 26. Readiness Component

组件：

```text
ReadinessProgress
```

显示：

```text
Readiness
86%
```

点击后打开：

```text
ReadinessDrawer
```

显示：

```text
✓ Product Code
✓ Brand
✓ Product Type
✓ Original Name
✓ English Name
✓ Chinese Name
✓ Ingredients
✗ Primary Image
✗ Chinese Description
```

---

# 27. Status Change Modal

组件：

```text
StatusChangeModal
```

显示：

```text
Current Status:
Review

New Status:
[ Ready ▼ ]

Reason:
[................]

[Cancel] [Confirm]
```

API：

```text
POST /api/v1/products/{id}/status
```

后端负责状态机验证。

---

# 28. Product Review Page

## Route

```text
/admin/review/products
```

Table：

```text
Product
Readiness
Missing Fields
Status
Reviewer
Updated
Actions
```

Actions：

```text
Open
Approve
Return
```

Return：

```text
ReviewReturnModal
```

必须填写原因。

---

# 29. Compliance Review Page

## Route

```text
/admin/review/compliance
```

Table：

```text
Product
Label Status
Notification Status
Claims
Compliance Status
Reviewer
Updated
Actions
```

Actions：

```text
Review
Approve
Block
Return
```

---

# 30. CSV Import Page

## Route

```text
/admin/imports/new
```

使用：

```text
Steps
Upload
Validate
Preview
Confirm
Result
```

---

# 31. CSV Upload Step

组件：

```text
CsvUploader
```

支持：

```text
.csv
```

显示：

```text
Filename
Size
Rows
CSV Version
```

API：

```text
POST /api/v1/imports
```

---

# 32. CSV Validation Step

组件：

```text
ImportValidationResult
```

显示：

```text
Total
Valid
Warnings
Errors
```

API：

```text
POST /api/v1/imports/{id}/validate
```

---

# 33. CSV Preview Step

组件：

```text
ImportPreviewTable
```

分类：

```text
New
Updated
Skipped
Errors
```

API：

```text
GET /api/v1/imports/{id}/preview
```

---

# 34. CSV Confirm Step

组件：

```text
ImportConfirmModal
```

显示最终统计。

API：

```text
POST /api/v1/imports/{id}/confirm
```

---

# 35. Import History

## Route

```text
/admin/imports
```

Columns：

```text
Batch ID
Filename
Total Rows
Success
Failed
Status
Created At
Actions
```

---

# 36. Import Errors

## Route

```text
/admin/imports/:id/errors
```

Columns：

```text
Row
Product Code
Field
Error Code
Message
Raw Value
```

操作：

```text
Export Errors
```

---

# 37. Brand Management

## Route

```text
/admin/brands
```

Table：

```text
Brand Name
Country
Website
Product Count
Status
Updated
Actions
```

Actions：

```text
Create
Edit
Deactivate
View Products
```

---

# 38. Taxonomy Management

页面：

```text
/admin/product-types
/admin/skin-types
/admin/skin-concerns
```

通用组件：

```text
TaxonomyTable
TaxonomyForm
```

不要建立三套完全重复的 UI。

---

# 39. Ingredient Management

## Route

```text
/admin/ingredients
```

Columns：

```text
INCI Name
Common Name EN
Common Name ZH
Common Name KO
Common Name JA
Functions
Product Count
Status
Actions
```

---

# 40. QR Management

## Route

```text
/admin/qr
```

Columns：

```text
Short Code
Product
Destination
Status
Created At
Actions
```

Actions：

```text
View
Generate
Download
Deactivate
```

---

# 41. QR Detail Drawer

显示：

```text
Product
Short Code
Public URL
QR Preview
Status
Created At
```

Public URL：

```text
https://yourdomain.ca/p/A8K29
```

---

# 42. Shopify Dashboard

## Route

```text
/admin/shopify
```

KPI：

```text
Connected
Synced
Pending
Failed
Last Sync
```

---

# 43. Shopify Sync Queue

## Route

```text
/admin/shopify/sync
```

Columns：

```text
Product
Readiness
Compliance
PIDB Status
Shopify Status
Sync Status
Last Sync
Error
Actions
```

---

# 44. Shopify Sync Actions

```text
Sync Product
Retry
Sync Selected
Sync All Ready
```

Sync 前端按钮显示条件：

```text
Readiness = 100%
Compliance = Approved
```

最终由 Backend 再次验证。

---

# 45. Shopify Sync Error

## Route

```text
/admin/shopify/errors
```

Columns：

```text
Product
Error Code
Message
Time
Retry Count
Status
Actions
```

Actions：

```text
Retry
View Product
View Log
```

---

# 46. Authentication UI

## Route

```text
/login
```

表单：

```text
Email
Password
Remember Me
Login
```

API：

```text
POST /api/v1/auth/login
GET /api/v1/auth/me
```

---

# 47. Auth Flow

```text
Login
 ↓
POST /auth/login
 ↓
JWT
 ↓
Auth Store
 ↓
GET /auth/me
 ↓
Permission
 ↓
Admin Dashboard
```

401：

```text
Clear Auth
Redirect /login
```

---

# 48. Permission Guard

组件：

```text
PermissionGuard
```

使用：

```text
<PermissionGuard permission="product.edit">
    <EditButton />
</PermissionGuard>
```

但是后端必须再次验证。

---

# 49. React Query Hooks

推荐：

```text
features/products/hooks/
├── useProducts.ts
├── useProduct.ts
├── useCreateProduct.ts
├── useUpdateProduct.ts
├── useChangeProductStatus.ts
└── useProductReadiness.ts
```

其他：

```text
useBrands
useIngredients
useProductTypes
useSkinTypes
useSkinConcerns
useClaims
useImports
useCompliance
useQr
useShopifySync
```

---

# 50. Query Key

统一：

```text
['products']
['products', id]
['brands']
['ingredients']
['product-types']
['skin-types']
['skin-concerns']
['imports']
['imports', id]
['qr']
['shopify']
```

Product 修改后：

```text
invalidateQueries(['products'])
invalidateQueries(['products', id])
```

---

# 51. API Layer

示例结构：

```text
api/
├── client.ts
├── auth.ts
├── products.ts
├── brands.ts
├── taxonomy.ts
├── ingredients.ts
├── claims.ts
├── imports.ts
├── compliance.ts
├── qr.ts
└── shopify.ts
```

Component 不直接写：

```text
axios.get(...)
```

而应该：

```text
useProducts()
```

---

# 52. Product API Mapping

| UI | API |
|---|---|
| Product List | GET /products |
| Product Detail | GET /products/{id} |
| Create | POST /products |
| Update | PUT /products/{id} |
| Status | POST /products/{id}/status |
| Readiness | GET /products/{id}/readiness |
| Shopify Sync | POST /shopify/products/{id}/sync |
| QR | POST /products/{id}/qr |

---

# 53. Form Submit Strategy

Product Editor：

```text
Save Draft
```

调用：

```text
POST /products
PUT /products/{id}
```

成功：

```text
invalidate product query
invalidate product list query
show success message
```

不要在保存后手工修改大量本地状态。

---

# 54. Unsaved Changes

Product Editor 如果存在修改：

```text
You have unsaved changes.
```

离开时：

```text
Leave
Stay
```

浏览器关闭可以使用：

```text
beforeunload
```

---

# 55. Loading State

统一：

```text
Skeleton
Spin
```

例如 Product Detail：

```text
ProductHeader Skeleton
Form Skeleton
```

不要只显示空白页面。

---

# 56. Error State

统一：

```text
ErrorState
```

显示：

```text
Unable to load product.

[Retry]
```

API Error 映射：

```text
404 → Product not found
409 → Duplicate resource
422 → Validation error
429 → Too many requests
500 → Server error
502 → External service error
```

---

# 57. Notification

成功：

```text
message.success()
```

错误：

```text
message.error()
```

重要操作：

```text
Modal.confirm()
```

例如：

```text
Product saved successfully.
Shopify sync started.
QR code generated.
```

---

# 58. Table UX

所有大型 Table 支持：

```text
Pagination
Sorting
Filtering
Column width
Horizontal scroll
Row selection
```

默认：

```text
20 rows/page
```

最大：

```text
100 rows/page
```

---

# 59. Mobile / Responsive

Admin 不是 Mobile-first。

优先：

```text
Desktop
Tablet
Mobile
```

Product List 在手机上可以：

```text
Card/List mode
```

Product Editor 在手机上：

```text
单列 Form
```

---

# 60. Consumer UI 预留

虽然 #14 重点是 Admin，但 React Router 必须预留：

```text
/product/:slug
/p/:short_code
/quiz
```

Consumer 不使用：

```text
AdminLayout
```

而使用：

```text
ConsumerLayout
```

---

# 61. Consumer Product Components

未来：

```text
ProductHero
ProductSummary
IngredientHighlights
SkinProfile
Claims
HowToUse
Warnings
ShopNowButton
RelatedProducts
```

---

# 62. Beauty Quiz Components

未来：

```text
QuizContainer
QuizProgress
QuizQuestion
QuizOption
QuizNavigation
QuizResult
RecommendationCard
```

API：

```text
GET /api/v1/quiz/questions
POST /api/v1/quiz/session
POST /api/v1/quiz/session/{id}/answers
POST /api/v1/quiz/recommend
```

---

# 63. Recommendation UI

后端返回：

```text
product
score
tier
reasons
```

前端只负责：

```text
Display
```

例如：

```text
92% Match

Hydrating Serum

✓ Suitable for Dry Skin
✓ Matches Hydration
✓ Contains preferred ingredient
```

前端不重新计算推荐分数。

---

# 64. Internationalization

Consumer：

```text
EN
ZH
```

Product 内容：

```text
product_name_en
product_name_zh
description_en
description_zh
how_to_use_en
how_to_use_zh
warnings_en
warnings_zh
```

Admin V1.0 默认 English UI。

---

# 65. Frontend Security Rules

禁止：

```text
Shopify Admin Token
Database Password
JWT Secret
Private API Keys
```

出现在：

```text
React
VITE_* environment
Browser LocalStorage
Frontend Bundle
```

前端只能知道：

```text
VITE_API_BASE_URL
```

以及必要的 public configuration。

---

# 66. Recommended Auth Storage

V1.0 推荐：

```text
Access Token
短生命周期
```

如果后端采用 HttpOnly Cookie，则前端不需要直接保存 JWT。

最终以 #12 FastAPI Authentication 实现为准。

优先安全性，而不是追求前端实现简单。

---

# 67. Frontend Environment

Development：

```text
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Production：

```text
VITE_API_BASE_URL=/api/v1
```

生产环境推荐：

```text
Browser
 ↓
Nginx
 ├── /api → FastAPI
 └── / → React static files
```

---

# 68. 推荐 Vite Route

```text
/
├── login
├── admin
│   ├── dashboard
│   ├── products
│   ├── brands
│   ├── taxonomy
│   ├── ingredients
│   ├── claims
│   ├── imports
│   ├── review
│   ├── compliance
│   ├── qr
│   └── shopify
│
├── product/:slug
├── p/:short_code
└── quiz
```

---

# 69. 第一阶段实际开发范围

不要一次开发全部 UI。

## Sprint 1

```text
Vite
React
TypeScript
Ant Design
Router
API Client
Auth
AdminLayout
Dashboard
```

## Sprint 2

```text
Product List
Product Detail
Product Create
Product Edit
```

## Sprint 3

```text
Brands
Product Types
Skin Types
Skin Concerns
Ingredients
```

## Sprint 4

```text
CSV Import
Import History
Import Errors
```

## Sprint 5

```text
Product Review
Compliance Review
Readiness
```

## Sprint 6

```text
QR
Shopify
Sync Queue
Sync Errors
```

## Sprint 7

```text
Consumer Product
Beauty Quiz
```

---

# 70. Product Editor 第一优先级

如果资源有限，优先完成：

```text
Basic Information
Names
Classification
Skin Profile
Ingredients
Description
Usage
Warnings
Images
Compliance
```

这部分是整个 PIDB 的核心。

---

# 71. 最终 Component Tree

```text
AdminLayout
│
├── Header
├── Sidebar
└── Content
    │
    └── ProductEditor
        │
        ├── ProductHeader
        ├── BasicInfoSection
        ├── NameSection
        ├── ClassificationSection
        ├── SkinProfileSection
        ├── IngredientManager
        │   └── IngredientSelector
        ├── ClaimManager
        ├── DescriptionSection
        ├── UsageSection
        ├── WarningSection
        ├── ImageManager
        ├── CompliancePanel
        ├── ReadinessProgress
        ├── QRPanel
        └── ShopifyPanel
```

---

# 72. 最终前端数据流

```text
User
 ↓
React Component
 ↓
React Query Hook
 ↓
API Module
 ↓
FastAPI REST API
 ↓
Service
 ↓
Repository
 ↓
PostgreSQL
```

修改：

```text
User
 ↓
Form
 ↓
Mutation
 ↓
FastAPI
 ↓
PostgreSQL
 ↓
Success
 ↓
Invalidate Query
 ↓
Refresh UI
```

---

# 73. 最终架构原则

PIDB Frontend 必须遵循以下原则：

1. Product Knowledge 以 PIDB 为 Master。
2. Shopify 不是 Product Editor 的数据源。
3. React 不保存完整数据库状态。
4. React Query 管理 Server State。
5. Taxonomy 从 API 获取，不在前端 hard-code。
6. 权限最终由 FastAPI 判断。
7. Compliance Safety Gate 最终由 Backend 判断。
8. Shopify Sync 最终由 Backend 判断。
9. Recommendation Score 由 Backend 计算。
10. 前端不保存 Shopify Admin Token。
11. Product Editor 必须模块化。
12. V1.0 优先简单、稳定、可维护。
13. 不提前引入 Redux-heavy architecture、GraphQL、Microservices、Redis 等复杂组件。

---

# 74. V1.0 完成标准

当以下流程可以在浏览器中完整运行：

```text
Login
 ↓
Dashboard
 ↓
Product List
 ↓
Create Product
 ↓
Edit Product
 ↓
Add Ingredients
 ↓
Set Skin Profile
 ↓
Upload Image URL
 ↓
Compliance Review
 ↓
Readiness 100%
 ↓
Generate QR
 ↓
Shopify Sync
```

则 PIDB Admin Frontend V1.0 的核心功能完成。

下一阶段进入：

**#15 — PIDB FastAPI + React 可运行项目代码骨架 V1.0**

目标不是继续写设计文档，而是直接生成：

```text
pidb/
├── backend/
└── frontend/
```

并让：

```text
PostgreSQL
    ↓
FastAPI
    ↓
React
```

真正启动运行。
