import type { NextRequest } from "next/server";
import { getCandidate, updateCandidate } from "@/server/store";
import { jsonError, jsonOk, readJson } from "@/server/http";
import type { WorkOrderCandidate } from "@/types/models";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const candidate = getCandidate(id);
  if (!candidate) return jsonError("Candidate not found", 404);
  return jsonOk(candidate);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let patch: Partial<WorkOrderCandidate>;
  try {
    patch = await readJson<Partial<WorkOrderCandidate>>(request);
  } catch {
    return jsonError("Invalid JSON body");
  }

  const updated = updateCandidate(id, patch);
  if (!updated) return jsonError("Candidate not found", 404);
  return jsonOk(updated);
}
