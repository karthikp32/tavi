import type { NextRequest } from "next/server";
import {
  addChatMessage,
  createChatSession,
  createWorkOrder,
  getChatSession,
  getWorkOrder,
  linkChatSessionToWorkOrder,
  listChatMessages,
} from "@/server/store";
import { jsonError, jsonOk, readJson } from "@/server/http";
import { missingFieldsPrompt, parseIntake, titleFor } from "@/server/intake";

interface LlmMessageBody {
  session_id?: string;
  message: string;
}

export async function POST(request: NextRequest) {
  let body: LlmMessageBody;
  try {
    body = await readJson<LlmMessageBody>(request);
  } catch {
    return jsonError("Invalid JSON body");
  }

  if (!body.message || !body.message.trim()) {
    return jsonError("message is required");
  }

  const session = body.session_id ? getChatSession(body.session_id) : undefined;
  const activeSession = session ?? createChatSession();

  addChatMessage(activeSession.id, "facility_manager", body.message);

  const parsed = parseIntake(body.message);
  const existingWorkOrder = activeSession.work_order_id
    ? getWorkOrder(activeSession.work_order_id)
    : undefined;

  let workOrder = existingWorkOrder;
  let assistantReply: string;

  if (!existingWorkOrder && parsed.trade) {
    workOrder = createWorkOrder({
      title: titleFor(parsed.trade, body.message),
      description: body.message,
      trade: parsed.trade,
      target_budget_cents: parsed.budgetCents ?? null,
      urgency: parsed.urgency ?? "normal",
    });
    linkChatSessionToWorkOrder(activeSession.id, workOrder.id);
    assistantReply = `I've created a draft work order for ${parsed.trade.replace(
      /_/g,
      " "
    )} work${parsed.city ? ` in ${parsed.city}` : ""}. You can review and edit it before we start discovering vendors.`;
  } else if (!parsed.trade) {
    assistantReply = missingFieldsPrompt(parsed);
  } else {
    assistantReply = "Thanks, I've noted that for your work order.";
  }

  const assistantMessage = addChatMessage(
    activeSession.id,
    "assistant",
    assistantReply,
    parsed as Record<string, unknown>
  );

  return jsonOk({
    session: getChatSession(activeSession.id),
    messages: listChatMessages(activeSession.id),
    reply: assistantMessage,
    work_order: workOrder ?? null,
  });
}
