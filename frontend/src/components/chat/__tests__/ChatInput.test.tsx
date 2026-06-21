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

    expect(sendLlmMessage).toHaveBeenCalledWith({
      message: "Fix a leaking sink",
      chat_session_id: undefined,
      work_order_id: undefined,
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
      expect(sendLlmMessage).toHaveBeenLastCalledWith({
        message: "Also check the breaker",
        chat_session_id: "session_1",
        work_order_id: "wo_1",
      });
    });
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
