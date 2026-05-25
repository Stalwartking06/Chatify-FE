import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore.js';

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,

  withCredentials: true,

  headers: {
    'Content-Type': 'application/json',
  },

  timeout: 15000, // Prevent hanging requests
});

// REQUEST INTERCEPTOR
api.interceptors.request.use(
  (config) => {

    const token =
      useAuthStore.getState().token;

    // Attach token
    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (error) => Promise.reject(error)
);

// REFRESH CONTROL
let isRefreshing = false;

let failedQueue = [];

// Process waiting requests
const processQueue = (
  error,
  token = null
) => {

  failedQueue.forEach((prom) => {

    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// RESPONSE INTERCEPTOR
api.interceptors.response.use(

  (response) => response,

  async (error) => {

    const originalRequest =
      error.config;

    // Ignore if no response
    if (!error.response) {
      return Promise.reject(error);
    }

    const isTokenExpired =
      error.response.status === 401 &&
      error.response.data?.code ===
        'TOKEN_EXPIRED';

    // Avoid infinite retry loop
    if (
      isTokenExpired &&
      !originalRequest._retry
    ) {

      // Queue requests during refresh
      if (isRefreshing) {

        return new Promise(
          (resolve, reject) => {

            failedQueue.push({
              resolve,
              reject,
            });
          }
        )
          .then((token) => {

            originalRequest.headers.Authorization =
              `Bearer ${token}`;

            return api(originalRequest);
          })
          .catch((err) =>
            Promise.reject(err)
          );
      }

      originalRequest._retry = true;

      isRefreshing = true;

      try {

        // Refresh access token
        const response =
          await axios.post(
            `${BASE_URL}/auth/refresh`,
            {},
            {
              withCredentials: true,
              timeout: 10000,
            }
          );

        const newToken =
          response.data.token;

        // Update store
        useAuthStore
          .getState()
          .setToken(newToken);

        // Retry queued requests
        processQueue(
          null,
          newToken
        );

        // Retry current request
        originalRequest.headers.Authorization =
          `Bearer ${newToken}`;

        return api(originalRequest);

      } catch (refreshError) {

        processQueue(
          refreshError,
          null
        );

        // Force logout once
        const authStore =
          useAuthStore.getState();

        if (
          authStore.isAuthenticated
        ) {
          await authStore.logout();
        }

        return Promise.reject(
          refreshError
        );

      } finally {

        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;