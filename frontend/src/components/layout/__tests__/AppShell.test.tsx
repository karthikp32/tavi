import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "../AppShell";
import { getSession, setSession } from "@/lib/auth";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

const replaceMock = vi.fn();

beforeEach(() => {
  replaceMock.mockReset();
  vi.mocked(useRouter).mockReturnValue({ replace: replaceMock });
  setSession({
    id: "user_fm",
    type: "facility_manager",
    name: "Jane FM",
    trade: null,
    company_id: null,
  });
});

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
  document.cookie = "tavi_session=; path=/; max-age=0";
});

describe("AppShell", () => {
  it("renders the main navigation links and children", () => {
    vi.mocked(usePathname).mockReturnValue("/tavi");

    render(
      <AppShell>
        <p>Page content</p>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "Tavi" })).toHaveAttribute("href", "/tavi");
    expect(screen.getAllByRole("link", { name: "Tavi" })).toHaveLength(1);
    expect(screen.getAllByText("Tavi")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Work Orders" })).toHaveAttribute(
      "href",
      "/work-orders",
    );
    expect(screen.getByRole("link", { name: "Vendors" })).toHaveAttribute("href", "/vendors");
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });

  it("renders separate vendor navigation links for Tavi and Marketplace", () => {
    document.cookie = "tavi_session=; path=/; max-age=0";
    setSession({
      id: "vendor_1",
      type: "vendor",
      name: "Acme HVAC",
      trade: "HVAC",
      company_id: "company_1",
    });
    vi.mocked(usePathname).mockReturnValue("/vendor/marketplace");

    render(
      <AppShell>
        <p>Page content</p>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "Tavi" })).toHaveAttribute("href", "/tavi");
    expect(screen.getAllByRole("link", { name: "Tavi" })).toHaveLength(1);
    expect(screen.getAllByText("Tavi")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Marketplace" })).toHaveAttribute(
      "href",
      "/vendor/marketplace",
    );
    expect(screen.getByRole("link", { name: "Marketplace" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("highlights the nav link matching the current path", () => {
    vi.mocked(usePathname).mockReturnValue("/work-orders/wo_1");

    render(
      <AppShell>
        <p>Page content</p>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "Work Orders" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Vendors" })).not.toHaveAttribute("aria-current");
  });

  it("clears the session and navigates to login on logout", () => {
    vi.mocked(usePathname).mockReturnValue("/tavi");

    render(
      <AppShell>
        <p>Page content</p>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(getSession()).toBeNull();
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });
});
