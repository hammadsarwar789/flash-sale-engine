import { ApiError } from '../types/api';

const BASE_URL = '/api/v1';

export class ApiClientError extends Error {
  status: number;
  data: ApiError;

  constructor(status: number, data: ApiError | any) {
    let msg = typeof data === 'string' ? data : (data?.message || data?.detail || data?.error || data?.title);
    if (!msg && data?.errors?.json) {
      const errKeys = Object.keys(data.errors.json);
      if (errKeys.length > 0) {
        const firstKey = errKeys[0];
        const val = data.errors.json[firstKey];
        const errStr = Array.isArray(val) ? val.join(' ') : String(val);
        msg = `Invalid ${firstKey}: ${errStr}`;
      }
    }
    if (!msg && data?.errors) {
      msg = typeof data.errors === 'string' ? data.errors : JSON.stringify(data.errors);
    }
    msg = msg || `HTTP ${status} Error`;
    super(msg);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
  }
}

let authToken: string | null = localStorage.getItem('flash_access_token');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('flash_access_token', token);
  } else {
    localStorage.removeItem('flash_access_token');
  }
};

export const getAuthToken = () => authToken;

interface RequestOptions extends RequestInit {
  idempotencyKey?: string;
}

export async function apiFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { idempotencyKey, headers: customHeaders, ...fetchOptions } = options;

  const url = endpoint.startsWith('/') ? `${BASE_URL}${endpoint}` : `${BASE_URL}/${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  // If payload is FormData, remove Content-Type so browser sets boundary multipart/form-data
  if (fetchOptions.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const config: RequestInit = {
    ...fetchOptions,
    headers,
    credentials: 'include',
  };

  try {
    let response = await fetch(url, config);

    // Silent Refresh Retry attempt on 401
    if (response.status === 401 && authToken) {
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          credentials: 'include',
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.access_token) {
            setAuthToken(refreshData.access_token);
            headers['Authorization'] = `Bearer ${refreshData.access_token}`;
            config.headers = headers;
            response = await fetch(url, config);
          }
        } else {
          setAuthToken(null);
        }
      } catch (err) {
        setAuthToken(null);
      }
    }

    if (!response.ok) {
      let errData: ApiError = {};
      try {
        errData = await response.json();
      } catch {
        errData = { message: `HTTP Error ${response.status}: ${response.statusText}` };
      }
      throw new ApiClientError(response.status, errData);
    }

    // 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    throw new ApiClientError(500, { message: (error as Error).message || 'Network request failed' });
  }
}
