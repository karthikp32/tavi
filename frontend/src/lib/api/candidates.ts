import { apiFetch, buildQueryString } from "./client";
import type { CommunicationEvent, WorkOrderCandidate } from "../types";

export type UpdateCandidatePayload = Partial<
  Omit<WorkOrderCandidate, "id" | "work_order_id" | "vendor_id" | "created_at" | "updated_at">
>;

export interface ContactCandidatePayload {
  channel: "email" | "sms" | "phone" | "chat" | "note";
  body: string;
  direction?: "inbound" | "outbound" | "internal";
  actor_type?: string;
  actor_name?: string;
  sender_id?: string;
  sender_type?: string;
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
  const { body, sender_id, sender_type, ...query } = payload;
  return apiFetch<CommunicationEvent>(
    `/api/work-order-candidates/${id}/contact${buildQueryString(query)}`,
    {
      method: "POST",
      body: JSON.stringify({ body, sender_id, sender_type }),
    },
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
