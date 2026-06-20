import type { NextRequest } from "next/server";
import { createWorkOrder, listWorkOrders } from "@/server/store";
import { jsonError, jsonOk, readJson } from "@/server/http";
import type { CreateWorkOrderInput } from "@/server/store";

export async function GET() {
  return jsonOk(listWorkOrders());
}

export async function POST(request: NextRequest) {
  let body: CreateWorkOrderInput;
  try {
    body = await readJson<CreateWorkOrderInput>(request);
  } catch {
    return jsonError("Invalid JSON body");
  }

  if (!body.title || !body.description || !body.trade) {
    return jsonError("title, description, and trade are required");
  }

  const workOrder = createWorkOrder(body);
  return jsonOk(workOrder, 201);
}
