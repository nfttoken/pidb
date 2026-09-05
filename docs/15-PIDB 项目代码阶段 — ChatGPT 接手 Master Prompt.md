# PIDB 项目代码阶段 — ChatGPT 接手 Master Prompt

你现在正式接手一个已经完成前期架构设计的项目。

项目名称：

**Beauty Product Information Database（PIDB）**

中文可以称为：

**美容产品信息数据库 / Beauty Product Information Database**

这是一个面向加拿大市场的 **Beauty Product Discovery + E-commerce Platform**。

你现在的主要任务不是重新设计架构，而是：

> **严格基于已有 #01～#14 设计文档，从 #15 开始进入实际代码开发阶段。**

---

# 一、首先理解项目目标

项目背景：

- 韩国、日本等美容产品已经进口到加拿大 Toronto/GTA。
- 实体产品已经具有 English/French 合规标签。
- 当前重点不是重新解决进口和标签合规问题。
- 当前重点是：
  1. 建立标准化 Beauty Product Information Database。
  2. 建立后台 Product Information Management。
  3. 将 PIDB 与 Shopify 集成。
  4. 建立 QR Product Discovery。
  5. 建立 Beauty Quiz。
  6. 后续实现规则型 Product Recommendation。
  7. Consumer Website 支持 English + Chinese。
  8. 后续可以扩展 PWA。

项目定位：

> **Beauty Product Discovery + E-commerce Platform**

不是：

> 单纯的 K-Beauty Shop。

因此数据库设计不能把系统硬编码成只支持 Korean Beauty。

产品原始语言必须支持：

```text
ko
ja
zh
en
fr
other
```

---

# 二、最重要的架构原则

请把下面这些内容视为已经确定的架构决策。

除非发现明确的技术错误、安全问题或者用户明确要求改变，否则：

**不要重新设计这些架构。**

---

## 1. Shopify 与 PIDB 的职责

### Shopify = Commerce Master

Shopify 管理：

```text
Product Commerce
Variant
SKU Commerce
Price
Inventory
Cart
Checkout
Payment
Order
Customer
Discount
Shipping
Fulfillment
Tax
```

### PIDB = Product Knowledge Master

PIDB 管理：

```text
Original Product Information
Standardized Product Information
Brand
Product Type
Skin Type
Skin Concern
Ingredients
INCI
Claims
Usage
Warnings
Images Metadata
Canada Internal Compliance Tracking
QR Mapping
Product Knowledge
Shopify Mapping
```

核心原则：

```text
PIDB
  ↓
Product Knowledge Master

Shopify
  ↓
Commerce Master
```

不要让 Shopify 成为 PIDB 的产品知识主数据库。

---

# 三、技术栈已经确定

## Backend

```text
Python
FastAPI
Pydantic v2
SQLAlchemy 2.x
Alembic
PostgreSQL
asyncpg
httpx
JWT / OAuth2
Argon2id
pytest
pytest-asyncio
```

## Frontend

```text
React
TypeScript
Vite
Ant Design
React Router
TanStack React Query
```

## Infrastructure

```text
Ubuntu
Nginx
Uvicorn
PostgreSQL
```

## External

```text
Shopify Admin API
```

---

# 四、V1.0 明确不要使用的技术

除非后续明确要求，否则不要主动加入：

```text
Django
Flask
Next.js
Nuxt
GraphQL
Microservices
API Gateway
Redis
Kafka
RabbitMQ
Celery
Elasticsearch
MongoDB
AI Recommendation
```

V1.0 的目标是：

> **简单、稳定、可维护、容易部署。**

目前产品规模预计小于约 10,000 products。

PostgreSQL 足够。

---

# 五、项目目录

最终项目采用：

```text
pidb/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py
│   │   │   ├── router.py
│   │   │   └── v1/
│   │   │       ├── auth.py
│   │   │       ├── products.py
│   │   │       ├── brands.py
│   │   │       ├── product_types.py
│   │   │       ├── skin_types.py
│   │   │       ├── skin_concerns.py
│   │   │       ├── ingredients.py
│   │   │       ├── claims.py
│   │   │       ├── compliance.py
│   │   │       ├── imports.py
│   │   │       ├── qr.py
│   │   │       ├── quiz.py
│   │   │       ├── shopify.py
│   │   │       ├── users.py
│   │   │       └── health.py
│   │   │
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   ├── security.py
│   │   │   ├── exceptions.py
│   │   │   └── logging.py
│   │   │
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── workers/
│   │   ├── utils/
│   │   └── main.py
│   │
│   ├── alembic/
│   ├── tests/
│   ├── requirements.txt
│   ├── pyproject.toml
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── api/
    │   ├── components/
    │   ├── features/
    │   ├── layouts/
    │   ├── pages/
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
    └── vite.config.ts
```

---

# 六、已有设计文档

项目已经完成：

```text
#01 — Product Information Database Specification V1.0

#04 — PIDB ↔ Shopify Integration Specification V1.0

#05 — PIDB Database Schema & CSV Import Specification V1.0

#06 — PIDB Admin UI & Product Management Specification V1.0

#07 — PIDB Data Dictionary & CSV → PIDB → Shopify Mapping Specification V1.0

#08 — Beauty Product Taxonomy & Recommendation Rules Specification V1.0

#09 — PIDB API Specification V1.0

#10 — PIDB FastAPI + React Project Structure & Development Specification V1.0

#11 — PIDB PostgreSQL Database Schema + SQLAlchemy Models + Alembic Migration V1.0

#12 — PIDB FastAPI API Implementation Specification V1.0

#13 — PIDB React Admin Frontend Implementation Specification V1.0

#14 — PIDB React Admin UI Page Design + React Component Specification V1.0
```

这些文件应该位于当前 ChatGPT Project / 工作目录中。

---

# 七、你的第一项工作：先阅读文档

在开始写代码之前：

1. 检查当前 Project 中是否存在 #01～#14。
2. 如果存在，逐个读取。
3. 建立一个统一的项目上下文。
4. 找出不同文档之间可能存在的冲突。
5. 不要自行覆盖已经确定的业务规则。
6. 如果发现冲突，列出冲突并告诉我应该以哪一份文档为准。

特别注意：

#10～#14 已经是从 Laravel 方案迁移到：

```text
FastAPI + React + PostgreSQL
```

因此：

> 如果早期文档中出现 Laravel、Sanctum 等内容，不要把 Laravel 重新作为当前技术栈。

当前 Backend：

```text
FastAPI
JWT/OAuth2
SQLAlchemy 2.x
Alembic
PostgreSQL
```

---

# 八、代码开发从 #15 开始

现在进入：

#15 — PIDB FastAPI + React Runnable Project Code Skeleton V1.0

目标不是继续写设计文档。

目标是：

> **生成真正可以运行的项目代码。**

最终应该能够做到：

```text
PostgreSQL
    ↓
FastAPI
    ↓
React
```

真正启动。

---

# 九、#15 的开发顺序

请严格按照下面顺序：

## Phase 1 — Project Bootstrap

Backend：

```text
FastAPI
Configuration
Database
SQLAlchemy
Alembic
Health Check
Logging
```

Frontend：

```text
Vite
React
TypeScript
Ant Design
React Router
React Query
API Client
```

---

## Phase 2 — Database

实现：

```text
SQLAlchemy Models
Alembic Migration
PostgreSQL Schema
```

核心 tables：

```text
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
```

同时考虑已经确定的：

```text
data_sources
product_source_records
audit_logs
```

---

# 十、Database 原则

使用：

```text
UUID primary keys
```

Product：

```text
id
product_code
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
created_at
updated_at
```

SKU：

```text
sku
barcode
variant_name_en
variant_name_zh
net_quantity
quantity_unit
status
```

SKU 必须唯一。

Barcode 如果存在必须唯一。

---

# 十一、Product ID / SKU / Barcode

不要混淆：

```text
Product ID
    ↓
UUID

Product Code
    ↓
Human-readable PIDB identifier

SKU
    ↓
Saleable inventory unit

Barcode
    ↓
Supplier / GTIN / product barcode

Shopify Product ID
    ↓
Shopify identifier

Shopify Handle
    ↓
URL identifier

QR Short Code
    ↓
QR identifier
```

---

# 十二、CSV Import

CSV 是重要数据来源。

主要来源：

```text
1688 CSV
Supplier CSV
Manufacturer Excel
Catalog
```

V1.0 不做 AI scraping。

CSV flow：

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
Import
 ↓
Result
```

CSV multi-value separator：

```text
|
```

例如：

```text
skin_types=Dry|Sensitive
```

---

# 十三、CSV Import 必须支持

```text
Create
Update
Upsert
Validation
Preview
Import Errors
Unknown Ingredients
Duplicate SKU
Duplicate Barcode
Missing Required Fields
```

默认：

```text
upsert by product_code
```

---

# 十四、Product Lifecycle

使用：

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

不要在前端自行决定状态。

状态转换由 FastAPI Service 控制。

---

# 十五、Readiness

Product 必须具有 Readiness。

例如：

```text
86%
```

Ready 的核心条件：

```text
Required Product Information
+
Required Content
+
Required Classification
+
Required Ingredients
+
Required Images
+
Compliance Approved
```

最终规则由 Backend 控制。

---

# 十六、Compliance

Product Canada Compliance：

```text
pending
reviewing
approved
blocked
```

只有：

```text
compliance = approved
```

才可以进入：

```text
ready
```

并最终：

```text
Shopify publish
```

注意：

> Compliance 是内部管理和审核模块，不等同于法律意见。

---

# 十七、Shopify Integration

架构：

```text
PIDB
 ↓
Sync Queue
 ↓
Shopify Admin API
```

V1.0 不需要：

```text
GraphQL
Event Bus
Kafka
Microservices
```

除非 Shopify 当前 API 实际要求某项能力，否则优先保持简单 REST/API Client 架构。

Shopify Sync 必须：

```text
Idempotent
Retryable
Logged
```

建议最大：

```text
3 retries
```

---

# 十八、Shopify 数据所有权

PIDB：

```text
Product Name
Description
Brand
Product Type
Skin Type
Skin Concern
Ingredients
Claims
Usage
Warnings
Country
Images Metadata
Compliance
```

Shopify：

```text
Price
Inventory
Cart
Checkout
Order
Customer
Discount
Shipping
Fulfillment
```

不要让 PIDB 维护：

```text
orders
customers
payments
inventory ledger
```

---

# 十九、Shopify Metafields

已经规划：

```text
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
custom.pidb_product_id
custom.qr_short_code
```

不要随意重新设计 namespace/key。

如果发现 Shopify API 当前版本对某字段有更好的实现方式，可以提出，但不要无理由改变。

---

# 二十、QR

QR 不直接指向 Shopify。

正确：

```text
QR
 ↓
https://yourdomain.ca/p/{short_code}
 ↓
PIDB
 ↓
Product
 ↓
Shopify
```

例如：

```text
/p/A8K29
```

这样以后可以改变目的地，而不用重新打印 QR。

---

# 二十一、Beauty Quiz

V1.0 不使用 AI。

Recommendation：

```text
Rule-based
```

评分：

```text
Skin Type       30
Skin Concern    30
Product Type    20
Ingredient      10
Other Preference10
------------------
Total           100
```

Tier：

```text
90–100 Excellent
75–89 Good
60–74 Potential
<60 Do Not Recommend
```

推荐逻辑由 Backend RecommendationService 完成。

React 只负责展示。

---

# 二十二、API 架构

采用：

```text
Router
 ↓
Pydantic Schema
 ↓
Service
 ↓
Repository
 ↓
SQLAlchemy
 ↓
PostgreSQL
```

不要：

```text
Router
 ↓
直接写 SQL
```

也不要：

```text
React
 ↓
SQL
```

---

# 二十三、API Response

标准：

```json
{
  "success": true,
  "data": {}
}
```

Error：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

---

# 二十四、错误代码

至少支持：

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

# 二十五、Authentication

使用：

```text
JWT / OAuth2
```

Password：

```text
Argon2id
```

Roles：

```text
Admin
Editor
Reviewer
```

后端必须进行最终权限验证。

React 的：

```text
PermissionGuard
```

只是 UI 层。

---

# 二十六、Frontend

Admin UI 使用：

```text
React
TypeScript
Vite
Ant Design
TanStack React Query
React Router
```

不要引入复杂状态管理。

Product 数据使用：

```text
React Query
```

而不是 Redux 中保存完整 Product Database。

---

# 二十七、React Component 原则

Product Editor 必须模块化：

```text
ProductEditor
├── ProductHeader
├── BasicInfoSection
├── NameSection
├── ClassificationSection
├── SkinProfileSection
├── IngredientManager
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

不要写成一个几千行：

```text
ProductEditor.tsx
```

---

# 二十八、Frontend API

组件不要直接：

```text
axios.get()
```

应该：

```text
React Component
 ↓
React Query Hook
 ↓
API Module
 ↓
FastAPI
```

例如：

```text
useProducts()
useProduct(id)
useCreateProduct()
useUpdateProduct()
useChangeProductStatus()
useProductReadiness()
useShopifySync()
```

---

# 二十九、TypeScript

使用：

```text
strict: true
```

尽量禁止：

```text
any
```

API DTO 与 UI Form Model 可以分开。

例如：

```text
ProductResponse
ProductFormData
ProductListItem
```

---

# 三十、Security

绝对不能把以下内容放到 Frontend：

```text
DATABASE_URL
JWT_SECRET_KEY
SHOPIFY_ADMIN_ACCESS_TOKEN
Private API Keys
```

Frontend `.env` 只能放 public configuration，例如：

```text
VITE_API_BASE_URL
```

---

# 三十一、测试

Backend：

```text
pytest
pytest-asyncio
httpx
```

至少测试：

```text
Auth
Product CRUD
Status Transition
Readiness
Compliance
CSV Validation
CSV Import
QR
Quiz
Recommendation
Shopify Sync
```

Frontend 后续：

```text
Playwright
```

---

# 三十二、代码质量要求

你写代码时：

1. 使用 Type Hints。
2. 使用 async/await。
3. 使用 SQLAlchemy 2.x style。
4. 使用 Pydantic v2。
5. 不把业务逻辑放在 Router。
6. 不把业务逻辑放在 React Component。
7. 不复制数据库模型逻辑到前端。
8. 不硬编码 taxonomy。
9. 不硬编码 secrets。
10. 不为了“未来可能需要”增加复杂基础设施。

---

# 三十三、代码生成方式

这是非常重要的工作方式。

不要一次生成整个项目几百个文件。

采用：

```text
Phase
 ↓
Implement
 ↓
Run/Test
 ↓
Fix
 ↓
Next Phase
```

每次修改后告诉我：

```text
Changed Files
Why
How to Run
How to Test
Known Issues
Next Step
```

---

# 三十四、如果运行环境是 Windows

我目前准备在：

**Windows Desktop ChatGPT**

环境中进行代码开发。

因此优先考虑：

```text
Windows 11
PowerShell
Git
Python
Node.js
npm
PostgreSQL
```

命令尽量同时提供：

```text
PowerShell
```

版本。

如果 Docker 是必要的，可以使用：

```text
Docker Desktop
```

但不要因为“可以 Docker”就强制所有东西 Docker 化。

---

# 三十五、Git

建议项目从一开始使用：

```text
Git
```

目录：

```text
pidb/
```

建议 branch：

```text
main
develop
feature/...
```

每完成一个稳定阶段，应建议一个 commit。

例如：

```text
feat: bootstrap FastAPI backend
feat: add PostgreSQL models
feat: add product CRUD
feat: add React admin shell
```

---

# 三十六、不要擅自改变架构

如果你认为：

```text
Redis
GraphQL
Next.js
Django
Microservices
Elasticsearch
AI
```

更好，不要直接加入。

先说明：

```text
Current Architecture
Problem
Proposed Change
Reason
Impact
```

等我确认后再改变。

---

# 三十七、遇到不确定问题时

优先级：

```text
已有项目文档
        ↓
已经实现的代码
        ↓
当前项目约定
        ↓
官方技术文档
        ↓
你的技术判断
```

不要仅凭自己的“最佳实践”推翻已有设计。

---

# 三十八、遇到文档冲突

如果发现：

```text
#05
```

与：

```text
#12
```

冲突：

不要静默选择。

告诉我：

```text
Conflict:
#05 says A
#12 says B

Recommendation:
Use B because...
```

然后等待确认，除非属于明显的技术迁移遗留问题。

---

# 三十九、当前代码阶段的最终目标

最终实现：

```text
                    Consumer
                       │
                       ▼
                 React Frontend
                 /            \
              Admin          Consumer
                │                │
                └──────┬─────────┘
                       │
                    FastAPI
                       │
                       ▼
                  PostgreSQL
                       │
                       ▼
                     PIDB
                       │
                       │ API
                       ▼
                    Shopify
```

---

# 四十、第一步现在应该做什么

你收到这个 Prompt 后：

**不要立即开始大量写代码。**

先执行以下任务：

### Step 1

检查当前 ChatGPT Project 中是否存在：

```text
#01
#04
#05
#06
#07
#08
#09
#10
#11
#12
#13
#14
```

### Step 2

读取这些 Markdown 文档。

### Step 3

输出：

```text
PIDB Project Understanding
```

包括：

```text
Business Goal
Architecture
Technology Stack
Data Ownership
Database
API
Frontend
Shopify
CSV
Compliance
QR
Quiz
Security
```

### Step 4

列出：

```text
Potential Conflicts
```

如果没有：

```text
No blocking architecture conflicts found.
```

### Step 5

提出：

```text
#15 Implementation Plan
```

但暂时不要写完整项目代码。

等我确认后，再正式开始 #15。

---

# 四十一、非常重要

从现在开始，请把这个项目视为一个**持续开发项目**。

不要把每次对话当成独立问题。

每完成一个阶段，要保持：

```text
Architecture
 ↓
Database
 ↓
Backend
 ↓
Frontend
 ↓
Integration
 ↓
Testing
```

之间的一致性。

如果代码与文档发生变化：

> **同步更新对应 Markdown Specification。**

不要让：

```text
Documentation
```

和：

```text
Code
```

长期产生 drift。

---

# 四十二、最终开发原则

这个项目不是为了展示技术复杂度。

目标是：

> **用尽可能简单的技术，实现一个真正可以运营的 Beauty Product Discovery + E-commerce Platform。**

优先级：

```text
Correctness
>
Data Integrity
>
Security
>
Maintainability
>
Simplicity
>
Performance
>
Future Scalability
```

不要为了所谓“未来扩展”过早增加基础设施。

---

# 开始

现在请先：

1. 读取当前 Project 中的 #01～#14 Markdown 文档。
2. 建立完整项目上下文。
3. 输出项目理解和潜在冲突。
4. 给出 #15 实施计划。
5. 暂时不要生成大量代码。

等待我的确认后，再开始实际代码开发。