import { useState } from "react";
import { Alert, Button, Result, Segmented, Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { resolveQr } from "../../api/public";
import { ProductDetails } from "../../components/consumer/ProductDetails";

export function QrProduct() {
  const { shortCode = "" } = useParams();
  const [language, setLanguage] = useState<"en" | "zh">("en");
  const query = useQuery({ queryKey: ["qr-product", shortCode], queryFn: () => resolveQr(shortCode), enabled: Boolean(shortCode) });

  if (query.isLoading) return <Spin size="large" />;
  if (query.isError || !query.data) return <Result status="404" title="Product not found" subTitle="This QR code is unavailable or the product is no longer published." extra={<Button href="/quiz">Explore the Beauty Quiz</Button>} />;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <Alert type="info" showIcon message={language === "zh" ? `产品编码 ${query.data.product_code}` : `Product code ${query.data.product_code}`} />
        <Segmented value={language} onChange={(value) => setLanguage(value as "en" | "zh")} options={[{ label: "EN", value: "en" }, { label: "中文", value: "zh" }]} />
      </div>
      <ProductDetails product={query.data.product} language={language} />
    </>
  );
}
