import type { NextRequest } from "next/server";
import { getBid, updateBid } from "@/server/store";
import { jsonError, jsonOk, readJson } from "@/server/http";
import type { Bid } from "@/types/models";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bid = getBid(id);
  if (!bid) return jsonError("Bid not found", 404);
  return jsonOk(bid);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let patch: Partial<Bid>;
  try {
    patch = await readJson<Partial<Bid>>(request);
  } catch {
    return jsonError("Invalid JSON body");
  }

  const updated = updateBid(id, patch);
  if (!updated) return jsonError("Bid not found", 404);
  return jsonOk(updated);
}
