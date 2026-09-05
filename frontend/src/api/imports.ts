import type { ApiResponse } from "../types/auth";
import type { ImportPreview, ImportResult } from "../types/imports";
import api from "./client";

export async function uploadCsv(file: File): Promise<ImportPreview> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<ApiResponse<ImportPreview>>("/imports/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function validateImport(batchId: string): Promise<ImportBatchSummary> {
  const { data } = await api.post<ApiResponse<ImportBatchSummary>>(`/imports/${batchId}/validate`);
  return data.data;
}

export async function getImportPreview(batchId: string): Promise<ImportPreview> {
  const { data } = await api.get<ApiResponse<ImportPreview>>(`/imports/${batchId}`);
  return data.data;
}

export async function confirmImport(batchId: string, mode: "upsert" | "create_only" | "update_only"): Promise<ImportResult> {
  const { data } = await api.post<ApiResponse<ImportResult>>(`/imports/${batchId}/confirm`, { mode });
  return data.data;
}

export type ImportBatchSummary = Omit<ImportPreview, "rows" | "errors">;

async function downloadCsv(path: string, filename: string): Promise<void> {
  const { data } = await api.get<Blob>(path, { responseType: "blob" });
  const url = URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadProductsCsv(): Promise<void> {
  return downloadCsv("/imports/export/products.csv", "pidb-products.csv");
}

export function downloadImportErrorsCsv(batchId: string): Promise<void> {
  return downloadCsv(`/imports/${batchId}/errors.csv`, "pidb-import-errors.csv");
}
