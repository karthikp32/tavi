import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ChatInput } from "../ChatInput";
import { sendLlmMessage } from "../../../lib/api/llm";

vi.mock("../../../lib/api/llm", () => ({
  sendLlmMessage: vi.fn(),
}));

afterEach(() => {
  vi.resetAllMocks();
  cleanup();
});

describe("ChatInput", () => {
  it("sends a message and renders the assistant response", async () => {
    vi.mocked(sendLlmMessage).mockResolvedValue({
      response: "I can help with that.",
      chat_session_id: "session_1",
      work_order_id: null,
      tool_calls: [],
    });

    render(<ChatInput />);

    fireEvent.change(screen.getByPlaceholderText(/describe your work order/i), {
      target: { value: "Fix a leaking sink" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(screen.getByText("Fix a leaking sink")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("I can help with that.")).toBeInTheDocument();
    });

    expect(sendLlmMessage).toHaveBeenCalledWith(
      {
        message: "Fix a leaking sink",
        chat_session_id: undefined,
        work_order_id: undefined,
      },
      expect.any(AbortSignal),
    );
  });

  it("renders assistant markdown as formatted content", async () => {
    vi.mocked(sendLlmMessage).mockResolvedValue({
      response: [
        "## Draft work orders",
        "",
        "| Title | Facility | Status |",
        "|---|---|---|",
        "| Panel label audit | Chicago Branch | `ready_for_vendor_discovery` |",
        "",
        "- Confirm the scope",
        "- Start vendor discovery",
      ].join("\n"),
      chat_session_id: "session_1",
      work_order_id: null,
      tool_calls: [],
    });

    render(<ChatInput />);

    fireEvent.change(screen.getByPlaceholderText(/describe your work order/i), {
      target: { value: "Show my work orders" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByRole("heading", { name: "Draft work orders" })).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Title" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Panel label audit" })).toBeInTheDocument();
    expect(screen.getByText("ready_for_vendor_discovery").tagName).toBe("CODE");
    expect(screen.getByText("Confirm the scope").tagName).toBe("LI");
  });

  it("renders initial messages from a selected chat session", () => {
    render(
      <ChatInput
        chatSession={{
          id: "session_1",
          user_id: "user_1",
          work_order_id: "wo_1",
          status: "active",
          summary: null,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
          messages: [
            {
              id: "msg_1",
              chat_session_id: "session_1",
              work_order_id: "wo_1",
              role: "facility_manager",
              body: "Fix a leaking sink",
              extracted_fields: null,
              created_at: "2026-01-01T00:00:00Z",
            },
            {
              id: "msg_2",
              chat_session_id: "session_1",
              work_order_id: "wo_1",
              role: "assistant",
              body: "I can help with that.",
              extracted_fields: null,
              created_at: "2026-01-01T00:01:00Z",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Fix a leaking sink")).toBeInTheDocument();
    expect(screen.getByText("I can help with that.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view work order/i })).toHaveAttribute(
      "href",
      "/work-orders/wo_1",
    );
  });

  it("notifies when a new chat session is created", async () => {
    const onSessionChange = vi.fn();
    vi.mocked(sendLlmMessage).mockResolvedValue({
      response: "I can help with that.",
      chat_session_id: "session_1",
      work_order_id: null,
      tool_calls: [],
    });

    render(<ChatInput onSessionChange={onSessionChange} />);

    fireEvent.change(screen.getByPlaceholderText(/describe your work order/i), {
      target: { value: "Fix a leaking sink" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(onSessionChange).toHaveBeenCalledWith("session_1");
    });
  });

  it("renders a link to the created work order when one is returned", async () => {
    vi.mocked(sendLlmMessage).mockResolvedValue({
      response: "Created your work order.",
      chat_session_id: "session_1",
      work_order_id: "wo_1",
      tool_calls: [],
    });

    render(<ChatInput />);

    fireEvent.change(screen.getByPlaceholderText(/describe your work order/i), {
      target: { value: "Fix a leaking sink" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /view work order/i })).toHaveAttribute(
        "href",
        "/work-orders/wo_1",
      );
    });
  });

  it("carries chat_session_id and work_order_id forward to the next message", async () => {
    vi.mocked(sendLlmMessage).mockResolvedValueOnce({
      response: "Created your work order.",
      chat_session_id: "session_1",
      work_order_id: "wo_1",
      tool_calls: [],
    });

    render(<ChatInput />);

    fireEvent.change(screen.getByPlaceholderText(/describe your work order/i), {
      target: { value: "Fix a leaking sink" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText("Created your work order.")).toBeInTheDocument();
    });

    vi.mocked(sendLlmMessage).mockResolvedValueOnce({
      response: "Got it, anything else?",
      chat_session_id: "session_1",
      work_order_id: null,
      tool_calls: [],
    });

    fireEvent.change(screen.getByPlaceholderText(/describe your work order/i), {
      target: { value: "Also check the breaker" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(sendLlmMessage).toHaveBeenLastCalledWith(
        {
          message: "Also check the breaker",
          chat_session_id: "session_1",
          work_order_id: "wo_1",
        },
        expect.any(AbortSignal),
      );
    });
  });

  it("aborts an in-flight message when stop is clicked", async () => {
    let signal: AbortSignal | undefined;
    vi.mocked(sendLlmMessage).mockImplementation((_payload, requestSignal) => {
      signal = requestSignal;
      return new Promise(() => {});
    });

    render(<ChatInput />);

    fireEvent.change(screen.getByPlaceholderText(/describe your work order/i), {
      target: { value: "Fix a leaking sink" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(screen.getByRole("button", { name: /stop/i })).toBeInTheDocument();
    expect(signal?.aborted).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: /stop/i }));

    expect(signal?.aborted).toBe(true);
  });

  it("shows an error state when the request fails", async () => {
    vi.mocked(sendLlmMessage).mockRejectedValue(new Error("network error"));

    render(<ChatInput />);

    fireEvent.change(screen.getByPlaceholderText(/describe your work order/i), {
      target: { value: "Fix a leaking sink" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });
});
