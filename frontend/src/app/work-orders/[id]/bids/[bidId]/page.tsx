"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getBid,
  getCandidate,
  getTimeline,
  getVendor,
  getWorkOrder,
} from "@/lib/api-client";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorState, Loading } from "@/components/ui/States";
import { formatCents, formatDateTime } from "@/lib/format";
import type { Bid, CommunicationEvent, Vendor, WorkOrder, WorkOrderCandidate } from "@/types/models";

interface BidDetailData {
  workOrder: WorkOrder;
  bid: Bid;
  candidate: WorkOrderCandidate;
  vendor: Vendor;
  communicationEvents: CommunicationEvent[];
}

export default function BidDetailPage() {
  const { id, bidId } = useParams<{ id: string; bidId: string }>();
  const [data, setData] = useState<BidDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [workOrder, bid, timeline] = await Promise.all([
          getWorkOrder(id),
          getBid(bidId),
          getTimeline(id),
        ]);
        const candidate = await getCandidate(bid.work_order_candidate_id);
        const vendor = await getVendor(candidate.vendor_id);
        const communicationEvents = timeline.timeline
          .filter((entry) => entry.kind === "communication_event")
          .map((entry) => entry.data as CommunicationEvent)
          .filter((event) => event.work_order_candidate_id === candidate.id);

        if (!cancelled) {
          setData({ workOrder, bid, candidate, vendor, communicationEvents });
        }
      } catch {
        if (!cancelled) setError("Could not load this bid.");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, bidId]);

  if (error) return <ErrorState message={error} />;
  if (!data) return <Loading label="Loading bid…" />;

  const { workOrder, bid, vendor, communicationEvents } = data;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{workOrder.title}</h1>
        <p className="text-sm text-slate-500">{workOrder.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card>
          <CardHeader title="Bid details" />
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Vendor</dt>
            <dd>
              <Link href={`/vendors/${vendor.id}?workOrderId=${workOrder.id}`} className="text-slate-900 hover:underline">
                {vendor.name}
              </Link>
            </dd>
            <dt className="text-slate-500">Amount</dt>
            <dd>{formatCents(bid.amount_cents)}</dd>
            <dt className="text-slate-500">Status</dt>
            <dd>
              <StatusBadge status={bid.status} />
            </dd>
            <dt className="text-slate-500">Arrival window</dt>
            <dd>
              {formatDateTime(bid.arrival_window_start)} – {formatDateTime(bid.arrival_window_end)}
            </dd>
            <dt className="text-slate-500">Scope notes</dt>
            <dd>{bid.scope_notes ?? "—"}</dd>
          </dl>
        </Card>

        <Card>
          <CardHeader title="AI notes" />
          <p className="text-sm text-slate-700">{buildAiNotes(bid, vendor, workOrder)}</p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Communication history" />
        {communicationEvents.length === 0 ? (
          <p className="text-sm text-slate-500">No communication recorded for this bid yet.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {communicationEvents.map((event) => (
              <li key={event.id} className="border-l-2 border-slate-200 pl-3">
                <p className="text-xs text-slate-400">{formatDateTime(event.created_at)}</p>
                <p>
                  <span className="font-medium">{event.actor_name ?? event.actor_type}</span> via{" "}
                  {event.channel}: {event.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Link href={`/work-orders/${workOrder.id}`} className="text-sm text-slate-500 underline">
        Back to work order review
      </Link>
    </div>
  );
}

function buildAiNotes(bid: Bid, vendor: Vendor, workOrder: WorkOrder): string {
  const notes: string[] = [];
  if (workOrder.target_budget_cents) {
    const diff = bid.amount_cents - workOrder.target_budget_cents;
    notes.push(
      diff <= 0
        ? "This bid is at or under the facility manager's target budget."
        : `This bid is ${formatCents(diff)} over the target budget.`
    );
  }
  if (vendor.quality_score != null) {
    notes.push(`Vendor quality score is ${vendor.quality_score}, based on prior completed jobs.`);
  }
  if (vendor.risk_score != null && vendor.risk_score > 0.3) {
    notes.push(`Risk score is elevated at ${vendor.risk_score}; consider extra verification.`);
  }
  if (bid.scope_notes) {
    notes.push(`Vendor noted: "${bid.scope_notes}"`);
  }
  return notes.join(" ");
}
