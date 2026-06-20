import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "../AppShell";

describe("AppShell", () => {
  it("renders the main navigation links and children", () => {
    render(
      <AppShell>
        <p>Page content</p>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Work Orders" })).toHaveAttribute(
      "href",
      "/work-orders",
    );
    expect(screen.getByRole("link", { name: "Vendors" })).toHaveAttribute("href", "/vendors");
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });
});
