import type { NextRequest } from "next/server";
import { getTimeline, getWorkOrder, recommendWinner } from "@/server/store";
import { jsonError, jsonOk } from "@/server/http";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!getWorkOrder(id)) return jsonError("Work order not found", 404);
  return jsonOk({
    timeline: getTimeline(id),
    recommendation: recommendWinner(id),
  });
}
