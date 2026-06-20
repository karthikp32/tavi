import type { NextRequest } from "next/server";
import { createBid, getWorkOrder, listBids, type CreateBidInput } from "@/server/store";
import { jsonError, jsonOk, readJson } from "@/server/http";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!getWorkOrder(id)) return jsonError("Work order not found", 404);
  return jsonOk(listBids(id));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!getWorkOrder(id)) return jsonError("Work order not found", 404);

  let body: CreateBidInput;
  try {
    body = await readJson<CreateBidInput>(request);
  } catch {
    return jsonError("Invalid JSON body");
  }

  if (!body.work_order_candidate_id || !body.amount_cents) {
    return jsonError("work_order_candidate_id and amount_cents are required");
  }

  const bid = createBid(id, body);
  return jsonOk(bid, 201);
}
