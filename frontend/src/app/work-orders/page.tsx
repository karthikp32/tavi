"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTimeline, getVendor, listBids, listCandidates, listWorkOrders } from "@/lib/api-client";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState, Loading } from "@/components/ui/States";
import { formatCents, formatDateTime } from "@/lib/format";
import type { WorkOrder, WorkOrderDashboardRow } from "@/types/models";

export default function WorkOrderDashboardPage() {
  const [rows, setRows] = useState<WorkOrderDashboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const workOrders = await listWorkOrders();
        const built = await Promise.all(workOrders.map((wo) => buildRow(wo)));
        if (!cancelled) setRows(built);
      } catch {
        if (!cancelled) setError("Could not load work orders. Please try again.");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <ErrorState message={error} />;
  if (rows === null) return <Loading label="Loading work orders…" />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Work Order Dashboard</h1>
        <Link href="/work-orders/new" className="text-sm text-slate-600 underline">
          + New work order
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState message="No work orders yet. Create one to get started." />
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>Title</Th>
              <Th>Trade</Th>
              <Th>Status</Th>
              <Th>Bidding mode</Th>
              <Th>Bid deadline</Th>
              <Th>Candidates</Th>
              <Th>Bids</Th>
              <Th>Best bid</Th>
              <Th>Recommended winner</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((row) => (
              <Tr key={row.work_order.id}>
                <Td>
                  <Link href={`/work-orders/${row.work_order.id}`} className="font-medium text-slate-900 hover:underline">
                    {row.work_order.title}
                  </Link>
                </Td>
                <Td>{row.work_order.trade.replace(/_/g, " ")}</Td>
                <Td>
                  <StatusBadge status={row.work_order.status} />
                </Td>
                <Td>{row.work_order.bidding_mode?.replace(/_/g, " ") ?? "—"}</Td>
                <Td>{formatDateTime(row.work_order.bid_deadline_at)}</Td>
                <Td>{row.candidate_count}</Td>
                <Td>{row.bid_count}</Td>
                <Td>{formatCents(row.best_bid_amount_cents)}</Td>
                <Td>{row.recommended_vendor_name ?? "—"}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}

async function buildRow(workOrder: WorkOrder): Promise<WorkOrderDashboardRow> {
  const [candidates, bids, timeline] = await Promise.all([
    listCandidates(workOrder.id),
    listBids(workOrder.id),
    getTimeline(workOrder.id),
  ]);

  const bestBid = bids.length > 0 ? Math.min(...bids.map((b) => b.amount_cents)) : null;
  const recommendedCandidateId = timeline.recommendation.recommended_candidate_id;
  const recommendedCandidate = recommendedCandidateId
    ? candidates.find((c) => c.id === recommendedCandidateId)
    : undefined;

  const recommendedVendor = recommendedCandidate
    ? await getVendor(recommendedCandidate.vendor_id).catch(() => null)
    : null;

  return {
    work_order: workOrder,
    candidate_count: candidates.length,
    bid_count: bids.length,
    best_bid_amount_cents: bestBid,
    recommended_vendor_name: recommendedVendor?.name ?? null,
  };
}
