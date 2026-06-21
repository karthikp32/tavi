import { apiFetch } from "./client";

export interface SendLlmMessagePayload {
  message: string;
  chat_session_id?: string;
  work_order_id?: string;
  actor_type?: "facility_manager" | "vendor";
  actor_id?: string;
}

export interface LlmMessageResponse {
  response: string;
  chat_session_id: string;
  work_order_id: string | null;
  tool_calls: Record<string, unknown>[];
}

export function sendLlmMessage(
  payload: SendLlmMessagePayload,
  signal?: AbortSignal,
): Promise<LlmMessageResponse> {
  return apiFetch<LlmMessageResponse>("/api/llm/messages", {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  });
}
