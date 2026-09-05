import { Button, Tag } from "antd";
import { Link } from "react-router-dom";

import type { PublicProduct } from "../../types/public";

export function ProductDetails({ product, language }: { product: PublicProduct; language: "en" | "zh" }) {
  const isChinese = language === "zh";
  const title = isChinese && product.product_name_zh ? product.product_name_zh : product.product_name_en;
  const description = isChinese && product.description_zh ? product.description_zh : product.description_en;
  const howToUse = isChinese && product.how_to_use_zh ? product.how_to_use_zh : product.how_to_use_en;
  const warnings = isChinese && product.warnings_zh ? product.warnings_zh : product.warnings_en;
  const image = product.images[0];
  const ingredients = product.ingredients.filter((item) => item.is_key_ingredient);
  const productUrl = product.shopify_url ?? (product.shopify_handle ? `/products/${product.shopify_handle}` : undefined);

  return (
    <article className="consumer-product-grid">
      <div>
        {image ? (
          <img
            className="consumer-product-image"
            src={image.image_url}
            alt={(isChinese && image.alt_text_zh) || image.alt_text_en || title}
          />
        ) : <div className="consumer-image-placeholder">{isChinese ? "暂无产品图片" : "Product image coming soon"}</div>}
        {product.images.length > 1 && (
          <div className="consumer-grid" style={{ marginTop: 12, gap: 12 }}>
            {product.images.slice(1, 5).map((item) => (
              <img key={item.image_url} className="consumer-product-image" style={{ aspectRatio: "1 / 1" }} src={item.image_url} alt={(isChinese && item.alt_text_zh) || item.alt_text_en || title} />
            ))}
          </div>
        )}
      </div>
      <div>
        <span className="consumer-kicker">{product.brand_name}</span>
        <h1 className="consumer-product-title">{title}</h1>
        <div className="consumer-product-meta">{isChinese ? product.product_type_zh || product.product_type_en : product.product_type_en} · {product.product_code}</div>
        <div className="consumer-tags" style={{ marginTop: 18 }}>
          {product.skin_types.map((value) => <Tag key={value}>{value}</Tag>)}
          {product.skin_concerns.map((value) => <Tag key={value}>{value}</Tag>)}
        </div>
        <div className="consumer-actions">
          {productUrl && <Button type="primary" href={productUrl} target="_blank" rel="noreferrer">{isChinese ? "在线购买" : "Buy online"}</Button>}
          <Button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}>{isChinese ? "查看成分" : "Explore ingredients"}</Button>
        </div>
        <section className="consumer-section">
          <h2>{isChinese ? "产品介绍" : "What is this?"}</h2>
          <p className="consumer-copy">{description || (isChinese ? "暂无产品介绍。" : "Product information is being prepared.")}</p>
        </section>
        {ingredients.length > 0 && (
          <section className="consumer-section">
            <h2>{isChinese ? "关键成分" : "Key ingredients"}</h2>
            <div className="consumer-tags">{ingredients.map((item) => <span className="consumer-tag" key={item.inci_name}>{isChinese && item.common_name_zh ? item.common_name_zh : item.common_name_en || item.inci_name}</span>)}</div>
          </section>
        )}
        <section className="consumer-section">
          <h2>{isChinese ? "使用方法" : "How to use"}</h2>
          <p className="consumer-copy">{howToUse || "-"}</p>
        </section>
        <section className="consumer-section">
          <h2>{isChinese ? "完整成分" : "Full ingredients"}</h2>
          <p className="consumer-copy">{product.source_inci || product.ingredients.map((item) => item.inci_name).join(", ") || "-"}</p>
        </section>
        <section className="consumer-section">
          <h2>{isChinese ? "注意事项" : "Warnings"}</h2>
          <p className="consumer-copy">{warnings || "-"}</p>
        </section>
        <p className="consumer-disclaimer">{isChinese ? "产品信息仅供参考，请按包装说明使用。" : "Product information is for reference. Follow the directions on the product packaging."}</p>
        <Link to="/quiz">{isChinese ? "不确定选什么？参加 Beauty Quiz" : "Not sure what to choose? Take the Beauty Quiz"}</Link>
      </div>
    </article>
  );
}
