import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import VendorMarketplacePage from "../page";
import { getWorkOrders } from "@/lib/api/work-orders";
import { getWorkOrderBids } from "@/lib/api/bids";

vi.mock("next/navigation", () => ({
  usePathname: () => "/vendor/marketplace",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/api/work-orders", () => ({
  getWorkOrders: vi.fn(),
}));

vi.mock("@/lib/api/bids", () => ({
  getWorkOrderBids: vi.fn(),
}));

afterEach(() => {
  document.cookie = "tavi_session=; path=/; max-age=0";
  vi.clearAllMocks();
  cleanup();
});

describe("VendorMarketplacePage", () => {
  it("renders marketplace work orders without embedding the Tavi chat", async () => {
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

    expect(screen.getByRole("heading", { name: "Marketplace" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tavi Agent" })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("No work orders right now")).toBeInTheDocument();
    });
  });
});
