import { apiFetch, buildQueryString } from "./client";
import type { CommunicationEvent, Vendor } from "../types";

export interface VendorSearchFilters {
  [key: string]: string | number | boolean | undefined;
  city?: string;
  trade?: string;
  task_type?: string;
  target_budget?: number;
  rating?: number;
  license_status?: string;
  insurance_status?: string;
  quality_score?: number;
  availability_score?: number;
  risk_score?: number;
  min_price_fit?: number;
}

export interface ContactVendorPayload {
  [key: string]: string | number | boolean | undefined;
  channel: "email" | "sms" | "phone";
  work_order_id: string;
  body: string;
  direction?: "inbound" | "outbound" | "internal";
  actor_type?: string;
  actor_name?: string;
}

export function getVendors(filters: VendorSearchFilters = {}): Promise<Vendor[]> {
  return apiFetch<Vendor[]>(`/api/vendors${buildQueryString(filters)}`);
}

export function getVendor(id: string): Promise<Vendor> {
  return apiFetch<Vendor>(`/api/vendors/${id}`);
}

export function contactVendor(
  id: string,
  payload: ContactVendorPayload,
): Promise<CommunicationEvent> {
  return apiFetch<CommunicationEvent>(`/api/vendors/${id}/contact${buildQueryString(payload)}`, {
    method: "POST",
  });
}
