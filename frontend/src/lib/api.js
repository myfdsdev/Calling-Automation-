import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({ baseURL });

const TOKEN_KEY = 'leadcall_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize errors into a friendly message and expose it as err.message.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const apiMessage = error.response?.data?.error?.message;

    if (status === 401 && getToken()) {
      // Session invalid/expired — clear and bounce to login.
      setToken(null);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }

    const friendly =
      apiMessage ||
      (error.code === 'ERR_NETWORK'
        ? 'Cannot reach the server. Is the backend running?'
        : 'Something went wrong. Please try again.');

    error.friendlyMessage = friendly;
    error.details = error.response?.data?.error?.details;
    return Promise.reject(error);
  },
);

export function getErrorMessage(error, fallback = 'Something went wrong') {
  return error?.friendlyMessage || error?.response?.data?.error?.message || fallback;
}
