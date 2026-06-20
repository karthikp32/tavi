import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreBadge } from "../ScoreBadge";

describe("ScoreBadge", () => {
  it("renders the label and formatted score", () => {
    render(<ScoreBadge label="Quality" score={0.82} />);
    expect(screen.getByText("Quality")).toBeInTheDocument();
    expect(screen.getByText("0.82")).toBeInTheDocument();
  });

  it("renders a placeholder when score is null", () => {
    render(<ScoreBadge label="Risk" score={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
