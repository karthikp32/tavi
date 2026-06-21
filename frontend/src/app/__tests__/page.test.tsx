import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import HomePage from "../page";
import { deleteChatSession, getChatSessions, updateChatSession } from "@/lib/api/chat";

vi.mock("@/lib/api/chat", () => ({
  deleteChatSession: vi.fn(),
  getChatSessions: vi.fn(),
  updateChatSession: vi.fn(),
}));

afterEach(() => {
  vi.resetAllMocks();
  cleanup();
});

describe("HomePage", () => {
  it("renders the chat input as the primary action", () => {
    vi.mocked(getChatSessions).mockResolvedValue([]);

    render(<HomePage />);
    expect(screen.getByRole("heading", { name: "Tavi" })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        "Describe your work order and Tavi will find matching vendors for your needs",
      ),
    ).toBeInTheDocument();
  });

  it("shows prior chats and loads the selected chat history", async () => {
    vi.mocked(getChatSessions).mockResolvedValue([
      {
        id: "session_1",
        user_id: "user_1",
        work_order_id: null,
        status: "active",
        summary: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        messages: [
          {
            id: "msg_1",
            chat_session_id: "session_1",
            work_order_id: null,
            role: "facility_manager",
            body: "Fix a leaking sink",
            extracted_fields: null,
            created_at: "2026-01-01T00:00:00Z",
          },
          {
            id: "msg_2",
            chat_session_id: "session_1",
            work_order_id: null,
            role: "assistant",
            body: "I can help with that.",
            extracted_fields: null,
            created_at: "2026-01-01T00:01:00Z",
          },
        ],
      },
    ]);

    render(<HomePage />);

    const previousChat = await screen.findByRole("button", { name: "Fix a leaking sink" });
    fireEvent.click(previousChat);

    await waitFor(() => {
      expect(screen.getByText("I can help with that.")).toBeInTheDocument();
    });
  });

  it("deletes a previous chat from the sidebar", async () => {
    vi.mocked(getChatSessions).mockResolvedValue([
      {
        id: "session_1",
        user_id: "user_1",
        work_order_id: null,
        status: "active",
        summary: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        messages: [
          {
            id: "msg_1",
            chat_session_id: "session_1",
            work_order_id: null,
            role: "facility_manager",
            body: "Fix a leaking sink",
            extracted_fields: null,
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
      },
    ]);
    vi.mocked(deleteChatSession).mockResolvedValue();

    render(<HomePage />);

    expect(await screen.findByRole("button", { name: "Fix a leaking sink" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete Fix a leaking sink" }));

    await waitFor(() => {
      expect(deleteChatSession).toHaveBeenCalledWith("session_1");
      expect(screen.queryByRole("button", { name: "Fix a leaking sink" })).not.toBeInTheDocument();
    });
  });

  it("renames a previous chat in the sidebar", async () => {
    const renamedSession = {
      id: "session_1",
      user_id: "user_1",
      work_order_id: null,
      status: "active" as const,
      summary: "Leaking sink",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      messages: [
        {
          id: "msg_1",
          chat_session_id: "session_1",
          work_order_id: null,
          role: "facility_manager" as const,
          body: "Fix a leaking sink",
          extracted_fields: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    };
    vi.mocked(getChatSessions).mockResolvedValue([{ ...renamedSession, summary: null }]);
    vi.mocked(updateChatSession).mockResolvedValue(renamedSession);
    const promptSpy = vi.spyOn(window, "prompt");

    render(<HomePage />);

    expect(await screen.findByRole("button", { name: "Fix a leaking sink" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Chat options for Fix a leaking sink" }));
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    const editInput = screen.getByRole("textbox", { name: "Rename chat" });
    fireEvent.change(editInput, { target: { value: "Leaking sink" } });
    fireEvent.keyDown(editInput, { key: "Enter" });

    await waitFor(() => {
      expect(promptSpy).not.toHaveBeenCalled();
      expect(updateChatSession).toHaveBeenCalledWith("session_1", { summary: "Leaking sink" });
      expect(screen.getByRole("button", { name: "Leaking sink" })).toBeInTheDocument();
    });
  });
});
