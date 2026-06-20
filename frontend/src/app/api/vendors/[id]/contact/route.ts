import type { NextRequest } from "next/server";
import { contactVendorForWorkOrder, getVendor, getWorkOrder, type ContactInput } from "@/server/store";
import { jsonError, jsonOk, readJson } from "@/server/http";

interface VendorContactBody extends ContactInput {
  work_order_id: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const vendor = getVendor(id);
  if (!vendor) return jsonError("Vendor not found", 404);

  let body: VendorContactBody;
  try {
    body = await readJson<VendorContactBody>(request);
  } catch {
    return jsonError("Invalid JSON body");
  }

  if (!body.work_order_id || !body.channel || !body.body) {
    return jsonError("work_order_id, channel, and body are required");
  }

  if (!getWorkOrder(body.work_order_id)) {
    return jsonError("Work order not found", 404);
  }

  const result = contactVendorForWorkOrder(id, body.work_order_id, body);
  return jsonOk(result, 201);
}
