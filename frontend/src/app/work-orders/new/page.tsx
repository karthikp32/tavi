"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWorkOrder, type CreateWorkOrderPayload } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { CheckboxField, SelectField, TextareaField, TextField } from "@/components/ui/FormFields";
import { ErrorState } from "@/components/ui/States";

const TRADE_OPTIONS = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC" },
  { value: "lawncare", label: "Lawncare" },
  { value: "cleaning", label: "Cleaning" },
  { value: "general_maintenance", label: "General Maintenance" },
];

const URGENCY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "emergency", label: "Emergency" },
];

export default function NewWorkOrderPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auctionEnabled, setAuctionEnabled] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const trade = String(form.get("trade") ?? "");
    const address = String(form.get("address") ?? "").trim();

    if (!title || !description || !trade) {
      setError("Trade, scope of work, and a title are required.");
      return;
    }

    const targetBudgetRaw = form.get("target_budget") as string;
    const maxPriceRaw = form.get("max_price") as string;

    const payload: CreateWorkOrderPayload = {
      title,
      description: address ? `${description}\n\nService address: ${address}` : description,
      trade,
      urgency: (form.get("urgency") as CreateWorkOrderPayload["urgency"]) ?? "normal",
      requested_start_at: (form.get("requested_start_at") as string) || undefined,
      target_budget_cents: targetBudgetRaw ? Math.round(Number(targetBudgetRaw) * 100) : undefined,
      access_instructions: (form.get("access_instructions") as string) || undefined,
      license_required: form.get("license_required") === "on",
      insurance_required: form.get("insurance_required") === "on",
    };

    if (auctionEnabled) {
      payload.bidding_mode = "transparent_auction";
      payload.max_price_cents = maxPriceRaw ? Math.round(Number(maxPriceRaw) * 100) : undefined;
      payload.bid_deadline_at = (form.get("bid_deadline_at") as string) || undefined;
      payload.arrival_window_start = (form.get("arrival_window_start") as string) || undefined;
      payload.arrival_window_end = (form.get("arrival_window_end") as string) || undefined;
      payload.qualification_criteria = (form.get("qualification_criteria") as string) || undefined;
    }

    setSubmitting(true);
    try {
      const workOrder = await createWorkOrder(payload);
      router.push(`/work-orders/${workOrder.id}`);
    } catch {
      setError("Could not create the work order. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">New Work Order</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Card>
          <CardHeader title="Work details" />
          <div className="flex flex-col gap-3">
            <TextField label="Title" name="title" required placeholder="e.g. Leaking pipe under kitchen sink" />
            <SelectField label="Trade" name="trade" required options={TRADE_OPTIONS} defaultValue="plumbing" />
            <TextField label="Facility / service address" name="address" placeholder="123 Main St, New York, NY" />
            <TextareaField label="Scope of work" name="description" required placeholder="Describe the issue and what needs to be done" />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Requested date/time" name="requested_start_at" type="datetime-local" />
              <SelectField label="Urgency" name="urgency" options={URGENCY_OPTIONS} defaultValue="normal" />
            </div>
            <TextField label="Target budget (USD)" name="target_budget" type="number" min="0" step="1" placeholder="250" />
            <TextareaField label="Access instructions" name="access_instructions" placeholder="Gate code, check-in desk, etc." />
            <div className="flex gap-6">
              <CheckboxField label="License required" name="license_required" />
              <CheckboxField label="Insurance required" name="insurance_required" />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Auction"
            action={
              <CheckboxField
                label="Create an auction"
                checked={auctionEnabled}
                onChange={(e) => setAuctionEnabled(e.target.checked)}
              />
            }
          />
          {auctionEnabled ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Maximum price (USD)" name="max_price" type="number" min="0" step="1" />
                <TextField label="Bid deadline" name="bid_deadline_at" type="datetime-local" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Arrival window start" name="arrival_window_start" type="datetime-local" />
                <TextField label="Arrival window end" name="arrival_window_end" type="datetime-local" />
              </div>
              <TextareaField
                label="Required qualification criteria"
                name="qualification_criteria"
                placeholder="e.g. Must be licensed and insured, 3+ years experience"
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Toggle on to run a transparent auction with a price cap and bid deadline.
            </p>
          )}
        </Card>

        {error && <ErrorState message={error} />}

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create work order"}
          </Button>
        </div>
      </form>
    </div>
  );
}
