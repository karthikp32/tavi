import { apiFetch } from "./client";
import type { Bid } from "../types";

export type CreateBidPayload = Omit<Bid, "id" | "work_order_id" | "created_at">;

export type UpdateBidPayload = Partial<Pick<Bid, "status">>;

export function getWorkOrderBids(workOrderId: string): Promise<Bid[]> {
  return apiFetch<Bid[]>(`/api/work-orders/${workOrderId}/bids`);
}

export function createWorkOrderBid(workOrderId: string, payload: CreateBidPayload): Promise<Bid> {
  return apiFetch<Bid>(`/api/work-orders/${workOrderId}/bids`, {
    method: "POST",
    body: JSON.stringify({ ...payload, work_order_id: workOrderId }),
  });
}

export function updateBid(id: string, payload: UpdateBidPayload): Promise<Bid> {
  return apiFetch<Bid>(`/api/bids/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
