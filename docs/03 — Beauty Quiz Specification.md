03 — Beauty Quiz Specification，把“用户回答几个问题 → 自动得到肤质/需求 → 推荐 3–5 个产品”的规则完整设计出来。
第三份文档我建议把 Beauty Quiz 设计成一个规则驱动的 Product Recommendation Engine，而不是 AI 问答。这样 V1.0 简单、可解释、容易维护，而且以后产品从韩国扩展到日本时不需要重构。

# 03 — Beauty Quiz Specification
## K-Beauty Canada 电商平台 V1.0

**技术底座：** Shopify + PIDB  
**模块名称：** Beauty Quiz / Product Recommendation Engine  
**目标市场：** Canada / GTA  
**消费者语言：** English + 中文  
**V1.0 推荐方式：** Rule-based Recommendation  
**AI：** 不使用 AI

---

# 1. 模块定位

Beauty Quiz 不是医疗诊断，也不是皮肤科诊断。

它的定位是：

> **帮助消费者根据自己的肤质、护肤需求和偏好发现适合的 Beauty Products。**

因此页面不要使用：

```text
Your Skin Diagnosis
Medical Skin Analysis
Disease Detection
```

而使用：

```text
Find Your Beauty Match
Find Products for Your Skin
Build Your Beauty Routine
```

中文：

```text
找到适合你的美妆产品
发现适合你的护肤产品
找到你的护肤搭配
```

---

# 2. 用户流程

完整流程：

```text
Homepage
    ↓
Beauty Quiz
    ↓
Q1 Skin Type
    ↓
Q2 Main Concern
    ↓
Q3 Secondary Concern
    ↓
Q4 Product Preference
    ↓
Q5 Routine / Product Type
    ↓
Recommendation Engine
    ↓
Beauty Profile
    ↓
Recommended Products
    ↓
Product Detail
    ↓
Add to Cart
```

---

# 3. V1.0 Quiz 问题数量

建议：

> **5 个核心问题**

不要一开始设计 10–20 个问题。

目标：

```text
完成时间：约 1–2 分钟
问题数量：5
结果产品：3–5 个
```

---

# 4. Q1 — Skin Type

### English

```text
What best describes your skin?

○ Normal
○ Dry
○ Oily
○ Combination
○ Sensitive / Easily Irritated
○ I'm not sure
```

### 中文

```text
以下哪一种最符合你的肤质？

○ 中性肌
○ 干性肌
○ 油性肌
○ 混合性肌
○ 敏感 / 容易受到刺激
○ 我不确定
```

---

# 5. Q1 数据映射

用户回答：

```text
Normal
```

映射：

```text
skin_type = normal
```

用户回答：

```text
Dry
```

映射：

```text
skin_type = dry
```

数据库使用 PIDB 的标准 SkinType：

```text
normal
dry
oily
combination
sensitive
```

---

# 6. "I'm not sure" 的处理

这是一个重要设计。

用户选择：

```text
I'm not sure
```

不要强行判断。

系统设置：

```text
skin_type_confidence = low
```

后续推荐：

> 降低 Skin Type 的权重。

例如：

```text
Normal Match = +20
Dry Match = +20
Oily Match = +20
```

而不是：

```text
确定用户是 Dry Skin
```

---

# 7. Q2 — Main Skin Concern

### English

```text
What's your main skin concern?

○ Dryness
○ Dehydration
○ Dullness
○ Uneven Skin Tone
○ Oiliness
○ Visible Pores
○ Redness
○ Skin Barrier
○ Fine Lines
○ Acne-Prone Skin
```

### 中文

```text
你目前最主要的肌肤需求是什么？

○ 干燥
○ 缺水
○ 暗沉
○ 肤色不均
○ 出油
○ 毛孔明显
○ 泛红
○ 肌肤屏障
○ 细纹
○ 痘肌 / 易长痘肌
```

---

# 8. Q2 选择数量

建议：

```text
最多选择 2 个
```

例如：

```text
✓ Dehydration
✓ Dullness
```

系统：

```text
primary_concern = dehydration
secondary_concern = dullness
```

---

# 9. Q3 — Product Goal

这一题不是 Skin Concern，而是购买目标。

### English

```text
What are you looking for today?

○ A quick hydration boost
○ A simple daily routine
○ A sheet mask
○ A serum / ampoule
○ A moisturizer
○ Sunscreen
○ I'm open to suggestions
```

中文：

```text
你今天主要想寻找什么？

○ 快速补水
○ 简单的日常护肤
○ 面膜
○ 精华 / 安瓶
○ 面霜 / 保湿产品
○ 防晒
○ 我想听推荐
```

这样可以把：

```text
User Need
```

转换成：

```text
Product Type Preference
```

---

# 10. Q4 — Texture / Preference

### English

```text
What kind of texture do you prefer?

○ Lightweight
○ Rich & nourishing
○ Gel / refreshing
○ No preference
```

中文：

```text
你更喜欢什么质地？

○ 清爽轻薄
○ 滋润型
○ 凝胶 / 清凉型
○ 没有特别偏好
```

V1.0 如果 PIDB 尚未建立 Texture 字段，可以暂时不启用。

因此：

> **该问题可以在 V1.1 增加。**

不要为了 Quiz 强行扩展 PIDB。

---

# 11. Q5 — Budget

建议增加预算问题。

### English

```text
What's your preferred price range?

○ Under $15
○ $15–30
○ $30–50
○ $50+
○ No preference
```

中文：

```text
你希望的价格范围？

○ $15 以下
○ $15–30
○ $30–50
○ $50+
○ 没有特别要求
```

价格来自 Shopify：

```text
Shopify Product / Variant Price
```

不要在 PIDB 中维护价格。

---

# 12. Quiz 数据结构

Quiz Session：

```text
QuizSession
────────────
session_id
language
started_at
completed_at

skin_type
skin_type_confidence

primary_concern
secondary_concern

product_goal
texture_preference

budget_range
```

例如：

```text
session_id = Q202609010001

language = zh

skin_type = combination
skin_type_confidence = high

primary_concern = hydration
secondary_concern = dullness

product_goal = sheet_mask

budget_range = under_15
```

---

# 13. Recommendation Engine

V1.0 不使用 AI。

采用：

> **Weighted Rule-based Scoring**

每个 Product 根据用户答案获得分数。

基本公式：

```text
Recommendation Score
=
Skin Type Score
+
Primary Concern Score
+
Secondary Concern Score
+
Product Goal Score
+
Budget Score
+
Availability Score
```

---

# 14. 推荐评分

建议初始权重：

| 条件 | 分值 |
|---|---:|
| Skin Type Match | +30 |
| Primary Concern Match | +30 |
| Secondary Concern Match | +15 |
| Product Goal Match | +15 |
| Budget Match | +5 |
| In Stock | +5 |
| **Total** | **100** |

这样：

```text
Skin Type + Concern
```

始终是最核心因素。

---

# 15. Skin Type Matching

例如用户：

```text
Dry Skin
```

产品：

```text
skin_types:
dry
normal
```

得到：

```text
+30
```

如果：

```text
skin_types:
oily
```

则：

```text
0
```

不应该直接负分。

原因：

> 一个产品是否适合某肤质，不能简单由“没有标签”推导为“不适合”。

---

# 16. Primary Concern Matching

用户：

```text
Primary Concern = Hydration
```

产品：

```text
skin_concerns:
hydration
skin_barrier
```

得到：

```text
+30
```

如果只有：

```text
dullness
```

则：

```text
0
```

---

# 17. Secondary Concern

用户：

```text
Hydration
+
Dullness
```

产品：

```text
Hydration
Dullness
```

得到：

```text
+30
+15
```

即：

```text
45
```

---

# 18. Product Goal Matching

用户：

```text
product_goal = sheet_mask
```

产品：

```text
product_type = sheet_mask
```

得到：

```text
+15
```

如果：

```text
product_type = serum
```

则：

```text
0
```

---

# 19. Budget Matching

例如：

```text
User Budget:
Under $15
```

产品：

```text
$12.99
```

得到：

```text
+5
```

产品：

```text
$29.99
```

得到：

```text
0
```

预算只作为辅助因素。

不能让一个便宜但明显不匹配的产品排到最前面。

---

# 20. Availability

如果：

```text
Inventory > 0
```

得到：

```text
+5
```

如果：

```text
Inventory = 0
```

得到：

```text
0
```

默认：

> 不推荐缺货产品。

除非未来增加：

```text
Notify Me
Pre-order
```

---

# 21. 推荐最低分

建议：

```text
Score >= 50
```

才进入推荐结果。

如果没有任何产品达到 50：

```text
Don't worry — here are some products
that may still be worth exploring.
```

中文：

```text
没有找到完全匹配的产品，
但下面这些产品可能值得你了解。
```

---

# 22. 推荐数量

默认：

```text
Top 3
```

最多：

```text
Top 5
```

不要一次显示 20 个产品。

推荐结果应该帮助用户做决定，而不是增加选择困难。

---

# 23. Recommendation Result

例如：

```text
Your Beauty Match

Skin Type
Combination

Main Concern
Hydration + Dullness

Recommended for You

1. Product A
   Match Score: 92%

2. Product B
   Match Score: 87%

3. Product C
   Match Score: 81%
```

---

# 24. Match Score 是否显示

V1.0 建议：

> **不直接显示精确百分比。**

不要显示：

```text
92% Match
```

因为这个数字容易让消费者误解为科学/医学精度。

更推荐：

```text
Great Match
Best Match
Recommended for You
```

例如：

```text
Best Match
Product A

Great Match
Product B
```

内部仍然使用：

```text
score = 92
```

但消费者看不到具体数字。

---

# 25. Recommendation Explanation

每个推荐产品必须告诉用户：

> 为什么推荐这个产品？

例如：

```text
Why we picked this for you:

✓ Suitable for combination skin
✓ Focuses on hydration
✓ Helps improve the appearance of dull skin
✓ Fits your sheet mask preference
```

中文：

```text
为什么推荐给你：

✓ 适合混合性肌肤
✓ 重点针对补水需求
✓ 有助于改善肌肤暗沉外观
✓ 符合你对面膜的选择
```

这是 Quiz 的重要价值。

---

# 26. Recommendation Explanation 数据来源

不能临时由 AI 生成。

全部来自：

```text
PIDB
```

例如：

```text
skin_types
skin_concerns
product_type
product_claims
key_ingredients
```

这样推荐结果：

> 可解释、可审计、可维护。

---

# 27. Product Recommendation Rule

建议建立：

```text
ProductRecommendationRule
```

字段：

| Field | 类型 |
|---|---|
| rule_id | UUID |
| product_id | UUID |
| skin_type | FK |
| skin_concern | FK |
| product_goal | string |
| weight | integer |
| status | active/inactive |
| priority | integer |

不过：

> V1.0 不需要把所有规则都做成复杂 Rule Engine。

最初完全可以根据 PIDB 的结构化字段直接计算。

---

# 28. V1.0 推荐算法

伪代码：

```text
for each product:

    score = 0

    if user.skin_type in product.skin_types:
        score += 30

    if user.primary_concern in product.skin_concerns:
        score += 30

    if user.secondary_concern in product.skin_concerns:
        score += 15

    if user.product_goal == product.product_type:
        score += 15

    if product.price fits user.budget:
        score += 5

    if product.inventory > 0:
        score += 5

    if score >= 50:
        add product

sort by score DESC

return top 3
```

这已经足够支撑 V1.0。

---

# 29. Recommendation Tie Breaker

如果两个产品：

```text
Product A = 85
Product B = 85
```

依次比较：

```text
1. Primary Concern Match
2. Skin Type Match
3. Inventory
4. Best Seller
5. Product Created Date
```

最后：

```text
Product A
```

---

# 30. 不要使用销量作为核心推荐因素

例如：

```text
Best Seller = +30
```

不建议。

否则：

```text
热门产品
```

可能压过：

```text
真正匹配用户需求的产品
```

Best Seller 只能作为：

```text
Tie Breaker
```

或者：

```text
Marketing Badge
```

---

# 31. Beauty Profile

Quiz 完成后生成：

```text
Beauty Profile
```

例如：

```text
Your Beauty Profile

Skin Type
Combination

Top Concern
Hydration

Secondary Concern
Dullness

Preferred Product
Sheet Mask

Budget
Under $15
```

这个 Profile 可以作为未来功能基础。

---

# 32. Profile 是否保存

V1.0：

> 不强制要求注册账号。

匿名用户也可以完成 Quiz。

Session 存在：

```text
Browser / Session
```

如果用户登录：

```text
Customer
     ↓
Beauty Profile
```

可以保存。

---

# 33. Customer Beauty Profile

未来数据库：

```text
CustomerBeautyProfile
──────────────────────
customer_id
skin_type
skin_type_confidence
primary_concern
secondary_concern
preferred_product_type
budget_range
updated_at
```

这样以后可以实现：

```text
My Beauty Profile
```

---

# 34. Quiz 与 Shopify

推荐流程：

```text
Quiz
 │
 ▼
Recommendation Engine
 │
 ▼
Product IDs
 │
 ▼
Shopify Product
 │
 ├── Product Page
 ├── Price
 ├── Inventory
 └── Add to Cart
```

Quiz 不负责：

```text
Price
Inventory
Checkout
Payment
```

全部交给 Shopify。

---

# 35. Quiz 页面结构

```text
┌────────────────────────────┐
│ Find Your Beauty Match     │
│                            │
│ Question 1 of 5            │
│ ███████░░░░░░░             │
│                            │
│ What best describes        │
│ your skin?                 │
│                            │
│ ○ Normal                   │
│ ○ Dry                      │
│ ○ Oily                     │
│ ○ Combination              │
│ ○ Sensitive                │
│                            │
│             [ Next → ]     │
└────────────────────────────┘
```

---

# 36. Mobile UX

Quiz 必须 Mobile First。

一个问题占一个屏幕。

不要：

```text
Q1
Q2
Q3
Q4
Q5
```

全部堆在一页。

推荐：

```text
Question 1
     ↓
Next
     ↓
Question 2
     ↓
Next
     ↓
Question 3
```

---

# 37. Progress Bar

显示：

```text
Question 3 of 5
████████████░░░░
```

让用户知道：

> 快完成了。

---

# 38. Back Button

必须支持：

```text
← Back
```

用户可以修改之前的答案。

---

# 39. Quiz Abandonment

系统可以记录：

```text
quiz_started
quiz_question_answered
quiz_completed
quiz_abandoned
```

用于 Analytics。

例如：

```text
100 users started
80 answered Q1
72 answered Q2
65 answered Q3
60 completed
```

可以发现：

> 用户在哪一个问题大量退出。

---

# 40. Analytics Events

建议 V1.0：

```text
quiz_started
quiz_question_viewed
quiz_question_answered
quiz_completed
quiz_result_viewed
quiz_product_clicked
quiz_add_to_cart
quiz_purchase
```

其中：

```text
quiz_purchase
```

非常重要。

最终要回答：

> 做 Quiz 的消费者是否比普通流量更容易购买？

---

# 41. Marketing Attribution

推荐结果 URL 可以带：

```text
?source=beauty_quiz
```

例如：

```text
/products/product-a?source=beauty_quiz
```

或者使用 Shopify Analytics / UTM。

例如：

```text
utm_source=beauty_quiz
utm_medium=website
utm_campaign=beauty_match
```

---

# 42. Quiz → Cart

推荐产品下面：

```text
[ View Product ]
[ Add to Cart ]
```

对于单个产品，可以直接：

```text
Add to Cart
```

对于 3 个产品，可以提供：

```text
[ Add All 3 to Cart ]
```

但 V1.0 建议先实现：

```text
Add to Cart
```

不要一开始开发复杂 Bundle。

---

# 43. Safety / Compliance Boundary

Beauty Quiz 必须避免：

```text
Diagnose acne
Diagnose eczema
Treat skin disease
Medical recommendation
Prescription-like advice
```

应该使用：

```text
Product Discovery
Beauty Preference
Skin Type
Skin Concern
```

例如：

❌

```text
You have acne.
```

✅

```text
You selected acne-prone skin as one of your concerns.
```

---

# 44. Recommendation Disclaimer

结果页底部建议：

### English

```text
This quiz is for beauty product discovery only.
It is not a medical or dermatological assessment.
```

### 中文

```text
本测试仅用于美妆产品发现和推荐，
不构成医疗或皮肤科诊断建议。
```

---

# 45. English / Chinese 内容

Quiz 的问题、选项、结果解释全部支持：

```text
EN
ZH
```

数据结构：

```text
QuizQuestion
├── question_en
├── question_zh
├── options
│   ├── label_en
│   └── label_zh
```

推荐规则本身：

> 与语言无关。

即：

```text
English User
     ↓
same recommendation engine
     ↓
English Result
```

```text
Chinese User
     ↓
same recommendation engine
     ↓
Chinese Result
```

---

# 46. V1.0 Database Relationship

```text
                 PIDB Product
                      │
          ┌───────────┼────────────┐
          │           │            │
          ▼           ▼            ▼
      Skin Type   Skin Concern  Product Type
          │           │            │
          └───────────┼────────────┘
                      │
                      ▼
              Recommendation
                  Engine
                      ▲
                      │
              Quiz Answers
                      │
                      ▼
                Quiz Session
```

---

# 47. 与 PIDB 的关系

Beauty Quiz 不创建另一套：

```text
Skin Type Database
Skin Concern Database
Product Database
```

而是直接使用 PIDB。

例如：

```text
PIDB
│
├── SkinType
├── SkinConcern
├── ProductType
├── Product
└── ProductIngredient
```

Quiz：

```text
读取 PIDB
    ↓
计算 Score
    ↓
返回 Product
```

这样避免数据重复。

---

# 48. V1.0 实现方案

不需要开发独立服务器。

推荐：

```text
Shopify
   │
   ├── Storefront
   │
   ├── Quiz UI
   │
   └── Quiz App / Custom App
           │
           ▼
      Recommendation Logic
           │
           ▼
      PIDB / Shopify Data
```

如果产品数量较少：

```text
Shopify Metafields
```

即可作为 Quiz 数据来源。

如果以后：

```text
300–500+ SKUs
```

再让 Quiz 直接查询 PIDB。

---

# 49. MVP 实施顺序

### Phase 1

实现：

```text
Q1 Skin Type
Q2 Main Concern
Q3 Product Goal
Q4 Budget
```

先不实现 Texture。

### Phase 2

增加：

```text
Secondary Concern
```

### Phase 3

增加：

```text
Texture
Routine
Customer Beauty Profile
```

---

# 50. V1.0 最终技术方案

```text
                 Shopify
                    │
          ┌─────────┴─────────┐
          │                   │
      Storefront          Products
          │                   │
          ▼                   │
     Beauty Quiz             │
          │                   │
          ▼                   │
    Quiz Answers             │
          │                   │
          └────────┬──────────┘
                   ▼
         Recommendation Engine
                   │
                   ▼
             Product Score
                   │
                   ▼
             Top 3 Products
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
       Product   Product   Product
          │        │        │
          └────────┼────────┘
                   ▼
                Cart
                   ▼
               Checkout
```

---

# 51. 核心设计结论

Beauty Quiz V1.0 的核心不是“智能”，而是：

> **结构化产品数据 + 简单透明的推荐规则。**

整个系统形成：

```text
PIDB
 ↓
Standardized Product Data
 ↓
Skin Type / Concern / Ingredient
 ↓
Beauty Quiz
 ↓
Recommendation
 ↓
Shopify Product
 ↓
Cart
 ↓
Checkout
```

这样以后增加 1,000 个产品，也不需要重新设计 Quiz。

只需要增加：

```text
Product
Skin Type
Skin Concern
Product Type
Ingredient
```

产品自动进入推荐系统。

---

# 52. 下一阶段

下一份文档应该是：

# **04 — PIDB ↔ Shopify Integration Specification**

这份将真正解决项目落地时最关键的问题：

```text
PIDB Product
      ↓
什么时候同步 Shopify？
      ↓
同步哪些字段？
      ↓
如何创建 Product？
      ↓
如何创建 Variant / SKU？
      ↓
如何更新价格？
      ↓
如何处理库存？
      ↓
如何处理图片？
      ↓
如何处理 EN / 中文？
      ↓
如何处理删除/下架？
      ↓
如何处理同步错误？
```

最终形成一条可以实际执行的：

**CSV → PIDB → Shopify → Storefront → QR → 销售**

完整数据链路。