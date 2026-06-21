"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getWorkOrder } from "@/lib/api/work-orders";
import { getWorkOrderBids } from "@/lib/api/bids";
import { getWorkOrderCandidate } from "@/lib/api/candidates";
import { getWorkOrderTimeline, type TimelineEntry } from "@/lib/api/timeline";
import { getVendor } from "@/lib/api/vendors";
import type { Bid, CommunicationEvent, Vendor, WorkOrder, WorkOrderCandidate } from "@/lib/types";

interface BidDetailViewProps {
  workOrderId: string;
  bidId: string;
}

function formatCents(cents: number | null): string {
  if (cents === null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

export function BidDetailView({ workOrderId, bidId }: BidDetailViewProps) {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [bid, setBid] = useState<Bid | null>(null);
  const [candidate, setCandidate] = useState<WorkOrderCandidate | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [communicationEvents, setCommunicationEvents] = useState<CommunicationEvent[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [nextWorkOrder, bids, timeline] = await Promise.all([
          getWorkOrder(workOrderId),
          getWorkOrderBids(workOrderId),
          getWorkOrderTimeline(workOrderId),
        ]);
        const nextBid = bids.find((item) => item.id === bidId) ?? null;
        if (!nextBid) {
          if (!isCancelled) {
            setError("Bid not found.");
            setIsLoading(false);
          }
          return;
        }

        const nextCandidate = await getWorkOrderCandidate(nextBid.work_order_candidate_id);
        const nextVendor = await getVendor(nextCandidate.vendor_id);

        const events = timeline
          .filter(
            (entry): entry is TimelineEntry & { type: "communication_event" } =>
              entry.type === "communication_event" &&
              entry.data.work_order_candidate_id === nextCandidate.id,
          )
          .map((entry) => entry.data);

        if (!isCancelled) {
          setWorkOrder(nextWorkOrder);
          setBid(nextBid);
          setCandidate(nextCandidate);
          setVendor(nextVendor);
          setCommunicationEvents(events);
        }
      } catch {
        if (!isCancelled) setError("Could not load this bid. Please try again.");
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [workOrderId, bidId]);

  const aiNote = useMemo(() => {
    if (!workOrder || !bid || !vendor) return null;
    const notes: string[] = [];
    if (workOrder.target_budget_cents !== null) {
      const diff = bid.amount_cents - workOrder.target_budget_cents;
      if (diff <= 0) {
        notes.push(`This bid is ${formatCents(Math.abs(diff))} under the target budget.`);
      } else {
        notes.push(`This bid is ${formatCents(diff)} over the target budget.`);
      }
    }
    if (vendor.quality_score !== null) {
      notes.push(`Vendor quality score is ${vendor.quality_score.toFixed(2)}.`);
    }
    if (vendor.risk_score !== null) {
      notes.push(`Vendor risk score is ${vendor.risk_score.toFixed(2)}.`);
    }
    return notes.length > 0 ? notes.join(" ") : null;
  }, [workOrder, bid, vendor]);

  if (isLoading) {
    return (
      <AppShell>
        <LoadingState label="Loading bid…" />
      </AppShell>
    );
  }

  if (error || !workOrder || !bid) {
    return (
      <AppShell>
        <ErrorState message={error ?? "Bid not found."} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-tavi-navy">Bid for {workOrder.title}</h1>
        <p className="text-sm text-tavi-navy/60">{workOrder.description}</p>

        <Card>
          <div className="flex flex-col gap-2 text-sm text-tavi-navy">
            <StatusBadge status={bid.status} />
            <p>
              <span className="font-medium">Vendor:</span>{" "}
              {vendor ? (
                <Link href={`/vendors/${vendor.id}`} className="text-tavi-indigo underline">
                  {vendor.name}
                </Link>
              ) : (
                "—"
              )}
            </p>
            <p>
              <span className="font-medium">Amount:</span> {formatCents(bid.amount_cents)}
            </p>
            <p>
              <span className="font-medium">Arrival window:</span>{" "}
              {formatDate(bid.arrival_window_start)} – {formatDate(bid.arrival_window_end)}
            </p>
            <p>
              <span className="font-medium">Scope notes:</span> {bid.scope_notes ?? "—"}
            </p>
          </div>
        </Card>

        <Card>
          <p className="mb-2 text-sm font-medium text-tavi-navy">Communication history</p>
          {communicationEvents.length === 0 ? (
            <p className="text-sm text-tavi-navy/50">No communication recorded for this candidate.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm text-tavi-navy">
              {communicationEvents.map((event) => (
                <li key={event.id} className="border-b border-tavi-navy/10 pb-2 last:border-0">
                  <p className="text-xs text-tavi-navy/50">{formatDate(event.created_at)}</p>
                  <p>
                    {event.channel} ({event.direction}): {event.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <p className="mb-1 text-sm font-medium text-tavi-navy">AI notes (heuristic)</p>
          <p className="text-sm text-tavi-navy/70">{aiNote ?? "Not enough data for a note."}</p>
        </Card>
      </div>
    </AppShell>
  );
}
