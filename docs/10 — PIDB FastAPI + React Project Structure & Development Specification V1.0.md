# #10 — PIDB FastAPI + React Project Structure & Development Specification V1.0

**Project:** Beauty Product Information Database (PIDB)  
**Architecture:** FastAPI + React + PostgreSQL  
**Version:** V1.0  
**Status:** Development Specification  
**Date:** 2026-09-01

---

## 1. 文档目的

本文档定义 PIDB 系统采用 **FastAPI + React** 技术栈后的完整项目结构、开发规范、模块边界、代码组织方式、运行方式和开发原则。

本版本正式替代之前的 Laravel 项目结构设计。

核心业务架构不变：

```text
Supplier / 1688 CSV
        │
        ▼
┌─────────────────────┐
│        PIDB         │
│ Product Knowledge   │
│      Master         │
└──────────┬──────────┘
           │ REST API
           ▼
┌─────────────────────┐
│       Shopify       │
│  Commerce Master    │
└─────────────────────┘
```

PIDB 不负责：

- ERP
- WMS
- OMS
- CRM
- Accounting
- Payment
- POS
- Shopify Checkout
- Shopify Inventory Master

PIDB 专注于：

> **Beauty Product Information + Product Standardization + Recommendation + QR + Shopify Product Data Synchronization**

---

# 2. 技术栈

## 2.1 Backend

| Component | Technology |
|---|---|
| Programming Language | Python 3.x |
| Web Framework | FastAPI |
| ORM | SQLAlchemy 2.x |
| Database | PostgreSQL |
| Migration | Alembic |
| Validation | Pydantic v2 |
| HTTP Client | HTTPX |
| Authentication | JWT / OAuth2 |
| Password Hashing | Argon2id 或 bcrypt |
| API Documentation | OpenAPI / Swagger |
| CSV Processing | Python csv，必要时 pandas |
| QR Code | Python QR Code library |
| Testing | pytest |
| Logging | Python logging |
| Background Job | Database Job Queue / FastAPI BackgroundTasks |
| Web Server | Uvicorn |
| Reverse Proxy | Nginx |

---

## 2.2 Frontend

| Component | Technology |
|---|---|
| Language | TypeScript |
| Framework | React |
| Build Tool | Vite |
| Routing | React Router |
| HTTP Client | Axios 或 Fetch |
| Admin UI | Ant Design |
| Consumer UI | Tailwind CSS |
| Form | React Hook Form |
| Validation | Zod |
| State | React Query + Local State |
| Icons | Lucide / Ant Design Icons |

V1.0 不建议引入 Redux。

如果 React Query 已经负责：

- API cache
- loading state
- mutation
- refetch
- server state

则没有必要再增加 Redux。

---

# 3. 总体系统架构

```text
                        Internet
                           │
                           ▼
                      ┌─────────┐
                      │  Nginx  │
                      └────┬────┘
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
      React Frontend              FastAPI Backend
                                      │
                         ┌────────────┼────────────┐
                         │            │            │
                         ▼            ▼            ▼
                    PostgreSQL    Job Queue      Shopify API
                         │
                         │
                         ▼
                  Product Knowledge
                       Database
```

---

# 4. Frontend / Backend 边界

## 4.1 React 负责

React 负责：

- 页面
- UI
- 表单
- 数据展示
- 用户交互
- Client-side routing
- API 调用
- 前端验证
- Loading / Error / Empty State
- Quiz UI
- Product Discovery UI
- Admin UI

React 不直接连接 PostgreSQL。

---

## 4.2 FastAPI 负责

FastAPI 负责：

- Authentication
- Authorization
- Business Logic
- Data Validation
- Database Access
- Product CRUD
- CSV Import
- Product Recommendation
- QR Resolution
- Shopify Synchronization
- Compliance Gate
- Audit Log
- API Rate Limiting
- Background Jobs

React 所有业务数据必须通过 FastAPI REST API 获取。

---

# 5. Repository Structure

推荐采用 Monorepo：

```text
pidb/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── workers/
│   │   ├── utils/
│   │   └── main.py
│   │
│   ├── alembic/
│   │   ├── versions/
│   │   ├── env.py
│   │   └── script.py.mako
│   │
│   ├── tests/
│   │   ├── api/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── fixtures/
│   │
│   ├── requirements.txt
│   ├── .env.example
│   └── pyproject.toml
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── nginx/
│   └── pidb.conf
│
├── docker/
│   ├── backend.Dockerfile
│   └── frontend.Dockerfile
│
├── docker-compose.yml
├── README.md
└── .gitignore
```

---

# 6. Backend Project Structure

## 6.1 app/

```text
backend/app/
│
├── main.py
│
├── api/
│   ├── deps.py
│   ├── router.py
│   │
│   └── v1/
│       ├── auth.py
│       ├── products.py
│       ├── brands.py
│       ├── product_types.py
│       ├── skin_types.py
│       ├── skin_concerns.py
│       ├── ingredients.py
│       ├── claims.py
│       ├── imports.py
│       ├── qr.py
│       ├── quiz.py
│       ├── shopify.py
│       ├── users.py
│       └── health.py
│
├── core/
│   ├── config.py
│   ├── database.py
│   ├── security.py
│   ├── logging.py
│   └── exceptions.py
│
├── models/
│   ├── base.py
│   ├── user.py
│   ├── brand.py
│   ├── product.py
│   ├── product_sku.py
│   ├── product_image.py
│   ├── product_type.py
│   ├── ingredient.py
│   ├── product_ingredient.py
│   ├── skin_type.py
│   ├── product_skin_type.py
│   ├── skin_concern.py
│   ├── product_concern.py
│   ├── product_claim.py
│   ├── product_canada.py
│   ├── product_qr.py
│   ├── shopify_mapping.py
│   ├── sync_log.py
│   ├── import_batch.py
│   ├── import_error.py
│   ├── data_source.py
│   ├── product_source_record.py
│   └── audit_log.py
│
├── schemas/
│   ├── auth.py
│   ├── product.py
│   ├── brand.py
│   ├── ingredient.py
│   ├── taxonomy.py
│   ├── import_schema.py
│   ├── qr.py
│   ├── quiz.py
│   ├── shopify.py
│   └── common.py
│
├── services/
│   ├── product_service.py
│   ├── brand_service.py
│   ├── ingredient_service.py
│   ├── taxonomy_service.py
│   ├── import_service.py
│   ├── normalization_service.py
│   ├── validation_service.py
│   ├── readiness_service.py
│   ├── compliance_service.py
│   ├── qr_service.py
│   ├── quiz_service.py
│   ├── recommendation_service.py
│   ├── shopify_service.py
│   ├── sync_service.py
│   └── audit_service.py
│
├── repositories/
│   ├── product_repository.py
│   ├── brand_repository.py
│   ├── ingredient_repository.py
│   ├── taxonomy_repository.py
│   ├── import_repository.py
│   └── user_repository.py
│
├── workers/
│   ├── job_runner.py
│   ├── import_worker.py
│   └── shopify_worker.py
│
└── utils/
    ├── csv_utils.py
    ├── qr_utils.py
    ├── text_utils.py
    ├── slug_utils.py
    └── country_utils.py
```

---

# 7. FastAPI Application Entry Point

`app/main.py`

主要职责：

1. 创建 FastAPI Application
2. 注册 middleware
3. 注册 API Router
4. 注册异常处理
5. 注册 health check
6. 初始化 logging

逻辑结构：

```text
FastAPI
 │
 ├── Middleware
 │
 ├── Exception Handler
 │
 ├── /api/v1
 │
 └── /health
```

不在 `main.py` 中直接编写业务逻辑。

---

# 8. API Router

统一：

```text
/api/v1/
```

例如：

```text
GET    /api/v1/products
POST   /api/v1/products
GET    /api/v1/products/{id}
PUT    /api/v1/products/{id}

GET    /api/v1/brands
POST   /api/v1/brands

GET    /api/v1/ingredients
POST   /api/v1/ingredients

POST   /api/v1/imports
POST   /api/v1/imports/{id}/validate
GET    /api/v1/imports/{id}/preview
POST   /api/v1/imports/{id}/confirm

GET    /api/v1/qr/{short_code}

GET    /api/v1/quiz/questions
POST   /api/v1/quiz/session
POST   /api/v1/quiz/recommend

POST   /api/v1/shopify/products/{id}/sync
POST   /api/v1/shopify/sync
```

---

# 9. API Layer 设计原则

API Layer 只负责：

```text
Request
   ↓
Validation
   ↓
Authentication
   ↓
Service
   ↓
Response
```

不要把复杂业务逻辑写进：

```text
products.py
quiz.py
imports.py
```

例如：

错误方式：

```python
@router.post("/products")
def create_product(...):
    # 200 lines of business logic
```

正确方式：

```python
@router.post("/products")
def create_product(...):
    return product_service.create(...)
```

---

# 10. Pydantic Schemas

Pydantic 用于 API 数据验证。

例如：

```text
schemas/
    product.py
```

建议至少定义：

```text
ProductCreate
ProductUpdate
ProductResponse
ProductListResponse
ProductFilter
ProductStatusUpdate
```

例如：

```python
class ProductCreate(BaseModel):
    product_code: str
    brand_id: UUID
    product_type_id: UUID
    original_language: str
    original_name: str
    product_name_en: str
    product_name_zh: str | None = None
```

---

# 11. SQLAlchemy Models

SQLAlchemy Model 与数据库表一一对应。

例如：

```text
models/product.py
```

对应：

```text
products
```

关系：

```text
Product
 │
 ├── Brand
 ├── ProductSKU
 ├── ProductImage
 ├── ProductIngredient
 ├── ProductSkinType
 ├── ProductConcern
 ├── ProductClaim
 ├── ProductCanada
 ├── ProductQR
 └── ShopifyMapping
```

不要把 Pydantic Schema 和 SQLAlchemy Model 混合使用。

---

# 12. Repository Layer

Repository 负责数据库访问。

例如：

```python
product_repository.get_by_id()
product_repository.get_by_product_code()
product_repository.search()
product_repository.create()
product_repository.update()
```

Repository 不负责：

- Shopify
- Recommendation
- Compliance
- CSV Business Logic

---

# 13. Service Layer

Service 是系统核心业务层。

推荐：

```text
ProductService
ImportService
NormalizationService
ValidationService
ReadinessService
ComplianceService
RecommendationService
QRService
ShopifyService
SyncService
```

---

# 14. Product Service

负责：

- Product Create
- Product Update
- Product Status
- Product Search
- Product Detail
- Product Readiness

流程：

```text
API
 ↓
ProductService
 ↓
ProductRepository
 ↓
PostgreSQL
```

---

# 15. Product Readiness Service

Product 从：

```text
Draft
```

进入：

```text
Ready
```

之前进行完整检查。

检查：

```text
Basic Information
Brand
Product Type
English Name
Chinese Name
SKU
Barcode
Country
Skin Type
Skin Concern
Ingredients
Description
How To Use
Warnings
Images
Canada Compliance
```

最终：

```text
Readiness Score = 100
AND
Compliance = Approved
```

才能进入：

```text
Ready
```

---

# 16. Compliance Service

Compliance Service 不替代法律顾问或 Health Canada。

其职责是内部状态管理：

```text
Pending
Reviewing
Approved
Blocked
```

例如：

```python
if product.compliance_status != "approved":
    raise ProductNotReadyError()
```

只有：

```text
Approved
```

的产品允许进入 Shopify Publish 流程。

---

# 17. CSV Import Architecture

CSV Import 是 PIDB 最重要的数据入口之一。

完整流程：

```text
Upload
  ↓
Parse
  ↓
Validate
  ↓
Normalize
  ↓
Preview
  ↓
Confirm
  ↓
Upsert
  ↓
Post Validation
  ↓
Import Result
```

API：

```text
POST /imports
POST /imports/{id}/validate
GET  /imports/{id}/preview
POST /imports/{id}/confirm
GET  /imports/{id}/errors
```

---

# 18. CSV Import Service

`import_service.py`

主要职责：

```text
read CSV
parse rows
validate fields
normalize values
resolve aliases
resolve ingredients
create/update products
create/update SKU
create relationships
record errors
record import batch
```

---

# 19. CSV Import 不直接写数据库

推荐：

```text
CSV
 ↓
ImportService
 ↓
ValidationService
 ↓
NormalizationService
 ↓
Repository
 ↓
PostgreSQL
```

禁止：

```text
CSV → SQL INSERT
```

因为这样无法保证：

- 数据标准化
- alias mapping
- transaction
- error tracking
- duplicate detection
- audit

---

# 20. Data Normalization Service

负责：

### Language

```text
Korean → ko
한국어 → ko

Japanese → ja
日本語 → ja

Chinese → zh
中文 → zh

English → en
French → fr
```

### Country

```text
Korea
South Korea
Republic of Korea

→ KR
```

```text
Japan → JP
China → CN
Canada → CA
```

### Multi-value

例如：

```text
Dry | Sensitive | Combination
```

转换：

```text
[
  "Dry",
  "Sensitive",
  "Combination"
]
```

---

# 21. Recommendation Service

`recommendation_service.py`

V1.0 不使用 AI。

采用 Rule-Based Recommendation。

核心评分：

```text
Skin Type       30
Skin Concern    30
Product Type    20
Ingredient      10
Other Preference 10
-------------------
Total           100
```

结果：

```text
90–100  Excellent
75–89   Good
60–74   Potential
<60     Do Not Recommend
```

推荐流程：

```text
Quiz Answers
      ↓
Normalize
      ↓
User Profile
      ↓
Eligible Products
      ↓
Safety / Compliance Filter
      ↓
Scoring
      ↓
Ranking
      ↓
Top 3–6 Products
```

---

# 22. Quiz Service

负责：

```text
Quiz Questions
Quiz Options
Quiz Sessions
Quiz Answers
Quiz Profile
```

API：

```text
GET  /quiz/questions
POST /quiz/session
POST /quiz/session/{id}/answers
POST /quiz/recommend
```

Quiz 不直接查询数据库。

必须：

```text
Quiz API
 ↓
QuizService
 ↓
RecommendationService
 ↓
ProductRepository
```

---

# 23. QR Service

二维码不是直接指向 Shopify。

格式：

```text
https://yourdomain.ca/p/A8K29
```

流程：

```text
QR Code
   ↓
/p/A8K29
   ↓
FastAPI
   ↓
ProductQR
   ↓
Product
   ↓
Product Discovery Page
```

这样以后可以修改：

```text
Shopify Product
Product Page
Campaign
Landing Page
```

而不需要重新打印 QR Code。

---

# 24. Shopify Service

Shopify 是 Commerce Master。

PIDB → Shopify：

```text
Product Name
Description
Brand
Product Type
Skin Type
Skin Concern
Ingredients
Claims
How To Use
Warnings
Images
SKU
Barcode
Country
Metafields
```

Shopify → PIDB 不负责：

```text
Order
Payment
Checkout
Customer
Inventory
Fulfillment
```

---

# 25. Shopify Sync Architecture

V1.0：

```text
React Admin
    ↓
FastAPI
    ↓
SyncService
    ↓
ShopifyService
    ↓
Shopify Admin API
```

同步前：

```text
Compliance Approved?
       │
       ├── NO → BLOCK
       │
       └── YES
             ↓
        Sync to Shopify
```

---

# 26. Shopify Sync Queue

V1.0 不引入：

- Kafka
- RabbitMQ
- Redis
- Celery

先使用 PostgreSQL Job Queue。

例如：

```text
jobs
```

记录：

```text
id
job_type
entity_type
entity_id
status
attempts
available_at
started_at
completed_at
last_error
```

状态：

```text
pending
processing
completed
failed
```

未来如果任务量明显增加，再考虑：

```text
Redis + Celery
```

---

# 27. Worker Architecture

初期：

```text
FastAPI
   +
Database Job Queue
   +
Python Worker
```

例如：

```text
python -m app.workers.job_runner
```

Worker 负责：

```text
CSV Import
Shopify Sync
Retry
```

不要让 API Request 长时间等待 Shopify API。

---

# 28. Authentication

Admin API 使用：

```text
JWT
```

角色：

```text
Admin
Editor
Reviewer
```

权限：

### Admin

全部权限。

### Editor

可以：

```text
Create
Edit
Import
Taxonomy
Images
Ingredients
```

不能：

```text
Final Compliance Approval
```

### Reviewer

可以：

```text
Review
Approve
Reject
Compliance Review
```

---

# 29. Public API

以下功能可以公开：

```text
Product Discovery
QR
Quiz
Recommendation
```

但不能暴露内部数据：

```text
supplier data
audit logs
raw source records
internal compliance notes
sync errors
admin users
```

---

# 30. API Response Standard

成功：

```json
{
  "success": true,
  "data": {}
}
```

错误：

```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_READY",
    "message": "Product is not ready for publishing.",
    "details": {}
  }
}
```

分页：

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 120
  }
}
```

---

# 31. Error Handling

统一异常：

```text
ValidationError
AuthenticationError
AuthorizationError
NotFoundError
DuplicateError
ImportError
ComplianceError
ShopifyError
```

API 层统一转换为 HTTP Response。

---

# 32. Frontend Structure

```text
frontend/src/
│
├── api/
│   ├── client.ts
│   ├── products.ts
│   ├── brands.ts
│   ├── ingredients.ts
│   ├── imports.ts
│   ├── quiz.ts
│   ├── qr.ts
│   └── shopify.ts
│
├── components/
│   ├── common/
│   ├── product/
│   ├── quiz/
│   └── admin/
│
├── features/
│   ├── products/
│   ├── imports/
│   ├── ingredients/
│   ├── quiz/
│   ├── qr/
│   └── shopify/
│
├── layouts/
│   ├── AdminLayout.tsx
│   └── PublicLayout.tsx
│
├── pages/
│   ├── admin/
│   ├── public/
│   ├── quiz/
│   └── qr/
│
├── routes/
│   └── index.tsx
│
├── hooks/
│
├── types/
│
├── utils/
│
├── App.tsx
└── main.tsx
```

---

# 33. React Route Structure

MVP 可以使用一个 React Application。

```text
/
├── /products
├── /products/:slug
├── /quiz
├── /p/:short_code
│
└── /admin
    ├── /dashboard
    ├── /products
    ├── /products/:id
    ├── /brands
    ├── /product-types
    ├── /skin-types
    ├── /skin-concerns
    ├── /ingredients
    ├── /claims
    ├── /imports
    ├── /review
    ├── /shopify
    └── /qr
```

---

# 34. Admin UI

Admin 使用：

```text
React
+
Ant Design
```

主要页面：

```text
Dashboard

Catalog
 ├── Products
 ├── Brands
 ├── Product Types
 ├── Skin Types
 └── Skin Concerns

Ingredients

Claims

Import
 ├── CSV Import
 ├── Import History
 └── Import Errors

Review
 ├── Product Review
 └── Compliance Review

Publishing
 ├── Shopify
 ├── Sync Queue
 └── Sync Errors

QR Codes

System
 ├── Users
 ├── Roles
 └── Settings
```

---

# 35. Product Editor

Product 编辑器建议：

```text
Basic Information
Names
Product Type
Skin Profile
Ingredients
Claims
Description
How To Use
Warnings
Images
Canada Compliance
SKU
QR
Shopify
```

每个 section 独立 Component。

例如：

```text
ProductBasicForm
ProductNameForm
ProductSkinProfile
ProductIngredients
ProductClaims
ProductImages
ProductCompliance
ProductShopify
```

---

# 36. Consumer Website

Consumer Frontend 使用：

```text
React
+
Tailwind CSS
```

核心页面：

```text
Homepage
Product Discovery
Product Detail
Beauty Quiz
Quiz Result
QR Product Page
Category Page
Search
```

最终消费者购买按钮跳转：

```text
PIDB Product Page
       ↓
Shopify Product Page
       ↓
Cart
       ↓
Checkout
```

---

# 37. Product Discovery

消费者页面不直接暴露 PIDB 数据库结构。

例如：

数据库：

```text
product_skin_types
product_concerns
product_ingredients
```

消费者看到：

```text
Best for:
Dry Skin
Sensitive Skin

Helps with:
Hydration
Skin Barrier

Key Ingredients:
Hyaluronic Acid
Ceramides
```

API 输出 Consumer DTO，而不是直接返回 SQLAlchemy Model。

---

# 38. TypeScript Types

前端定义：

```text
types/
├── product.ts
├── brand.ts
├── ingredient.ts
├── quiz.ts
├── qr.ts
└── api.ts
```

例如：

```typescript
export interface Product {
  id: string;
  productCode: string;
  productNameEn: string;
  productNameZh?: string;
  productType: ProductType;
  skinTypes: SkinType[];
  skinConcerns: SkinConcern[];
}
```

---

# 39. API Client

统一：

```text
api/client.ts
```

负责：

```text
Base URL
JWT
Headers
Error Handling
Timeout
```

其他 API：

```text
api/products.ts
api/imports.ts
api/quiz.ts
```

都通过统一 Client。

---

# 40. React Query

建议使用 React Query 管理 Server State。

例如：

```text
useProducts()
useProduct()
useBrands()
useIngredients()
useQuizQuestions()
```

Mutation：

```text
useCreateProduct()
useUpdateProduct()
useImportCSV()
useSyncShopify()
```

这样可以避免在组件内部大量手写：

```text
useEffect
loading
error
refetch
```

---

# 41. State Management

V1.0：

```text
React Local State
+
React Query
```

不引入 Redux。

只有当未来出现复杂跨页面 Client State 时，再考虑 Zustand 等轻量方案。

---

# 42. Security

## Backend

必须：

```text
JWT
Password Hashing
CORS
Rate Limiting
Input Validation
SQLAlchemy Parameterization
Secret Management
HTTPS
```

禁止：

```text
SQL string concatenation
Hard-coded passwords
Hard-coded Shopify token
Hard-coded JWT secret
```

---

# 43. Environment Variables

`.env.example`：

```text
APP_ENV=development

DATABASE_URL=postgresql+psycopg://...

JWT_SECRET_KEY=
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60

SHOPIFY_STORE_DOMAIN=
SHOPIFY_ADMIN_ACCESS_TOKEN=
SHOPIFY_API_VERSION=

CORS_ORIGINS=

QR_BASE_URL=
```

生产环境：

```text
.env
```

不能进入 Git。

---

# 44. PostgreSQL

PIDB 使用 PostgreSQL。

数据库职责：

```text
Product Knowledge
Taxonomy
Ingredients
Recommendation Data
Import Data
QR Mapping
Shopify Mapping
Audit
Jobs
```

主要索引：

```text
products.product_code
products.status
products.brand_id
products.product_type_id

product_skus.sku
product_skus.barcode

ingredients.inci_name

product_qr.short_code

shopify_mapping.shopify_product_id
```

---

# 45. Database Transaction

CSV Import 必须使用 transaction。

基本原则：

```text
One Product
     ↓
One Transaction
```

如果某一个产品失败：

```text
Rollback Product
```

不会导致整个 CSV 全部失败。

---

# 46. Audit Log

重要操作写入：

```text
audit_logs
```

例如：

```text
Product Created
Product Updated
Product Approved
Product Rejected
Product Published
CSV Imported
Shopify Synced
QR Generated
```

记录：

```text
user_id
action
entity_type
entity_id
old_value
new_value
created_at
```

---

# 47. Testing

使用：

```text
pytest
```

测试分为：

```text
Unit Tests
Integration Tests
API Tests
```

重点测试：

### Product

```text
create
update
status
readiness
```

### CSV

```text
parse
validation
normalization
duplicate
upsert
rollback
```

### Recommendation

```text
skin type scoring
concern scoring
product type scoring
ingredient scoring
```

### Shopify

```text
mapping
payload
sync
retry
error handling
```

---

# 48. API Test Example

测试：

```text
POST /api/v1/products
```

检查：

```text
HTTP 201
product ID
product code
status
```

以及：

```text
duplicate product_code
invalid brand
invalid product_type
```

---

# 49. Development Environment

推荐：

```text
Ubuntu
Python
Node.js
PostgreSQL
Nginx
Git
Docker
```

开发环境可以：

```text
FastAPI → localhost:8000
React   → localhost:5173
PostgreSQL → localhost:5432
```

生产环境：

```text
Internet
   ↓
Nginx :443
   ├── /api → FastAPI
   └── /    → React
```

---

# 50. Production Deployment

推荐：

```text
                    Internet
                       │
                     HTTPS
                       │
                    Nginx
                 ┌─────┴─────┐
                 │           │
                 ▼           ▼
              React       FastAPI
                             │
                             ▼
                         PostgreSQL
```

FastAPI：

```text
Uvicorn
```

生产可以使用：

```text
Gunicorn/Uvicorn Workers
```

根据服务器 CPU 和实际负载调整。

---

# 51. Docker

V1.0 可以使用 Docker，但保持简单。

```text
docker-compose.yml
```

服务：

```text
backend
frontend
postgres
nginx
```

不需要：

```text
Kubernetes
Redis
Kafka
RabbitMQ
Elasticsearch
```

---

# 52. Logging

Backend 日志至少包括：

```text
timestamp
level
module
request_id
user_id
message
exception
```

重要操作：

```text
CSV Import
Shopify API
Authentication
Database Error
```

必须有日志。

---

# 53. Monitoring

MVP：

```text
/health
```

检查：

```text
Application
Database
```

例如：

```text
GET /health
```

返回：

```json
{
  "status": "ok",
  "database": "ok"
}
```

未来规模增加后再考虑：

```text
Prometheus
Grafana
Sentry
```

V1.0 不强制。

---

# 54. API Documentation

FastAPI 自动生成：

```text
OpenAPI
Swagger UI
ReDoc
```

开发阶段用于：

```text
API Testing
Frontend Integration
Backend Debugging
```

API 必须保持：

```text
/api/v1/
```

版本化。

---

# 55. Coding Standards

Python：

```text
PEP 8
Type Hints
async/await where appropriate
```

例如：

```python
async def get_product(
    product_id: UUID,
) -> ProductResponse:
    ...
```

TypeScript：

```text
strict: true
```

React：

```text
Functional Components
Hooks
TypeScript
```

禁止：

```text
any
```

除非确有必要。

---

# 56. Business Logic Boundary

必须保持：

```text
Router
  ↓
Service
  ↓
Repository
  ↓
Database
```

而不是：

```text
Router
  ↓
Database
```

也不是：

```text
React
  ↓
Database
```

---

# 57. Module Dependency Rules

允许：

```text
API → Service
Service → Repository
Repository → Model
Schema → API
```

不允许：

```text
Repository → API
Model → Service
Frontend → PostgreSQL
```

Shopify：

```text
ShopifyService
```

只能由 Service Layer 调用。

---

# 58. V1.0 不做的技术

明确不引入：

```text
Microservices
GraphQL
API Gateway
Kubernetes
Kafka
RabbitMQ
Redis
Elasticsearch
Celery
AI Recommendation
Vector Database
LLM
Event Bus
```

原因：

PIDB MVP 当前产品规模不需要这些基础设施。

优先保证：

```text
Data Quality
Product Standardization
CSV Import
Recommendation
QR
Shopify Sync
```

---

# 59. V1.0 开发优先级

## Phase 1 — Foundation

```text
FastAPI
PostgreSQL
SQLAlchemy
Alembic
React
TypeScript
Vite
Authentication
```

---

## Phase 2 — Product Master

```text
Brand
Product
SKU
Product Type
Skin Type
Skin Concern
Ingredient
Image
Claims
```

---

## Phase 3 — CSV Import

```text
CSV Upload
Validation
Normalization
Preview
Import
Error
History
```

---

## Phase 4 — Product Review

```text
Readiness
Compliance
Review
Approval
```

---

## Phase 5 — QR

```text
QR Generation
QR Mapping
QR Resolution
Public Product Page
```

---

## Phase 6 — Beauty Quiz

```text
Questions
Answers
Profile
Recommendation
Result Page
```

---

## Phase 7 — Shopify

```text
Shopify Credentials
Product Mapping
Sync Queue
Product Sync
Sync Log
Retry
```

---

# 60. Recommended Development Sequence

实际开发不要同时开始所有模块。

推荐顺序：

```text
1. PostgreSQL Schema
        ↓
2. SQLAlchemy Models
        ↓
3. Alembic Migration
        ↓
4. FastAPI Core
        ↓
5. Authentication
        ↓
6. Product CRUD
        ↓
7. Taxonomy
        ↓
8. Ingredient
        ↓
9. CSV Import
        ↓
10. Product Review
        ↓
11. QR
        ↓
12. Beauty Quiz
        ↓
13. Recommendation
        ↓
14. Shopify Sync
        ↓
15. Consumer Frontend
        ↓
16. Production Deployment
```

---

# 61. 最终技术架构

PIDB V1.0 最终确定：

```text
                    ┌──────────────────────┐
                    │       Customer       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    React Frontend    │
                    │   TypeScript + Vite  │
                    └──────────┬───────────┘
                               │ REST
                               ▼
                    ┌──────────────────────┐
                    │    FastAPI Backend   │
                    ├──────────────────────┤
                    │ API                  │
                    │ Services             │
                    │ Validation           │
                    │ Recommendation       │
                    │ QR                   │
                    │ Import               │
                    │ Shopify Sync         │
                    └──────────┬───────────┘
                               │
                   ┌───────────┴───────────┐
                   │                       │
                   ▼                       ▼
          ┌──────────────────┐   ┌─────────────────┐
          │   PostgreSQL     │   │  Shopify API    │
          │                  │   │                 │
          │ Product Master   │   │ Commerce Master │
          │ Knowledge Master │   │                 │
          └──────────────────┘   └─────────────────┘
```

---

# 62. 最终架构原则

PIDB V1.0 遵循以下原则：

### 原则 1

**PIDB 是 Product Knowledge Master。**

### 原则 2

**Shopify 是 Commerce Master。**

### 原则 3

**FastAPI 是唯一 Backend API。**

### 原则 4

**React 不直接访问数据库。**

### 原则 5

**PostgreSQL 是 PIDB V1.0 唯一核心数据库。**

### 原则 6

**CSV 是主要商品数据导入入口之一。**

### 原则 7

**所有商品进入 Shopify 前必须经过 Compliance Gate。**

### 原则 8

**Beauty Quiz V1.0 使用 Rule-Based Recommendation，不使用 AI。**

### 原则 9

**QR 使用 PIDB Dynamic URL，不直接绑定 Shopify URL。**

### 原则 10

**先使用单体模块化架构，不提前微服务化。**

---

# 63. V1.0 最终 Stack

```text
Frontend
────────
React
TypeScript
Vite
Ant Design
Tailwind CSS
React Query
React Router
React Hook Form
Zod


Backend
───────
Python
FastAPI
Pydantic v2
SQLAlchemy 2.x
Alembic
HTTPX
JWT
pytest


Database
────────
PostgreSQL


Infrastructure
──────────────
Nginx
Uvicorn
Docker
Ubuntu


External
────────
Shopify Admin API
```

---

# 64. 与前面 #01–#09 的关系

最终系统文档结构：

```text
#01 Product Information Database Specification
       ↓
#04 PIDB ↔ Shopify Integration
       ↓
#05 Database Schema & CSV Import
       ↓
#06 Admin UI
       ↓
#07 Data Dictionary & Mapping
       ↓
#08 Taxonomy & Recommendation
       ↓
#09 API Specification
       ↓
#10 FastAPI + React Project Structure   ← 本文
       ↓
#11 PostgreSQL Schema + SQLAlchemy
       ↓
#12 FastAPI API Implementation
       ↓
#13 React Admin Implementation
       ↓
#14 CSV Import Implementation
       ↓
#15 QR + Beauty Quiz
       ↓
#16 Shopify Integration
       ↓
#17 Deployment
```

---

# 65. 本文结论

PIDB V1.0 正式采用：

> **FastAPI + React + PostgreSQL + Shopify**

作为技术底座。

架构采用：

> **Modular Monolith + REST API**

而不是 Microservices。

Backend：

> **FastAPI + SQLAlchemy + Pydantic + Alembic**

Frontend：

> **React + TypeScript + Vite**

Database：

> **PostgreSQL**

Commerce：

> **Shopify**

Recommendation：

> **Rule-Based**

Data Import：

> **CSV**

QR：

> **Dynamic PIDB URL**

该技术架构能够覆盖当前 MVP，同时保留未来扩展 B2B、PWA、更多 Beauty Categories、更多语言以及更复杂 Recommendation Engine 的空间。