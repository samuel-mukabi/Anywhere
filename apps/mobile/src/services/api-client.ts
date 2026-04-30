/**
 * API Client — src/lib/apiClient.ts
 *
 * Axios instance with:
 *  - baseURL from Expo Constants
 *  - Request interceptor: attach JWT from authStore
 *  - Pre-flight expiry check: refresh if JWT expires within 60s
 *  - Response interceptor: on 401 → auto-refresh → retry original request
 *  - On refresh failure: clearAuth() + redirect to login
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { secureStorage } from '../core/secure-storage';
import { useAuthStore }  from '../features/auth/auth-store';
import { DestinationResult } from '../features/search/search-store';

// ─── Create instance ──────────────────────────────────────────────────────────
const baseURL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  'http://localhost:8000';

export const apiClient = axios.create({
  baseURL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── JWT helpers ──────────────────────────────────────────────────────────────
function decodeExpiry(jwt: string): number | null {
  try {
    const payload = jwt.split('.')[1];
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { exp?: number };
    return decoded.exp ?? null;
  } catch {
    return null;
  }
}

function isExpiringSoon(jwt: string, thresholdSeconds = 60): boolean {
  const exp = decodeExpiry(jwt);
  if (!exp) return false;
  return exp - Date.now() / 1000 < thresholdSeconds;
}

// ─── Token refresh (isolated to avoid circular import with authStore) ─────────
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

async function doRefresh(): Promise<string> {
  const refreshToken = await secureStorage.getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  const res = await axios.post<{ token: string; refreshToken: string }>(
    `${baseURL}/api/auth/refresh`,
    { refreshToken },
  );

  const { token, refreshToken: newRefresh } = res.data;
  await Promise.all([
    secureStorage.setJwt(token),
    secureStorage.setRefreshToken(newRefresh),
  ]);

  // Sync token directly into Zustand store
  useAuthStore.setState({ token });

  return token;
}

// ─── Request interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  let token = await secureStorage.getJwt();
  if (!token) return config;

  // Pre-flight: proactively refresh if expiring within 60s
  if (isExpiringSoon(token)) {
    try {
      token = await doRefresh();
    } catch {
      // Let the request proceed; response interceptor will handle 401
    }
  }

  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response interceptor — auto-refresh on 401 ────────────────────────────────
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const isAuthPath = original.url?.includes('/auth/login') || 
                       original.url?.includes('/auth/register') ||
                       original.url?.includes('/auth/refresh');

    if (error.response?.status !== 401 || original._retry || isAuthPath) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      // Queue request behind current refresh
      return new Promise((resolve, reject) => {
        refreshQueue.push((newToken: string) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          resolve(apiClient(original));
        });
      });
    }

    isRefreshing = true;

    try {
      const newToken = await doRefresh();
      
      // Execute queued requests
      refreshQueue.forEach((cb) => cb(newToken));
      refreshQueue = [];

      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    } catch (refreshError) {
      // REFRESH FAILED — This is critical. The session is dead.
      refreshQueue = [];
      
      console.warn('[API] Token refresh failed permanently. Wiping session.');
      
      // 1. Wipe SecureStore physically
      await secureStorage.clearAll();
      
      // 2. Clear Zustand memory
      useAuthStore.getState().clearAuth();
      
      // 3. Force redirect to login
      router.replace('/(auth)/login');
      
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

// ─── Typed API helpers ────────────────────────────────────────────────────────
export interface AuthResponse {
  user:         { id: string; email: string; tier: string; name?: string };
  token:        string;
  refreshToken: string;
}

export const authApi = {
  login:          (data: { email: string; password: string }) =>
    apiClient.post<AuthResponse>('/api/auth/login', data),

  register:       (data: { email: string; password: string }) =>
    apiClient.post<AuthResponse>('/api/auth/register', data),

  forgotPassword: (email: string) =>
    apiClient.post('/api/auth/forgot-password', { email }),

  googleMobile:   (code: string) =>
    apiClient.post<AuthResponse>('/api/auth/google/mobile', { code }),

  appleMobile:    (identityToken: string, fullName?: string | null) =>
    apiClient.post<AuthResponse>('/api/auth/apple/mobile', { identityToken, fullName }),
};

// ─── Search API ──────────────────────────────────────────────────────────────
export interface SearchPostPayload {
  budget:          number;
  vibes:           string[];
  duration:        number;
  dateFrom:        string | null;
  dateTo:          string | null;
  travelMonth?:    number | null;
  departureRegion: string;
  currency:        string;
}

export interface SearchPostResponse {
  searchId: string;
  cached: boolean;
  status?: string;
  results?: DestinationResult[];
}

export interface SearchStatusResponse {
  status: 'pending' | 'ready' | 'failed';
  results?: DestinationResult[];
}

export const searchApi = {
  createSearch: (payload: SearchPostPayload) =>
    apiClient.post<SearchPostResponse>('/api/search', payload),

  getSearchStatus: (searchId: string) =>
    apiClient.get<SearchStatusResponse>(`/api/search/poll/${searchId}`),
};
