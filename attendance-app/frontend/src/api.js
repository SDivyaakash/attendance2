import axios from "axios";

// In local dev, Vite proxies "/api" to the backend (see vite.config.js).
// In production (e.g. deployed on Render), set VITE_API_URL to the
// deployed backend's URL, e.g. https://rollcall-backend.onrender.com/api
const baseURL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiErrorMessage(err) {
  return err?.response?.data?.error || "Something went wrong. Please try again.";
}

export default api;
