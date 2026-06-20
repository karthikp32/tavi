import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NewWorkOrderForm } from "../NewWorkOrderForm";
import { createWorkOrder } from "@/lib/api/work-orders";
import { getFacilities } from "@/lib/api/facilities";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/api/work-orders", () => ({
  createWorkOrder: vi.fn(),
}));

vi.mock("@/lib/api/facilities", () => ({
  getFacilities: vi.fn(),
  createFacility: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});

describe("NewWorkOrderForm", () => {
  it("blocks submit and shows errors when required fields are missing", async () => {
    vi.mocked(getFacilities).mockResolvedValue([]);

    render(<NewWorkOrderForm />);

    fireEvent.click(screen.getByRole("button", { name: /create work order/i }));

    expect(await screen.findByText("Trade is required")).toBeInTheDocument();
    expect(screen.getByText("Scope of work is required")).toBeInTheDocument();
    expect(screen.getByText("Requested date and time is required")).toBeInTheDocument();
    expect(createWorkOrder).not.toHaveBeenCalled();
  });

  it("submits the form with the correct payload and navigates to the new work order", async () => {
    vi.mocked(getFacilities).mockResolvedValue([]);
    vi.mocked(createWorkOrder).mockResolvedValue({
      id: "wo_1",
    } as Awaited<ReturnType<typeof createWorkOrder>>);

    render(<NewWorkOrderForm />);

    fireEvent.change(screen.getByLabelText("Trade"), { target: { value: "Plumbing" } });
    fireEvent.change(screen.getByLabelText("Scope of work"), {
      target: { value: "Fix leaking sink" },
    });
    fireEvent.change(screen.getByLabelText("Requested date and time"), {
      target: { value: "2026-07-01T10:00" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create work order/i }));

    await waitFor(() => {
      expect(createWorkOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "f3089d70-d4cf-4ca6-bdfd-7c22718e2036",
          trade: "Plumbing",
          description: "Fix leaking sink",
          title: "Plumbing",
          bidding_mode: "private_negotiation",
        }),
      );
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/work-orders/wo_1");
    });
  });
});
