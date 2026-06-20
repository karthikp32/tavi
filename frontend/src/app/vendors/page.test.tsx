import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import VendorSearchPage from "./page";
import { searchVendors } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  searchVendors: vi.fn(),
}));

describe("VendorSearchPage", () => {
  it("renders vendors returned from the initial search", async () => {
    vi.mocked(searchVendors).mockResolvedValue([
      {
        id: "v_1",
        name: "Ace Plumbing",
        trade: "plumbing",
        city: "New York",
        rating: 4.8,
        review_count: 12,
        license_status: "verified",
        insurance_status: "verified",
        quality_score: 0.9,
        price_fit: 80,
        availability_score: 0.7,
        risk_score: 0.1,
      } as never,
    ]);

    render(<VendorSearchPage />);

    await waitFor(() => {
      expect(searchVendors).toHaveBeenCalledWith({});
    });
    expect(screen.getByRole("link", { name: "Ace Plumbing" })).toHaveAttribute("href", "/vendors/v_1");
  });

  it("re-queries with the selected city filter", async () => {
    vi.mocked(searchVendors).mockResolvedValue([]);
    const user = userEvent.setup();
    render(<VendorSearchPage />);

    await waitFor(() => expect(searchVendors).toHaveBeenCalledWith({}));

    await user.selectOptions(screen.getByLabelText("City"), "New York");

    await waitFor(() => {
      expect(searchVendors).toHaveBeenLastCalledWith({ city: "New York" });
    });
  });

  it("shows an empty state when no vendors match", async () => {
    vi.mocked(searchVendors).mockResolvedValue([]);
    render(<VendorSearchPage />);
    await waitFor(() => {
      expect(screen.getByText("No vendors match these filters.")).toBeInTheDocument();
    });
  });
});
