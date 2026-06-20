import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NavBar } from "./NavBar";

describe("NavBar", () => {
  it("links to the dashboard, new work order, and vendors pages", () => {
    render(<NavBar />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/work-orders");
    expect(screen.getByRole("link", { name: "New Work Order" })).toHaveAttribute(
      "href",
      "/work-orders/new"
    );
    expect(screen.getByRole("link", { name: "Vendors" })).toHaveAttribute("href", "/vendors");
  });
});
