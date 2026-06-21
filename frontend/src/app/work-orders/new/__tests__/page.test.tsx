import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NewWorkOrderPage from "../page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/api/facilities", () => ({
  getFacilities: vi.fn().mockResolvedValue([]),
  createFacility: vi.fn(),
}));

describe("NewWorkOrderPage", () => {
  it("renders the manual work order creation form shell", () => {
    render(<NewWorkOrderPage />);
    expect(screen.getByRole("heading", { name: "New Work Order" })).toBeInTheDocument();
    expect(screen.getByLabelText("Trade")).toBeInTheDocument();
    expect(screen.getByLabelText("Scope of work")).toBeInTheDocument();
  });
});
