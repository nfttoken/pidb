# 08 — Beauty Product Taxonomy & Recommendation Rules Specification
## 美妆产品分类体系与 Beauty Quiz 推荐规则 V1.0

**项目：** Canada Beauty Product Information Database  
**系统简称：** PIDB  
**版本：** V1.0  
**Commerce：** Shopify  
**前台语言：** English / Chinese  
**原始产品语言：** Korean / Japanese / Chinese / English / French / Other

---

# 1. 文档目的

本文件定义：

1. 产品如何分类
2. Skin Type 如何标准化
3. Skin Concern 如何标准化
4. Ingredient 如何参与产品搜索
5. Beauty Quiz 如何提问
6. Quiz 答案如何转换成产品筛选条件
7. 如何计算 Product Recommendation Score
8. 如何避免错误推荐
9. 如何将推荐结果连接到 Shopify

核心目标：

> **让消费者可以通过“我是什么肤质 / 我有什么皮肤需求 / 我想解决什么问题”找到合适的产品。**

---

# 2. 核心架构

Beauty Quiz 不直接判断“医学上的皮肤疾病”。

它做的是：

```text
User Preference
      ↓
Skin Profile
      ↓
Beauty Concern
      ↓
Product Matching
      ↓
Recommendation Score
      ↓
Product List
      ↓
Shopify Product
```

系统推荐的是：

> **Cosmetic Product Recommendation**

而不是：

> Medical Diagnosis / Medical Treatment

---

# 3. Product Taxonomy

产品分类采用三级思路。

```text
Level 1
   ↓
Level 2
   ↓
Level 3
```

V1.0 不要求一定实现三级。

---

# 4. Level 1 Product Categories

第一层：

```text
Skincare
Makeup
Haircare
Body Care
```

未来可以扩展：

```text
Tools
Beauty Devices
Fragrance
Men's Grooming
```

但 V1.0 不需要。

---

# 5. Skincare Taxonomy

建议：

```text
Skincare
│
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
├── Wash-off Mask
├── Sleeping Mask
├── Lip Care
└── Other
```

---

# 6. Makeup Taxonomy

未来：

```text
Makeup
│
├── Foundation
├── Cushion
├── Concealer
├── Powder
├── Blush
├── Highlighter
├── Eyeshadow
├── Eyeliner
├── Mascara
├── Lipstick
├── Lip Tint
└── Other
```

---

# 7. Haircare Taxonomy

```text
Haircare
│
├── Shampoo
├── Conditioner
├── Hair Mask
├── Hair Oil
├── Scalp Care
└── Styling
```

---

# 8. Body Care Taxonomy

```text
Body Care
│
├── Body Wash
├── Body Lotion
├── Body Cream
├── Hand Care
├── Foot Care
└── Other
```

---

# 9. Skin Type

V1.0 只定义五种：

```text
Normal
Dry
Oily
Combination
Sensitive
```

数据库 Code：

```text
normal
dry
oily
combination
sensitive
```

---

# 10. Skin Type Definitions

## Normal

特点：

```text
Oil / Moisture relatively balanced
```

推荐策略：

> Balanced / General Products

---

## Dry

特点：

```text
Low oil
Dryness
Tightness
Flaking
```

优先推荐：

```text
Hydration
Moisturization
Barrier Support
```

---

## Oily

特点：

```text
Excess sebum
Shine
Oiliness
```

优先：

```text
Oil Control
Lightweight Hydration
Pore Appearance
```

---

## Combination

特点：

```text
Oily T-zone
Drier cheeks
```

优先：

```text
Balanced Hydration
Oil Control
Lightweight Moisturizer
```

---

## Sensitive

特点：

```text
Easily feels uncomfortable
Prone to redness
```

优先：

```text
Soothing
Barrier Support
Gentle Formulas
```

避免过度复杂的医学判断。

---

# 11. Skin Concerns

V1.0：

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

# 12. Concern Hierarchy

可以进一步组织：

```text
Hydration
└── Dryness

Tone
├── Dark Spots
├── Dullness
└── Uneven Skin Tone

Texture
├── Pores
├── Fine Lines
└── Wrinkles

Barrier
├── Sensitivity
└── Redness

Oil
└── Oil Control
```

这样未来网站导航可以使用：

```text
Shop by Concern
```

---

# 13. Concern 与 Medical Claim 的边界

系统允许：

```text
Hydration
Skin Barrier Support
Soothing
Brightening Appearance
Oil Control
Appearance of Pores
```

但不要把：

```text
Acne Treatment
Eczema Treatment
Rosacea Treatment
Melasma Treatment
```

作为普通产品推荐标签。

系统中的：

```text
Acne-prone Skin
```

代表消费者的 skin concern / preference。

不代表产品具有治疗痤疮的医疗功效。

---

# 14. Ingredient Taxonomy

Ingredient 数据分两层。

```text
Ingredient Identity
        ↓
Ingredient Function
```

例如：

```text
Niacinamide
```

可以关联：

```text
Brightening Appearance
Oil Control
Skin Barrier Support
```

但 Ingredient Function 不能自动变成产品 Claim。

---

# 15. Ingredient Function

V1.0 可以定义：

```text
Humectant
Emollient
Occlusive
Skin Conditioning
Soothing
Antioxidant
Exfoliant
Brightening Appearance
Oil Control
Barrier Support
```

未来可以继续扩展。

---

# 16. Product ↔ Ingredient

一个产品：

```text
Product A
```

可以：

```text
Ingredient 1
Ingredient 2
Ingredient 3
...
```

一个 Ingredient：

```text
Niacinamide
```

也可以：

```text
Product A
Product B
Product C
...
```

因此：

```text
Many-to-Many
```

---

# 17. Key Ingredient

产品中的 Ingredient 分为：

```text
Key Ingredient
Supporting Ingredient
```

数据库：

```text
is_key_ingredient
```

例如：

```text
Snail Secretion Filtrate = Key
Niacinamide = Key
Water = Supporting
Glycerin = Supporting
```

注意：

> Key Ingredient 是内容管理标签，不代表其浓度或功效强弱。

---

# 18. Product Matching

推荐系统首先进行硬条件过滤。

例如用户：

```text
Skin Type = Sensitive
```

系统优先选择：

```text
Product.skin_types contains Sensitive
```

---

# 19. Hard Filter

以下条件可以作为 Hard Filter：

```text
Product Status = Active
Compliance = Approved
Product Type = selected category
```

例如用户只想找：

```text
Serum
```

则：

```text
Product Type = Serum
```

不应该推荐：

```text
Cleanser
```

---

# 20. Soft Matching

Skin Type 和 Skin Concern 更适合使用 Soft Matching。

例如：

用户：

```text
Sensitive
Hydration
```

产品：

```text
Dry
Sensitive
Hydration
Barrier
```

匹配度很高。

---

# 21. Recommendation Score

V1.0 推荐评分：

```text
Score =
Skin Type Match
+
Skin Concern Match
+
Product Type Match
+
Ingredient Match
+
Preference Match
```

建议满分：

```text
100
```

---

# 22. 推荐评分权重

建议：

| 条件 | 权重 |
|---|---:|
| Skin Type | 30 |
| Skin Concern | 30 |
| Product Type | 20 |
| Ingredient | 10 |
| Other Preference | 10 |
| **Total** | **100** |

---

# 23. Skin Type Score

例如：

用户：

```text
Sensitive
```

产品：

```text
Sensitive
```

得：

```text
30
```

---

产品：

```text
Dry + Sensitive
```

得：

```text
30
```

---

产品：

```text
Dry
```

得：

```text
10
```

---

产品：

```text
Oily
```

得：

```text
0
```

---

# 24. Skin Concern Score

用户选择：

```text
Hydration
Skin Barrier
```

产品：

```text
Hydration
Skin Barrier
Dryness
```

匹配：

```text
30 / 30
```

如果只匹配：

```text
Hydration
```

则：

```text
15 / 30
```

---

# 25. Product Type Score

用户：

```text
Serum
```

产品：

```text
Serum
```

得：

```text
20
```

如果用户：

```text
Skincare
```

产品是：

```text
Serum
```

则可以得到：

```text
15–20
```

---

# 26. Ingredient Score

用户可能选择：

```text
Niacinamide
```

产品包含：

```text
Niacinamide
```

得：

```text
10
```

如果产品只具有相关 Ingredient Function，而没有该 Ingredient：

```text
5
```

---

# 27. Other Preference

例如用户选择：

```text
Lightweight
Fragrance-free
Vegan
```

未来可以增加：

```text
Product Attributes
```

V1.0 可以先保留：

```text
0–10
```

---

# 28. Recommendation Example

用户：

```text
Skin Type:
Sensitive

Concern:
Hydration

Product Type:
Serum
```

Product A：

```text
Sensitive
Dry

Hydration
Barrier

Serum
```

评分：

```text
Skin Type      30
Concern        30
Type           20
Ingredient      5
Other           5
----------------
Total          90
```

显示：

```text
90% Match
```

---

# 29. Recommendation Result

前台不要只显示：

```text
Product A
```

建议显示：

```text
Best Match

COSRX Advanced Snail 96 Mucin Power Essence

90% Match

Why we selected it:
✓ Suitable for sensitive skin
✓ Supports hydration
✓ Supports skin barrier
✓ Serum format
```

---

# 30. “Why This Product” 数据来源

解释文字必须来自结构化数据库。

例如：

```text
skin_types
skin_concerns
product_type
key_ingredients
```

不要依赖 AI 自动生成。

这样：

```text
推荐结果
=
可解释
+
可审计
+
可重复
```

---

# 31. Recommendation 不等于 Diagnosis

Beauty Quiz 页面必须避免：

```text
Your skin has eczema.
```

而使用：

```text
Your answers suggest that you may prefer
products focused on hydration and skin barrier support.
```

中文：

```text
根据你的选择，你可能更偏好注重保湿和肌肤屏障护理的产品。
```

---

# 32. Beauty Quiz V1.0

建议 6–8 个问题即可。

不要设计 20–30 个问题。

目标：

> **2–3 分钟完成。**

---

# 33. Question 1 — Skin Type

```text
How would you describe your skin?

How would you describe your skin?
```

选项：

```text
Normal
Dry
Oily
Combination
Sensitive
Not Sure
```

中文：

```text
你觉得自己的肤质属于哪一种？
```

---

# 34. Question 2 — Main Concern

```text
What is your main skin concern?
```

可以多选：

```text
Hydration
Dryness
Redness
Oil Control
Dark Spots
Dullness
Pores
Fine Lines
Skin Barrier
```

最多建议：

```text
3
```

---

# 35. Question 3 — Product Type

```text
What type of product are you looking for?
```

选项：

```text
Cleanser
Toner
Essence
Serum
Moisturizer
Mask
Sunscreen
Not Sure
```

如果用户：

```text
Not Sure
```

则不进行 Product Type Hard Filter。

---

# 36. Question 4 — Texture

未来：

```text
What texture do you prefer?
```

选项：

```text
Lightweight
Rich
Gel
Cream
No Preference
```

这个字段可以在 V1.0 作为 optional attribute。

---

# 37. Question 5 — Routine

```text
What is your current skincare routine?
```

选项：

```text
Minimal
Basic
Complete
Advanced
```

用于推荐数量，而不是决定产品功效。

---

# 38. Question 6 — Sensitivity

```text
How sensitive is your skin?
```

选项：

```text
Not particularly sensitive
Sometimes sensitive
Very sensitive
Not sure
```

这可以帮助确认：

```text
Sensitive
```

但不能作为医学诊断。

---

# 39. Question 7 — Ingredient Preference

可选：

```text
Are there any ingredients you particularly like?
```

例如：

```text
Niacinamide
Hyaluronic Acid
Ceramides
Snail
Centella
Vitamin C
Peptides
```

最多选择：

```text
3
```

---

# 40. Question 8 — Avoidance

未来可以：

```text
Are there ingredients or product characteristics
you prefer to avoid?
```

例如：

```text
Fragrance
Alcohol
Essential Oils
No Preference
```

注意：

> 不应在没有可靠产品数据支持时宣称“无某成分”。

---

# 41. Quiz Data Model

增加：

```text
quiz_questions
quiz_options
quiz_sessions
quiz_answers
```

结构：

```text
Quiz
 │
 ├── Question
 │     └── Option
 │
 └── Session
       └── Answer
```

---

# 42. Quiz Question

字段：

```text
id
question_code
question_en
question_zh
question_type
sort_order
status
```

question_type：

```text
single
multiple
scale
```

---

# 43. Quiz Option

字段：

```text
id
question_id
option_code
label_en
label_zh
sort_order
status
```

例如：

```text
Question:
skin_type

Option:
dry

EN:
Dry

ZH:
干性
```

---

# 44. Quiz Answer Mapping

不要把推荐逻辑硬编码在前端。

建立：

```text
quiz_answer_mappings
```

例如：

```text
option:
dry

maps_to:
skin_type = dry
```

---

# 45. Concern Mapping

例如：

```text
Question:
main_concern

Option:
dryness

maps_to:
skin_concern = dryness
```

---

# 46. Ingredient Preference Mapping

例如：

```text
Option:
niacinamide

maps_to:
ingredient = Niacinamide
```

---

# 47. Recommendation Engine

建议独立成一个 Laravel Service：

```text
RecommendationService
```

流程：

```text
Quiz Answers
      ↓
Normalize Answers
      ↓
Build User Profile
      ↓
Filter Active Products
      ↓
Calculate Score
      ↓
Sort
      ↓
Return Top Products
```

---

# 48. User Profile

Quiz 最终生成：

```text
User Profile

Skin Type:
Sensitive

Concerns:
Hydration
Redness

Product Type:
Serum

Ingredient Preferences:
Niacinamide
Centella
```

这个 Profile 不一定永久保存。

V1.0 可以只保存：

```text
quiz_session
```

---

# 49. Recommendation Query

概念：

```text
Products
WHERE
status = active
AND
compliance = approved
```

然后计算：

```text
score
```

---

# 50. 推荐排序

最终：

```text
ORDER BY score DESC
```

例如：

```text
Product A    92
Product B    88
Product C    81
Product D    76
Product E    71
```

前台显示：

```text
Top 3
```

或者：

```text
Top 6
```

---

# 51. Recommendation Threshold

建议：

```text
90–100
Excellent Match

75–89
Good Match

60–74
Potential Match

<60
Do Not Recommend
```

如果最高分只有：

```text
52
```

不要强行显示：

```text
52% Match
```

可以显示：

```text
We couldn't find a strong match.
Here are some popular options you may want to explore.
```

---

# 52. Product Safety Gate

Recommendation Engine 必须先执行：

```text
status = active
```

和：

```text
compliance = approved
```

然后才计算分数。

不能：

```text
Blocked Product
```

因为评分高就推荐。

---

# 53. Discontinued Product

如果：

```text
Product = discontinued
```

则：

```text
Recommendation = NO
```

即使历史评分很高。

---

# 54. Inventory Handling

V1.0：

```text
Out of Stock
```

可以：

```text
推荐
```

但排序降低。

例如：

```text
In Stock:
+5

Out of Stock:
0
```

这样用户仍然可以查看产品。

如果以后库存长期为 0：

```text
Hide from Recommendation
```

---

# 55. Price 不参与基础评分

V1.0 不建议：

```text
Price = high
→ score lower
```

因为：

> 产品匹配度与价格是两个不同维度。

未来如果 Quiz 增加：

```text
Budget
```

再加入：

```text
Budget Match
```

---

# 56. Brand Preference

用户以后可以选择：

```text
Brand Preference
```

例如：

```text
Korean
Japanese
Any
```

但 V1.0 不建议让品牌成为主要评分因素。

否则系统会过度偏向：

```text
热门品牌
```

而不是：

```text
更适合用户的产品
```

---

# 57. Similar Products

除了 Quiz，还可以做：

```text
You May Also Like
```

匹配逻辑：

```text
Same Product Type
+
Same Skin Type
+
Same Concern
+
Shared Ingredients
```

例如：

```text
Product A
```

找到：

```text
Product B
Product C
Product D
```

---

# 58. Similarity Score

可以简单：

```text
Product Type        30
Skin Type           25
Concern             25
Key Ingredients    20
-----------------------
Total              100
```

---

# 59. Search Filters

网站必须支持：

```text
Product Type
Brand
Skin Type
Skin Concern
Key Ingredient
Price
Country of Origin
```

例如：

```text
Serum
+
Sensitive
+
Hydration
+
Niacinamide
```

最终查询：

```text
PIDB
 ↓
Matching Products
 ↓
Shopify
```

---

# 60. Collection Strategy

Shopify Collection 可以使用：

```text
Product Type
Brand
Skin Type
Skin Concern
```

例如：

```text
Shop
├── Skincare
│   ├── Cleansers
│   ├── Serums
│   ├── Moisturizers
│   └── Masks
│
├── Shop by Skin Type
│   ├── Dry Skin
│   ├── Oily Skin
│   ├── Combination Skin
│   └── Sensitive Skin
│
└── Shop by Concern
    ├── Hydration
    ├── Redness
    ├── Dark Spots
    ├── Pores
    └── Skin Barrier
```

---

# 61. SEO Strategy

未来可以形成大量结构化 Landing Pages：

```text
/collections/serums
/collections/sensitive-skin
/collections/hydrating-products
/collections/niacinamide-products
```

但是：

> 不要为了 SEO 大量生成没有实际内容的页面。

只有：

```text
Product Count
+
Useful Content
+
Real Product Data
```

达到一定规模后再创建。

---

# 62. Chinese / English Frontend

用户进入网站时：

```text
English
中文
```

切换语言。

产品：

```text
English Product Name
Chinese Product Name
```

Quiz：

```text
English Questions
Chinese Questions
```

QR：

```text
English
中文
```

都从 PIDB 提供内容。

---

# 63. Original Language Display

如果产品原始语言为：

```text
ko
```

前台可以显示：

```text
Original Product Language:
Korean
```

但不建议默认把韩文原始产品名称作为消费者主要名称。

主要显示：

```text
English
中文
```

---

# 64. Product Knowledge Page

未来可以在产品页面增加：

```text
Product Overview

Skin Type
Dry / Sensitive

Skin Concerns
Hydration / Barrier

Key Ingredients
Snail / Niacinamide

How To Use
...

Full Ingredients
...

Warnings
...
```

这些全部来自 PIDB。

---

# 65. 数据关系总图

```text
                     PRODUCT
                        │
       ┌────────────────┼────────────────┐
       │                │                │
       ▼                ▼                ▼
 Product Type       Skin Type       Skin Concern
       │                │                │
       │                │                │
       └────────────────┼────────────────┘
                        │
                        ▼
                    INGREDIENT
                        │
                        ▼
                  Recommendation
                        │
                        ▼
                   Beauty Quiz
                        │
                        ▼
                  User Profile
                        │
                        ▼
                Recommendation Score
                        │
                        ▼
                  Shopify Product
```

---

# 66. V1.0 Recommendation Architecture

最终：

```text
                    USER
                     │
                     ▼
               Beauty Quiz
                     │
                     ▼
                Quiz Answers
                     │
                     ▼
             User Skin Profile
                     │
                     ▼
            Recommendation Engine
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
      Skin Type    Concern    Product Type
         │           │           │
         └───────────┼───────────┘
                     ▼
                 PIDB Search
                     │
                     ▼
              Score Products
                     │
                     ▼
                 Top 3–6
                     │
                     ▼
               Shopify Product
```

---

# 67. 为什么 V1.0 不使用 AI

当前产品数量即使达到：

```text
1,000
5,000
10,000
```

上述规则系统仍然可以工作。

优点：

```text
可解释
可审计
可重复
成本低
容易测试
容易修改
不会产生幻觉
```

例如：

```text
Why recommended?
```

系统可以明确回答：

```text
Sensitive Skin
+
Hydration
+
Serum
```

而不是：

```text
AI thinks this product looks good.
```

---

# 68. AI 的未来位置

未来如果产品达到：

```text
10,000+
```

并且有大量：

```text
Customer Reviews
Purchase History
Quiz Results
Product Ratings
Return Data
```

才有必要考虑：

```text
AI Recommendation
ML Ranking
Personalized Recommendation
```

届时：

```text
Rule Engine
+
AI / ML
```

可以共同工作。

但：

> AI 不应该取代 Product Knowledge Master。

---

# 69. V1.0 数据库新增表

在前面的 Schema 基础上增加：

```text
quiz_questions
quiz_options
quiz_answer_mappings
quiz_sessions
quiz_answers
```

未来可以增加：

```text
product_attributes
product_similarity
recommendation_logs
```

但不是 V1.0 必须项。

---

# 70. Recommendation Logs

建议至少记录：

```text
quiz_session_id
product_id
score
ranking
created_at
```

这样未来可以分析：

```text
哪些产品经常被推荐？
哪些产品点击率高？
哪些产品购买率高？
```

---

# 71. Analytics

未来可以建立：

```text
Quiz Started
Quiz Completed
Recommendation Viewed
Product Clicked
Add to Cart
Purchase
```

形成：

```text
Quiz
 ↓
Recommendation
 ↓
Click
 ↓
Add to Cart
 ↓
Purchase
```

这样最终可以计算：

```text
Recommendation Conversion Rate
```

这是未来优化推荐算法的重要数据。

---

# 72. 最终 V1.0 结论

Beauty Platform 的核心不是：

```text
Shopify + Product List
```

而是：

```text
PIDB
+
Product Taxonomy
+
Skin Knowledge
+
Ingredient Knowledge
+
Recommendation Rules
+
Shopify Commerce
```

最终形成：

```text
             PRODUCT DATABASE
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
   Product       Ingredient   Skin Profile
       │            │            │
       └────────────┼────────────┘
                    ▼
              Recommendation
                    │
                    ▼
                Beauty Quiz
                    │
                    ▼
               Consumer
                    │
                    ▼
                 Shopify
                    │
                    ▼
                  Sale
```

这就是第一阶段真正应该建设的核心能力：

> **不是简单地“卖韩国/日本化妆品”，而是建立一个能够理解、分类、搜索和推荐 Beauty Products 的 Product Knowledge Platform。**

---

# 73. 后续开发顺序

到目前为止，数据和业务逻辑已经基本确定。

建议下一份进入：

# 09 — PIDB API Specification

重点定义：

```text
Product API
Brand API
Ingredient API
Skin Type API
Skin Concern API
QR API
Beauty Quiz API
Recommendation API
Shopify Sync API
CSV Import API
```

并且明确：

```text
GET /api/products
GET /api/products/{id}
GET /api/ingredients
GET /api/skin-types
GET /api/skin-concerns
GET /api/qr/{short_code}
POST /api/quiz/session
POST /api/quiz/recommend
POST /api/shopify/sync
```

这样到第 09 份完成后，** 后端就已经可以开始真正编码**，而不是继续停留在概念架构阶段。