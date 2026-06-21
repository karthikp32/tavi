import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import VendorMarketplacePage from "../page";
import { getWorkOrders } from "@/lib/api/work-orders";
import { getWorkOrderBids } from "@/lib/api/bids";
import { ChatInput } from "@/components/chat/ChatInput";

vi.mock("next/navigation", () => ({
  usePathname: () => "/vendor/marketplace",
}));

vi.mock("@/lib/api/work-orders", () => ({
  getWorkOrders: vi.fn(),
}));

vi.mock("@/lib/api/bids", () => ({
  getWorkOrderBids: vi.fn(),
}));

vi.mock("@/components/chat/ChatInput", () => ({
  ChatInput: vi.fn(() => <div data-testid="vendor-chat" />),
}));

afterEach(() => {
  document.cookie = "tavi_session=; path=/; max-age=0";
  vi.clearAllMocks();
  cleanup();
});

describe("VendorMarketplacePage", () => {
  it("renders vendor chat with the authenticated vendor context", async () => {
    document.cookie = `tavi_session=${encodeURIComponent(
      JSON.stringify({
        id: "vendor_1",
        type: "vendor",
        name: "Acme HVAC",
        trade: "HVAC",
        company_id: "company_1",
      }),
    )}; path=/`;
    vi.mocked(getWorkOrders).mockResolvedValue([]);
    vi.mocked(getWorkOrderBids).mockResolvedValue([]);

    render(<VendorMarketplacePage />);

    expect(screen.getByRole("heading", { name: "Tavi Agent" })).toBeInTheDocument();
    expect(screen.getByTestId("vendor-chat")).toBeInTheDocument();
    expect(ChatInput).toHaveBeenCalledWith(
      expect.objectContaining({ actorType: "vendor", actorId: "vendor_1" }),
      undefined,
    );
    await waitFor(() => {
      expect(screen.getByText("No work orders right now")).toBeInTheDocument();
    });
  });
});
