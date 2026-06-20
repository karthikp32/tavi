import type { NextRequest } from "next/server";
import { addChatMessage, getChatSession } from "@/server/store";
import { jsonError, jsonOk, readJson } from "@/server/http";
import type { ChatMessageRole } from "@/types/models";

interface AddMessageBody {
  role: ChatMessageRole;
  body: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!getChatSession(id)) return jsonError("Chat session not found", 404);

  let body: AddMessageBody;
  try {
    body = await readJson<AddMessageBody>(request);
  } catch {
    return jsonError("Invalid JSON body");
  }

  if (!body.role || !body.body) {
    return jsonError("role and body are required");
  }

  const message = addChatMessage(id, body.role, body.body);
  return jsonOk(message, 201);
}
