import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormField } from "../FormField";

describe("FormField", () => {
  it("renders a label associated with its input and an error message", () => {
    render(
      <FormField label="Trade" htmlFor="trade" error="Trade is required">
        <input id="trade" />
      </FormField>,
    );

    expect(screen.getByLabelText("Trade")).toBeInTheDocument();
    expect(screen.getByText("Trade is required")).toBeInTheDocument();
  });
});
