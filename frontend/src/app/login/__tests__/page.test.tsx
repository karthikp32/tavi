import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginPage from "../page";
import { login } from "@/lib/api/auth";
import { getSession } from "@/lib/auth";

vi.mock("@/lib/api/auth", () => ({
  login: vi.fn(),
}));

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
  document.cookie = "tavi_session=; path=/; max-age=0";
});

describe("LoginPage", () => {
  it("stores the canonical login token returned for vendor-name login", async () => {
    vi.mocked(login).mockResolvedValue({
      id: "vendor_1",
      type: "vendor",
      name: "Acme HVAC",
      trade: "HVAC",
      company_id: "company_1",
      login_token: "hvac-tech-1",
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Login token or vendor company name"), {
      target: { value: "Acme HVAC" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/tavi");
    });

    expect(login).toHaveBeenCalledWith("Acme HVAC");
    expect(getSession()).toMatchObject({
      id: "vendor_1",
      type: "vendor",
      login_token: "hvac-tech-1",
    });
  });
});
