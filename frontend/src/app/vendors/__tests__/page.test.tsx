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
      expect(getVendors).toHaveBeenCalledWith({});
    });

    fireEvent.change(screen.getByLabelText("City"), { target: { value: "New York" } });
    fireEvent.change(screen.getByLabelText("Trade"), { target: { value: "Plumbing" } });

    await waitFor(() => {
      expect(getVendors).toHaveBeenCalledWith({ city: "New York", trade: "Plumbing" });
    });
  });
});
