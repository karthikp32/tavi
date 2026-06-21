import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { AppShell } from "../AppShell";
import { setSession } from "@/lib/auth";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

beforeEach(() => {
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
    vi.mocked(usePathname).mockReturnValue("/");

    render(
      <AppShell>
        <p>Page content</p>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "Tavi" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Work Orders" })).toHaveAttribute(
      "href",
      "/work-orders",
    );
    expect(screen.getByRole("link", { name: "Vendors" })).toHaveAttribute("href", "/vendors");
    expect(screen.getByText("Page content")).toBeInTheDocument();
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
});
