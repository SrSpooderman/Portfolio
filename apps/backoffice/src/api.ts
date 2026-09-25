import createClient from 'openapi-fetch';
import type { paths } from './api-schema';

let accessToken = '';
let refreshInProgress: Promise<boolean> | null = null;
export function setAccessToken(value: string) { accessToken = value; }
export function getAccessToken() { return accessToken; }
export class ApiError extends Error {
  constructor(message: string, public status: number, public payload: any) { super(message); }
}

async function sessionFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(input instanceof Request ? input.headers : init.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const requestInit = { ...init, headers, credentials: 'same-origin' as const };
  const requestUrl = input instanceof Request ? input.url : String(input);
  let response = await fetch(input, requestInit);
  if (response.status === 401 && !requestUrl.includes('/auth/')) {
    refreshInProgress ??= restoreSession().finally(() => { refreshInProgress = null; });
    if (await refreshInProgress) {
      headers.set('Authorization', `Bearer ${accessToken}`);
      response = await fetch(input, { ...requestInit, headers });
    }
  }
  return response;
}

export const typedApi = createClient<paths>({ fetch: sessionFetch });

function apiUrl(path: string) {
  const relative = '/api/v1/' + path.replace(/^\//, '');
  return typeof window === 'undefined' ? `http://localhost${relative}` : new URL(relative, window.location.href).toString();
}

export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const url = apiUrl(path);
  const response = await sessionFetch(url, { ...init, headers });
  if (!response.ok) {
    let payload: any;
    try { payload = await response.json(); } catch { payload = { detail: response.statusText }; }
    const detail = payload.detail;
    const message = typeof detail === 'string' ? detail : JSON.stringify(detail);
    throw new ApiError(message || `HTTP ${response.status}`, response.status, payload);
  }
  return response.json();
}

export async function restoreSession(): Promise<boolean> {
  try {
    const { data, response } = await typedApi.POST('/api/v1/auth/refresh');
    if (!response.ok) return false;
    const result = data as { access_token: string };
    setAccessToken(result.access_token);
    return true;
  }
  catch { return false; }
}

export async function login(email: string, password: string) {
  const { data, error, response } = await typedApi.POST('/api/v1/auth/login', { body: { email, password } });
  if (!response.ok) throw new ApiError('No se pudo iniciar sesión', response.status, error);
  const result = data as { access_token: string };
  setAccessToken(result.access_token);
}

export async function logout() {
  const { response } = await typedApi.POST('/api/v1/auth/logout');
  if (!response.ok) throw new ApiError('No se pudo cerrar la sesión', response.status, {});
  setAccessToken('');
}
