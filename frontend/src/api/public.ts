import type { ApiResponse } from "../types/auth";
import type { PublicProduct } from "../types/public";
import api from "./client";

export type QrResolution = {
  short_code: string;
  target_url: string;
  product_id: string;
  product_code: string;
  product_name_en: string;
  product_name_zh: string | null;
  product_status: string;
  product: PublicProduct;
};

export async function resolveQr(shortCode: string): Promise<QrResolution> {
  const { data } = await api.get<ApiResponse<QrResolution>>(`/qr/${encodeURIComponent(shortCode)}`);
  return data.data;
}

export async function getPublicProduct(productId: string): Promise<PublicProduct> {
  const { data } = await api.get<ApiResponse<PublicProduct>>(`/public/products/${productId}`);
  return data.data;
}
