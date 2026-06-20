import { apiFetch } from "./client";
import type { Facility } from "../types";

export type CreateFacilityPayload = Omit<Facility, "id" | "created_at" | "updated_at">;

export function getFacilities(): Promise<Facility[]> {
  return apiFetch<Facility[]>("/api/facilities");
}

export function createFacility(payload: CreateFacilityPayload): Promise<Facility> {
  return apiFetch<Facility>("/api/facilities", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
