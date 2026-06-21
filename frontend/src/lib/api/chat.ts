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

export interface UpdateChatSessionPayload {
  summary: string;
}

export function createChatSession(payload: CreateChatSessionPayload): Promise<ChatSession> {
  return apiFetch<ChatSession>("/api/chat-sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getChatSessions(): Promise<ChatSession[]> {
  return apiFetch<ChatSession[]>("/api/chat-sessions");
}

export function getChatSession(id: string): Promise<ChatSession> {
  return apiFetch<ChatSession>(`/api/chat-sessions/${id}`);
}

export function deleteChatSession(id: string): Promise<void> {
  return apiFetch<void>(`/api/chat-sessions/${id}`, {
    method: "DELETE",
  });
}

export function updateChatSession(
  id: string,
  payload: UpdateChatSessionPayload,
): Promise<ChatSession> {
  return apiFetch<ChatSession>(`/api/chat-sessions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
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
