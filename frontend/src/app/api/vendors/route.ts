import type { NextRequest } from "next/server";
import { priceFitForVendor, searchVendors, type VendorSearchFilters } from "@/server/store";
import { jsonOk } from "@/server/http";

function numberParam(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const filters: VendorSearchFilters = {
    city: params.get("city") ?? undefined,
    trade: params.get("trade") ?? undefined,
    minRating: numberParam(params, "min_rating"),
    minReviewCount: numberParam(params, "min_review_count"),
    licenseStatus: params.get("license_status") ?? undefined,
    insuranceStatus: params.get("insurance_status") ?? undefined,
    minQualityScore: numberParam(params, "min_quality_score"),
    minAvailabilityScore: numberParam(params, "min_availability_score"),
    maxRiskScore: numberParam(params, "max_risk_score"),
    maxDistanceMiles: numberParam(params, "max_distance_miles"),
    taskType: params.get("task_type") ?? undefined,
  };

  const targetBudgetCents = numberParam(params, "target_budget_cents");
  const minPriceFit = numberParam(params, "min_price_fit");

  const vendors = searchVendors(filters);

  const withPriceFit = vendors.map((vendor) => ({
    ...vendor,
    price_fit:
      filters.trade && vendor.city
        ? priceFitForVendor(vendor.id, filters.trade, filters.taskType, vendor.city, targetBudgetCents)
        : null,
  }));

  const result =
    minPriceFit != null
      ? withPriceFit.filter((v) => v.price_fit != null && v.price_fit >= minPriceFit)
      : withPriceFit;

  return jsonOk(result);
}
