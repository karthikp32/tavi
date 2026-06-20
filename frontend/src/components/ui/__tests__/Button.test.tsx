import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../Button";

describe("Button", () => {
  it("renders an icon, label, and trailing icon and handles click", () => {
    const onClick = vi.fn();
    render(
      <Button icon={<span data-testid="icon" />} trailingIcon={<span data-testid="trailing" />} onClick={onClick}>
        Send
      </Button>,
    );

    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByTestId("trailing")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
