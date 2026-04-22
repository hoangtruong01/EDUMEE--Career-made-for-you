export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string;
}

export interface ApiErrorBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

export class ApiError extends Error {
  statusCode: number;
  payload?: ApiErrorBody;

  constructor(message: string, statusCode: number, payload?: ApiErrorBody) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

const DEFAULT_API_BASE_URL = 'http://localhost:3001/api/v1';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || DEFAULT_API_BASE_URL;

const parseErrorMessage = (payload: ApiErrorBody | undefined, fallback: string): string => {
  if (!payload?.message) {
    return fallback;
  }

  if (Array.isArray(payload.message)) {
    return payload.message.join(', ');
  }

  return payload.message;
};

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  return response.json();
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = (await parseResponseBody(response)) as ApiErrorBody | T | null;

  if (!response.ok) {
    const parsedPayload = (payload || undefined) as ApiErrorBody | undefined;
    throw new ApiError(
      parseErrorMessage(parsedPayload, 'Đã xảy ra lỗi khi gọi API'),
      response.status,
      parsedPayload,
    );
  }

  return (payload ?? ({} as T)) as T;
}

export const apiClient = {
  get: <T>(path: string, token?: string) => apiRequest<T>(path, { method: 'GET', token }),
  post: <T>(path: string, body?: unknown, token?: string) =>
    apiRequest<T>(path, { method: 'POST', body, token }),
};
