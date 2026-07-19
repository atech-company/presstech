import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import { getAuthToken, useAuthStore } from "@/store/auth-store";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(
  /\/$/,
  ""
);

/**
 * Browser: use same-origin `/api/v1` (Next/Vercel rewrite → Laravel).
 * That avoids Hostinger CDN blocking cross-origin browser calls with 403 HTML
 * (which shows up as a CORS error because those responses have no ACAO header).
 *
 * SSR / server: call the API host directly.
 */
function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "/api/v1";
  }

  return `${API_URL}/api/v1`;
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  // Auth is via Bearer token; no need to send cookies cross-origin
  withCredentials: false,
});

apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();

  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
  message?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export class ApiClientError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.errors = errors;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const status = error.response?.status ?? 500;

    if (status === 401 && typeof window !== "undefined") {
      useAuthStore.getState().logout();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }

    const message =
      error.response?.data?.message ??
      (status === 429
        ? "Too many requests — please wait a moment and try again."
        : error.message) ??
      "An error occurred";
    const errors = error.response?.data?.errors;
    return Promise.reject(new ApiClientError(message, status, errors));
  }
);

export async function apiGet<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const response = await apiClient.get<ApiResponse<T>>(url, config);
  return response.data;
}

export async function apiPost<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const response = await apiClient.post<ApiResponse<T>>(url, data, config);
  return response.data;
}

export async function apiPut<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const response = await apiClient.put<ApiResponse<T>>(url, data, config);
  return response.data;
}

export async function apiPatch<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const response = await apiClient.patch<ApiResponse<T>>(url, data, config);
  return response.data;
}

export async function apiDelete<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const response = await apiClient.delete<ApiResponse<T>>(url, config);
  return response.data;
}
