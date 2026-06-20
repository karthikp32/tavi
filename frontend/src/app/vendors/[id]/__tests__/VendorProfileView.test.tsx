import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { VendorProfileView } from "../VendorProfileView";

describe("VendorProfileView", () => {
  it("renders the vendor id", () => {
    render(<VendorProfileView vendorId="vendor_1" />);
    expect(screen.getByRole("heading", { name: "Vendor vendor_1" })).toBeInTheDocument();
  });
});
