import { apiFetch } from "./client";
import type { SessionType } from "../auth";

export interface LoginResponse {
  id: string;
  type: SessionType;
  name: string;
  trade: string | null;
  company_id: string | null;
}

export function login(token: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}
