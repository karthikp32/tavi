"use client";

import { useState } from "react";
import Link from "next/link";
import { sendLlmMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import type { ChatMessage, WorkOrder } from "@/types/models";

const PLACEHOLDER = "Describe your work order and Tavi will finding matching vendors for your needs";

export default function LandingPage() {
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    setInput("");

    try {
      const result = await sendLlmMessage(text, sessionId);
      setSessionId(result.session.id);
      setMessages(result.messages);
      setWorkOrder(result.work_order);
    } catch {
      setError("Something went wrong sending your message. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Tavi</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your command center for trade work orders.
        </p>
      </div>

      <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex max-h-96 flex-col gap-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="text-sm text-slate-400">
              Start by describing the work order you need help with.
            </p>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                message.role === "facility_manager"
                  ? "self-end bg-slate-900 text-white"
                  : "self-start bg-slate-100 text-slate-800"
              }`}
            >
              {message.body}
            </div>
          ))}
          {loading && <p className="text-sm text-slate-400">Tavi is thinking…</p>}
        </div>

        <form
          className="flex items-center gap-2 border-t border-slate-200 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
        >
          <input
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            placeholder={PLACEHOLDER}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            Send
          </Button>
        </form>
      </div>

      {error && (
        <div className="w-full max-w-2xl">
          <ErrorState message={error} />
        </div>
      )}

      {workOrder && (
        <div className="w-full max-w-2xl rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Work order created: <strong>{workOrder.title}</strong>.{" "}
          <Link href={`/work-orders/${workOrder.id}`} className="font-medium underline">
            Open work order review
          </Link>
        </div>
      )}

      <p className="text-sm text-slate-500">
        Prefer a form?{" "}
        <Link href="/work-orders/new" className="underline">
          Create a work order manually
        </Link>
        .
      </p>
    </div>
  );
}
