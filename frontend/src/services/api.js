import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 20000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sameel_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && !String(error.config?.url).includes("/auth/login")) {
      localStorage.removeItem("sameel_token");
      localStorage.removeItem("sameel_user");
      window.dispatchEvent(new Event("sameel:logout"));
    }
    return Promise.reject(error);
  }
);

export default api;
