import axios from "axios";
import { getApiErrorMessage } from "./errorMessage";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
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
