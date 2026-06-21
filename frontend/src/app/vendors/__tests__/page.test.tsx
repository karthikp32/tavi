import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import VendorsPage from "../page";
import { getVendors } from "@/lib/api/vendors";

vi.mock("@/lib/api/vendors", () => ({
  getVendors: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});

describe("VendorsPage", () => {
  it("renders the vendor search shell and an empty state when no vendors are found", async () => {
    vi.mocked(getVendors).mockResolvedValue([]);

    render(<VendorsPage />);
    expect(screen.getByRole("heading", { name: "Vendors" })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("No vendors found")).toBeInTheDocument();
    });
  });

  it("issues getVendors with the correct query when filters change", async () => {
    vi.mocked(getVendors).mockResolvedValue([]);

    render(<VendorsPage />);

    await waitFor(() => {
      expect(getVendors).toHaveBeenCalledWith({ rating: 4 });
    });

    fireEvent.change(screen.getByLabelText("City"), { target: { value: "New York" } });
    fireEvent.change(screen.getByLabelText("Trade"), { target: { value: "Plumbing" } });

    await waitFor(() => {
      expect(getVendors).toHaveBeenCalledWith({ city: "New York", trade: "Plumbing", rating: 4 });
    });
  });

  it("paginates vendor rows", async () => {
    vi.mocked(getVendors).mockResolvedValue(
      Array.from({ length: 12 }, (_, index) => ({
        id: `vendor-${index + 1}`,
        company_id: null,
        name: `Vendor ${index + 1}`,
        trade: "Plumbing",
        phone: null,
        email: null,
        address: null,
        city: "New York",
        latitude: null,
        longitude: null,
        rating: 4.8,
        review_count: 10,
        license_status: "verified",
        insurance_status: "verified",
        quality_score: 0.8,
        availability_score: 0.7,
        risk_score: 0.1,
        score_evidence: null,
        created_at: "2026-01-01T00:00:00",
        updated_at: "2026-01-01T00:00:00",
      })),
    );

    render(<VendorsPage />);

    expect(await screen.findByText("Vendor 1")).toBeInTheDocument();
    expect(screen.queryByText("Vendor 12")).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1-8 of 12")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Vendor 12")).toBeInTheDocument();
    expect(screen.getByText("Showing 9-12 of 12")).toBeInTheDocument();
  });
});
