import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import LandingPage from "./page";
import { sendLlmMessage } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  sendLlmMessage: vi.fn(),
}));

describe("LandingPage", () => {
  it("renders the chatbot placeholder text", () => {
    render(<LandingPage />);
    expect(
      screen.getByPlaceholderText(
        "Describe your work order and Tavi will finding matching vendors for your needs"
      )
    ).toBeInTheDocument();
  });

  it("sends a message and renders the assistant reply plus work order link", async () => {
    vi.mocked(sendLlmMessage).mockResolvedValue({
      session: { id: "sess_1" } as never,
      messages: [
        { id: "m1", role: "facility_manager", body: "I need a plumber" } as never,
        { id: "m2", role: "assistant", body: "Got it, creating a work order." } as never,
      ],
      reply: { id: "m2", role: "assistant", body: "Got it, creating a work order." } as never,
      work_order: { id: "wo_1", title: "Fix the leaky sink" } as never,
    });

    const user = userEvent.setup();
    render(<LandingPage />);

    const input = screen.getByPlaceholderText(
      "Describe your work order and Tavi will finding matching vendors for your needs"
    );
    await user.type(input, "I need a plumber");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(screen.getByText("Got it, creating a work order.")).toBeInTheDocument();
    });
    expect(screen.getByText(/Work order created/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open work order review" })).toHaveAttribute(
      "href",
      "/work-orders/wo_1"
    );
  });

  it("shows an error state when the request fails", async () => {
    vi.mocked(sendLlmMessage).mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<LandingPage />);

    const input = screen.getByPlaceholderText(
      "Describe your work order and Tavi will finding matching vendors for your needs"
    );
    await user.type(input, "hello");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(
        screen.getByText("Something went wrong sending your message. Please try again.")
      ).toBeInTheDocument();
    });
  });
});
