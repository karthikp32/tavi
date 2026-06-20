import type { NextRequest } from "next/server";
import { getChatSession, listChatMessages } from "@/server/store";
import { jsonError, jsonOk } from "@/server/http";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = getChatSession(id);
  if (!session) return jsonError("Chat session not found", 404);
  return jsonOk({ session, messages: listChatMessages(id) });
}
