"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { CommandCenterLayout } from "@/components/layout/CommandCenterLayout";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, type TableColumn } from "@/components/ui/Table";
import { getWorkOrder } from "@/lib/api/work-orders";
import { getWorkOrderCandidates } from "@/lib/api/candidates";
import { getWorkOrderBids } from "@/lib/api/bids";
import { getWorkOrderTimeline, type TimelineEntry } from "@/lib/api/timeline";
import { getVendor } from "@/lib/api/vendors";
import type { Bid, Vendor, WorkOrder, WorkOrderCandidate } from "@/lib/types";

interface WorkOrderReviewViewProps {
  workOrderId: string;
}

function formatCents(cents: number | null): string {
  if (cents === null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function describeTimelineEntry(entry: TimelineEntry): string {
  if (entry.type === "communication_event") {
    return `${entry.data.channel} (${entry.data.direction}): ${entry.data.body}`;
  }
  if (entry.type === "bid") {
    return `Bid submitted for ${formatCents(entry.data.amount_cents)}`;
  }
  return `Status changed to ${entry.data.status}`;
}

export function WorkOrderReviewView({ workOrderId }: WorkOrderReviewViewProps) {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [candidates, setCandidates] = useState<WorkOrderCandidate[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [vendorsById, setVendorsById] = useState<Record<string, Vendor>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [nextWorkOrder, nextCandidates, nextBids, nextTimeline] = await Promise.all([
          getWorkOrder(workOrderId),
          getWorkOrderCandidates(workOrderId),
          getWorkOrderBids(workOrderId),
          getWorkOrderTimeline(workOrderId),
        ]);

        const uniqueVendorIds = Array.from(new Set(nextCandidates.map((c) => c.vendor_id)));
        const vendorResults = await Promise.allSettled(uniqueVendorIds.map((id) => getVendor(id)));
        const vendors = vendorResults
          .filter((result): result is PromiseFulfilledResult<Vendor> => result.status === "fulfilled")
          .map((result) => result.value);
        const nextVendorsById = Object.fromEntries(vendors.map((vendor) => [vendor.id, vendor]));

        if (!isCancelled) {
          setWorkOrder(nextWorkOrder);
          setCandidates(nextCandidates);
          setBids(nextBids);
          setTimeline(nextTimeline);
          setVendorsById(nextVendorsById);
        }
      } catch {
        if (!isCancelled) setError("Could not load this work order. Please try again.");
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [workOrderId]);

  const candidatesByVendorId = useMemo(
    () => Object.fromEntries(candidates.map((candidate) => [candidate.id, candidate])),
    [candidates],
  );

  const recommendation = useMemo(() => {
    const submittedBids = bids.filter((bid) => bid.status === "submitted");
    if (submittedBids.length === 0) return null;

    const maxAmount = Math.max(...submittedBids.map((bid) => bid.amount_cents));

    let best: { bid: Bid; vendor: Vendor; score: number } | null = null;
    for (const bid of submittedBids) {
      const candidate = candidatesByVendorId[bid.work_order_candidate_id];
      const vendor = candidate ? vendorsById[candidate.vendor_id] : undefined;
      if (!vendor) continue;

      const quality = vendor.quality_score ?? 0.5;
      const risk = vendor.risk_score ?? 0.5;
      const priceNormalized = maxAmount > 0 ? bid.amount_cents / maxAmount : 0;
      const score = quality * 0.5 + (1 - risk) * 0.3 - priceNormalized * 0.2;

      if (!best || score > best.score) {
        best = { bid, vendor, score };
      }
    }
    return best;
  }, [bids, candidatesByVendorId, vendorsById]);

  const nextActions = useMemo(() => {
    if (!workOrder) return [];
    const actions: string[] = [];
    if (bids.length < candidates.length) {
      actions.push(`Awaiting ${candidates.length - bids.length} more bid(s)`);
    }
    if (workOrder.bid_deadline_at && new Date(workOrder.bid_deadline_at) < new Date()) {
      if (!workOrder.selected_vendor_id) {
        actions.push("Bid deadline passed — pick a winner");
      }
    }
    if (candidates.length === 0) {
      actions.push("No vendor candidates yet — discover vendors for this work order");
    }
    return actions;
  }, [workOrder, bids, candidates]);

  const bidColumns: TableColumn<Bid>[] = [
    {
      key: "vendor",
      header: "Vendor",
      render: (bid) => {
        const candidate = candidatesByVendorId[bid.work_order_candidate_id];
        const vendor = candidate ? vendorsById[candidate.vendor_id] : undefined;
        return vendor ? (
          <Link href={`/vendors/${vendor.id}`} className="font-medium text-tavi-indigo underline">
            {vendor.name}
          </Link>
        ) : (
          "—"
        );
      },
    },
    {
      key: "amount",
      header: "Amount",
      render: (bid) => (
        <Link
          href={`/work-orders/${workOrderId}/bids/${bid.id}`}
          className="text-tavi-indigo underline"
        >
          {formatCents(bid.amount_cents)}
        </Link>
      ),
    },
    { key: "status", header: "Status", render: (bid) => <StatusBadge status={bid.status} /> },
  ];

  if (isLoading) {
    return (
      <AppShell>
        <LoadingState label="Loading work order…" />
      </AppShell>
    );
  }

  if (error || !workOrder) {
    return (
      <AppShell>
        <ErrorState message={error ?? "Work order not found."} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-tavi-navy">{workOrder.title}</h1>
        <CommandCenterLayout
          left={
            <Card>
              <div className="flex flex-col gap-2 text-sm text-tavi-navy">
                <StatusBadge status={workOrder.status} />
                <p>
                  <span className="font-medium">Trade:</span> {workOrder.trade}
                </p>
                <p>
                  <span className="font-medium">Description:</span> {workOrder.description}
                </p>
                <p>
                  <span className="font-medium">Bid deadline:</span>{" "}
                  {workOrder.bid_deadline_at
                    ? new Date(workOrder.bid_deadline_at).toLocaleString()
                    : "—"}
                </p>
                <p>
                  <span className="font-medium">Target budget:</span>{" "}
                  {formatCents(workOrder.target_budget_cents)}
                </p>
              </div>
            </Card>
          }
          center={
            timeline.length === 0 ? (
              <EmptyState
                title="No activity yet"
                description="Communication history, bids, and status changes will appear here."
              />
            ) : (
              <Card>
                <ul className="flex flex-col gap-2 text-sm text-tavi-navy">
                  {timeline.map((entry, index) => (
                    <li key={index} className="border-b border-tavi-navy/10 pb-2 last:border-0">
                      <p className="text-xs text-tavi-navy/50">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                      <p>{describeTimelineEntry(entry)}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            )
          }
          right={
            <div className="flex flex-col gap-4">
              <Card>
                <p className="mb-2 text-sm font-medium text-tavi-navy">Candidates</p>
                {candidates.length === 0 ? (
                  <p className="text-sm text-tavi-navy/50">No candidates yet.</p>
                ) : (
                  <ul className="flex flex-col gap-1 text-sm text-tavi-navy">
                    {candidates.map((candidate) => {
                      const vendor = vendorsById[candidate.vendor_id];
                      return (
                        <li key={candidate.id}>
                          <Link
                            href={`/vendors/${candidate.vendor_id}`}
                            className="text-tavi-indigo underline"
                          >
                            {vendor?.name ?? candidate.vendor_id}
                          </Link>{" "}
                          — {candidate.status}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>

              <Card>
                <p className="mb-2 text-sm font-medium text-tavi-navy">Bids</p>
                {bids.length === 0 ? (
                  <p className="text-sm text-tavi-navy/50">No bids yet.</p>
                ) : (
                  <Table columns={bidColumns} rows={bids} getRowKey={(bid) => bid.id} />
                )}
              </Card>

              <Card>
                <p className="mb-1 text-sm font-medium text-tavi-navy">AI summary (heuristic)</p>
                {recommendation ? (
                  <p className="text-sm text-tavi-navy/70">
                    Based on quality, risk, and price among submitted bids, the recommended winner
                    is{" "}
                    <Link
                      href={`/vendors/${recommendation.vendor.id}`}
                      className="font-medium text-tavi-indigo underline"
                    >
                      {recommendation.vendor.name}
                    </Link>{" "}
                    at {formatCents(recommendation.bid.amount_cents)}.
                  </p>
                ) : (
                  <p className="text-sm text-tavi-navy/50">
                    No submitted bids yet to generate a recommendation.
                  </p>
                )}
              </Card>

              <Card>
                <p className="mb-1 text-sm font-medium text-tavi-navy">Next actions</p>
                {nextActions.length === 0 ? (
                  <p className="text-sm text-tavi-navy/50">No outstanding actions.</p>
                ) : (
                  <ul className="flex flex-col gap-1 text-sm text-tavi-navy/70">
                    {nextActions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
