import axios from "axios";
import { getApiErrorMessage } from "./errorMessage";
import { API_BASE_URL } from "./config";

const api = axios.create({
  baseURL: API_BASE_URL,
});

function getPendingCount() {
  if (typeof window === "undefined") return;
  window.__appPendingRequests = window.__appPendingRequests || 0;
  return window.__appPendingRequests;
}

function notifyLoading() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("app:loading", { detail: { count: getPendingCount() } }),
  );
}

function startLoading() {
  if (typeof window === "undefined") return;
  window.__appPendingRequests = getPendingCount() + 1;
  notifyLoading();
}

function stopLoading() {
  if (typeof window === "undefined") return;
  window.__appPendingRequests = Math.max(0, getPendingCount() - 1);
  notifyLoading();
}

api.interceptors.request.use((config) => {
  startLoading();
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => {
  stopLoading();
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => {
    stopLoading();
    return response;
  },
  (error) => {
    stopLoading();
    if (error.response?.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("app:unauthorized"));
    }
    const message = getApiErrorMessage(error);
    error.normalizedMessage = message;
    error.message = message;

    if (error.response) {
      error.response.data = {
        ...(error.response.data || {}),
        message,
      };
    }

    return Promise.reject(error);
  },
);

export default api;
