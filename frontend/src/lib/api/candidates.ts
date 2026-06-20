import { apiFetch } from "./client";
import type { WorkOrderCandidate } from "../types";

export type UpdateCandidatePayload = Partial<
  Omit<WorkOrderCandidate, "id" | "work_order_id" | "vendor_id" | "created_at" | "updated_at">
>;

export interface ContactCandidatePayload {
  channel: "email" | "sms" | "phone";
  message?: string;
}

export interface CreateCandidateMessagePayload {
  channel: "email" | "sms" | "phone" | "chat" | "note";
  direction: "inbound" | "outbound" | "internal";
  body: string;
}

export function getWorkOrderCandidates(workOrderId: string): Promise<WorkOrderCandidate[]> {
  return apiFetch<WorkOrderCandidate[]>(`/api/work-orders/${workOrderId}/candidates`);
}

export function getWorkOrderCandidate(id: string): Promise<WorkOrderCandidate> {
  return apiFetch<WorkOrderCandidate>(`/api/work-order-candidates/${id}`);
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

export function contactWorkOrderCandidate(id: string, payload: ContactCandidatePayload) {
  return apiFetch(`/api/work-order-candidates/${id}/contact`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createWorkOrderCandidateMessage(
  id: string,
  payload: CreateCandidateMessagePayload,
) {
  return apiFetch(`/api/work-order-candidates/${id}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
