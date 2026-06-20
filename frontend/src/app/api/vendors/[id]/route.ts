import type { NextRequest } from "next/server";
import { getVendor, priceFitForVendor } from "@/server/store";
import { jsonError, jsonOk } from "@/server/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const vendor = getVendor(id);
  if (!vendor) return jsonError("Vendor not found", 404);

  const search = request.nextUrl.searchParams;
  const trade = search.get("trade") ?? vendor.trade;
  const taskType = search.get("task_type") ?? undefined;
  const targetBudgetRaw = search.get("target_budget_cents");
  const targetBudgetCents = targetBudgetRaw ? Number(targetBudgetRaw) : undefined;

  const price_fit = priceFitForVendor(vendor.id, trade, taskType, vendor.city, targetBudgetCents);

  return jsonOk({ ...vendor, price_fit });
}
