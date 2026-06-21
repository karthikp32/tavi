import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import TaviPage from "../page";
import { deleteChatSession, getChatSessions, updateChatSession } from "@/lib/api/chat";

vi.mock("next/navigation", () => ({
  usePathname: () => "/tavi",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/api/chat", () => ({
  deleteChatSession: vi.fn(),
  getChatSessions: vi.fn(),
  updateChatSession: vi.fn(),
}));

afterEach(() => {
  vi.resetAllMocks();
  cleanup();
  document.cookie = "tavi_session=; path=/; max-age=0";
});

describe("TaviPage", () => {
  it("renders the facility manager chat input as the primary action", () => {
    document.cookie = `tavi_session=${encodeURIComponent(
      JSON.stringify({
        id: "user_fm",
        type: "facility_manager",
        name: "Jane FM",
        trade: null,
        company_id: null,
      }),
    )}; path=/`;
    vi.mocked(getChatSessions).mockResolvedValue([]);

    render(<TaviPage />);

    expect(screen.getByRole("heading", { name: "Tavi" })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        "Describe your work order and Tavi will find matching vendors for your needs",
      ),
    ).toBeInTheDocument();
  });

  it("renders the vendor chat input with vendor-specific copy", () => {
    document.cookie = `tavi_session=${encodeURIComponent(
      JSON.stringify({
        id: "vendor_1",
        type: "vendor",
        name: "Acme HVAC",
        trade: "HVAC",
        company_id: "company_1",
      }),
    )}; path=/`;
    vi.mocked(getChatSessions).mockResolvedValue([]);

    render(<TaviPage />);

    expect(
      screen.getByText(
        "Ask Tavi about marketplace work orders, current lowest bids, and what details are needed before you place a bid.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        "Ask about marketplace work orders, current lowest bids, or help making a bid",
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

    render(<TaviPage />);

    const previousChat = await screen.findByRole("button", { name: "Fix a leaking sink" });
    fireEvent.click(previousChat);

    await waitFor(() => {
      expect(screen.getByText("I can help with that.")).toBeInTheDocument();
    });
  });

  it("uses vendor messages as chat titles", async () => {
    document.cookie = `tavi_session=${encodeURIComponent(
      JSON.stringify({
        id: "vendor_1",
        type: "vendor",
        name: "Acme HVAC",
        trade: "HVAC",
        company_id: "company_1",
      }),
    )}; path=/`;
    vi.mocked(getChatSessions).mockResolvedValue([
      {
        id: "session_1",
        user_id: "vendor_1",
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
            role: "vendor",
            body: "Show HVAC jobs",
            extracted_fields: null,
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
      },
    ]);

    render(<TaviPage />);

    expect(await screen.findByRole("button", { name: "Show HVAC jobs" })).toBeInTheDocument();
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

    render(<TaviPage />);

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

    render(<TaviPage />);

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
