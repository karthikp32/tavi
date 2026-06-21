"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "../ui/Button";
import { ErrorState } from "../ui/ErrorState";
import { sendLlmMessage } from "../../lib/api/llm";

interface ConversationMessage {
  role: "user" | "assistant";
  body: string;
}

export function ChatInput() {
  const [value, setValue] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [chatSessionId, setChatSessionId] = useState<string | undefined>(undefined);
  const [workOrderId, setWorkOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = value.trim();
    if (!message || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", body: message }]);
    setValue("");
    setIsLoading(true);
    setError(null);

    try {
      const result = await sendLlmMessage({
        message,
        chat_session_id: chatSessionId,
        work_order_id: workOrderId ?? undefined,
      });
      setChatSessionId(result.chat_session_id);
      if (result.work_order_id) {
        setWorkOrderId(result.work_order_id);
      }
      setMessages((prev) => [...prev, { role: "assistant", body: result.response }]);
    } catch {
      setValue(message);
      setError("Something went wrong sending your message. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
              {message.body}
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
          <Button type="submit" disabled={value.trim().length === 0 || isLoading}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
