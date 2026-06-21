import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import FacilitiesPage from "../page";
import { getFacilities } from "@/lib/api/facilities";
import { getSession } from "@/lib/auth";
import type { Facility } from "@/lib/types";

vi.mock("@/lib/api/facilities", () => ({
  getFacilities: vi.fn(),
}));

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    getSession: vi.fn(),
  };
});

const facilityManagerSession = {
  id: "fm-1",
  type: "facility_manager" as const,
  name: "Jane Manager",
  trade: null,
  company_id: null,
};

const sampleFacility: Facility = {
  id: "facility-1",
  user_id: "fm-1",
  name: "Downtown Office",
  address: "123 Main St",
  city: "New York",
  state: "NY",
  postal_code: "10001",
  latitude: null,
  longitude: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});

describe("FacilitiesPage", () => {
  it("renders the facilities heading and an empty state when no facilities are found", async () => {
    vi.mocked(getSession).mockReturnValue(facilityManagerSession);
    vi.mocked(getFacilities).mockResolvedValue([]);

    render(<FacilitiesPage />);
    expect(screen.getByRole("heading", { name: "Facilities" })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("No facilities found")).toBeInTheDocument();
    });
  });

  it("renders facility rows when facilities are returned", async () => {
    vi.mocked(getSession).mockReturnValue(facilityManagerSession);
    vi.mocked(getFacilities).mockResolvedValue([sampleFacility]);

    render(<FacilitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Downtown Office")).toBeInTheDocument();
    });
    expect(screen.getByText("123 Main St")).toBeInTheDocument();
    expect(screen.getByText("New York")).toBeInTheDocument();
  });

  it("renders nothing for a non-facility-manager session", () => {
    vi.mocked(getSession).mockReturnValue({
      id: "vendor-1",
      type: "vendor",
      name: "Acme Plumbing",
      trade: "Plumbing",
      company_id: null,
    });

    const { container } = render(<FacilitiesPage />);
    expect(container).toBeEmptyDOMElement();
    expect(getFacilities).not.toHaveBeenCalled();
  });
});
