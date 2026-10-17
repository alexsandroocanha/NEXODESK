import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api",
});

api.interceptors.request.use(config => {
  const token = sessionStorage.getItem("nexo_access");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;

    if (error.response?.status === 401 && !original?._retry && sessionStorage.getItem("nexo_refresh")) {
      original._retry = true;

      try {
        const response = await axios.post(`${api.defaults.baseURL}/auth/refresh/`, {
          refresh: sessionStorage.getItem("nexo_refresh"),
        });

        sessionStorage.setItem("nexo_access", response.data.access);

        if (response.data.refresh) {
          sessionStorage.setItem("nexo_refresh", response.data.refresh);
        }

        original.headers.Authorization = `Bearer ${response.data.access}`;
        return api(original);
      } catch {
        sessionStorage.removeItem("nexo_access");
        sessionStorage.removeItem("nexo_refresh");
        window.dispatchEvent(new Event("nexo:logout"));
      }
    }

    return Promise.reject(error);
  },
);

export default api;