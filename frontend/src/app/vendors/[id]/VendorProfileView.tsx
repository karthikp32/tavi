"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { getVendor, contactVendor } from "@/lib/api/vendors";
import { getWorkOrderCandidates, contactWorkOrderCandidate } from "@/lib/api/candidates";
import { createWorkOrder, getWorkOrders } from "@/lib/api/work-orders";
import { DEFAULT_USER_ID } from "@/lib/constants";
import type { CommunicationEvent, Vendor, WorkOrder, WorkOrderCandidate } from "@/lib/types";

interface VendorProfileViewProps {
  vendorId: string;
  initialWorkOrderId?: string;
}

const selectClassName =
  "rounded-md border border-tavi-navy/20 px-3 py-2 text-sm text-tavi-navy focus:border-tavi-indigo focus:outline-none";

const NEW_WORK_ORDER_VALUE = "__new__";

export function VendorProfileView({ vendorId, initialWorkOrderId }: VendorProfileViewProps) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>(
    initialWorkOrderId ?? NEW_WORK_ORDER_VALUE,
  );
  const [candidates, setCandidates] = useState<WorkOrderCandidate[]>([]);

  const [messageBody, setMessageBody] = useState("");
  const [contactError, setContactError] = useState<string | null>(null);
  const [isContacting, setIsContacting] = useState(false);
  const [lastEvent, setLastEvent] = useState<CommunicationEvent | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    getVendor(vendorId)
      .then(setVendor)
      .catch(() => setError("Could not load this vendor."))
      .finally(() => setIsLoading(false));
  }, [vendorId]);

  useEffect(() => {
    getWorkOrders({ vendor_id: vendorId })
      .then(setWorkOrders)
      .catch(() => setWorkOrders([]));
  }, [vendorId]);

  useEffect(() => {
    if (!selectedWorkOrderId || selectedWorkOrderId === NEW_WORK_ORDER_VALUE) {
      setCandidates([]);
      return;
    }
    let isCancelled = false;
    getWorkOrderCandidates(selectedWorkOrderId)
      .then((result) => {
        if (!isCancelled) setCandidates(result);
      })
      .catch(() => {
        if (!isCancelled) setCandidates([]);
      });
    return () => {
      isCancelled = true;
    };
  }, [selectedWorkOrderId]);

  const candidate = useMemo(
    () => candidates.find((item) => item.vendor_id === vendorId) ?? null,
    [candidates, vendorId],
  );

  async function handleContact(channel: "email" | "sms" | "phone") {
    if (!vendor) return;
    if (!messageBody.trim()) {
      setContactError("Type a message before sending.");
      return;
    }
    setContactError(null);
    setIsContacting(true);
    try {
      const body = messageBody.trim();
      let workOrderId = selectedWorkOrderId;

      if (workOrderId === NEW_WORK_ORDER_VALUE) {
        const newWorkOrder = await createWorkOrder({
          user_id: DEFAULT_USER_ID,
          company_id: null,
          facility_id: null,
          status: "ready_for_vendor_discovery",
          title: `${vendor.trade} – ${vendor.name}`,
          description: body,
          trade: vendor.trade,
          task_type: null,
          requested_start_at: new Date().toISOString(),
          target_budget_cents: null,
          max_price_cents: null,
          bid_deadline_at: null,
          urgency: null,
          bidding_mode: null,
          required_arrival_window_start: null,
          required_arrival_window_end: null,
          selected_vendor_id: null,
          accepted_bid_id: null,
          accepted_price_cents: null,
          scheduled_start_at: null,
          confirmation_status: null,
          completed_vendor_quality_score: null,
        });
        workOrderId = newWorkOrder.id;
        setWorkOrders((previous) => [...previous, newWorkOrder]);
        setSelectedWorkOrderId(newWorkOrder.id);
      }

      const event = candidate
        ? await contactWorkOrderCandidate(candidate.id, { channel, body })
        : await contactVendor(vendor.id, {
            channel,
            work_order_id: workOrderId,
            body,
          });
      setLastEvent(event);
    } catch {
      setContactError("Could not send that message. Please try again.");
    } finally {
      setIsContacting(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <LoadingState label="Loading vendor…" />
      </AppShell>
    );
  }

  if (error || !vendor) {
    return (
      <AppShell>
        <ErrorState message={error ?? "Vendor not found."} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-tavi-navy">{vendor.name}</h1>

        <Card>
          <div className="flex flex-col gap-2 text-sm text-tavi-navy">
            <p>
              <span className="font-medium">Trade:</span> {vendor.trade}
            </p>
            <p>
              <span className="font-medium">Service area:</span> {vendor.city ?? "Unknown"}
            </p>
            <p>
              <span className="font-medium">Contact:</span> {vendor.phone ?? "—"} ·{" "}
              {vendor.email ?? "—"}
            </p>
            <p>
              <span className="font-medium">Rating:</span>{" "}
              {vendor.rating !== null ? vendor.rating.toFixed(1) : "—"} ({vendor.review_count ?? 0}{" "}
              reviews)
            </p>
            <p>
              <span className="font-medium">License:</span> {vendor.license_status ?? "unknown"} ·{" "}
              <span className="font-medium">Insurance:</span> {vendor.insurance_status ?? "unknown"}
            </p>
            <div className="flex gap-2">
              <ScoreBadge label="Quality" score={vendor.quality_score} />
              <ScoreBadge label="Availability" score={vendor.availability_score} />
              <ScoreBadge label="Risk" score={vendor.risk_score} />
            </div>
          </div>
        </Card>

        {vendor.score_evidence ? (
          <Card>
            <p className="mb-2 text-sm font-medium text-tavi-navy">Score evidence</p>
            <ul className="flex flex-col gap-1 text-sm text-tavi-navy/70">
              {Object.entries(vendor.score_evidence).map(([key, value]) => (
                <li key={key}>
                  <span className="font-medium">{key}:</span> {String(value)}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <Card>
          <div className="flex flex-col gap-3">
            <label htmlFor="work_order_select" className="text-sm font-medium text-tavi-navy/80">
              Work order context
            </label>
            <select
              id="work_order_select"
              value={selectedWorkOrderId}
              onChange={(event) => setSelectedWorkOrderId(event.target.value)}
              className={selectClassName}
            >
              {workOrders.map((workOrder) => (
                <option key={workOrder.id} value={workOrder.id}>
                  {workOrder.title}
                </option>
              ))}
              <option value={NEW_WORK_ORDER_VALUE}>New Work Order</option>
            </select>

            {candidate ? (
              <p className="text-sm text-tavi-navy/70">
                Candidate status: <span className="font-medium">{candidate.status}</span>
              </p>
            ) : null}

            <label htmlFor="message_body" className="text-sm font-medium text-tavi-navy/80">
              Message
            </label>
            <textarea
              id="message_body"
              rows={4}
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
              placeholder="Type the message you want to send as an email or text…"
              className="rounded-md border border-tavi-navy/20 px-3 py-2 text-sm text-tavi-navy placeholder:text-tavi-navy/40 focus:border-tavi-indigo focus:outline-none"
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={isContacting}
                onClick={() => handleContact("email")}
              >
                Send email
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isContacting}
                onClick={() => handleContact("sms")}
              >
                Send text
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isContacting}
                onClick={() => handleContact("phone")}
              >
                Call {vendor.name}
              </Button>
            </div>

            {contactError ? <ErrorState message={contactError} /> : null}
            {lastEvent ? (
              <p className="text-sm text-tavi-navy/70">
                Logged {lastEvent.channel} ({lastEvent.direction}): {lastEvent.body}
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
