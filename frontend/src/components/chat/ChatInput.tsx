"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "../ui/Button";
import { ErrorState } from "../ui/ErrorState";
import { MarkdownMessage } from "./MarkdownMessage";
import { sendLlmMessage } from "../../lib/api/llm";
import type { ChatSession } from "../../lib/types";

interface ConversationMessage {
  role: "user" | "assistant";
  body: string;
}

interface ChatInputProps {
  chatSession?: ChatSession | null;
  onSessionChange?: (chatSessionId: string) => void;
}

function getConversationMessages(chatSession?: ChatSession | null): ConversationMessage[] {
  return (chatSession?.messages ?? [])
    .filter((message) => message.role === "facility_manager" || message.role === "assistant")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      body: message.body,
    }));
}

export function ChatInput({ chatSession, onSessionChange }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>(() =>
    getConversationMessages(chatSession),
  );
  const [chatSessionId, setChatSessionId] = useState<string | undefined>(chatSession?.id);
  const [workOrderId, setWorkOrderId] = useState<string | null>(chatSession?.work_order_id ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = value.trim();
    if (!message || isLoading) return;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setMessages((prev) => [...prev, { role: "user", body: message }]);
    setValue("");
    setIsLoading(true);
    setError(null);

    try {
      const result = await sendLlmMessage({
        message,
        chat_session_id: chatSessionId,
        work_order_id: workOrderId ?? undefined,
      }, abortController.signal);
      const isNewSession = result.chat_session_id !== chatSessionId;
      setChatSessionId(result.chat_session_id);
      if (isNewSession) {
        onSessionChange?.(result.chat_session_id);
      }
      if (result.work_order_id) {
        setWorkOrderId(result.work_order_id);
      }
      setMessages((prev) => [...prev, { role: "assistant", body: result.response }]);
    } catch {
      if (abortController.signal.aborted) {
        return;
      }
      setValue(message);
      setError("Something went wrong sending your message. Please try again.");
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      setIsLoading(false);
    }
  }

  function handleStop() {
    abortControllerRef.current?.abort();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      {messages.length > 0 ? (
        <div className="flex flex-col gap-3 text-left">
          {messages.map((message, index) => (
            <div
              key={index}
              className={
                message.role === "user"
                  ? "self-end rounded-lg bg-tavi-navy px-4 py-2 text-sm text-white"
                  : "self-start rounded-lg bg-tavi-pale-blue/60 px-4 py-2 text-sm text-tavi-navy"
              }
            >
              {message.role === "assistant" ? (
                <MarkdownMessage content={message.body} />
              ) : (
                message.body
              )}
            </div>
          ))}
        </div>
      ) : null}

      {workOrderId ? (
        <p className="text-sm text-tavi-navy/70">
          Work order created:{" "}
          <Link href={`/work-orders/${workOrderId}`} className="font-medium text-tavi-indigo underline">
            View work order
          </Link>
        </p>
      ) : null}

      {isLoading ? <p className="text-sm text-tavi-navy/50">Tavi is thinking…</p> : null}
      {error ? <ErrorState message={error} /> : null}

      <form className="flex w-full flex-col gap-3" onSubmit={handleSubmit}>
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your work order and Tavi will find matching vendors for your needs"
          rows={3}
          className="w-full resize-none rounded-lg border border-tavi-navy/20 px-4 py-3 text-sm text-tavi-navy placeholder:text-tavi-navy/40 focus:border-tavi-indigo focus:outline-none"
        />
        <div className="flex justify-end">
          {isLoading ? (
            <Button
              type="button"
              aria-label="Stop"
              className="h-10 w-10 justify-center rounded-full px-0"
              onClick={handleStop}
            >
              <span aria-hidden="true" className="text-xs leading-none">■</span>
            </Button>
          ) : (
            <Button
              type="submit"
              aria-label="Send"
              disabled={value.trim().length === 0}
              className="h-10 w-10 justify-center rounded-full px-0"
            >
              <span aria-hidden="true" className="text-lg leading-none">↑</span>
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
