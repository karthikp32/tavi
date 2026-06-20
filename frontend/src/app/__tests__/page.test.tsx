import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "../page";

describe("HomePage", () => {
  it("renders the chat input as the primary action", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: "Tavi" })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        "Describe your work order and Tavi will finding matching vendors for your needs",
      ),
    ).toBeInTheDocument();
  });
});
