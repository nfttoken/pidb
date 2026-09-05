# #11 — PIDB PostgreSQL Database Schema + SQLAlchemy Models + Alembic Migration Specification V1.0

**Project:** Beauty Product Information Database (PIDB)  
**Architecture:** FastAPI + React + PostgreSQL  
**ORM:** SQLAlchemy 2.x  
**Migration:** Alembic  
**Version:** V1.0  
**Status:** Development Specification  
**Date:** 2026-09-01

---

# 1. 文档目的

本文档把 #05 中定义的 PIDB 数据模型正式转换为 PostgreSQL 数据库实施规范。

本文档确定：

- PostgreSQL Database Schema
- Table Structure
- Column Types
- Primary Keys
- Foreign Keys
- Unique Constraints
- Indexes
- Enum / Status
- Relationship
- SQLAlchemy 2.x Model Structure
- Alembic Migration Structure
- Transaction Rules
- Soft Delete Rules
- Audit Rules

本文档是后续 FastAPI Backend 开发的数据库基础。

---

# 2. Database Architecture

PIDB 使用：

```text
PostgreSQL
    │
    ├── Core Product Data
    ├── Taxonomy
    ├── Ingredients
    ├── Product Relationships
    ├── Compliance
    ├── QR
    ├── Shopify Mapping
    ├── Import
    ├── Audit
    └── Job Queue
```

V1.0：

> **一个 PostgreSQL Database**

不拆分多个 Database。

---

# 3. Database Naming Convention

统一使用：

```text
snake_case
```

例如：

```text
product_code
product_name_en
country_of_origin
created_at
updated_at
```

Table：

```text
plural + snake_case
```

例如：

```text
products
product_skus
product_images
skin_types
```

---

# 4. UUID Strategy

核心业务实体使用 UUID。

例如：

```text
products.id
brands.id
ingredients.id
product_skus.id
```

推荐 PostgreSQL：

```text
UUID
```

默认生成：

```text
gen_random_uuid()
```

因此需要：

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

# 5. Identifier Strategy

系统存在多个不同 ID。

```text
Product ID
Product Code
SKU
Barcode
Shopify Product ID
Shopify Handle
QR Short Code
```

它们不能混用。

---

## 5.1 Product ID

例如：

```text
550e8400-e29b-41d4-a716-446655440000
```

用途：

> Database permanent identity

---

## 5.2 Product Code

例如：

```text
KR-SERUM-001
```

用途：

> Human-readable internal product identifier

必须：

```text
UNIQUE
NOT NULL
```

---

## 5.3 SKU

例如：

```text
COSRX-SNAIL-100
```

SKU 是可销售库存单位。

必须：

```text
UNIQUE
```

---

## 5.4 Barcode

例如：

```text
8809598451234
```

如果存在：

```text
UNIQUE
```

允许 NULL。

---

# 6. Timestamp Standard

所有主要业务表使用：

```text
created_at
updated_at
```

PostgreSQL：

```text
TIMESTAMP WITH TIME ZONE
```

简称：

```text
TIMESTAMPTZ
```

统一使用 UTC 存储。

应用层根据用户时区显示。

---

# 7. Core Tables

V1.0 核心表：

```text
1. users
2. brands
3. product_types
4. products
5. product_skus
6. product_images
7. ingredients
8. product_ingredients
9. skin_types
10. product_skin_types
11. skin_concerns
12. product_concerns
13. product_claims
14. product_canada
15. product_qr
16. shopify_mapping
17. sync_logs
18. import_batches
19. import_errors
20. data_sources
21. product_source_records
22. audit_logs
23. jobs
```

---

# 8. Users

Table：

```text
users
```

用途：

> PIDB Admin 用户

字段：

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| email | VARCHAR(255) | UNIQUE NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| name | VARCHAR(150) | NOT NULL |
| role | VARCHAR(30) | NOT NULL |
| is_active | BOOLEAN | NOT NULL |
| last_login_at | TIMESTAMPTZ | NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

Role：

```text
admin
editor
reviewer
```

---

# 9. Brands

Table：

```text
brands
```

字段：

| Field | Type |
|---|---|
| id | UUID PK |
| name | VARCHAR(255) |
| name_en | VARCHAR(255) |
| name_zh | VARCHAR(255) |
| country_of_origin | CHAR(2) |
| website | VARCHAR(500) |
| description_en | TEXT |
| description_zh | TEXT |
| status | VARCHAR(30) |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

建议：

```text
UNIQUE(name)
```

---

# 10. Product Types

Table：

```text
product_types
```

字段：

```text
id
code
name_en
name_zh
parent_id
sort_order
status
created_at
updated_at
```

例如：

```text
SKINCARE
MAKEUP
HAIRCARE
BODY_CARE
```

允许层级：

```text
Skincare
 ├── Cleanser
 ├── Toner
 ├── Serum
 └── Moisturizer
```

因此：

```text
parent_id → product_types.id
```

---

# 11. Products

这是 PIDB 最核心的表。

Table：

```text
products
```

字段：

| Field | Type | Constraint |
|---|---|---|
| id | UUID | PK |
| product_code | VARCHAR(50) | UNIQUE NOT NULL |
| brand_id | UUID | FK NOT NULL |
| product_type_id | UUID | FK NOT NULL |
| original_language | VARCHAR(10) | NOT NULL |
| original_name | VARCHAR(500) | NOT NULL |
| product_name_en | VARCHAR(500) | NOT NULL |
| product_name_zh | VARCHAR(500) | NULL |
| description_en | TEXT | NULL |
| description_zh | TEXT | NULL |
| how_to_use_en | TEXT | NULL |
| how_to_use_zh | TEXT | NULL |
| warnings_en | TEXT | NULL |
| warnings_zh | TEXT | NULL |
| country_of_origin | CHAR(2) | NULL |
| status | VARCHAR(30) | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

Status：

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

---

# 12. Product Status Rules

推荐生命周期：

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

异常/终止：

```text
inactive
discontinued
```

不能简单通过 SQL 任意修改状态。

状态转换应通过：

```text
ProductService
```

进行。

---

# 13. Product SKUs

Table：

```text
product_skus
```

字段：

| Field | Type |
|---|---|
| id | UUID PK |
| product_id | UUID FK |
| sku | VARCHAR(100) UNIQUE |
| barcode | VARCHAR(50) UNIQUE NULL |
| variant_name_en | VARCHAR(255) |
| variant_name_zh | VARCHAR(255) |
| net_quantity | NUMERIC(12,3) |
| quantity_unit | VARCHAR(20) |
| status | VARCHAR(30) |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

关系：

```text
Product 1 ─── N ProductSKU
```

例如：

```text
Product:
COSRX Advanced Snail 96

SKU:
COSRX-SNAIL-100
COSRX-SNAIL-30
```

---

# 14. Product Images

Table：

```text
product_images
```

字段：

```text
id
product_id
image_url
image_type
alt_text_en
alt_text_zh
sort_order
status
created_at
updated_at
```

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

PIDB 只保存：

```text
image_url
```

不保存图片二进制。

---

# 15. Ingredients

Table：

```text
ingredients
```

字段：

| Field | Type |
|---|---|
| id | UUID |
| inci_name | VARCHAR(255) |
| common_name_en | VARCHAR(255) |
| common_name_zh | VARCHAR(255) |
| common_name_ko | VARCHAR(255) |
| common_name_ja | VARCHAR(255) |
| description_en | TEXT |
| description_zh | TEXT |
| cosmetic_functions | JSONB |
| search_keywords | TEXT |
| status | VARCHAR(30) |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

`inci_name` 建议：

```text
UNIQUE
```

---

# 16. Product Ingredients

这是 Product ↔ Ingredient 的关联表。

```text
product_ingredients
```

字段：

```text
product_id
ingredient_id
ingredient_order
is_key_ingredient
created_at
```

Primary Key：

```text
(product_id, ingredient_id)
```

例如：

```text
Product
   │
   ├── Hyaluronic Acid
   ├── Glycerin
   ├── Panthenol
   └── Ceramide NP
```

`ingredient_order` 必须保留，因为 INCI 顺序具有业务价值。

---

# 17. Cosmetic Ingredient Functions

`cosmetic_functions` 使用 JSONB。

例如：

```json
[
  "humectant",
  "skin_conditioning"
]
```

V1.0 可以采用 JSONB，而不是立即建立复杂的：

```text
ingredient_functions
ingredient_function_translations
ingredient_function_mapping
```

避免过度数据库规范化。

---

# 18. Skin Types

Table：

```text
skin_types
```

V1：

```text
normal
dry
oily
combination
sensitive
```

字段：

```text
id
code
name_en
name_zh
description_en
description_zh
sort_order
status
created_at
updated_at
```

---

# 19. Product Skin Types

关联表：

```text
product_skin_types
```

字段：

```text
product_id
skin_type_id
```

Primary Key：

```text
(product_id, skin_type_id)
```

关系：

```text
Product N ─── N SkinType
```

---

# 20. Skin Concerns

Table：

```text
skin_concerns
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

字段：

```text
id
code
name_en
name_zh
parent_id
description_en
description_zh
sort_order
status
created_at
updated_at
```

允许层级：

```text
Tone
 ├── Dark Spots
 ├── Dullness
 └── Uneven Skin Tone

Texture
 ├── Pores
 ├── Fine Lines
 └── Wrinkles
```

---

# 21. Product Concerns

Table：

```text
product_concerns
```

字段：

```text
product_id
concern_id
```

Primary Key：

```text
(product_id, concern_id)
```

---

# 22. Product Claims

Table：

```text
product_claims
```

字段：

```text
id
product_id
claim_en
claim_zh
claim_type
source
approved
created_at
updated_at
```

Claim Type：

```text
hydration
soothing
brightening_appearance
oil_control
barrier_support
anti_aging_appearance
other
```

重要：

> Claim 必须作为独立数据，而不是简单拼接到 Description。

---

# 23. Product Canada

Table：

```text
product_canada
```

字段：

```text
id
product_id
importer_name
distributor_name
canadian_label_status
cosmetic_notification_status
compliance_status
notes
reviewed_at
created_at
updated_at
```

状态：

```text
canadian_label_status:
pending
reviewing
approved
blocked
```

```text
cosmetic_notification_status:
pending
submitted
confirmed
not_required
```

```text
compliance_status:
pending
reviewing
approved
blocked
```

---

# 24. Compliance Rule

Shopify Publish 必须满足：

```text
product.status = ready
```

并且：

```text
product_canada.compliance_status = approved
```

否则：

```text
BLOCK SHOPIFY SYNC
```

这个规则必须位于：

```text
ComplianceService
```

和：

```text
SyncService
```

而不是仅依赖 Frontend。

---

# 25. Product QR

Table：

```text
product_qr
```

字段：

```text
id
product_id
short_code
destination_type
status
created_at
updated_at
```

Short Code：

```text
UNIQUE
```

例如：

```text
A8K29
```

URL：

```text
https://yourdomain.ca/p/A8K29
```

---

# 26. QR Destination

V1：

```text
product
```

未来可扩展：

```text
campaign
quiz
landing_page
```

但是 V1 数据结构保留：

```text
destination_type
```

方便未来扩展。

---

# 27. Shopify Mapping

Table：

```text
shopify_mapping
```

字段：

```text
id
product_id
shopify_product_id
shopify_handle
sync_status
last_sync_at
last_sync_hash
last_error
created_at
updated_at
```

`product_id`：

```text
UNIQUE
```

因为：

> 一个 PIDB Product V1.0 对应一个 Shopify Product。

---

# 28. Shopify Sync Status

```text
pending
syncing
synced
failed
blocked
```

---

# 29. Sync Logs

Table：

```text
sync_logs
```

字段：

```text
id
product_id
action
status
error_code
error_message
started_at
completed_at
```

用途：

记录每次 Shopify Sync。

例如：

```text
PRODUCT_SYNC
SUCCESS
```

或者：

```text
PRODUCT_UPDATE
FAILED
SHOPIFY_API_ERROR
```

---

# 30. Import Batches

Table：

```text
import_batches
```

字段：

```text
id
filename
total_rows
success_rows
failed_rows
status
created_at
updated_at
```

Status：

```text
uploaded
validating
validated
importing
completed
completed_with_errors
failed
```

---

# 31. Import Errors

Table：

```text
import_errors
```

字段：

```text
id
batch_id
row_number
product_code
field_name
error_code
error_message
raw_value
created_at
```

关系：

```text
ImportBatch 1 ─── N ImportError
```

---

# 32. Data Sources

Table：

```text
data_sources
```

用于记录数据来源。

例如：

```text
1688
Supplier CSV
Manufacturer Excel
Official Website
Product Packaging
Manual Entry
```

字段：

```text
id
name
source_type
url
description
status
created_at
updated_at
```

---

# 33. Product Source Records

Table：

```text
product_source_records
```

字段：

```text
id
product_id
data_source_id
source_identifier
raw_data
created_at
updated_at
```

其中：

```text
raw_data JSONB
```

用于保留供应商原始数据。

例如：

```json
{
  "product_name": "...",
  "ingredients": "...",
  "brand": "...",
  "source_sku": "..."
}
```

这样 PIDB 标准化后仍然可以追溯原始数据。

---

# 34. Audit Logs

Table：

```text
audit_logs
```

字段：

```text
id
user_id
action
entity_type
entity_id
old_value
new_value
created_at
```

其中：

```text
old_value JSONB
new_value JSONB
```

例如：

```text
Product
Updated
```

可以记录：

```json
{
  "product_name_en": "Old Name"
}
```

到：

```json
{
  "product_name_en": "New Name"
}
```

---

# 35. Jobs

V1.0 使用 PostgreSQL Job Queue。

Table：

```text
jobs
```

字段：

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
created_at
updated_at
```

Job Type：

```text
csv_import
shopify_sync
```

未来可以扩展。

---

# 36. Database Relationships

整体关系：

```text
Brand
  │
  └── 1:N Product
             │
             ├── 1:N ProductSKU
             ├── 1:N ProductImage
             ├── N:N Ingredient
             ├── N:N SkinType
             ├── N:N SkinConcern
             ├── 1:N ProductClaim
             ├── 1:1 ProductCanada
             ├── 1:1 ProductQR
             ├── 1:1 ShopifyMapping
             └── 1:N ProductSourceRecord
```

---

# 37. SQLAlchemy 2.x Base

推荐：

```python
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
```

所有 Model：

```python
class Product(Base):
    __tablename__ = "products"
```

---

# 38. SQLAlchemy UUID

推荐：

```python
from sqlalchemy.dialects.postgresql import UUID
```

字段：

```python
id: Mapped[UUID]
```

数据库：

```text
UUID
```

---

# 39. SQLAlchemy Model Style

使用 SQLAlchemy 2.x Typed ORM：

```python
class Product(Base):
    __tablename__ = "products"

    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    product_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )
```

不推荐旧式：

```python
Column(...)
```

作为新的 V1.0 代码标准。

---

# 40. Relationship Style

例如：

```python
class Product(Base):

    brand: Mapped["Brand"] = relationship(
        back_populates="products"
    )

    skus: Mapped[list["ProductSKU"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
    )
```

---

# 41. Cascade Rules

Product 删除时：

允许级联删除：

```text
ProductSKU
ProductImage
ProductIngredient
ProductSkinType
ProductConcern
ProductClaim
ProductQR
```

但：

```text
Ingredient
SkinType
SkinConcern
Brand
```

不能因为 Product 删除而删除。

---

# 42. Soft Delete Strategy

V1.0 不要求所有表统一增加：

```text
deleted_at
```

原因：

很多 PIDB 数据属于 master/reference data。

对于 Product：

```text
inactive
discontinued
```

优先使用业务状态。

因此：

> 不采用全局 Soft Delete。

如果未来需要审计级别删除恢复，再增加 `deleted_at`。

---

# 43. Foreign Key Rules

例如：

```text
products.brand_id
        ↓
brands.id
```

删除 Brand 时：

```text
RESTRICT
```

因为不能删除仍被 Product 使用的 Brand。

同理：

```text
ProductType
Ingredient
SkinType
SkinConcern
```

都不允许被 Product 删除操作级联删除。

---

# 44. Unique Constraints

V1.0 必须：

```text
brands.name
products.product_code
product_skus.sku
product_skus.barcode
ingredients.inci_name
product_qr.short_code
shopify_mapping.product_id
```

其中 Barcode 允许：

```text
NULL
```

但非 NULL 值必须唯一。

---

# 45. Important Indexes

Products：

```text
INDEX products.brand_id
INDEX products.product_type_id
INDEX products.status
INDEX products.original_language
INDEX products.country_of_origin
```

SKUs：

```text
INDEX product_skus.product_id
UNIQUE product_skus.sku
UNIQUE product_skus.barcode
```

Ingredients：

```text
UNIQUE ingredients.inci_name
```

QR：

```text
UNIQUE product_qr.short_code
```

Shopify：

```text
UNIQUE shopify_mapping.product_id
INDEX shopify_mapping.shopify_product_id
INDEX shopify_mapping.sync_status
```

Jobs：

```text
INDEX jobs.status
INDEX jobs.available_at
```

---

# 46. Search Strategy

V1.0 不使用 Elasticsearch。

PostgreSQL：

```text
ILIKE
```

用于：

```text
Product Name
Product Code
SKU
Barcode
Brand
INCI
```

未来如果产品数量达到明显规模，再考虑：

```text
PostgreSQL Full Text Search
```

或者 Elasticsearch。

---

# 47. Alembic Structure

```text
backend/
│
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       ├── 0001_create_users.py
│       ├── 0002_create_taxonomy.py
│       ├── 0003_create_products.py
│       ├── 0004_create_ingredients.py
│       ├── 0005_create_product_relations.py
│       ├── 0006_create_compliance_qr.py
│       ├── 0007_create_shopify.py
│       ├── 0008_create_import_audit.py
│       └── 0009_create_jobs.py
```

---

# 48. Migration Principle

所有数据库结构变化必须通过：

```text
Alembic Migration
```

禁止直接在生产数据库：

```text
ALTER TABLE
```

然后不生成 Migration。

---

# 49. Alembic Commands

创建 migration：

```bash
alembic revision --autogenerate -m "create products"
```

执行：

```bash
alembic upgrade head
```

回滚：

```bash
alembic downgrade -1
```

查看：

```bash
alembic current
```

---

# 50. Initial Migration Order

推荐：

```text
0001
Users

0002
Brands

0003
Product Types

0004
Products

0005
Product SKUs

0006
Images

0007
Ingredients

0008
Skin Types

0009
Skin Concerns

0010
Product Relationships

0011
Claims

0012
Canada Compliance

0013
QR

0014
Shopify

0015
Import

0016
Data Sources

0017
Audit

0018
Jobs
```

---

# 51. Seed Data

以下属于系统基础数据，需要 Seed：

```text
Product Types
Skin Types
Skin Concerns
Ingredient Function Categories
Claim Types
System Roles
```

例如 Skin Types：

```text
normal
dry
oily
combination
sensitive
```

Seed 数据必须具有稳定的：

```text
code
```

不要依赖数据库自增 ID。

---

# 52. Database Session

FastAPI 使用：

```text
SQLAlchemy AsyncSession
```

推荐：

```text
asyncpg
```

Database URL：

```text
postgresql+asyncpg://...
```

例如：

```python
engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
)
```

---

# 53. Session Dependency

API：

```text
get_db()
```

提供：

```text
AsyncSession
```

流程：

```text
Request
   ↓
get_db()
   ↓
Service
   ↓
Repository
   ↓
Commit / Rollback
```

---

# 54. Transaction Boundary

Service 层负责 Transaction Boundary。

例如 CSV：

```text
ImportService
      │
      ├── Product A → transaction
      ├── Product B → transaction
      └── Product C → transaction
```

单个 Product 出错：

```text
Rollback Product
```

而不是：

```text
Rollback entire CSV
```

---

# 55. Product Create Transaction

创建一个 Product 时：

```text
products
+
product_skus
+
product_ingredients
+
product_skin_types
+
product_concerns
+
product_claims
+
product_images
```

应该处于：

```text
ONE DATABASE TRANSACTION
```

---

# 56. Read Model vs Write Model

V1.0 不需要 CQRS。

统一：

```text
SQLAlchemy Model
+
Pydantic Schema
```

但是：

> Database Model 不直接作为 API Response。

必须经过：

```text
SQLAlchemy
 ↓
Pydantic Response Schema
 ↓
JSON
```

---

# 57. JSONB Usage

V1.0 使用 JSONB 的地方：

```text
ingredients.cosmetic_functions
product_source_records.raw_data
audit_logs.old_value
audit_logs.new_value
```

不建议把核心关系数据放 JSONB。

例如：

错误：

```json
{
  "skin_types": ["dry", "sensitive"]
}
```

正确：

```text
product_skin_types
```

因为 Skin Type 需要：

- filtering
- joins
- recommendation
- indexing

---

# 58. Database Integrity

必须依赖数据库 Constraint 保证：

```text
PK
FK
UNIQUE
NOT NULL
CHECK
```

不能只依赖 React 或 FastAPI Validation。

例如：

```text
Duplicate SKU
```

必须由：

```text
FastAPI Validation
+
PostgreSQL UNIQUE
```

双重保障。

---

# 59. Check Constraints

可以增加：

```text
net_quantity >= 0
```

例如：

```sql
CHECK (net_quantity IS NULL OR net_quantity >= 0)
```

对于：

```text
sort_order
ingredient_order
```

也可以限制：

```text
>= 0
```

---

# 60. Product Code Format

推荐：

```text
^[A-Z0-9][A-Z0-9_-]{2,49}$
```

例如：

```text
KR-SERUM-001
JP-CLEANSER-001
COSRX-SNAIL-001
```

但 Format Validation 应主要由：

```text
Pydantic
```

完成。

Database 重点保证：

```text
UNIQUE
NOT NULL
```

---

# 61. Barcode Strategy

Barcode 不强制所有 Product 必须存在。

原因：

部分供应商数据可能：

```text
无 Barcode
Barcode 缺失
Barcode 错误
```

因此：

```text
barcode NULL allowed
```

但一旦存在：

```text
UNIQUE
```

---

# 62. Original Language

数据库：

```text
VARCHAR(10)
```

V1：

```text
ko
ja
zh
en
fr
other
```

不要使用 PostgreSQL ENUM。

原因：

未来可能增加：

```text
de
es
it
pt
```

使用普通 VARCHAR + Application Validation 更容易扩展。

---

# 63. Status Fields

同样不强制 PostgreSQL ENUM。

使用：

```text
VARCHAR
```

配合：

```text
Pydantic Enum
```

例如：

```python
class ProductStatus(str, Enum):
    DRAFT = "draft"
    IMPORTED = "imported"
    PROCESSING = "processing"
    REVIEW = "review"
    READY = "ready"
    PUBLISHED = "published"
    ACTIVE = "active"
    INACTIVE = "inactive"
    DISCONTINUED = "discontinued"
```

这样未来修改状态不会产生复杂 DB Migration。

---

# 64. Performance Target

V1.0 目标：

```text
Product Count
< 100,000
```

PostgreSQL 足够。

目标：

```text
Product Search
< 300ms
```

普通 Admin CRUD：

```text
< 500ms
```

Recommendation：

```text
< 1s
```

实际性能以生产环境测试为准。

---

# 65. Backup

PostgreSQL 必须：

```text
Daily Backup
```

至少保留：

```text
7–30 days
```

生产环境推荐：

```text
pg_dump
```

以及未来：

```text
Point-in-Time Recovery
```

---

# 66. Database Security

Production：

```text
PostgreSQL
     │
     └── private network
```

禁止：

```text
Internet → PostgreSQL:5432
```

只有：

```text
FastAPI → PostgreSQL
```

允许访问。

---

# 67. Database User

不要使用：

```text
postgres
```

作为 FastAPI Production Runtime User。

创建：

```text
pidb_app
```

例如：

```text
pidb_app
```

权限：

```text
SELECT
INSERT
UPDATE
DELETE
```

Migration 可以使用独立：

```text
pidb_migration
```

---

# 68. Final Database Architecture

```text
                        PostgreSQL
                            │
        ┌───────────────────┼────────────────────┐
        │                   │                    │
        ▼                   ▼                    ▼
   Product Master       Taxonomy             Ingredients
        │                   │                    │
        └───────────────────┼────────────────────┘
                            │
                            ▼
                    Recommendation Data
                            │
             ┌──────────────┼───────────────┐
             ▼              ▼               ▼
          Canada           QR            Shopify
        Compliance       Mapping          Mapping
             │              │               │
             └──────────────┼───────────────┘
                            ▼
                       Audit / Jobs
                            │
                            ▼
                       Import System
```

---

# 69. Final Table List

V1.0 最终确定：

```text
users

brands

product_types
products
product_skus
product_images

ingredients
product_ingredients

skin_types
product_skin_types

skin_concerns
product_concerns

product_claims

product_canada

product_qr

shopify_mapping
sync_logs

import_batches
import_errors

data_sources
product_source_records

audit_logs

jobs
```

共：

> **23 张核心表**

---

# 70. V1.0 Database Design Principle

最终采用：

```text
PostgreSQL
+
UUID
+
SQLAlchemy 2.x
+
Alembic
+
AsyncSession
+
JSONB for flexible metadata
+
Relational tables for core business data
```

核心原则：

> **关系型数据关系化，非结构化辅助数据 JSONB 化。**

不采用：

```text
MongoDB
Redis
Elasticsearch
```

作为 PIDB V1.0 核心数据库。

---

# 71. 与前面文档的对应关系

```text
#05
Database Schema & CSV Import
        │
        ▼
#11
PostgreSQL + SQLAlchemy + Alembic
        │
        ▼
#12
FastAPI API Implementation
        │
        ▼
#13
React Admin Implementation
        │
        ▼
#14
CSV Import Implementation
        │
        ▼
#15
QR + Beauty Quiz
        │
        ▼
#16
Shopify Integration
```

因此从 #12 开始，可以真正进入代码实现阶段。

---

# 72. Final Decision

PIDB V1.0 数据层正式确定：

> **PostgreSQL + SQLAlchemy 2.x + Alembic + AsyncSession**

数据库：

> **23 张核心表**

Backend：

> **FastAPI**

Frontend：

> **React + TypeScript**

数据导入：

> **CSV**

Recommendation：

> **Rule-Based**

Commerce：

> **Shopify**

整体架构：

> **Modular Monolith + REST API**

不提前引入：

> **Microservices / Redis / Kafka / RabbitMQ / Elasticsearch / AI**