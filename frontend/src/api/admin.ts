import type { ApiResponse, User } from "../types/auth";
import api from "./client";

export type DashboardStats = {
  products_total: number;
  products_by_status: Record<string, number>;
  needs_review: number;
  compliance_review: number;
  shopify_pending: number;
  shopify_failed: number;
  shopify_succeeded: number;
};

export type Settings = {
  app_name: string;
  app_env: string;
  api_prefix: string;
  public_base_url: string;
  shopify_configured: boolean;
  shopify_api_version: string;
  refresh_token_expire_days: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<ApiResponse<DashboardStats>>("/dashboard/stats");
  return data.data;
}

export async function listUsers(): Promise<User[]> {
  const { data } = await api.get<ApiResponse<User[]>>("/users");
  return data.data;
}

export async function createUser(payload: { email: string; name: string; role: string; password: string }): Promise<User> {
  const { data } = await api.post<ApiResponse<User>>("/users", payload);
  return data.data;
}

export async function updateUser(id: string, payload: { name?: string; role?: string; password?: string; is_active?: boolean }): Promise<User> {
  const { data } = await api.patch<ApiResponse<User>>(`/users/${id}`, payload);
  return data.data;
}

export async function getSettings(): Promise<Settings> {
  const { data } = await api.get<ApiResponse<Settings>>("/settings");
  return data.data;
}
