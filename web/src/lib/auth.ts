export type AuthResponse = {
  jwt: string;
  user: {
    id: number;
    username: string;
    email: string;
    [key: string]: unknown;
  };
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
  try {
    const res = await fetch(`${baseUrl}/api/auth/local`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ identifier, password })
    });
    
    if (!res.ok) {
      let errorMessage = 'Login failed';
      try {
        const errorData = await res.json();
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch {
        const text = await res.text();
        errorMessage = text || errorMessage;
      }
      throw new Error(errorMessage);
    }
    
    const data = await res.json();
    return data as AuthResponse;
  } catch (error: unknown) {
    // Handle network errors, timeouts, etc.
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Kết nối quá lâu, vui lòng thử lại');
      }
      if (error.message.includes('fetch')) {
        throw new Error('Lỗi kết nối, vui lòng kiểm tra mạng');
      }
    }
    throw error;
  }
}

export function logout() {
  try { clearTokenCookie(); } catch {}
  if (typeof window !== 'undefined') window.location.href = '/login';
}


