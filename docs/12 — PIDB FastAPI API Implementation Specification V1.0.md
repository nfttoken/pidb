# #12 — PIDB FastAPI API Implementation Specification V1.0

**Project:** Beauty Product Information Database (PIDB)  
**Backend:** FastAPI  
**Database:** PostgreSQL  
**ORM:** SQLAlchemy 2.x  
**Validation:** Pydantic v2  
**Migration:** Alembic  
**API:** REST API  
**Version:** V1.0  
**Status:** Development Specification  
**Date:** 2026-09-01

---

# 1. 文档目的

本文档将：

- #09 PIDB API Specification
- #10 FastAPI + React Project Structure
- #11 PostgreSQL + SQLAlchemy Database Specification

正式连接起来。

本文件定义：

```text
FastAPI Application
API Router
Dependency Injection
Pydantic Schema
Service
Repository
SQLAlchemy
PostgreSQL
Authentication
Authorization
Pagination
Filtering
Error Handling
```

目标：

> 开发人员可以根据本文档直接开始编写 FastAPI Backend。

---

# 2. Backend Architecture

最终采用：

```text
React
  │
  │ HTTPS / REST
  ▼
FastAPI
  │
  ├── Router
  │
  ├── Schema
  │
  ├── Service
  │
  ├── Repository
  │
  └── SQLAlchemy
          │
          ▼
      PostgreSQL
```

---

# 3. Request Flow

标准请求：

```text
HTTP Request
     ↓
FastAPI Router
     ↓
Authentication
     ↓
Pydantic Validation
     ↓
Service
     ↓
Repository
     ↓
SQLAlchemy
     ↓
PostgreSQL
     ↓
Repository
     ↓
Service
     ↓
Pydantic Response
     ↓
HTTP Response
```

---

# 4. Project Structure

最终 Backend：

```text
backend/
│
├── app/
│   ├── main.py
│
│   ├── api/
│   │   ├── deps.py
│   │   ├── router.py
│   │   │
│   │   └── v1/
│   │       ├── auth.py
│   │       ├── products.py
│   │       ├── brands.py
│   │       ├── product_types.py
│   │       ├── skin_types.py
│   │       ├── skin_concerns.py
│   │       ├── ingredients.py
│   │       ├── claims.py
│   │       ├── imports.py
│   │       ├── qr.py
│   │       ├── quiz.py
│   │       ├── shopify.py
│   │       ├── users.py
│   │       └── health.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── security.py
│   │   ├── exceptions.py
│   │   └── logging.py
│   │
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── repositories/
│   ├── workers/
│   └── utils/
│
├── alembic/
├── tests/
├── requirements.txt
├── pyproject.toml
└── .env.example
```

---

# 5. FastAPI Main Application

`app/main.py`

职责：

```text
Create FastAPI
Register Middleware
Register Exception Handlers
Register API Router
Register Health Check
```

基本结构：

```python
from fastapi import FastAPI

from app.api.router import api_router


app = FastAPI(
    title="PIDB API",
    version="1.0.0",
)


app.include_router(
    api_router,
    prefix="/api/v1",
)
```

不要在 `main.py` 中编写业务逻辑。

---

# 6. API Router

`app/api/router.py`

统一注册：

```text
auth
products
brands
product_types
skin_types
skin_concerns
ingredients
claims
imports
qr
quiz
shopify
users
health
```

结构：

```python
from fastapi import APIRouter

api_router = APIRouter()

api_router.include_router(
    products.router,
    prefix="/products",
    tags=["Products"],
)
```

最终：

```text
/api/v1/products
```

---

# 7. API Versioning

V1：

```text
/api/v1/
```

未来：

```text
/api/v2/
```

V1 API 不直接修改已有字段语义。

如果发生 breaking change：

```text
v1 → v2
```

而不是修改：

```text
v1
```

导致 React 或 Shopify Integration 失效。

---

# 8. Database Dependency

`app/core/database.py`

采用：

```text
SQLAlchemy AsyncEngine
+
AsyncSession
```

推荐：

```python
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
```

配置：

```text
DATABASE_URL=
postgresql+asyncpg://...
```

---

# 9. get_db()

`app/api/deps.py`

提供：

```text
get_db()
```

用于：

```python
async def endpoint(
    db: AsyncSession = Depends(get_db),
):
    ...
```

标准生命周期：

```text
Request
 ↓
AsyncSession
 ↓
Service
 ↓
Commit / Rollback
 ↓
Session Close
```

---

# 10. Authentication

Admin API：

```text
JWT Bearer Token
```

Request：

```text
Authorization: Bearer <JWT>
```

登录：

```text
POST /api/v1/auth/login
```

Response：

```json
{
  "success": true,
  "data": {
    "access_token": "...",
    "token_type": "bearer",
    "expires_in": 3600
  }
}
```

---

# 11. Authentication Flow

```text
React Admin
    ↓
POST /auth/login
    ↓
FastAPI
    ↓
Verify Password
    ↓
Create JWT
    ↓
React
    ↓
Authorization Header
    ↓
Protected API
```

---

# 12. Password Security

数据库只保存：

```text
password_hash
```

禁止：

```text
password
```

明文存储。

推荐：

```text
Argon2id
```

作为密码 Hash Algorithm。

---

# 13. JWT Payload

JWT 可以包含：

```json
{
  "sub": "user_uuid",
  "role": "admin",
  "exp": 1780000000
}
```

不要在 JWT 中保存：

```text
password
personal sensitive data
full user profile
```

---

# 14. Current User Dependency

提供：

```text
get_current_user()
```

例如：

```python
current_user = Depends(get_current_user)
```

获取：

```text
User ID
Role
Active Status
```

---

# 15. Authorization

定义：

```text
require_admin()
require_editor()
require_reviewer()
```

例如：

```text
POST /products
```

允许：

```text
admin
editor
```

而：

```text
POST /products/{id}/approve
```

允许：

```text
admin
reviewer
```

---

# 16. Product API

核心：

```text
GET    /products
POST   /products
GET    /products/{id}
PUT    /products/{id}
POST   /products/{id}/status
```

---

# 17. Product List

```text
GET /api/v1/products
```

支持：

```text
page
per_page
search
brand_id
product_type_id
skin_type
skin_concern
ingredient
status
country
compliance_status
shopify_sync_status
```

例如：

```text
GET /products?
search=snail
&brand_id=...
&status=active
&page=1
&per_page=20
```

---

# 18. Pagination

默认：

```text
page=1
per_page=20
```

最大：

```text
per_page=100
```

禁止：

```text
per_page=100000
```

Response：

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 125
  }
}
```

---

# 19. Product Search

V1.0 使用 PostgreSQL。

搜索字段：

```text
product_code
original_name
product_name_en
product_name_zh
SKU
Barcode
Brand
INCI
```

使用：

```text
ILIKE
```

V1.0 不使用 Elasticsearch。

---

# 20. Product Create

```text
POST /api/v1/products
```

Request：

```json
{
  "product_code": "KR-SERUM-001",
  "brand_id": "uuid",
  "product_type_id": "uuid",
  "original_language": "ko",
  "original_name": "Example Serum",
  "product_name_en": "Example Serum",
  "product_name_zh": "示例精华"
}
```

流程：

```text
Router
 ↓
ProductCreate Schema
 ↓
ProductService
 ↓
Validation
 ↓
Repository
 ↓
PostgreSQL
```

---

# 21. Product Update

```text
PUT /api/v1/products/{id}
```

使用：

```text
ProductUpdate
```

允许 Partial Update。

但是：

```text
status
compliance
publish
```

不应该通过普通 Product Update 修改。

这些必须使用专门 Action API。

---

# 22. Status API

```text
POST /api/v1/products/{id}/status
```

Request：

```json
{
  "status": "review"
}
```

Service 检查状态转换。

例如：

```text
draft → imported
imported → processing
processing → review
review → ready
ready → published
published → active
```

禁止：

```text
draft → active
```

直接跳跃。

---

# 23. Product Readiness

Endpoint：

```text
GET /api/v1/products/{id}/readiness
```

Response：

```json
{
  "success": true,
  "data": {
    "score": 95,
    "ready": false,
    "missing": [
      "warnings_en"
    ]
  }
}
```

Readiness 由：

```text
ReadinessService
```

统一计算。

---

# 24. Product Detail Response

Product API 不直接返回 SQLAlchemy Model。

使用：

```text
ProductResponse
```

例如：

```json
{
  "id": "...",
  "product_code": "KR-SERUM-001",
  "brand": {
    "id": "...",
    "name": "Example Brand"
  },
  "product_name_en": "Example Serum",
  "product_name_zh": "示例精华",
  "product_type": {
    "code": "serum",
    "name_en": "Serum"
  },
  "skin_types": [],
  "skin_concerns": [],
  "ingredients": []
}
```

---

# 25. Brand API

```text
GET  /brands
POST /brands
GET  /brands/{id}
PUT  /brands/{id}
```

支持：

```text
search
status
country
```

---

# 26. Product Type API

```text
GET /product-types
```

V1.0 主要提供：

```text
Product Type Tree
```

例如：

```text
Skincare
 ├── Cleanser
 ├── Toner
 ├── Serum
 └── Cream

Makeup
 ├── Foundation
 ├── Cushion
 └── Lip Tint
```

---

# 27. Skin Type API

```text
GET /skin-types
```

返回：

```text
Normal
Dry
Oily
Combination
Sensitive
```

主要用于：

- Admin
- Product Editor
- Quiz
- Recommendation
- Filter

---

# 28. Skin Concern API

```text
GET /skin-concerns
```

支持层级：

```text
Tone
Texture
Barrier
Oil
```

以及具体 Concern：

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

---

# 29. Ingredient API

```text
GET  /ingredients
POST /ingredients
GET  /ingredients/{id}
PUT  /ingredients/{id}
```

Search：

```text
inci_name
common_name_en
common_name_zh
common_name_ko
common_name_ja
search_keywords
```

---

# 30. Ingredient Search

例如：

```text
GET /ingredients?search=hyaluronic
```

可以匹配：

```text
Hyaluronic Acid
Sodium Hyaluronate
```

是否属于同义词由：

```text
Ingredient Alias
```

规则决定，而不是简单字符串匹配。

---

# 31. Claims API

```text
GET  /claims
POST /products/{id}/claims
PUT  /claims/{id}
```

Claim 必须记录：

```text
claim_en
claim_zh
claim_type
source
approved
```

---

# 32. Compliance API

推荐：

```text
GET  /products/{id}/compliance
PUT  /products/{id}/compliance
POST /products/{id}/compliance/approve
POST /products/{id}/compliance/block
```

最终状态：

```text
pending
reviewing
approved
blocked
```

---

# 33. Compliance Approval

Approval 必须经过：

```text
Reviewer
```

或：

```text
Admin
```

审批后：

```text
compliance_status = approved
```

同时记录：

```text
audit_logs
```

---

# 34. CSV Import API

```text
POST /imports
POST /imports/{id}/validate
GET  /imports/{id}/preview
POST /imports/{id}/confirm
GET  /imports/{id}/errors
GET  /imports
```

---

# 35. CSV Upload

```text
POST /api/v1/imports
Content-Type: multipart/form-data
```

上传：

```text
CSV File
```

系统生成：

```text
import_batch
```

状态：

```text
uploaded
```

---

# 36. CSV Validation

```text
POST /imports/{id}/validate
```

执行：

```text
Schema Validation
Type Validation
Language Normalization
Country Normalization
Product Type Mapping
Ingredient Mapping
Duplicate Detection
Required Field Validation
```

结果：

```text
valid rows
invalid rows
warnings
```

---

# 37. CSV Preview

```text
GET /imports/{id}/preview
```

显示：

```text
New Products
Updated Products
Warnings
Errors
Unmatched Ingredients
```

管理员确认前：

> 不写入正式 Product Master。

---

# 38. CSV Confirm

```text
POST /imports/{id}/confirm
```

执行：

```text
ImportService
```

每一个 Product：

```text
BEGIN
 ↓
Upsert Product
 ↓
Upsert SKU
 ↓
Resolve Ingredients
 ↓
Update Relationships
 ↓
COMMIT
```

失败：

```text
ROLLBACK
```

记录：

```text
import_errors
```

---

# 39. QR API

```text
GET  /qr/{short_code}
POST /products/{id}/qr
```

Admin 创建：

```text
POST /products/{id}/qr
```

生成：

```text
short_code
```

消费者访问：

```text
GET /qr/{short_code}
```

然后：

```text
ProductQR
 ↓
Product
 ↓
Consumer Product Response
```

---

# 40. QR Public Endpoint

QR Endpoint 不需要 Admin JWT。

但必须：

```text
Rate Limit
```

并且只返回：

```text
Public Product Data
```

不能返回：

```text
Supplier
Internal Compliance Notes
Audit Logs
Shopify Token
Internal IDs
```

---

# 41. Quiz API

```text
GET  /quiz/questions
POST /quiz/session
POST /quiz/session/{id}/answers
POST /quiz/recommend
```

---

# 42. Quiz Session

创建：

```text
POST /quiz/session
```

生成：

```text
session_id
```

可以记录：

```text
started_at
completed_at
```

V1.0 不要求用户注册。

---

# 43. Quiz Recommendation

```text
POST /quiz/recommend
```

Request：

```json
{
  "session_id": "...",
  "answers": {
    "skin_type": "dry",
    "concerns": [
      "hydration",
      "skin_barrier"
    ],
    "product_type": "serum"
  }
}
```

流程：

```text
Quiz
 ↓
Normalize
 ↓
RecommendationService
 ↓
ProductRepository
 ↓
Score
 ↓
Rank
```

---

# 44. Recommendation API Response

例如：

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "product_id": "...",
        "score": 94,
        "tier": "excellent",
        "reasons": [
          "Matches dry skin",
          "Supports hydration",
          "Suitable serum type"
        ]
      }
    ]
  }
}
```

Explanation 来自数据库规则。

V1.0 不调用 AI。

---

# 45. Shopify API

```text
POST /shopify/products/{id}/sync
POST /shopify/sync
GET  /shopify/products/{id}/status
GET  /shopify/sync-logs
```

---

# 46. Shopify Product Sync

执行：

```text
POST /shopify/products/{id}/sync
```

流程：

```text
Product
 ↓
Readiness Check
 ↓
Compliance Check
 ↓
Build Shopify Payload
 ↓
Shopify API
 ↓
Update Mapping
 ↓
Sync Log
```

---

# 47. Shopify Safety Gate

必须：

```text
Readiness = 100
```

并且：

```text
Compliance = approved
```

否则：

```text
sync_status = blocked
```

返回：

```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_READY",
    "message": "Product cannot be synchronized to Shopify."
  }
}
```

---

# 48. Shopify Sync Payload

PIDB 提供：

```text
title
description
vendor
product_type
images
variants
SKU
barcode
metafields
```

例如：

```text
custom.pidb_product_id
custom.product_type
custom.skin_types
custom.skin_concerns
custom.key_ingredients
custom.ingredients_inci
custom.how_to_use_en
custom.how_to_use_zh
custom.warnings_en
custom.warnings_zh
custom.country_of_origin
custom.qr_short_code
```

---

# 49. Shopify Sync Queue

不让 API 长时间等待 Shopify。

请求：

```text
POST /shopify/products/{id}/sync
```

可以创建：

```text
jobs
```

例如：

```text
job_type = shopify_sync
entity_type = product
entity_id = product UUID
status = pending
```

然后 Worker 执行。

---

# 50. Bulk Shopify Sync

```text
POST /shopify/sync
```

可以提交：

```json
{
  "product_ids": [
    "...",
    "...",
    "..."
  ]
}
```

或者：

```json
{
  "filter": {
    "status": "ready",
    "compliance_status": "approved"
  }
}
```

系统生成多个 Jobs。

---

# 51. Sync Retry

失败：

```text
attempts += 1
```

建议：

```text
1st failure → retry
2nd failure → retry
3rd failure → failed
```

V1.0：

```text
max_attempts = 3
```

---

# 52. API Error Codes

统一：

```text
AUTH_REQUIRED
AUTH_INVALID
PERMISSION_DENIED

VALIDATION_ERROR
RESOURCE_NOT_FOUND
DUPLICATE_RESOURCE

PRODUCT_NOT_READY
COMPLIANCE_NOT_APPROVED
INVALID_STATUS_TRANSITION

IMPORT_VALIDATION_FAILED
IMPORT_CONFIRM_FAILED

SHOPIFY_API_ERROR
SHOPIFY_SYNC_FAILED

QR_NOT_FOUND
QUIZ_SESSION_NOT_FOUND
```

---

# 53. HTTP Status Codes

标准：

```text
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
502 Bad Gateway
```

---

# 54. Exception Architecture

定义：

```text
app/core/exceptions.py
```

例如：

```python
class ProductNotReadyError(Exception):
    pass


class ComplianceNotApprovedError(Exception):
    pass


class DuplicateResourceError(Exception):
    pass
```

FastAPI Exception Handler 统一转换。

---

# 55. Validation Architecture

三层验证：

```text
React
  ↓
Pydantic
  ↓
PostgreSQL
```

React：

> User Experience

Pydantic：

> API Contract

PostgreSQL：

> Data Integrity

三者不能互相替代。

---

# 56. Service Architecture

Product：

```text
ProductRouter
     ↓
ProductService
     ↓
ProductRepository
```

CSV：

```text
ImportRouter
     ↓
ImportService
     ├── ValidationService
     ├── NormalizationService
     └── ProductRepository
```

Recommendation：

```text
QuizRouter
     ↓
QuizService
     ↓
RecommendationService
     ↓
ProductRepository
```

Shopify：

```text
ShopifyRouter
     ↓
SyncService
     ↓
ShopifyService
     ↓
HTTPX
```

---

# 57. Repository Rules

Repository 只负责：

```text
SELECT
INSERT
UPDATE
DELETE
```

不负责：

```text
Shopify API
Recommendation
Compliance Decision
CSV Parsing
HTTP Response
```

---

# 58. Service Rules

Service 负责：

```text
Business Rules
Transaction
Workflow
Cross-table Operations
```

例如：

```text
ProductService
```

可以同时修改：

```text
products
product_skus
product_ingredients
product_concerns
```

---

# 59. Response Schema

每一个 API Response 都应该有对应：

```text
Pydantic Response Model
```

例如：

```text
ProductResponse
ProductListResponse
BrandResponse
IngredientResponse
QuizResultResponse
ShopifySyncResponse
```

避免：

```python
return sqlAlchemyObject
```

直接返回。

---

# 60. Public vs Admin API

API 分为两类。

## Admin

```text
/api/v1/products
/api/v1/imports
/api/v1/compliance
/api/v1/shopify
```

需要 JWT。

## Public

```text
/api/v1/public/products
/api/v1/qr
/api/v1/quiz
```

不需要 Admin JWT。

---

# 61. Public Product API

建议增加：

```text
GET /api/v1/public/products/{slug}
```

返回：

```text
Product Name
Brand
Description
Skin Type
Skin Concern
Ingredients
Usage
Warnings
Images
```

不返回内部字段。

---

# 62. Consumer Product Page

Consumer React：

```text
GET /public/products/{slug}
```

或者：

```text
GET /qr/{short_code}
```

得到 Consumer DTO。

然后页面显示：

```text
Product
 ↓
Why It May Suit You
Key Ingredients
How To Use
Warnings
Where To Buy
```

---

# 63. Rate Limiting

Public API 必须限制：

```text
QR
Quiz
Recommendation
Product Search
```

V1.0 可以使用：

```text
Nginx
+
Application-level rate limiting
```

不强制 Redis。

---

# 64. CORS

生产：

```text
CORS_ORIGINS
```

例如：

```text
https://yourdomain.ca
```

不要：

```text
allow_origins=["*"]
```

用于生产 Admin API。

---

# 65. Request ID

建议每一个 Request 有：

```text
X-Request-ID
```

用于：

```text
API Log
Shopify Error
Import Error
Debugging
```

例如：

```text
Request
  ↓
request_id
  ↓
Log
  ↓
Exception
```

---

# 66. Logging

API 日志：

```text
timestamp
request_id
method
path
status_code
duration
user_id
```

Shopify API：

```text
request_id
shopify_product_id
action
status
error
```

不要记录：

```text
Shopify Access Token
JWT
Password
```

---

# 67. API Testing

使用：

```text
pytest
+
pytest-asyncio
+
httpx
```

重点：

```text
Authentication
Product CRUD
CSV Import
Compliance
QR
Quiz
Recommendation
Shopify Sync
```

---

# 68. Product API Test Matrix

必须测试：

```text
Create Product
Duplicate Product Code
Invalid Brand
Invalid Product Type
Update Product
Get Product
List Product
Search Product
Status Transition
Readiness
```

---

# 69. Compliance Test Matrix

测试：

```text
Pending → Sync
```

必须：

```text
BLOCK
```

测试：

```text
Approved + Ready → Sync
```

必须：

```text
ALLOW
```

测试：

```text
Approved + Not Ready → Sync
```

必须：

```text
BLOCK
```

---

# 70. CSV Test Matrix

至少：

```text
Valid CSV
Missing Product Code
Duplicate SKU
Invalid Barcode
Unknown Product Type
Unknown Skin Type
Unknown Ingredient
Invalid Language
Invalid Country
Duplicate Product
Update Existing Product
Partial Failure
Rollback
```

---

# 71. Recommendation Test Matrix

至少：

```text
Dry Skin
Oily Skin
Sensitive Skin
Multiple Concerns
Product Type Match
Ingredient Match
No Match
Out of Stock
Blocked Product
Inactive Product
```

Blocked Product：

> 永远不得进入推荐结果。

---

# 72. Shopify Test Matrix

至少：

```text
New Product Sync
Existing Product Update
Compliance Block
Readiness Block
Shopify API Error
Timeout
Retry
Duplicate Mapping
```

---

# 73. API Documentation

FastAPI 自动提供：

```text
OpenAPI
Swagger UI
ReDoc
```

API 文档必须包含：

```text
Request Schema
Response Schema
Authentication
Error Response
Example
```

---

# 74. OpenAPI Tags

推荐：

```text
Auth
Products
Brands
Taxonomy
Ingredients
Claims
Compliance
Imports
QR
Quiz
Shopify
Users
Health
```

---

# 75. Health API

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

可以增加：

```text
GET /health/live
GET /health/ready
```

用于生产环境。

---

# 76. API Performance

V1.0 目标：

```text
Simple CRUD       < 500ms
Search            < 500ms
Quiz              < 1s
QR Resolution     < 300ms
```

Shopify Sync：

> 不纳入同步 API 响应时间目标，因为采用异步 Job。

---

# 77. Database Query Rules

禁止：

```text
N+1 Queries
```

Product Detail 如果需要：

```text
Brand
SKU
Images
Ingredients
Skin Types
Concerns
Claims
```

应该通过：

```text
selectinload()
```

等 SQLAlchemy eager loading 方法优化。

---

# 78. Transaction Rules

以下必须 Transaction：

```text
Product Create
Product Update
CSV Product Import
Compliance Approval
Shopify Mapping Update
```

---

# 79. Idempotency

以下操作建议支持 Idempotency：

```text
CSV Confirm
QR Generate
Shopify Sync
```

例如：

```text
Idempotency-Key: abc123
```

防止：

```text
Double Click
Network Retry
Duplicate Job
```

导致重复数据。

---

# 80. API Security Checklist

上线前必须确认：

```text
[ ] HTTPS
[ ] JWT
[ ] Password Hash
[ ] CORS
[ ] Rate Limit
[ ] Input Validation
[ ] SQL Injection Protection
[ ] Secret Protection
[ ] Admin Authorization
[ ] Audit Log
[ ] Error Message Sanitization
[ ] PostgreSQL Private Network
```

---

# 81. Environment Configuration

`app/core/config.py`

使用 Pydantic Settings：

```text
APP_ENV
DATABASE_URL
JWT_SECRET_KEY
JWT_EXPIRE_MINUTES
SHOPIFY_STORE_DOMAIN
SHOPIFY_ADMIN_ACCESS_TOKEN
SHOPIFY_API_VERSION
CORS_ORIGINS
QR_BASE_URL
```

所有配置从：

```text
Environment
```

读取。

---

# 82. 不允许 Hard Coding

禁止：

```python
SHOPIFY_TOKEN = "shpat_xxxxx"
```

禁止：

```python
DATABASE_URL = "postgresql://user:password@..."
```

必须：

```text
.env
Environment Variables
Secret Manager
```

---

# 83. FastAPI Development Command

开发：

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

生产：

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

生产环境可以进一步使用：

```text
Gunicorn + Uvicorn Workers
```

---

# 84. Alembic

开发数据库：

```bash
alembic upgrade head
```

创建 Migration：

```bash
alembic revision --autogenerate -m "..."
```

生产部署：

```bash
alembic upgrade head
```

---

# 85. Backend Requirements

核心依赖：

```text
fastapi
uvicorn
sqlalchemy
asyncpg
alembic
pydantic
pydantic-settings
python-jose
argon2-cffi
httpx
python-multipart
pytest
pytest-asyncio
```

CSV 如果需要高级 DataFrame 操作：

```text
pandas
```

但普通 CSV Import 优先使用 Python 标准库 `csv`。

---

# 86. V1.0 不引入

Backend 不引入：

```text
Django
Flask
GraphQL
Celery
Redis
RabbitMQ
Kafka
Elasticsearch
MongoDB
Microservices
API Gateway
```

核心原因：

> 当前 PIDB 数据规模和业务复杂度不需要。

---

# 87. Backend MVP Implementation Order

实际编码顺序：

```text
1. FastAPI Project
       ↓
2. Configuration
       ↓
3. PostgreSQL Connection
       ↓
4. SQLAlchemy Models
       ↓
5. Alembic
       ↓
6. Authentication
       ↓
7. Product CRUD
       ↓
8. Taxonomy
       ↓
9. Ingredients
       ↓
10. Product Relations
       ↓
11. Readiness
       ↓
12. Compliance
       ↓
13. CSV Import
       ↓
14. QR
       ↓
15. Quiz
       ↓
16. Recommendation
       ↓
17. Shopify
       ↓
18. Background Jobs
       ↓
19. Tests
       ↓
20. Production Deployment
```

---

# 88. FastAPI Backend Final Architecture

```text
                         React
                           │
                           │ REST / HTTPS
                           ▼
                    ┌──────────────┐
                    │   FastAPI    │
                    └──────┬───────┘
                           │
                  ┌────────┴────────┐
                  │                 │
                  ▼                 ▼
              API Router        Auth / RBAC
                  │
                  ▼
             Pydantic
               Schema
                  │
                  ▼
              Service
                  │
          ┌───────┼────────┐
          │       │        │
          ▼       ▼        ▼
      Repository  QR    Shopify
          │       │        │
          └───────┼────────┘
                  ▼
              SQLAlchemy
                  │
                  ▼
             PostgreSQL
```

---

# 89. Final API Modules

V1.0 最终：

```text
/auth
/products
/brands
/product-types
/skin-types
/skin-concerns
/ingredients
/claims
/compliance
/imports
/qr
/quiz
/shopify
/users
/health
```

---

# 90. Final Architectural Rules

### Rule 1

FastAPI 是唯一 Backend API。

### Rule 2

React 不直接访问 PostgreSQL。

### Rule 3

所有业务规则放 Service Layer。

### Rule 4

所有数据库访问通过 Repository / SQLAlchemy。

### Rule 5

所有 API 输入使用 Pydantic Validation。

### Rule 6

所有 API 输出使用 Response Schema。

### Rule 7

Product Status 不允许任意跳转。

### Rule 8

Compliance Approved 是 Shopify Publish 的必要条件。

### Rule 9

Readiness 通过后才能进入 Shopify Publish。

### Rule 10

CSV Import 必须支持 Validation → Preview → Confirm。

### Rule 11

Recommendation V1.0 使用 Rule-Based Engine。

### Rule 12

QR 使用 PIDB Dynamic URL。

### Rule 13

Shopify Sync 使用 Job Queue。

### Rule 14

V1.0 不引入 Redis、Kafka、RabbitMQ、Elasticsearch 和 Microservices。

---

# 91. #12 完成后的系统状态

到目前为止：

```text
#01  Product Information Database
#04  PIDB ↔ Shopify
#05  Database & CSV
#06  Admin UI
#07  Data Dictionary
#08  Taxonomy & Recommendation
#09  API Specification
#10  FastAPI + React Architecture
#11  PostgreSQL + SQLAlchemy
#12  FastAPI API Implementation
```

已经完成从：

```text
Business Requirement
        ↓
Data Model
        ↓
System Architecture
        ↓
Database
        ↓
API
```

的完整设计闭环。

下一阶段正式进入：

```text
React Frontend
```

以及具体的 Admin Product Management UI。

---

# 92. 下一份文档

下一份定义：

> **#13 — PIDB React Admin Frontend Implementation Specification V1.0**

重点包括：

```text
React Project Structure
React Router
Ant Design
Admin Layout
Dashboard
Product List
Product Editor
Brand Management
Ingredient Management
Taxonomy Management
CSV Import UI
Review UI
Compliance UI
QR Management
Shopify Sync UI
Authentication
React Query
Form Validation
Permission Control
```

完成 #13 后，前后端的核心框架就基本齐全，可以开始真正编写 MVP。