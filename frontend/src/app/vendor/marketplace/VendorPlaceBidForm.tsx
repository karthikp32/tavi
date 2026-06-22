"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { FormField } from "@/components/ui/FormField";
import { formInputClassName } from "@/components/ui/styles";
import { createWorkOrderCandidate } from "@/lib/api/candidates";
import { createWorkOrderBid } from "@/lib/api/bids";
import { validateArrivalWindow } from "@/lib/validation";

interface VendorPlaceBidFormProps {
  workOrderId: string;
  vendorId: string;
  onSuccess: () => void;
}

export function VendorPlaceBidForm({ workOrderId, vendorId, onSuccess }: VendorPlaceBidFormProps) {
  const [amount, setAmount] = useState("");
  const [arrivalWindowStart, setArrivalWindowStart] = useState("");
  const [arrivalWindowEnd, setArrivalWindowEnd] = useState("");
  const [scopeNotes, setScopeNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      nextErrors.amount = "Bid amount is required";
    }
    const arrivalWindowError = validateArrivalWindow(arrivalWindowStart, arrivalWindowEnd);
    if (arrivalWindowError) {
      nextErrors.arrivalWindowEnd = arrivalWindowError;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const candidate = await createWorkOrderCandidate(workOrderId, vendorId);
      await createWorkOrderBid(workOrderId, {
        work_order_candidate_id: candidate.id,
        amount_cents: Math.round(Number(amount) * 100),
        arrival_window_start: arrivalWindowStart ? new Date(arrivalWindowStart).toISOString() : null,
        arrival_window_end: arrivalWindowEnd ? new Date(arrivalWindowEnd).toISOString() : null,
        scope_notes: scopeNotes.trim() || null,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      });
      onSuccess();
    } catch {
      setSubmitError("Something went wrong submitting your bid. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex max-w-xl flex-col gap-4" onSubmit={handleSubmit}>
      <FormField label="Bid amount (USD)" htmlFor="amount" error={errors.amount}>
        <input
          id="amount"
          name="amount"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className={formInputClassName}
        />
      </FormField>

      <FormField label="Arrival window start" htmlFor="arrival_window_start">
        <input
          id="arrival_window_start"
          name="arrival_window_start"
          type="datetime-local"
          value={arrivalWindowStart}
          onChange={(event) => setArrivalWindowStart(event.target.value)}
          className={formInputClassName}
        />
      </FormField>

      <FormField
        label="Arrival window end"
        htmlFor="arrival_window_end"
        error={errors.arrivalWindowEnd}
      >
        <input
          id="arrival_window_end"
          name="arrival_window_end"
          type="datetime-local"
          value={arrivalWindowEnd}
          onChange={(event) => setArrivalWindowEnd(event.target.value)}
          className={formInputClassName}
        />
      </FormField>

      <FormField label="Scope notes" htmlFor="scope_notes">
        <textarea
          id="scope_notes"
          name="scope_notes"
          rows={3}
          value={scopeNotes}
          onChange={(event) => setScopeNotes(event.target.value)}
          className={formInputClassName}
        />
      </FormField>

      {submitError ? <ErrorState message={submitError} /> : null}

      <Button type="submit" disabled={isSubmitting}>
        Submit Bid
      </Button>
    </form>
  );
}
