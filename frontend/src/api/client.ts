import axios, { type AxiosRequestConfig } from "axios";

import type { ApiResponse, TokenResponse, User } from "../types/auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let accessToken: string | null = null;
let refreshRequest: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshRequest) {
    refreshRequest = api
      .post<ApiResponse<TokenResponse>>("/auth/refresh")
      .then(({ data }) => {
        setAccessToken(data.data.access_token);
        return data.data.access_token;
      })
      .catch(() => {
        setAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status !== 401 || !original || original._retry || original.url?.includes("/auth/")) {
      return Promise.reject(error);
    }
    original._retry = true;
    const token = await refreshAccessToken();
    if (!token) {
      return Promise.reject(error);
    }
    original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
    return api(original);
  },
);

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await api.post<ApiResponse<TokenResponse>>("/auth/login", { email, password });
  setAccessToken(data.data.access_token);
  return data.data;
}

export async function restoreSession(): Promise<User | null> {
  const token = await refreshAccessToken();
  if (!token) return null;
  const { data } = await api.get<ApiResponse<User>>("/auth/me");
  return data.data;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
  setAccessToken(null);
}

export default api;

