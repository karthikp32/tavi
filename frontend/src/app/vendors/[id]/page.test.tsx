import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import VendorProfilePage from "./page";
import { contactVendor, getVendor, listCandidates, listWorkOrders } from "@/lib/api-client";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "v_1" }),
  useSearchParams: () => new URLSearchParams("workOrderId=wo_1"),
}));

vi.mock("@/lib/api-client", () => ({
  getVendor: vi.fn(),
  listWorkOrders: vi.fn(),
  listCandidates: vi.fn(),
  contactVendor: vi.fn(),
}));

const vendor = {
  id: "v_1",
  name: "Ace Plumbing",
  trade: "plumbing",
  city: "New York",
  phone: "555-1234",
  email: "ace@example.com",
  rating: 4.8,
  review_count: 12,
  license_status: "verified",
  insurance_status: "verified",
  quality_score: 0.9,
  price_fit: 80,
  availability_score: 0.7,
  risk_score: 0.1,
  score_evidence: null,
};

const candidate = {
  id: "cand_1",
  work_order_id: "wo_1",
  vendor_id: "v_1",
  status: "discovered",
  distance_miles: 3,
  quoted_price_cents: 15000,
  last_contacted_at: null,
  next_action: "Send intro email",
};

describe("VendorProfilePage", () => {
  it("renders vendor details and candidate context for the linked work order", async () => {
    vi.mocked(getVendor).mockResolvedValue(vendor as never);
    vi.mocked(listWorkOrders).mockResolvedValue([{ id: "wo_1", title: "Fix the sink" } as never]);
    vi.mocked(listCandidates).mockResolvedValue([candidate as never]);

    render(<VendorProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Ace Plumbing" })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("Send intro email")).toBeInTheDocument();
    });
  });

  it("sends a contact message and shows the logged event", async () => {
    vi.mocked(getVendor).mockResolvedValue(vendor as never);
    vi.mocked(listWorkOrders).mockResolvedValue([{ id: "wo_1", title: "Fix the sink" } as never]);
    vi.mocked(listCandidates).mockResolvedValue([candidate as never]);
    vi.mocked(contactVendor).mockResolvedValue({
      candidate,
      event: { id: "evt_1", body: "Hi there, please confirm your availability." } as never,
    } as never);

    const user = userEvent.setup();
    render(<VendorProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Send intro email")).toBeInTheDocument();
    });

    await user.type(
      screen.getByLabelText("Message"),
      "Hi there, please confirm your availability."
    );
    await user.click(screen.getByRole("button", { name: "Send email" }));

    await waitFor(() => {
      expect(contactVendor).toHaveBeenCalledWith("v_1", "wo_1", {
        channel: "email",
        body: "Hi there, please confirm your availability.",
      });
    });
    expect(
      screen.getByText("Logged: Hi there, please confirm your availability.")
    ).toBeInTheDocument();
  });
});
