// Cliente HTTP mínimo para la API. Adjunta el JWT y centraliza errores.
const BASE = (import.meta as any).env?.VITE_API_URL || '/api';

export function getToken(): string | null {
  return localStorage.getItem('prh_token');
}
export function setToken(t: string | null) {
  if (t) localStorage.setItem('prh_token', t);
  else localStorage.removeItem('prh_token');
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) setToken(null);
    throw new Error((data as any).error || `Error ${res.status}`);
  }
  return data as T;
}

// POST de multipart/form-data (subida de archivos). No fija Content-Type:
// el navegador agrega el boundary automáticamente.
async function requestForm<T>(method: string, path: string, form: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) setToken(null);
    throw new Error((data as any).error || `Error ${res.status}`);
  }
  return data as T;
}

// Descarga binaria autenticada (p.ej. comprobante de licencia) -> Blob.
export async function fetchBlob(path: string): Promise<Blob> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) {
    if (res.status === 401) setToken(null);
    throw new Error(`Error ${res.status}`);
  }
  return res.blob();
}

export const api = {
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b?: unknown) => request<T>('POST', p, b),
  put: <T>(p: string, b?: unknown) => request<T>('PUT', p, b),
  patch: <T>(p: string, b?: unknown) => request<T>('PATCH', p, b),
  del: <T>(p: string) => request<T>('DELETE', p),
  postForm: <T>(p: string, form: FormData) => requestForm<T>('POST', p, form),
};
