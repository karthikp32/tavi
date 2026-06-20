import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import NewWorkOrderPage from "./page";
import { createWorkOrder } from "@/lib/api-client";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/api-client", () => ({
  createWorkOrder: vi.fn(),
}));

describe("NewWorkOrderPage", () => {
  it("submits the form with required fields and redirects to the new work order", async () => {
    vi.mocked(createWorkOrder).mockResolvedValue({ id: "wo_9" } as never);
    const user = userEvent.setup();
    render(<NewWorkOrderPage />);

    await user.type(screen.getByLabelText(/^Title/), "Leaking pipe");
    await user.type(screen.getByLabelText(/^Scope of work/), "Pipe under the sink is leaking.");
    await user.click(screen.getByRole("button", { name: "Create work order" }));

    await waitFor(() => {
      expect(createWorkOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Leaking pipe",
          description: "Pipe under the sink is leaking.",
          trade: "plumbing",
        })
      );
    });
    expect(push).toHaveBeenCalledWith("/work-orders/wo_9");
  });

  it("includes auction fields only when the auction toggle is enabled", async () => {
    vi.mocked(createWorkOrder).mockResolvedValue({ id: "wo_10" } as never);
    const user = userEvent.setup();
    render(<NewWorkOrderPage />);

    await user.type(screen.getByLabelText(/^Title/), "Mow the lawn");
    await user.type(screen.getByLabelText(/^Scope of work/), "Weekly lawn mowing.");
    await user.click(screen.getByLabelText("Create an auction"));
    await user.type(screen.getByLabelText(/^Maximum price/), "500");
    await user.click(screen.getByRole("button", { name: "Create work order" }));

    await waitFor(() => {
      expect(createWorkOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          bidding_mode: "transparent_auction",
          max_price_cents: 50000,
        })
      );
    });
  });

  it("shows an error state when creation fails", async () => {
    vi.mocked(createWorkOrder).mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<NewWorkOrderPage />);

    await user.type(screen.getByLabelText(/^Title/), "Leaking pipe");
    await user.type(screen.getByLabelText(/^Scope of work/), "Pipe under the sink is leaking.");
    await user.click(screen.getByRole("button", { name: "Create work order" }));

    await waitFor(() => {
      expect(screen.getByText("Could not create the work order. Please try again.")).toBeInTheDocument();
    });
  });
});
