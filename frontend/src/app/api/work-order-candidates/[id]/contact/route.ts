import type { NextRequest } from "next/server";
import { contactCandidate, getCandidate, type ContactInput } from "@/server/store";
import { jsonError, jsonOk, readJson } from "@/server/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!getCandidate(id)) return jsonError("Candidate not found", 404);

  let body: ContactInput;
  try {
    body = await readJson<ContactInput>(request);
  } catch {
    return jsonError("Invalid JSON body");
  }

  if (!body.channel || !body.body) {
    return jsonError("channel and body are required");
  }

  const event = contactCandidate(id, body);
  return jsonOk(event, 201);
}
