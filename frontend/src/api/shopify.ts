import type { ApiResponse } from "../types/auth";
import type { ProductListResponse } from "../types/product";
import type { ShopifyJob, ShopifySyncStatus } from "../types/shopify";
import api from "./client";

export async function listProducts(): Promise<ProductListResponse> {
  const { data } = await api.get<ApiResponse<ProductListResponse>>("/products", {
    params: { offset: 0, limit: 100 },
  });
  return data.data;
}

export async function getShopifyStatus(productId: string): Promise<ShopifySyncStatus | null> {
  try {
    const { data } = await api.get<ApiResponse<ShopifySyncStatus>>(
      `/shopify/products/${productId}/status`,
    );
    return data.data;
  } catch (error) {
    if (error instanceof Error && "response" in error && (error as { response?: { status?: number } }).response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function syncProduct(productId: string, action: "sync" | "sync_price" = "sync"): Promise<ShopifyJob> {
  const { data } = await api.post<ApiResponse<ShopifyJob>>(`/shopify/products/${productId}/sync`, {
    action,
  });
  return data.data;
}

export async function queueProducts(productIds: string[]): Promise<ShopifyJob[]> {
  const { data } = await api.post<ApiResponse<ShopifyJob[]>>("/shopify/sync", {
    product_ids: productIds,
  });
  return data.data;
}

export async function retryShopifyJob(jobId: string): Promise<ShopifyJob> {
  const { data } = await api.post<ApiResponse<ShopifyJob>>(`/shopify/jobs/${jobId}/retry`);
  return data.data;
}
