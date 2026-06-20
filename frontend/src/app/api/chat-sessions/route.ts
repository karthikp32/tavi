import type { NextRequest } from "next/server";
import { createChatSession } from "@/server/store";
import { jsonOk, readJson } from "@/server/http";

interface CreateChatSessionBody {
  user_id?: string;
  work_order_id?: string | null;
}

export async function POST(request: NextRequest) {
  let body: CreateChatSessionBody = {};
  try {
    body = await readJson<CreateChatSessionBody>(request);
  } catch {
    // Body is optional for chat session creation.
  }

  const session = createChatSession(body.user_id, body.work_order_id);
  return jsonOk(session, 201);
}
