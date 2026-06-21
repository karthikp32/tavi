export type SessionType = "facility_manager" | "vendor";

export interface Session {
  id: string;
  type: SessionType;
  name: string;
  trade: string | null;
  company_id: string | null;
  login_token?: string;
}

const COOKIE_NAME = "tavi_session";

export function getSession(): Session | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1])) as Session;
  } catch {
    return null;
  }
}

export function setSession(session: Session): void {
  const value = encodeURIComponent(JSON.stringify(session));
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=604800; samesite=lax${secure}`;
}

export function clearSession(): void {
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; samesite=lax${secure}`;
}

export function homePathForSession(session: Session): string {
  return session.type === "vendor" ? "/vendor/marketplace" : "/";
}
