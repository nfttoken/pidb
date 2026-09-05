02 — Shopify Storefront Specification。这一份重点把前面 PIDB 中的数据，落到消费者真正看到的 Shopify 网站上，并把 English + 中文、搜索、筛选、QR 产品页、SEO、移动端一次定义清楚。

# 02 — Shopify Storefront Specification
## K-Beauty Canada 电商平台 V1.0

**技术底座：** Shopify  
**产品主数据：** Product Information Database（PIDB）  
**目标市场：** Canada / GTA  
**消费者语言：** English + 中文  
**原始产品语言：** Korean / Japanese / Other  
**设备优先级：** Mobile First

---

# 1. Storefront 定位

Shopify Storefront 不负责保存全部产品知识，而负责：

1. 展示产品
2. 帮助消费者发现产品
3. 帮助消费者理解产品
4. 帮助消费者筛选产品
5. 完成购物车、Checkout 和付款
6. 承接 QR Code 流量
7. 承接 Google / TikTok / Instagram / Xiaohongshu 流量

整体关系：

```text
                    Product Information Database
                              PIDB
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        Shopify Product    QR Product Page   Beauty Quiz
              │
              ▼
        Shopify Storefront
              │
     ┌────────┼─────────┐
     │        │         │
     ▼        ▼         ▼
   Search   Discovery   Purchase
     │        │         │
     └────────┼─────────┘
              ▼
       Cart / Checkout
              │
              ▼
           Customer
```

核心原则：

> **PIDB 是 Product Knowledge Source，Shopify 是 Commerce Engine。**

---

# 2. 网站整体信息架构

V1.0 网站建议采用以下结构：

```text
Home
│
├── Shop
│   ├── Skincare
│   ├── Makeup
│   ├── Haircare
│   └── Body Care
│
├── Shop by Skin Type
│   ├── Normal Skin
│   ├── Dry Skin
│   ├── Oily Skin
│   ├── Combination Skin
│   └── Sensitive Skin
│
├── Shop by Concern
│   ├── Hydration
│   ├── Dryness
│   ├── Redness
│   ├── Acne-Prone Skin
│   ├── Oil Control
│   ├── Dark Spots
│   ├── Dullness
│   ├── Uneven Skin Tone
│   ├── Fine Lines
│   ├── Skin Barrier
│   └── Pores
│
├── Ingredients
│
├── Brands
│
├── Beauty Quiz
│
├── About
│
├── FAQ
│
├── Contact
│
├── Cart
│
└── Customer Account
```

V1.0 **不建议**做：

- Community
- Forum
- Blog CMS 大型系统
- AI Chatbot
- Native App
- Complex loyalty system

这些属于后续阶段。

---

# 3. Header / Navigation

## 3.1 Desktop Header

建议：

```text
┌────────────────────────────────────────────────────────────┐
│ LOGO     Shop   Skin Type   Concerns   Ingredients   Brands │
│                                      🔍  EN / 中文  🛒      │
└────────────────────────────────────────────────────────────┘
```

主要导航：

| Navigation | 功能 |
|---|---|
| Shop | 全部产品 |
| Skin Type | 按肤质发现 |
| Concerns | 按肌肤问题发现 |
| Ingredients | 按成分发现 |
| Brands | 按品牌发现 |
| Beauty Quiz | 肌肤/产品推荐 |

---

# 4. Mobile Navigation

移动端采用：

```text
┌─────────────────────────────┐
│ ☰     LOGO      🔍   🛒     │
├─────────────────────────────┤
│                             │
│        Page Content         │
│                             │
├─────────────────────────────┤
│ Home Shop Quiz Account      │
└─────────────────────────────┘
```

Bottom Navigation：

1. Home
2. Shop
3. Quiz
4. Search
5. Account

购物车数量显示 Badge。

---

# 5. Language System

网站只提供：

```text
English
中文
```

语言切换：

```text
EN | 中文
```

默认语言：

```text
English
```

中文用户可以主动切换中文。

---

# 6. URL 结构

采用 SEO-friendly URL。

## English

```text
/
```

例如：

```text
/products/medicube-age-r-booster
/collections/sheet-masks
/collections/dry-skin
/collections/hydration
/ingredients/niacinamide
/brands/medicube
```

## Chinese

建议使用 Shopify 多语言 URL 机制：

```text
/zh/products/...
/zh/collections/...
/zh/ingredients/...
/zh/brands/...
```

不要自己开发 URL 路由系统。

---

# 7. Homepage

首页是整个商业模式最重要的页面之一。

不要做成简单的：

```text
Banner
↓
Products
↓
Footer
```

而应该围绕：

> **Discover → Understand → Shop**

设计。

---

## 7.1 Homepage Structure

```text
Hero
│
├── Shop Korean & Japanese Beauty
│
├── Shop by Skin Type
│
├── Shop by Concern
│
├── Featured Products
│
├── Trending / Best Sellers
│
├── Shop by Ingredient
│
├── Beauty Quiz
│
├── Recently Added
│
└── Newsletter / Footer
```

---

# 8. Hero Section

建议核心信息：

```text
Discover Korean & Japanese Beauty

Curated beauty products with clear,
easy-to-understand information.

[ Shop Now ]   [ Take the Beauty Quiz ]
```

中文：

```text
发现真正适合你的日韩美妆

用简单、清晰的产品信息，
帮助你找到适合自己的护肤产品。

[ 开始购物 ]   [ 肌肤测试 ]
```

Hero 不建议强调：

```text
Cheap
Lowest Price
Best Price
```

而应该建立：

> **Product Discovery + Trust**

---

# 9. Shop Page

URL：

```text
/collections/all
```

功能：

- Product Grid
- Filter
- Sort
- Search
- Pagination / Infinite Scroll

Desktop：

```text
┌──────────────┬─────────────────────────────────────────┐
│ Filters      │ Product Product Product Product         │
│              │                                         │
│ Category     │ Product Product Product Product         │
│ Skin Type    │                                         │
│ Concern      │ Product Product Product Product         │
│ Ingredient   │                                         │
│ Brand        │                                         │
│ Price        │                                         │
└──────────────┴─────────────────────────────────────────┘
```

Mobile：

```text
┌──────────────────────────┐
│ 32 Products              │
│ [Filter] [Sort]          │
├──────────────────────────┤
│ Product    Product       │
│ Product    Product       │
│ Product    Product       │
└──────────────────────────┘
```

---

# 10. Product Card

Product Card 是核心组件。

建议显示：

```text
┌──────────────────────────┐
│                          │
│       Product Image      │
│                          │
├──────────────────────────┤
│ BRAND                    │
│ Product Name             │
│                          │
│ ★★★★★                    │
│ $19.99 CAD               │
│                          │
│ Hydrating                │
│ Dry Skin                 │
│                          │
│ [ Add to Cart ]          │
└──────────────────────────┘
```

Product Card 数据来源：

| 数据 | Source |
|---|---|
| Brand | PIDB |
| Product Name | PIDB |
| Image | PIDB/Shopify |
| Price | Shopify |
| Availability | Shopify |
| Skin Type | PIDB |
| Skin Concern | PIDB |
| Rating | Shopify / Review App |

---

# 11. Product Detail Page

这是整个系统最重要的消费者页面。

URL：

```text
/products/{product-handle}
```

建议结构：

```text
Product Gallery
        ↓
Brand
Product Name
Rating
Price
Availability
        ↓
Skin Type
Skin Concerns
Key Ingredients
        ↓
Product Description
        ↓
Why You'll Like It
        ↓
How to Use
        ↓
Ingredients
        ↓
Warnings
        ↓
Product Information
        ↓
Shipping / Returns
        ↓
Related Products
```

---

# 12. Product Detail Above-the-Fold

用户进入页面后首先看到：

```text
┌───────────────────────────────────────────┐
│ Product Images        │ BRAND             │
│                       │ Product Name      │
│                       │ ★★★★★            │
│                       │                   │
│                       │ $XX.XX CAD        │
│                       │                   │
│                       │ Skin Type         │
│                       │ Dry / Normal      │
│                       │                   │
│                       │ Concern           │
│                       │ Hydration         │
│                       │                   │
│                       │ [ Add to Cart ]   │
└───────────────────────────────────────────┘
```

Mobile：

```text
Image
↓
Brand
↓
Product Name
↓
Price
↓
Skin Type
↓
Concerns
↓
Add to Cart
```

---

# 13. Product Information Architecture

Product Detail 不建议把所有信息塞进一个 Description。

应拆成结构化模块：

### 13.1 Product Overview

```text
What it is
```

### 13.2 Best For

```text
Best for:
✓ Dry Skin
✓ Combination Skin

Helps with:
✓ Hydration
✓ Skin Barrier
```

### 13.3 Key Ingredients

例如：

```text
Key Ingredients

Niacinamide
Hyaluronic Acid
Ceramide
```

每个 Ingredient 可以点击：

```text
Niacinamide →
```

进入：

```text
/ingredients/niacinamide
```

---

# 14. How to Use

标准化：

```text
How to Use

1. Cleanse your face.
2. Apply the sheet mask evenly.
3. Leave on for 15–20 minutes.
4. Remove and gently pat remaining essence into skin.
```

中文：

```text
使用方法

1. 清洁面部。
2. 将面膜均匀敷于面部。
3. 静敷约 15–20 分钟。
4. 取下面膜，将剩余精华轻拍至吸收。
```

数据来自 PIDB：

```text
how_to_use_en
how_to_use_zh
```

---

# 15. Ingredients

产品页面显示：

```text
Ingredients

Water, Glycerin, Niacinamide, ...
```

建议同时提供：

```text
Key Ingredients
```

和：

```text
Full Ingredients
```

例如：

```text
Key Ingredients
────────────────
Niacinamide
Hyaluronic Acid
Ceramide

Full Ingredients
────────────────
Water, Glycerin, ...
```

---

# 16. Warnings

显示：

```text
Warnings

For external use only.
Avoid contact with eyes.
Discontinue use if irritation occurs.
Keep out of reach of children.
```

中文：

```text
注意事项

仅供外用。
避免接触眼睛。
如出现刺激或不适，请停止使用。
请放置于儿童无法接触处。
```

---

# 17. Cosmetic Claims

Claims 必须与 PIDB 中的 Claims 数据对应。

推荐使用：

```text
Helps hydrate skin
Helps improve the appearance of dull skin
Helps maintain the skin barrier
Helps improve the appearance of uneven skin tone
```

避免：

```text
Treats acne
Cures eczema
Prevents disease
Heals damaged skin
```

网站 Product Claims 必须与实际产品标签及合规审核保持一致。

---

# 18. Skin Type System

产品页面显示：

```text
Best for

○ Normal Skin
○ Dry Skin
○ Oily Skin
○ Combination Skin
○ Sensitive Skin
```

点击后：

```text
Dry Skin →
```

进入：

```text
/collections/dry-skin
```

---

# 19. Skin Concern System

例如：

```text
Helps with

Hydration
Dryness
Skin Barrier
Dullness
```

点击：

```text
Hydration →
```

进入：

```text
/collections/hydration
```

这样可以形成大量自然的 Product Discovery 页面。

---

# 20. Ingredient Page

URL：

```text
/ingredients/{ingredient-slug}
```

例如：

```text
/ingredients/niacinamide
```

页面：

```text
Niacinamide

What is Niacinamide?
─────────────────────
...

Common Cosmetic Functions
─────────────────────────
...

Products with Niacinamide
──────────────────────────
[ Product ][ Product ][ Product ]
```

Ingredient 页面主要作用：

1. SEO
2. 教育消费者
3. 产品 Discovery
4. 内部 Product Knowledge

---

# 21. Brand Page

URL：

```text
/brands/{brand-slug}
```

例如：

```text
/brands/xxx
```

页面：

```text
Brand Name

About the Brand
────────────────

Featured Products
─────────────────

All Products
────────────
```

Brand 数据来自 PIDB。

---

# 22. Shop by Skin Type

例如：

```text
/collections/dry-skin
```

页面标题：

```text
Best Beauty Products for Dry Skin
```

内容：

```text
Dry Skin

Explore products selected for dry skin,
including hydrating masks, serums and creams.

[ Product Grid ]
```

---

# 23. Shop by Concern

例如：

```text
/collections/hydration
```

结构：

```text
Hydration

Products focused on helping skin
feel hydrated and comfortable.

[ Product Grid ]
```

注意：

> Concern Page 是 Discovery Page，不是医疗建议页面。

---

# 24. Search

Search 是非常重要的功能。

消费者可能搜索：

```text
sheet mask
hydration
niacinamide
dry skin
Korean mask
Japanese sunscreen
```

Search 应支持：

- Product Name
- Brand
- Ingredient
- Product Type
- Skin Type
- Skin Concern

例如用户搜索：

```text
niacinamide
```

结果不仅显示：

```text
Product Name
```

还可以显示：

```text
Products containing Niacinamide
```

---

# 25. Filter

V1.0 Filter：

| Filter | 类型 |
|---|---|
| Category | Multi-select |
| Product Type | Multi-select |
| Brand | Multi-select |
| Skin Type | Multi-select |
| Skin Concern | Multi-select |
| Ingredient | Multi-select |
| Price | Range |
| Availability | Boolean |

未来可以增加：

- Country of Origin
- Texture
- Vegan
- Fragrance-free
- Alcohol-free

但前提是 PIDB 有可靠数据。

---

# 26. QR Product Page

这是本项目区别于普通 Shopify Shop 的重要功能。

产品包装上的 QR Code：

```text
[ QR ]
   ↓
https://yourdomain.ca/p/ABC123
   ↓
Product Information Page
```

而不是：

```text
QR → Shopify product URL
```

---

# 27. QR 页面逻辑

QR URL：

```text
/p/{short_code}
```

例如：

```text
/p/A8K29
```

服务器/应用查询：

```text
ProductQR.short_code
        ↓
PIDB product_id
        ↓
Product
        ↓
Shopify product
```

最终跳转：

```text
Product Detail Page
```

---

# 28. 为什么 QR 必须动态

例如第一批产品 QR：

```text
/p/A8K29
```

未来：

```text
Shopify Handle
```

从：

```text
product-a
```

变成：

```text
brand-product-a
```

QR 不需要重新印刷。

同时可以：

- 更换产品页面
- 修改产品信息
- 更新图片
- 更新说明
- 统计 QR Scan
- 修改语言
- 更换销售页面

因此：

> **QR Code 是 Product Identity 的入口，而不是 Shopify URL 的二维码。**

---

# 29. QR Landing Page

QR 用户和普通 Google 用户不同。

他们通常已经拿到了实物。

因此 QR 页面应优先显示：

```text
Product Name

What is this?
────────────────

Key Ingredients
────────────────

How to Use
───────────

Full Ingredients
───────────────

Warnings
────────

[ Buy Online ]
```

并提供：

```text
EN | 中文
```

---

# 30. Beauty Quiz

首页明显入口：

```text
Not sure what to choose?

Take our Beauty Quiz

[ Start Quiz ]
```

Quiz 最终不是给出医学诊断，而是：

> **Product Discovery Recommendation**

例如：

```text
Your Beauty Profile

Skin Type:
Combination

Main Concerns:
Hydration
Dullness

Recommended Products:

1. Product A
2. Product B
3. Product C
```

具体规则将在：

**03 — Beauty Quiz Specification**

中定义。

---

# 31. Cart

Shopify 原生 Cart。

显示：

```text
Product
Quantity
Price
Subtotal
Shipping
Tax
Total
```

功能：

- Quantity update
- Remove
- Discount code
- Continue Shopping
- Checkout

不要自己开发支付系统。

---

# 32. Checkout

V1.0 使用 Shopify Checkout。

不自行开发：

- Payment Gateway
- Order Engine
- Tax Engine
- Fraud System
- Refund System

这些全部交给 Shopify。

---

# 33. Customer Account

V1.0 使用 Shopify Customer Account。

支持：

```text
Login
Register
Orders
Addresses
Profile
```

未来可以增加：

```text
Beauty Profile
Favorite Products
Wishlist
Quiz History
```

但不作为 MVP 必需功能。

---

# 34. Footer

建议：

```text
Shop
────
All Products
Skincare
Sheet Masks
Best Sellers

Discover
────────
Skin Type
Skin Concerns
Ingredients
Beauty Quiz
Brands

Help
────
FAQ
Shipping
Returns
Contact

About
─────
About Us
Privacy Policy
Terms
```

语言：

```text
English | 中文
```

---

# 35. SEO Strategy

V1.0 SEO 页面重点不是 Blog，而是结构化 Product Discovery。

优先建立：

```text
/products/*
/collections/*
/ingredients/*
/brands/*
```

例如：

```text
/products/xxx
/collections/dry-skin
/collections/hydration
/collections/sheet-masks
/ingredients/niacinamide
/brands/xxx
```

这些页面均应该具备：

- SEO Title
- Meta Description
- Canonical URL
- Structured Data
- Open Graph
- Image Alt Text

---

# 36. Product SEO Fields

PIDB 应增加：

```text
seo_title_en
seo_title_zh

seo_description_en
seo_description_zh

seo_keywords
```

但：

> 不建议大量人工堆砌 Keywords。

核心还是：

```text
Product
+
Ingredient
+
Skin Type
+
Concern
+
Brand
```

形成自然内容结构。

---

# 37. Image Strategy

产品图片类型统一：

```text
primary
gallery
packaging
ingredients
usage
lifestyle
qr
```

例如：

```text
primary
    ↓
产品主图

gallery
    ↓
产品多角度图片

ingredients
    ↓
产品成分表

usage
    ↓
使用方法

lifestyle
    ↓
使用场景

qr
    ↓
二维码/包装图片
```

图片本身存储在 Shopify CDN / Image Storage。

PIDB 保存：

```text
image_url
image_type
alt_text_en
alt_text_zh
sort_order
```

---

# 38. Mobile First

由于主要流量预计来自：

- TikTok
- Instagram
- Xiaohongshu
- QR Code
- Mobile Google Search

因此：

> **Mobile UX 优先于 Desktop UX。**

关键页面必须在手机上优化：

```text
Homepage
Product Page
Collection Page
Quiz
Cart
```

尤其 Product Page：

```text
Image
↓
Product Name
↓
Price
↓
Best For
↓
Key Ingredients
↓
Add to Cart
```

不要让用户滚动大量文字后才能看到购买按钮。

---

# 39. Sticky Add to Cart

Mobile Product Page 建议：

```text
┌──────────────────────────┐
│                          │
│      Product Content     │
│                          │
│                          │
├──────────────────────────┤
│ $19.99       [Add Cart]  │
└──────────────────────────┘
```

用户向下浏览：

```text
How to Use
Ingredients
Warnings
Reviews
```

底部仍然显示：

```text
$19.99   [ Add to Cart ]
```

---

# 40. Shopify Metafields

Shopify 不保存全部 PIDB 数据，但需要保存 Storefront 展示所需要的数据。

建议 Metafields：

| Namespace | Key | 类型 |
|---|---|---|
| custom | skin_types | List |
| custom | skin_concerns | List |
| custom | key_ingredients | List |
| custom | ingredients_inci | Multi-line text |
| custom | how_to_use_en | Rich Text |
| custom | how_to_use_zh | Rich Text |
| custom | warnings_en | Rich Text |
| custom | warnings_zh | Rich Text |
| custom | country_of_origin | Text |
| custom | product_type | Text |
| custom | pidb_product_id | Text |
| custom | qr_code | Text |

PIDB 是 Master Data。

Shopify Metafields 是：

> **Storefront Projection**

即：

```text
PIDB
  ↓
Selected Product Data
  ↓
Shopify Metafields
  ↓
Storefront
```

---

# 41. 数据同步原则

不要让 Shopify 和 PIDB 双向随意修改。

推荐：

```text
PIDB
 │
 │ Product Information
 ▼
Shopify
```

也就是说：

### PIDB 管：

- Product Name
- Description
- Skin Type
- Concern
- Ingredient
- How to Use
- Warning
- Product Claims
- Product Origin
- Product Images
- QR Mapping

### Shopify 管：

- Price
- Inventory
- Variant
- Product Status
- Cart
- Order
- Payment
- Customer
- Discount
- Shipping

---

# 42. Product Page 数据流

```text
                 PIDB
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
 Product Knowledge      Shopify Mapping
        │                   │
        └─────────┬─────────┘
                  ▼
             Shopify
                  │
                  ▼
          Product Detail
                  │
        ┌─────────┼──────────┐
        ▼         ▼          ▼
      Search     SEO       Purchase
```

---

# 43. V1.0 页面清单

| Page | Priority | V1.0 |
|---|---:|---:|
| Homepage | P0 | ✅ |
| Shop | P0 | ✅ |
| Product Detail | P0 | ✅ |
| Cart | P0 | ✅ |
| Checkout | P0 | Shopify |
| Skin Type | P0 | ✅ |
| Concern | P0 | ✅ |
| Ingredient | P1 | ✅ |
| Brand | P1 | ✅ |
| Search | P0 | ✅ |
| Beauty Quiz | P0 | 下一阶段 |
| QR Page | P0 | ✅ |
| FAQ | P1 | ✅ |
| About | P1 | ✅ |
| Contact | P1 | ✅ |
| Customer Account | P1 | Shopify |
| Blog | P2 | 后续 |
| Wishlist | P2 | 后续 |
| Loyalty | P2 | 后续 |
| Community | P3 | 不做 MVP |

---

# 44. V1.0 MVP 用户路径

## 路径 A：Google Search

```text
Google
  ↓
Product / Ingredient / Collection
  ↓
Product Detail
  ↓
Add to Cart
  ↓
Checkout
```

---

## 路径 B：TikTok / Instagram

```text
Social Media
     ↓
Product Page
     ↓
Product Information
     ↓
Add to Cart
     ↓
Checkout
```

---

## 路径 C：QR Code

```text
Physical Product
       ↓
      QR
       ↓
QR Product Page
       ↓
Product Information
       ↓
Buy Online
```

---

## 路径 D：Beauty Quiz

```text
Homepage
   ↓
Beauty Quiz
   ↓
Skin Profile
   ↓
Recommended Products
   ↓
Product Detail
   ↓
Checkout
```

---

# 45. V1.0 技术边界

必须保持简单。

### 使用 Shopify：

```text
Storefront
Products
Variants
Inventory
Cart
Checkout
Orders
Customers
Payments
Discounts
Shipping
```

### 使用 PIDB：

```text
Product Knowledge
Ingredients
Skin Type
Skin Concerns
Claims
Original Product Data
QR
Product Mapping
```

### 不开发：

```text
Custom Checkout
Custom Payment
Custom Inventory
Custom ERP
Custom CRM
Native Mobile App
AI Chatbot
Microservices
Kubernetes
```

---

# 46. 核心原则

整个 Storefront V1.0 遵循：

```text
                 ┌───────────────┐
                 │    Traffic    │
                 │ Google/Social │
                 │ QR Code       │
                 └───────┬───────┘
                         ↓
                ┌─────────────────┐
                │    Discovery    │
                │ Skin / Concern  │
                │ Ingredient      │
                │ Brand           │
                └────────┬────────┘
                         ↓
                ┌─────────────────┐
                │ Product Detail  │
                │ Clear Information│
                └────────┬────────┘
                         ↓
                ┌─────────────────┐
                │    Purchase     │
                │ Cart / Checkout │
                └────────┬────────┘
                         ↓
                ┌─────────────────┐
                │     Customer    │
                └─────────────────┘
```

最终目标不是单纯建立：

> **一个卖韩国面膜的 Shopify 商店**

而是建立：

> **一个能够通过 Skin Type、Skin Concern、Ingredient、Brand、QR 等多种入口发现和购买日韩 Beauty Products 的 Product Discovery Commerce Platform。**

这也是后续从韩国产品扩展到日本产品、其他亚洲 Beauty Products 时，不需要重新设计系统的基础。

---

# 47. 下一阶段

下一份文档：

# 03 — Beauty Quiz Specification

将定义：

1. Quiz 问题
2. Skin Type 判定逻辑
3. Skin Concern 判定逻辑
4. 产品推荐算法
5. Product ↔ Quiz Rule
6. Recommendation Score
7. English / 中文 Quiz
8. Quiz Result Page
9. Shopify 集成
10. 如何避免把 Quiz 做成“医疗诊断”

这部分实际上是整个项目中非常有价值的 **Product Discovery Engine**。