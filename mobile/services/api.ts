import axios from "axios";

import { API_BASE, API_URL, IS_API_URL_FALLBACK } from "@/constants/config";
import { deleteItem, getItem, setItem } from "@/lib/storage";
import { useUIStore } from "@/stores/uiStore";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — attach token
api.interceptors.request.use(async (config) => {
  const token = await getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle token refresh
api.interceptors.response.use(
  (response) => {
    // Clear any previous connectivity warning once a request succeeds.
    useUIStore.getState().setApiWarning(null);
    return response;
  },
  async (error) => {
    if (!error.response) {
      const fallbackHint = IS_API_URL_FALLBACK
        ? ` App is using fallback API URL (${API_URL}). Set EXPO_PUBLIC_API_URL if this is not your local API.`
        : "";
      useUIStore
        .getState()
        .setApiWarning(`Can't reach server at ${API_URL}.${fallbackHint}`);
    }

    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await getItem("refresh_token");
        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        const response = await axios.post(`${API_BASE}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data;
        await setItem("access_token", access_token);
        await setItem("refresh_token", refresh_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch {
        await deleteItem("access_token");
        await deleteItem("refresh_token");
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
