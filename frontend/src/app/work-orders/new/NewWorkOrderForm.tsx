"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { ErrorState } from "@/components/ui/ErrorState";
import { createWorkOrder } from "@/lib/api/work-orders";
import { createFacility, getFacilities } from "@/lib/api/facilities";
import { DEFAULT_USER_ID } from "@/lib/constants";
import type { Facility, Urgency } from "@/lib/types";

const inputClassName =
  "rounded-md border border-tavi-navy/20 px-3 py-2 text-sm text-tavi-navy focus:border-tavi-indigo focus:outline-none";

const urgencyOptions: Urgency[] = ["low", "normal", "high", "emergency"];

const NEW_FACILITY_VALUE = "__new__";

export function NewWorkOrderForm() {
  const router = useRouter();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityId, setFacilityId] = useState<string>("");
  const [isAddingFacility, setIsAddingFacility] = useState(false);
  const [newFacilityName, setNewFacilityName] = useState("");
  const [newFacilityAddress, setNewFacilityAddress] = useState("");
  const [newFacilityCity, setNewFacilityCity] = useState("");
  const [newFacilityState, setNewFacilityState] = useState("");
  const [newFacilityPostalCode, setNewFacilityPostalCode] = useState("");

  const [trade, setTrade] = useState("");
  const [description, setDescription] = useState("");
  const [requestedStartAt, setRequestedStartAt] = useState("");
  const [urgency, setUrgency] = useState<Urgency | "">("");
  const [targetBudget, setTargetBudget] = useState("");
  const [isAuction, setIsAuction] = useState(false);
  const [maxPrice, setMaxPrice] = useState("");
  const [bidDeadlineAt, setBidDeadlineAt] = useState("");
  const [arrivalWindowStart, setArrivalWindowStart] = useState("");
  const [arrivalWindowEnd, setArrivalWindowEnd] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getFacilities()
      .then(setFacilities)
      .catch(() => setFacilities([]));
  }, []);

  function handleFacilitySelectChange(nextValue: string) {
    setFacilityId(nextValue);
    setIsAddingFacility(nextValue === NEW_FACILITY_VALUE);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!trade.trim()) nextErrors.trade = "Trade is required";
    if (!description.trim()) nextErrors.description = "Scope of work is required";
    if (!requestedStartAt) nextErrors.requestedStartAt = "Requested date and time is required";
    if (isAddingFacility) {
      if (!newFacilityName.trim()) nextErrors.newFacilityName = "Facility name is required";
      if (!newFacilityAddress.trim()) nextErrors.newFacilityAddress = "Facility address is required";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      let resolvedFacilityId: string | null = facilityId || null;
      let resolvedFacilityName: string | null = null;

      if (isAddingFacility) {
        const facility = await createFacility({
          user_id: DEFAULT_USER_ID,
          name: newFacilityName.trim(),
          address: newFacilityAddress.trim(),
          city: newFacilityCity.trim() || null,
          state: newFacilityState.trim() || null,
          postal_code: newFacilityPostalCode.trim() || null,
          latitude: null,
          longitude: null,
        });
        resolvedFacilityId = facility.id;
        resolvedFacilityName = facility.name;
      } else if (facilityId) {
        resolvedFacilityName = facilities.find((facility) => facility.id === facilityId)?.name ?? null;
      }

      const title = resolvedFacilityName ? `${trade.trim()} – ${resolvedFacilityName}` : trade.trim();

      const workOrder = await createWorkOrder({
        user_id: DEFAULT_USER_ID,
        company_id: null,
        facility_id: resolvedFacilityId,
        status: "ready_for_vendor_discovery",
        title,
        description: description.trim(),
        trade: trade.trim(),
        task_type: null,
        requested_start_at: new Date(requestedStartAt).toISOString(),
        target_budget_cents: targetBudget ? Math.round(Number(targetBudget) * 100) : null,
        max_price_cents: maxPrice ? Math.round(Number(maxPrice) * 100) : null,
        bid_deadline_at: bidDeadlineAt ? new Date(bidDeadlineAt).toISOString() : null,
        urgency: urgency || null,
        bidding_mode: isAuction ? "transparent_auction" : "private_negotiation",
        required_arrival_window_start: arrivalWindowStart
          ? new Date(arrivalWindowStart).toISOString()
          : null,
        required_arrival_window_end: arrivalWindowEnd
          ? new Date(arrivalWindowEnd).toISOString()
          : null,
        selected_vendor_id: null,
        accepted_bid_id: null,
        accepted_price_cents: null,
        scheduled_start_at: null,
        confirmation_status: null,
        completed_vendor_quality_score: null,
      });

      router.push(`/work-orders/${workOrder.id}`);
    } catch {
      setSubmitError("Something went wrong creating the work order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex max-w-xl flex-col gap-4" onSubmit={handleSubmit}>
      <FormField label="Trade" htmlFor="trade" error={errors.trade}>
        <input
          id="trade"
          name="trade"
          value={trade}
          onChange={(event) => setTrade(event.target.value)}
          className={inputClassName}
        />
      </FormField>

      <FormField label="Facility" htmlFor="facility_id">
        <select
          id="facility_id"
          name="facility_id"
          value={isAddingFacility ? NEW_FACILITY_VALUE : facilityId}
          onChange={(event) => handleFacilitySelectChange(event.target.value)}
          className={inputClassName}
        >
          <option value="">No facility</option>
          {facilities.map((facility) => (
            <option key={facility.id} value={facility.id}>
              {facility.name}
            </option>
          ))}
          <option value={NEW_FACILITY_VALUE}>Add new facility…</option>
        </select>
      </FormField>

      {isAddingFacility ? (
        <div className="flex flex-col gap-3 rounded-md border border-tavi-navy/10 bg-tavi-pale-blue/30 p-3">
          <FormField label="Facility name" htmlFor="new_facility_name" error={errors.newFacilityName}>
            <input
              id="new_facility_name"
              value={newFacilityName}
              onChange={(event) => setNewFacilityName(event.target.value)}
              className={inputClassName}
            />
          </FormField>
          <FormField label="Address" htmlFor="new_facility_address" error={errors.newFacilityAddress}>
            <input
              id="new_facility_address"
              value={newFacilityAddress}
              onChange={(event) => setNewFacilityAddress(event.target.value)}
              className={inputClassName}
            />
          </FormField>
          <FormField label="City" htmlFor="new_facility_city">
            <input
              id="new_facility_city"
              value={newFacilityCity}
              onChange={(event) => setNewFacilityCity(event.target.value)}
              className={inputClassName}
            />
          </FormField>
          <FormField label="State" htmlFor="new_facility_state">
            <input
              id="new_facility_state"
              value={newFacilityState}
              onChange={(event) => setNewFacilityState(event.target.value)}
              className={inputClassName}
            />
          </FormField>
          <FormField label="Postal code" htmlFor="new_facility_postal_code">
            <input
              id="new_facility_postal_code"
              value={newFacilityPostalCode}
              onChange={(event) => setNewFacilityPostalCode(event.target.value)}
              className={inputClassName}
            />
          </FormField>
        </div>
      ) : null}

      <FormField label="Scope of work" htmlFor="description" error={errors.description}>
        <textarea
          id="description"
          name="description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className={inputClassName}
        />
      </FormField>

      <FormField
        label="Requested date and time"
        htmlFor="requested_start_at"
        error={errors.requestedStartAt}
      >
        <input
          id="requested_start_at"
          name="requested_start_at"
          type="datetime-local"
          value={requestedStartAt}
          onChange={(event) => setRequestedStartAt(event.target.value)}
          className={inputClassName}
        />
      </FormField>

      <FormField label="Urgency" htmlFor="urgency">
        <select
          id="urgency"
          name="urgency"
          value={urgency}
          onChange={(event) => setUrgency(event.target.value as Urgency | "")}
          className={inputClassName}
        >
          <option value="">Select urgency</option>
          {urgencyOptions.map((option) => (
            <option key={option} value={option}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Target budget (USD)" htmlFor="target_budget">
        <input
          id="target_budget"
          name="target_budget"
          type="number"
          min="0"
          step="0.01"
          value={targetBudget}
          onChange={(event) => setTargetBudget(event.target.value)}
          className={inputClassName}
        />
      </FormField>

      <label htmlFor="is_auction" className="flex items-center gap-2 text-sm text-tavi-navy/80">
        <input
          id="is_auction"
          type="checkbox"
          checked={isAuction}
          onChange={(event) => setIsAuction(event.target.checked)}
        />
        Run as a transparent auction
      </label>

      <FormField label="Maximum price (USD)" htmlFor="max_price">
        <input
          id="max_price"
          name="max_price"
          type="number"
          min="0"
          step="0.01"
          value={maxPrice}
          onChange={(event) => setMaxPrice(event.target.value)}
          className={inputClassName}
        />
      </FormField>

      <FormField label="Bid deadline" htmlFor="bid_deadline_at">
        <input
          id="bid_deadline_at"
          name="bid_deadline_at"
          type="datetime-local"
          value={bidDeadlineAt}
          onChange={(event) => setBidDeadlineAt(event.target.value)}
          className={inputClassName}
        />
      </FormField>

      <FormField label="Required arrival window start" htmlFor="arrival_window_start">
        <input
          id="arrival_window_start"
          name="arrival_window_start"
          type="datetime-local"
          value={arrivalWindowStart}
          onChange={(event) => setArrivalWindowStart(event.target.value)}
          className={inputClassName}
        />
      </FormField>

      <FormField label="Required arrival window end" htmlFor="arrival_window_end">
        <input
          id="arrival_window_end"
          name="arrival_window_end"
          type="datetime-local"
          value={arrivalWindowEnd}
          onChange={(event) => setArrivalWindowEnd(event.target.value)}
          className={inputClassName}
        />
      </FormField>

      {submitError ? <ErrorState message={submitError} /> : null}

      <Button type="submit" disabled={isSubmitting}>
        Create Work Order
      </Button>
    </form>
  );
}
