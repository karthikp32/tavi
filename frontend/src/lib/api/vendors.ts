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
  channel: "email" | "sms" | "phone";
  work_order_id: string;
  body: string;
  direction?: "inbound" | "outbound" | "internal";
  actor_type?: string;
  actor_name?: string;
  sender_id?: string;
  sender_type?: string;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function normalizeVendor(vendor: Vendor): Vendor {
  return {
    ...vendor,
    rating: toNumberOrNull(vendor.rating),
    quality_score: toNumberOrNull(vendor.quality_score),
    availability_score: toNumberOrNull(vendor.availability_score),
    risk_score: toNumberOrNull(vendor.risk_score),
  };
}

export function getVendors(filters: VendorSearchFilters = {}): Promise<Vendor[]> {
  return apiFetch<Vendor[]>(`/api/vendors${buildQueryString(filters)}`).then((vendors) =>
    vendors.map(normalizeVendor),
  );
}

export function getVendor(id: string): Promise<Vendor> {
  return apiFetch<Vendor>(`/api/vendors/${id}`).then(normalizeVendor);
}

export function contactVendor(
  id: string,
  payload: ContactVendorPayload,
): Promise<CommunicationEvent> {
  const { body, actor_name, sender_id, sender_type, ...query } = payload;
  return apiFetch<CommunicationEvent>(`/api/vendors/${id}/contact${buildQueryString(query)}`, {
    method: "POST",
    body: JSON.stringify({ body, actor_name, sender_id, sender_type }),
  });
}
