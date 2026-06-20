import { apiFetch, buildQueryString } from "./client";
import type { Vendor } from "../types";

export interface VendorSearchFilters {
  [key: string]: string | number | boolean | undefined;
  city?: string;
  trade?: string;
  min_rating?: number;
  license_status?: string;
  insurance_status?: string;
  min_quality_score?: number;
  min_availability_score?: number;
  max_risk_score?: number;
  task_type?: string;
}

export interface ContactVendorPayload {
  channel: "email" | "sms" | "phone";
  work_order_id: string;
  message?: string;
}

export function getVendors(filters: VendorSearchFilters = {}): Promise<Vendor[]> {
  return apiFetch<Vendor[]>(`/api/vendors${buildQueryString(filters)}`);
}

export function getVendor(id: string): Promise<Vendor> {
  return apiFetch<Vendor>(`/api/vendors/${id}`);
}

export function contactVendor(id: string, payload: ContactVendorPayload) {
  return apiFetch(`/api/vendors/${id}/contact`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
