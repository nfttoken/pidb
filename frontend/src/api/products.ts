import type { ApiResponse } from "../types/auth";
import type { Product, ProductCreatePayload, ProductImage, ProductListResponse, ProductReadiness, ProductUpdatePayload } from "../types/product";
import api from "./client";

export async function listProducts(params: { search?: string; status?: string; compliance_status?: string }): Promise<ProductListResponse> {
  const { data } = await api.get<ApiResponse<ProductListResponse>>("/products", { params: { offset: 0, limit: 100, ...params } });
  return data.data;
}

export async function getProduct(productId: string): Promise<Product> {
  const { data } = await api.get<ApiResponse<Product>>(`/products/${productId}`);
  return data.data;
}

export async function createProduct(payload: ProductCreatePayload): Promise<Product> {
  const { data } = await api.post<ApiResponse<Product>>("/products", payload);
  return data.data;
}

export async function updateProduct(productId: string, payload: ProductUpdatePayload): Promise<Product> {
  const { data } = await api.patch<ApiResponse<Product>>(`/products/${productId}`, payload);
  return data.data;
}

export async function changeProductStatus(productId: string, status: string): Promise<Product> {
  const { data } = await api.post<ApiResponse<Product>>(`/products/${productId}/status`, { status });
  return data.data;
}

export async function getProductReadiness(productId: string): Promise<ProductReadiness> {
  const { data } = await api.get<ApiResponse<ProductReadiness>>(`/products/${productId}/readiness`);
  return data.data;
}

export async function updateProductCompliance(productId: string, payload: { importer_name?: string; distributor_name?: string; canadian_label_status?: string; cosmetic_notification_status?: string; compliance_status: string; notes?: string }): Promise<Product["canada"]> {
  const { data } = await api.put<ApiResponse<Product["canada"]>>(`/products/${productId}/compliance`, payload);
  return data.data;
}

export async function addProductImage(productId: string, payload: Omit<ProductImage, "id" | "product_id" | "status">): Promise<ProductImage> {
  const { data } = await api.post<ApiResponse<ProductImage>>(`/products/${productId}/images`, payload);
  return data.data;
}

export async function updateProductImage(productId: string, imageId: string, payload: Omit<ProductImage, "id" | "product_id" | "status">): Promise<ProductImage> {
  const { data } = await api.patch<ApiResponse<ProductImage>>(`/products/${productId}/images/${imageId}`, payload);
  return data.data;
}

export async function deactivateProductImage(productId: string, imageId: string): Promise<ProductImage> {
  const { data } = await api.post<ApiResponse<ProductImage>>(`/products/${productId}/images/${imageId}/deactivate`);
  return data.data;
}
