# 09 — PIDB API Specification V1.0

**Project:** Beauty Product Information Database (PIDB)  
**Version:** V1.0  
**Backend:** Laravel  
**Database:** PostgreSQL  
**API Style:** REST API / JSON  
**Primary Language:** Chinese documentation + English technical terms

---

## 1. API Architecture

PIDB API 是 PIDB 的统一数据访问层，负责：

1. Admin 后台访问产品数据
2. CSV Import
3. Shopify Integration
4. QR Product Page
5. Beauty Quiz
6. Product Recommendation
7. 后续第三方系统接入

V1.0 不采用：

- GraphQL
- Microservices
- API Gateway
- Kafka
- RabbitMQ
- Elasticsearch
- 独立 API Server

直接使用 Laravel Application 提供 REST API。

### Architecture

```text
                    ┌─────────────────────┐
                    │     Admin Panel     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │      PIDB API       │
                    │   Laravel REST API  │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
   ┌──────▼──────┐      ┌──────▼──────┐      ┌──────▼──────┐
   │ PostgreSQL  │      │ Queue/Jobs   │      │ File/Image  │
   │    PIDB     │      │ Shopify Sync │      │   Storage   │
   └─────────────┘      └──────┬──────┘      └─────────────┘
                                │
                         ┌──────▼──────┐
                         │   Shopify   │
                         └─────────────┘

Public:
QR Page ────────┐
Beauty Quiz ────┼──────► PIDB API
Storefront ─────┘
```

---

# 2. API Versioning

所有 API 使用 `/api/v1/`。

例如：

```text
/api/v1/products
/api/v1/products/{id}
/api/v1/ingredients
/api/v1/quiz/session
/api/v1/quiz/recommend
```

未来如果发生重大 Breaking Change：

```text
/api/v2/
```

V1 不因为普通字段增加而升级版本。

---

# 3. Authentication

## 3.1 Admin API

Admin API 使用 Laravel Sanctum。

```text
Authorization: Bearer {token}
```

用于：

- Product CRUD
- Brand CRUD
- Ingredient CRUD
- CSV Import
- Review
- Compliance
- Shopify Sync
- QR Management

---

## 3.2 Public API

以下接口可以公开：

```text
GET /api/v1/qr/{short_code}
POST /api/v1/quiz/session
POST /api/v1/quiz/recommend
GET /api/v1/products/{id}
```

Public API 必须：

- Rate Limit
- 不返回内部字段
- 不返回 Shopify API Credentials
- 不返回 Compliance 内部 Notes
- 不返回 Audit Log
- 不返回内部用户信息

---

# 4. Standard Response Format

所有 API 使用 JSON。

## Success

```json
{
  "success": true,
  "data": {}
}
```

列表：

```json
{
  "success": true,
  "data": [],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 100,
    "last_page": 5
  }
}
```

---

# 5. Error Response

统一格式：

```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product not found.",
    "details": {}
  }
}
```

常见 Error Code：

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
PRODUCT_NOT_FOUND
SKU_ALREADY_EXISTS
BARCODE_ALREADY_EXISTS
INVALID_STATUS
COMPLIANCE_NOT_APPROVED
SHOPIFY_SYNC_FAILED
IMPORT_FAILED
QR_NOT_FOUND
QUIZ_SESSION_NOT_FOUND
```

HTTP Status：

| HTTP | 用途 |
|---|---|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 429 | Too Many Requests |
| 500 | Server Error |

---

# 6. Product API

## 6.1 Product List

```http
GET /api/v1/products
```

支持：

```text
page
per_page
search
brand_id
product_type_id
original_language
country_of_origin
skin_type
skin_concern
ingredient
status
compliance_status
shopify_sync_status
```

示例：

```http
GET /api/v1/products?
search=serum&
brand_id=xxx&
skin_type=dry&
skin_concern=hydration&
status=active&
page=1&
per_page=20
```

---

## 6.2 Product Detail

```http
GET /api/v1/products/{id}
```

返回：

```json
{
  "success": true,
  "data": {
    "id": "UUID",
    "product_code": "KR-SERUM-001",
    "brand": {},
    "product_type": {},
    "original_language": "ko",
    "original_name": "...",
    "product_name_en": "...",
    "product_name_zh": "...",
    "description_en": "...",
    "description_zh": "...",
    "skin_types": [],
    "skin_concerns": [],
    "ingredients": [],
    "claims": [],
    "skus": [],
    "images": [],
    "usage": {},
    "warnings": {},
    "qr": {},
    "shopify": {}
  }
}
```

---

# 7. Product Create

```http
POST /api/v1/products
```

Request：

```json
{
  "product_code": "KR-SERUM-001",
  "brand_id": "UUID",
  "product_type_id": "UUID",
  "original_language": "ko",
  "original_name": "Original Product Name",
  "product_name_en": "Hydrating Serum",
  "product_name_zh": "保湿精华",
  "country_of_origin": "KR"
}
```

服务器自动生成：

```text
id
created_at
updated_at
status = draft
```

---

# 8. Product Update

```http
PUT /api/v1/products/{id}
```

允许更新：

- Product Name
- Description
- Product Type
- Skin Type
- Skin Concern
- Ingredients
- Claims
- Usage
- Warnings
- Images
- Canada Compliance
- QR

但：

```text
product.id
```

永远不可修改。

---

# 9. Product Status API

```http
POST /api/v1/products/{id}/status
```

Request：

```json
{
  "status": "ready"
}
```

状态转换必须经过业务规则验证。

例如：

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
```

不能直接：

```text
draft → active
```

除非 Admin 具有特殊权限。

---

# 10. Brand API

## List

```http
GET /api/v1/brands
```

支持：

```text
search
status
page
per_page
```

## Detail

```http
GET /api/v1/brands/{id}
```

## Create

```http
POST /api/v1/brands
```

## Update

```http
PUT /api/v1/brands/{id}
```

Brand 是 Product 的主数据。

一个 Brand：

```text
Brand 1 ───── N Products
```

---

# 11. Product Type API

```http
GET /api/v1/product-types
```

返回 Tree Structure：

```json
[
  {
    "id": "...",
    "name_en": "Skincare",
    "name_zh": "护肤",
    "children": [
      {
        "name_en": "Serum",
        "name_zh": "精华"
      },
      {
        "name_en": "Sheet Mask",
        "name_zh": "面膜"
      }
    ]
  }
]
```

Product Type 不允许产品自由输入。

必须从标准 Taxonomy 中选择。

---

# 12. Skin Type API

```http
GET /api/v1/skin-types
```

V1：

```text
normal
dry
oily
combination
sensitive
```

返回：

```json
[
  {
    "code": "dry",
    "name_en": "Dry Skin",
    "name_zh": "干性皮肤"
  }
]
```

---

# 13. Skin Concern API

```http
GET /api/v1/skin-concerns
```

V1：

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

这些数据同时供：

- Product Filter
- Shopify Collection
- Beauty Quiz
- Recommendation Engine

使用。

---

# 14. Ingredient API

## Ingredient List

```http
GET /api/v1/ingredients
```

支持：

```text
search
status
function
page
per_page
```

例如：

```http
GET /api/v1/ingredients?search=niacinamide
```

---

## Ingredient Detail

```http
GET /api/v1/ingredients/{id}
```

返回：

```json
{
  "id": "UUID",
  "inci_name": "Niacinamide",
  "common_name_en": "Niacinamide",
  "common_name_zh": "烟酰胺",
  "common_name_ko": "...",
  "common_name_ja": "...",
  "description_en": "...",
  "description_zh": "...",
  "cosmetic_functions": [
    "brightening_appearance",
    "skin_conditioning"
  ]
}
```

---

# 15. Product Ingredient API

产品与 Ingredient 为 Many-to-Many。

```http
POST /api/v1/products/{id}/ingredients
```

Request：

```json
{
  "ingredient_id": "UUID",
  "ingredient_order": 5,
  "is_key_ingredient": true
}
```

删除：

```http
DELETE /api/v1/products/{id}/ingredients/{ingredient_id}
```

---

# 16. Product Skin Type API

```http
POST /api/v1/products/{id}/skin-types
```

Request：

```json
{
  "skin_type_codes": [
    "dry",
    "combination"
  ]
}
```

---

# 17. Product Skin Concern API

```http
POST /api/v1/products/{id}/skin-concerns
```

Request：

```json
{
  "concern_codes": [
    "hydration",
    "skin_barrier"
  ]
}
```

---

# 18. Product Image API

## Add Image

```http
POST /api/v1/products/{id}/images
```

Request：

```json
{
  "image_url": "https://cdn.example.com/product.jpg",
  "image_type": "primary",
  "alt_text_en": "Hydrating Serum",
  "alt_text_zh": "保湿精华",
  "sort_order": 1
}
```

## Delete

```http
DELETE /api/v1/products/{id}/images/{image_id}
```

PIDB 只保存 Image URL 和 Metadata。

不建议 V1.0 将图片 Binary 存在 PostgreSQL。

---

# 19. Product Claims API

```http
GET /api/v1/products/{id}/claims
```

添加：

```http
POST /api/v1/products/{id}/claims
```

Request：

```json
{
  "claim_en": "Helps improve the appearance of dull skin.",
  "claim_zh": "帮助改善暗沉肌肤的外观。",
  "claim_type": "brightening_appearance",
  "approved": true
}
```

Claim 必须经过审核才能进入 Ready 状态。

---

# 20. Canada Compliance API

内部 API：

```http
GET /api/v1/products/{id}/compliance
```

更新：

```http
PUT /api/v1/products/{id}/compliance
```

例如：

```json
{
  "canadian_label_status": "approved",
  "cosmetic_notification_status": "submitted",
  "compliance_status": "approved"
}
```

如果：

```text
compliance_status != approved
```

则不能进入：

```text
ready
```

也不能同步到 Shopify。

---

# 21. QR API

QR 使用：

```text
short_code
```

例如：

```text
A8K29
```

---

## QR Lookup

```http
GET /api/v1/qr/{short_code}
```

返回适合消费者页面的数据：

```json
{
  "success": true,
  "data": {
    "product": {},
    "brand": {},
    "skin_types": [],
    "skin_concerns": [],
    "key_ingredients": [],
    "ingredients": [],
    "usage": {},
    "warnings": {},
    "where_to_buy": {}
  }
}
```

不要返回：

```text
supplier_cost
internal_notes
compliance_notes
shopify_internal_id
sync_logs
admin_users
```

---

## QR Generate

```http
POST /api/v1/products/{id}/qr
```

服务器生成：

```text
short_code
public_url
```

例如：

```text
https://yourdomain.ca/p/A8K29
```

二维码实际编码：

```text
https://yourdomain.ca/p/A8K29
```

而不是 Shopify URL。

---

# 22. Beauty Quiz API

## Create Session

```http
POST /api/v1/quiz/session
```

Response：

```json
{
  "success": true,
  "data": {
    "session_id": "UUID"
  }
}
```

---

# 23. Quiz Questions

```http
GET /api/v1/quiz/questions
```

返回：

```json
[
  {
    "id": "skin_type",
    "question_en": "What is your skin type?",
    "question_zh": "您的肤质是什么？",
    "type": "single",
    "options": []
  }
]
```

Quiz Questions 存储在数据库中，而不是 Hard-code 到前端。

这样未来可以修改问题而无需修改程序。

---

# 24. Submit Quiz Answers

```http
POST /api/v1/quiz/session/{session_id}/answers
```

Request：

```json
{
  "answers": [
    {
      "question_id": "skin_type",
      "option_id": "dry"
    },
    {
      "question_id": "concern",
      "option_id": "hydration"
    }
  ]
}
```

---

# 25. Recommendation API

```http
POST /api/v1/quiz/recommend
```

Request：

```json
{
  "session_id": "UUID"
}
```

Recommendation Service：

```text
Quiz Answers
     ↓
Normalize
     ↓
User Profile
     ↓
Hard Filter
     ↓
Product Matching
     ↓
Score
     ↓
Sort
     ↓
Top 3–6
```

---

# 26. Recommendation Response

```json
{
  "success": true,
  "data": {
    "profile": {
      "skin_type": "dry",
      "skin_concerns": [
        "hydration"
      ]
    },
    "recommendations": [
      {
        "product_id": "UUID",
        "product_code": "KR-SERUM-001",
        "score": 94,
        "tier": "excellent_match",
        "reasons": [
          {
            "type": "skin_type",
            "text_en": "Suitable for dry skin.",
            "text_zh": "适合干性皮肤。"
          },
          {
            "type": "concern",
            "text_en": "Supports hydration.",
            "text_zh": "有助于改善肌肤保湿状态。"
          }
        ]
      }
    ]
  }
}
```

---

# 27. Recommendation Score

V1.0：

```text
Skin Type       30
Skin Concern    30
Product Type    20
Ingredient      10
Preference      10
----------------
Total          100
```

Tier：

```text
90–100   Excellent Match
75–89    Good Match
60–74    Potential Match
<60      Do Not Recommend
```

Recommendation Engine 不使用 AI。

所有推荐原因来自 PIDB Structured Data。

---

# 28. Product Search API

```http
GET /api/v1/products/search
```

支持：

```text
q
brand
product_type
skin_type
skin_concern
ingredient
country
```

例如：

```http
GET /api/v1/products/search?q=niacinamide&skin_type=oily
```

V1.0 使用 PostgreSQL：

```text
ILIKE
Full Text Search
GIN Index
JSONB Index（必要时）
```

产品数量低于约 10,000 时，不引入 Elasticsearch。

---

# 29. Shopify Sync API

Shopify Sync 属于 Internal/Admin API。

## Sync One Product

```http
POST /api/v1/shopify/products/{product_id}/sync
```

系统首先验证：

```text
Product Status
Compliance Status
Required Fields
SKU
Images
```

通过后：

```text
Create/Update Shopify Product
        ↓
Update Metafields
        ↓
Update Images
        ↓
Update Translation
        ↓
Update Shopify Mapping
        ↓
Create Sync Log
```

---

# 30. Batch Shopify Sync

```http
POST /api/v1/shopify/sync
```

Request：

```json
{
  "product_ids": [
    "UUID-1",
    "UUID-2",
    "UUID-3"
  ]
}
```

API 不直接执行大量 Shopify API 操作。

只负责创建 Queue Jobs：

```text
ShopifySyncProductJob
```

然后由 Laravel Queue 执行。

---

# 31. Shopify Sync Status

```http
GET /api/v1/shopify/products/{product_id}/status
```

返回：

```json
{
  "shopify_product_id": "gid://shopify/Product/123456",
  "shopify_handle": "hydrating-serum",
  "sync_status": "success",
  "last_sync_at": "...",
  "last_sync_hash": "..."
}
```

---

# 32. CSV Import API

## Upload CSV

```http
POST /api/v1/imports
```

Multipart：

```text
file = products.csv
```

服务器创建：

```text
import_batch
```

状态：

```text
uploaded
```

---

# 33. Validate CSV

```http
POST /api/v1/imports/{batch_id}/validate
```

执行：

```text
Parse
 ↓
Normalize
 ↓
Validate
 ↓
Map
 ↓
Generate Errors
```

---

# 34. CSV Preview

```http
GET /api/v1/imports/{batch_id}/preview
```

返回：

```json
{
  "total_rows": 500,
  "new_products": 420,
  "updates": 60,
  "errors": 20
}
```

---

# 35. Confirm Import

```http
POST /api/v1/imports/{batch_id}/confirm
```

系统开始正式导入。

规则：

```text
product_code
```

作为默认 Upsert Key。

即：

```text
不存在 → Create
存在 → Update
```

不能使用：

```text
product_name
```

作为主匹配条件。

---

# 36. Import Errors

```http
GET /api/v1/imports/{batch_id}/errors
```

例如：

```json
{
  "row": 25,
  "product_code": "KR-SERUM-025",
  "field": "product_type",
  "error_code": "UNKNOWN_PRODUCT_TYPE",
  "message": "Unknown product type."
}
```

---

# 37. API Pagination

所有列表 API 使用：

```text
page
per_page
```

默认：

```text
page = 1
per_page = 20
```

最大：

```text
per_page = 100
```

禁止客户端：

```text
per_page=100000
```

---

# 38. Filtering Convention

统一使用：

```text
?brand_id=
?product_type_id=
?skin_type=
?skin_concern=
?ingredient=
?status=
?country=
```

避免同一个概念出现多种参数名称。

例如不要同时存在：

```text
skinType
skin_type
skinTypeCode
skin
```

统一：

```text
skin_type
```

---

# 39. Sorting

列表 API 支持：

```text
sort
direction
```

例如：

```http
GET /api/v1/products?sort=updated_at&direction=desc
```

允许字段由服务器白名单控制。

不能允许用户直接传任意 SQL 字段。

---

# 40. Idempotency

重要操作支持 Idempotency。

尤其：

```text
CSV Import
Shopify Sync
QR Generation
```

例如：

```http
Idempotency-Key: 8f4c9...
```

避免用户重复点击造成：

```text
重复 Import
重复 Shopify Product
重复 QR
```

---

# 41. Rate Limiting

Public API：

```text
60 requests/minute/IP
```

Quiz：

```text
30 sessions/hour/IP
```

Admin API：

根据用户权限设置较高限制。

Shopify API 不直接暴露给浏览器。

---

# 42. Laravel Route Structure

建议：

```text
routes/
├── api.php
├── web.php
└── admin.php
```

API：

```php
Route::prefix('v1')->group(function () {

    Route::get('/products', ...);
    Route::get('/products/{product}', ...);

    Route::get('/brands', ...);

    Route::get('/product-types', ...);

    Route::get('/skin-types', ...);

    Route::get('/skin-concerns', ...);

    Route::get('/ingredients', ...);

    Route::get('/qr/{shortCode}', ...);

    Route::post('/quiz/session', ...);
    Route::post('/quiz/recommend', ...);
});
```

Admin：

```php
Route::middleware('auth:sanctum')
    ->prefix('v1')
    ->group(function () {

        // Product Management
        // Import
        // Review
        // Compliance
        // Shopify
        // QR
    });
```

---

# 43. Controller Structure

建议：

```text
app/Http/Controllers/Api/V1/

ProductController.php
BrandController.php
ProductTypeController.php
SkinTypeController.php
SkinConcernController.php
IngredientController.php
ProductIngredientController.php
ProductImageController.php
ProductClaimController.php
ComplianceController.php
QrController.php
QuizController.php
RecommendationController.php
ShopifySyncController.php
ImportController.php
ImportErrorController.php
```

不要建立：

```text
GenericController
MegaController
EverythingController
```

保持一个 Controller 对应一个业务领域。

---

# 44. Service Layer

复杂业务放 Service。

```text
app/Services/

ProductService.php
ProductImportService.php
IngredientService.php
RecommendationService.php
QrService.php
ShopifyProductService.php
ShopifySyncService.php
ComplianceService.php
```

例如：

```text
RecommendationController
        ↓
RecommendationService
        ↓
ProductRepository / Eloquent
        ↓
PostgreSQL
```

Controller 不应该直接写复杂 Recommendation Algorithm。

---

# 45. Queue Jobs

Laravel Queue：

```text
app/Jobs/

ShopifySyncProductJob.php
ShopifySyncBatchJob.php
ProcessCsvImportJob.php
GenerateQrJob.php
```

V1.0 可以使用：

```text
Database Queue
```

如果以后任务量增加，再考虑 Redis。

因此：

**V1.0 不需要为了 Queue 强行部署 Redis。**

---

# 46. API Resources

使用 Laravel API Resources：

```text
ProductResource
ProductListResource
IngredientResource
BrandResource
QrProductResource
QuizQuestionResource
RecommendationResource
```

原因：

避免直接：

```php
return Product::find($id);
```

把数据库所有字段暴露给前端。

---

# 47. Request Validation

使用：

```text
FormRequest
```

例如：

```text
StoreProductRequest
UpdateProductRequest
ProductStatusRequest
StoreIngredientRequest
QuizAnswerRequest
ImportCsvRequest
ShopifySyncRequest
```

Validation 应发生在：

```text
API → Request Validation
```

而不是完全依赖 Database。

---

# 48. Public Product DTO

当前实现的公共产品详情接口为：

```http
GET /api/v1/public/products/{product_id}
```

该接口只返回消费者需要的产品知识字段，并要求产品状态为
`published` 或 `active` 且 Canada compliance 为 `approved`。

QR Lookup 也返回同一份公共产品 DTO，避免 QR 页面和普通产品页面产生两套字段定义。

Public Product API 与 Admin Product API 不应完全相同。

例如 Admin 可以看到：

```text
compliance_status
shopify_product_id
sync_status
internal_notes
```

消费者不能看到。

Public DTO：

```text
ProductPublicResource
```

只提供消费者需要的数据。

---

# 49. API Security Rules

禁止：

```text
Shopify Admin Token
Database Credentials
Internal File Paths
Supplier Cost
Purchase Price
Internal Notes
Compliance Internal Notes
Audit Logs
Admin Users
```

出现在 Public API。

所有数据库查询必须通过：

```text
Eloquent
Query Builder
```

禁止把用户输入直接拼接 SQL。

---

# 50. Caching

V1.0 只对高频、低变化数据缓存。

例如：

```text
Skin Types
Skin Concerns
Product Types
Ingredients
Quiz Questions
```

产品详情可以后续加入 Cache。

不建议一开始建立复杂 Cache Architecture。

---

# 51. API Logging

记录：

```text
request_id
user_id
endpoint
method
status_code
response_time
created_at
```

对于 Shopify Sync：

```text
product_id
action
status
error_code
error_message
started_at
completed_at
```

不记录：

```text
password
API token
Shopify secret
payment information
```

---

# 52. Request ID

每个 API Request 生成：

```text
X-Request-ID
```

例如：

```text
X-Request-ID: 01KABC123XYZ
```

当出现错误时：

```text
User → Request ID
Admin → Logs → 找到具体请求
```

方便排查问题。

---

# 53. API Documentation

建议使用：

```text
OpenAPI
Swagger
```

V1.0 可以直接维护：

```text
openapi.yaml
```

后续生成：

```text
Swagger UI
```

供开发和测试使用。

---

# 54. API Testing

Laravel 使用：

```text
PHPUnit
Laravel Feature Tests
```

重点测试：

### Product

```text
Create Product
Update Product
Product Validation
Product Status
```

### CSV

```text
CSV Parse
CSV Validation
Upsert
Duplicate SKU
Duplicate Barcode
Import Error
```

### Recommendation

```text
Skin Type Match
Concern Match
Ingredient Match
Score Calculation
Hard Filter
```

### QR

```text
Valid QR
Invalid QR
Inactive QR
Product Mapping
```

### Shopify

```text
Create
Update
Sync Failure
Retry
Compliance Block
```

---

# 55. API Development Priority

开发顺序：

```text
Phase 1
Product API
Brand API
Taxonomy API
Ingredient API
        ↓
Phase 2
CSV Import API
Review API
Compliance API
        ↓
Phase 3
Shopify Sync API
        ↓
Phase 4
QR API
        ↓
Phase 5
Beauty Quiz API
Recommendation API
```

不要一开始同时开发全部 API。

---

# 56. V1.0 Final API List

最终核心 API：

```text
PRODUCT
GET    /api/v1/products
POST   /api/v1/products
GET    /api/v1/products/{id}
PUT    /api/v1/products/{id}
POST   /api/v1/products/{id}/status

BRAND
GET    /api/v1/brands
POST   /api/v1/brands
GET    /api/v1/brands/{id}
PUT    /api/v1/brands/{id}

TAXONOMY
GET    /api/v1/product-types
GET    /api/v1/skin-types
GET    /api/v1/skin-concerns

INGREDIENT
GET    /api/v1/ingredients
POST   /api/v1/ingredients
GET    /api/v1/ingredients/{id}
PUT    /api/v1/ingredients/{id}

QR
GET    /api/v1/qr/{short_code}
POST   /api/v1/products/{id}/qr

QUIZ
GET    /api/v1/quiz/questions
POST   /api/v1/quiz/session
POST   /api/v1/quiz/session/{id}/answers
POST   /api/v1/quiz/recommend

IMPORT
POST   /api/v1/imports
POST   /api/v1/imports/{id}/validate
GET    /api/v1/imports/{id}/preview
POST   /api/v1/imports/{id}/confirm
GET    /api/v1/imports/{id}/errors

SHOPIFY
POST   /api/v1/shopify/products/{id}/sync
POST   /api/v1/shopify/sync
GET    /api/v1/shopify/products/{id}/status
```

---

# 57. V1.0 API Design Principle

整个 PIDB API 遵循一个核心原则：

```text
Simple
        ↓
Stable
        ↓
Maintainable
        ↓
Extensible
```

而不是：

```text
Microservices
API Gateway
GraphQL
Event Bus
Kubernetes
Elasticsearch
AI
```

PIDB 当前真正需要解决的是：

```text
1688 CSV
      ↓
Product Knowledge
      ↓
Review
      ↓
Compliance
      ↓
Shopify
      ↓
QR
      ↓
Beauty Quiz
      ↓
Recommendation
```

因此 V1.0 使用：

```text
Laravel
+ PostgreSQL
+ REST API
+ Laravel Queue
+ Shopify Admin API
```

即可满足整个 MVP 到早期商业化阶段的需求。

---

# 58. Final System Boundary

最终系统边界保持清晰：

```text
                 ┌─────────────────────────┐
                 │       Supplier / 1688   │
                 │        CSV / Excel      │
                 └────────────┬────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │       PIDB       │
                    │ Product Knowledge│
                    │      Master      │
                    └────────┬─────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
              QR Page      Quiz       Shopify
                │            │            │
                │            ▼            ▼
                │      Recommendation   Storefront
                │                         │
                └────────────┬────────────┘
                             ▼
                         Consumer
```

**PIDB 是 Product Knowledge Master。**

**Shopify 是 Commerce Master。**

两者通过 API 连接，但不互相替代。

这是 V1.0 最重要的架构边界。
