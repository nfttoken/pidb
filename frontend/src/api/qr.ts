import type { ApiResponse } from "../types/auth";
import type { QrListItem, QrResponse } from "../types/qr";
import api from "./client";

export async function createProductQr(productId: string): Promise<QrResponse> {
  const { data } = await api.post<ApiResponse<QrResponse>>(`/qr/products/${productId}`, {
    destination_type: "product",
  });
  return data.data;
}

export async function listQrCodes(): Promise<QrListItem[]> {
  const { data } = await api.get<ApiResponse<QrListItem[]>>("/qr");
  return data.data;
}

export async function deactivateQr(shortCode: string): Promise<QrResponse> {
  const { data } = await api.post<ApiResponse<QrResponse>>(`/qr/${encodeURIComponent(shortCode)}/deactivate`);
  return data.data;
}

export async function regenerateQr(shortCode: string): Promise<QrResponse> {
  const { data } = await api.post<ApiResponse<QrResponse>>(`/qr/${encodeURIComponent(shortCode)}/regenerate`);
  return data.data;
}
