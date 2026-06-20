import { apiFetch } from "./client";
import type { ChatMessage, ChatSession } from "../types";

export interface CreateChatSessionPayload {
  user_id: string;
  work_order_id?: string;
}

export interface CreateChatMessagePayload {
  role: ChatMessage["role"];
  body: string;
}

export function createChatSession(payload: CreateChatSessionPayload): Promise<ChatSession> {
  return apiFetch<ChatSession>("/api/chat-sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getChatSession(id: string): Promise<ChatSession> {
  return apiFetch<ChatSession>(`/api/chat-sessions/${id}`);
}

export function createChatMessage(
  sessionId: string,
  payload: CreateChatMessagePayload,
): Promise<ChatMessage> {
  return apiFetch<ChatMessage>(`/api/chat-sessions/${sessionId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
