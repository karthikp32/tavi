import type { NextRequest } from "next/server";
import { getWorkOrder, updateWorkOrder } from "@/server/store";
import { jsonError, jsonOk, readJson } from "@/server/http";
import type { WorkOrder } from "@/types/models";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const workOrder = getWorkOrder(id);
  if (!workOrder) return jsonError("Work order not found", 404);
  return jsonOk(workOrder);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let patch: Partial<WorkOrder>;
  try {
    patch = await readJson<Partial<WorkOrder>>(request);
  } catch {
    return jsonError("Invalid JSON body");
  }

  const updated = updateWorkOrder(id, patch);
  if (!updated) return jsonError("Work order not found", 404);
  return jsonOk(updated);
}
