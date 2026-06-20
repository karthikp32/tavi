import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  contactVendor,
  createWorkOrder,
  getWorkOrder,
  listWorkOrders,
  searchVendors,
  sendLlmMessage,
  updateWorkOrder,
} from "./api-client";

function mockFetch(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("api-client", () => {
  it("listWorkOrders calls GET /api/work-orders", async () => {
    global.fetch = mockFetch([{ id: "wo_1" }]);
    const result = await listWorkOrders();
    expect(global.fetch).toHaveBeenCalledWith("/api/work-orders", expect.objectContaining({}));
    expect(result).toEqual([{ id: "wo_1" }]);
  });

  it("getWorkOrder calls GET /api/work-orders/:id", async () => {
    global.fetch = mockFetch({ id: "wo_1" });
    await getWorkOrder("wo_1");
    expect(global.fetch).toHaveBeenCalledWith("/api/work-orders/wo_1", expect.objectContaining({}));
  });

  it("createWorkOrder POSTs the payload as JSON", async () => {
    global.fetch = mockFetch({ id: "wo_2" });
    await createWorkOrder({ title: "Fix sink", description: "leaky", trade: "plumbing" });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/work-orders",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "Fix sink", description: "leaky", trade: "plumbing" }),
      })
    );
  });

  it("updateWorkOrder PATCHes the partial payload", async () => {
    global.fetch = mockFetch({ id: "wo_1", status: "scheduled" });
    await updateWorkOrder("wo_1", { status: "scheduled" });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/work-orders/wo_1",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "scheduled" }) })
    );
  });

  it("searchVendors serializes filters into the query string", async () => {
    global.fetch = mockFetch([]);
    await searchVendors({ city: "New York", min_rating: 4 });
    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("/api/vendors?");
    expect(calledUrl).toContain("city=New+York");
    expect(calledUrl).toContain("min_rating=4");
  });

  it("searchVendors omits undefined filters from the query string", async () => {
    global.fetch = mockFetch([]);
    await searchVendors({});
    expect(global.fetch).toHaveBeenCalledWith("/api/vendors", expect.objectContaining({}));
  });

  it("contactVendor POSTs channel/body plus work_order_id", async () => {
    global.fetch = mockFetch({ candidate: {}, event: {} });
    await contactVendor("v_1", "wo_1", { channel: "email", body: "Hi" });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/vendors/v_1/contact",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ channel: "email", body: "Hi", work_order_id: "wo_1" }),
      })
    );
  });

  it("sendLlmMessage POSTs message and optional session id", async () => {
    global.fetch = mockFetch({ session: {}, messages: [], reply: {}, work_order: null });
    await sendLlmMessage("I need a plumber", "sess_1");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/llm/messages",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ message: "I need a plumber", session_id: "sess_1" }),
      })
    );
  });

  it("throws ApiError with status when the response is not ok", async () => {
    global.fetch = mockFetch({ error: "Not found" }, false, 404);
    await expect(getWorkOrder("missing")).rejects.toMatchObject(
      new ApiError("Not found", 404)
    );
  });
});
