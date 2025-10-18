export type AuthResponse = {
  jwt: string;
  user: any;
};

export const AUTH_COOKIE_NAME = 'token';

export function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + AUTH_COOKIE_NAME + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setTokenCookie(token: string, days: number = 7) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Expires=${expires}`;
}

export function clearTokenCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export async function loginWithEmailPassword(baseUrl: string, identifier: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${baseUrl}/api/auth/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Login failed');
  }
  const data = await res.json();
  return data as AuthResponse;
}

export function logout() {
  try { clearTokenCookie(); } catch {}
  if (typeof window !== 'undefined') window.location.href = '/login';
}


