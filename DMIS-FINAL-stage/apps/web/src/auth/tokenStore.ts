/**
 * JWT persistence. localStorage keeps the session across reloads (needed for
 * session restoration). Trade-off, accepted for this prototype: any XSS could
 * read it, so the app renders no untrusted HTML and the API sends helmet headers.
 */
const KEY = "dmis.token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
export function setToken(token: string): void {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    /* storage unavailable — session lasts until reload */
  }
}
export function clearToken(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
