import { apiFetch } from "./client";
import type { Bid, CommunicationEvent, WorkOrderState } from "../types";

export type TimelineEntry =
  | { type: "communication_event"; timestamp: string; data: CommunicationEvent }
  | { type: "bid"; timestamp: string; data: Bid }
  | { type: "state_snapshot"; timestamp: string; data: WorkOrderState };

export function getWorkOrderTimeline(workOrderId: string): Promise<TimelineEntry[]> {
  return apiFetch<TimelineEntry[]>(`/api/work-orders/${workOrderId}/timeline`);
}

export function getWorkOrderStates(workOrderId: string): Promise<WorkOrderState[]> {
  return apiFetch<WorkOrderState[]>(`/api/work-orders/${workOrderId}/states`);
}
