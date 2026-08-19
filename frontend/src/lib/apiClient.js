import axios from 'axios';

let rawBaseURL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';
if (rawBaseURL && (rawBaseURL.startsWith('http://') || rawBaseURL.startsWith('https://'))) {
  rawBaseURL = rawBaseURL.replace(/\/+$/, '');
  if (!rawBaseURL.endsWith('/api')) {
    rawBaseURL += '/api';
  }
}
const baseURL = rawBaseURL;

// Access token lives in memory only — never localStorage/sessionStorage (docs/02 §4).
// The refresh token is an HttpOnly cookie the browser sends automatically; JS never touches it.
let accessToken = null;
export function setAccessToken(token) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}

export const apiClient = axios.create({
  baseURL,
  withCredentials: true, // required so the browser sends the HttpOnly refresh cookie
});

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const code = error.response?.data?.error?.code;

    if (error.response?.status === 401 && code === 'AUTH_TOKEN_EXPIRED' && !original._retried) {
      original._retried = true;
      try {
        // De-duplicate concurrent refreshes triggered by parallel requests.
        refreshPromise = refreshPromise || apiClient.post('/auth/refresh');
        const { data } = await refreshPromise;
        setAccessToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(original);
      } catch (refreshErr) {
        setAccessToken(null);
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        refreshPromise = null;
      }
    }
    return Promise.reject(error);
  }
);
