import { apiFetch } from "./client";
import type { WorkOrder } from "../types";

export type CreateWorkOrderPayload = Omit<
  WorkOrder,
  "id" | "created_at" | "updated_at" | "status"
> &
  Partial<Pick<WorkOrder, "status">>;

export type UpdateWorkOrderPayload = Partial<Omit<WorkOrder, "id" | "created_at" | "updated_at">>;

export function getWorkOrders(filters: { vendor_id?: string } = {}): Promise<WorkOrder[]> {
  const params = new URLSearchParams();
  if (filters.vendor_id) params.set("vendor_id", filters.vendor_id);
  const query = params.toString();
  return apiFetch<WorkOrder[]>(`/api/work-orders${query ? `?${query}` : ""}`);
}

export function getWorkOrder(id: string): Promise<WorkOrder> {
  return apiFetch<WorkOrder>(`/api/work-orders/${id}`);
}

export function createWorkOrder(payload: CreateWorkOrderPayload): Promise<WorkOrder> {
  return apiFetch<WorkOrder>("/api/work-orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateWorkOrder(id: string, payload: UpdateWorkOrderPayload): Promise<WorkOrder> {
  return apiFetch<WorkOrder>(`/api/work-orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
