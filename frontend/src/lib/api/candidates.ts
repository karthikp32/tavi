import { apiFetch, buildQueryString } from "./client";
import type { CommunicationEvent, WorkOrderCandidate } from "../types";

export type UpdateCandidatePayload = Partial<
  Omit<WorkOrderCandidate, "id" | "work_order_id" | "vendor_id" | "created_at" | "updated_at">
>;

export interface ContactCandidatePayload {
  [key: string]: string | number | boolean | undefined;
  channel: "email" | "sms" | "phone" | "chat" | "note";
  body: string;
  direction?: "inbound" | "outbound" | "internal";
  actor_type?: string;
  actor_name?: string;
}

export interface CreateCandidateMessagePayload {
  [key: string]: string | number | boolean | undefined;
  body: string;
  channel?: "email" | "sms" | "phone" | "chat" | "note";
}

export function getWorkOrderCandidates(workOrderId: string): Promise<WorkOrderCandidate[]> {
  return apiFetch<WorkOrderCandidate[]>(`/api/work-orders/${workOrderId}/candidates`);
}

export function getWorkOrderCandidate(id: string): Promise<WorkOrderCandidate> {
  return apiFetch<WorkOrderCandidate>(`/api/work-order-candidates/${id}`);
}

export function createWorkOrderCandidate(
  workOrderId: string,
  vendorId: string,
): Promise<WorkOrderCandidate> {
  return apiFetch<WorkOrderCandidate>(
    `/api/work-orders/${workOrderId}/candidates${buildQueryString({ vendor_id: vendorId })}`,
    { method: "POST" },
  );
}

export function updateWorkOrderCandidate(
  id: string,
  payload: UpdateCandidatePayload,
): Promise<WorkOrderCandidate> {
  return apiFetch<WorkOrderCandidate>(`/api/work-order-candidates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function contactWorkOrderCandidate(
  id: string,
  payload: ContactCandidatePayload,
): Promise<CommunicationEvent> {
  return apiFetch<CommunicationEvent>(
    `/api/work-order-candidates/${id}/contact${buildQueryString(payload)}`,
    { method: "POST" },
  );
}

export function createWorkOrderCandidateMessage(
  id: string,
  payload: CreateCandidateMessagePayload,
): Promise<CommunicationEvent> {
  return apiFetch<CommunicationEvent>(
    `/api/work-order-candidates/${id}/messages${buildQueryString(payload)}`,
    { method: "POST" },
  );
}
