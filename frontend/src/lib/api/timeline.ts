import { apiFetch } from "./client";
import type { AgentAction, Bid, CommunicationEvent, WorkOrderState } from "../types";

export type TimelineEntry =
  | ({ entry_type: "communication_event" } & CommunicationEvent)
  | ({ entry_type: "bid" } & Bid)
  | ({ entry_type: "work_order_state" } & WorkOrderState)
  | ({ entry_type: "agent_action" } & AgentAction);

export function getWorkOrderTimeline(workOrderId: string): Promise<TimelineEntry[]> {
  return apiFetch<TimelineEntry[]>(`/api/work-orders/${workOrderId}/timeline`);
}

export function getWorkOrderStates(workOrderId: string): Promise<WorkOrderState[]> {
  return apiFetch<WorkOrderState[]>(`/api/work-orders/${workOrderId}/states`);
}
