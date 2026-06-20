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
import { getWorkOrders } from "@/lib/api/work-orders";
import type { CommunicationEvent, Vendor, WorkOrder, WorkOrderCandidate } from "@/lib/types";

interface VendorProfileViewProps {
  vendorId: string;
  initialWorkOrderId?: string;
}

const selectClassName =
  "rounded-md border border-tavi-navy/20 px-3 py-2 text-sm text-tavi-navy focus:border-tavi-indigo focus:outline-none";

export function VendorProfileView({ vendorId, initialWorkOrderId }: VendorProfileViewProps) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>(initialWorkOrderId ?? "");
  const [candidates, setCandidates] = useState<WorkOrderCandidate[]>([]);

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
    getWorkOrders()
      .then(setWorkOrders)
      .catch(() => setWorkOrders([]));
  }, []);

  useEffect(() => {
    if (!selectedWorkOrderId) {
      setCandidates([]);
      return;
    }
    getWorkOrderCandidates(selectedWorkOrderId)
      .then(setCandidates)
      .catch(() => setCandidates([]));
  }, [selectedWorkOrderId]);

  const candidate = useMemo(
    () => candidates.find((item) => item.vendor_id === vendorId) ?? null,
    [candidates, vendorId],
  );

  async function handleContact(channel: "email" | "sms" | "phone") {
    if (!vendor) return;
    setContactError(null);
    setIsContacting(true);
    try {
      const body = `Outreach via ${channel} regarding work order.`;
      const event = candidate
        ? await contactWorkOrderCandidate(candidate.id, { channel, body })
        : await contactVendor(vendor.id, {
            channel,
            work_order_id: selectedWorkOrderId,
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
              <option value="">No work order selected</option>
              {workOrders.map((workOrder) => (
                <option key={workOrder.id} value={workOrder.id}>
                  {workOrder.title}
                </option>
              ))}
            </select>

            {candidate ? (
              <p className="text-sm text-tavi-navy/70">
                Candidate status: <span className="font-medium">{candidate.status}</span>
              </p>
            ) : null}

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
                Log call
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
