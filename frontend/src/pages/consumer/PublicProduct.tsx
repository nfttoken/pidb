import { useState } from "react";
import { Button, Result, Segmented, Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { getPublicProduct } from "../../api/public";
import { ProductDetails } from "../../components/consumer/ProductDetails";

export function PublicProduct() {
  const { productId = "" } = useParams();
  const [language, setLanguage] = useState<"en" | "zh">("en");
  const query = useQuery({ queryKey: ["public-product", productId], queryFn: () => getPublicProduct(productId), enabled: Boolean(productId) });

  if (query.isLoading) return <Spin size="large" />;
  if (query.isError || !query.data) return <Result status="404" title="Product not found" extra={<Button href="/quiz">Explore the Beauty Quiz</Button>} />;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 28 }}>
        <Segmented value={language} onChange={(value) => setLanguage(value as "en" | "zh")} options={[{ label: "EN", value: "en" }, { label: "中文", value: "zh" }]} />
      </div>
      <ProductDetails product={query.data} language={language} />
    </>
  );
}
