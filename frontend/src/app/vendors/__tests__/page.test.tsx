import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import VendorsPage from "../page";

describe("VendorsPage", () => {
  it("renders the vendor search shell", () => {
    render(<VendorsPage />);
    expect(screen.getByRole("heading", { name: "Vendors" })).toBeInTheDocument();
  });
});
