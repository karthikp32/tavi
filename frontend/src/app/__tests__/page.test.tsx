import { describe, expect, it, vi } from "vitest";
import HomePage from "../page";
import { redirect } from "next/navigation";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("HomePage", () => {
  it("redirects to the shared Tavi agent route", () => {
    HomePage();

    expect(redirect).toHaveBeenCalledWith("/tavi");
  });
});
