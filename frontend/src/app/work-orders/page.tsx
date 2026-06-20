"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, type TableColumn } from "@/components/ui/Table";
import { getWorkOrders } from "@/lib/api/work-orders";
import { getWorkOrderCandidates } from "@/lib/api/candidates";
import { getWorkOrderBids } from "@/lib/api/bids";
import type { WorkOrder } from "@/lib/types";

interface WorkOrderRow {
  workOrder: WorkOrder;
  candidateCount: number;
  bidCount: number;
  bestBidCents: number | null;
}

function formatCents(cents: number | null): string {
  if (cents === null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

export default function WorkOrdersPage() {
  const [rows, setRows] = useState<WorkOrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const workOrders = await getWorkOrders();
        const nextRows = await Promise.all(
          workOrders.map(async (workOrder) => {
            const [candidates, bids] = await Promise.all([
              getWorkOrderCandidates(workOrder.id),
              getWorkOrderBids(workOrder.id),
            ]);
            const bestBidCents =
              bids.length > 0 ? Math.min(...bids.map((bid) => bid.amount_cents)) : null;
            return {
              workOrder,
              candidateCount: candidates.length,
              bidCount: bids.length,
              bestBidCents,
            };
          }),
        );
        if (!isCancelled) setRows(nextRows);
      } catch {
        if (!isCancelled) setError("Could not load work orders. Please try again.");
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, []);

  const columns: TableColumn<WorkOrderRow>[] = [
    {
      key: "title",
      header: "Title",
      render: ({ workOrder }) => (
        <Link href={`/work-orders/${workOrder.id}`} className="font-medium text-tavi-indigo underline">
          {workOrder.title}
        </Link>
      ),
    },
    { key: "trade", header: "Trade", render: ({ workOrder }) => workOrder.trade },
    {
      key: "location",
      header: "Location",
      render: ({ workOrder }) => workOrder.facility?.city ?? workOrder.facility?.name ?? "—",
    },
    {
      key: "status",
      header: "Status",
      render: ({ workOrder }) => <StatusBadge status={workOrder.status} />,
    },
    {
      key: "bidding_mode",
      header: "Bidding mode",
      render: ({ workOrder }) => workOrder.bidding_mode ?? "—",
    },
    {
      key: "bid_deadline_at",
      header: "Bid deadline",
      render: ({ workOrder }) =>
        workOrder.bid_deadline_at ? new Date(workOrder.bid_deadline_at).toLocaleString() : "—",
    },
    {
      key: "candidate_count",
      header: "Candidates",
      render: ({ candidateCount }) => candidateCount,
    },
    {
      key: "bid_count",
      header: "Bids",
      render: ({ bidCount }) => bidCount,
    },
    {
      key: "best_bid",
      header: "Best bid",
      render: ({ bestBidCents }) => formatCents(bestBidCents),
    },
    {
      key: "recommended_winner",
      header: "Selected vendor",
      render: ({ workOrder }) => (workOrder.selected_vendor_id ? "Selected" : "—"),
    },
  ];

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-tavi-navy">Work Orders</h1>
          <Link href="/work-orders/new">
            <Button>New Work Order</Button>
          </Link>
        </div>

        {isLoading ? <LoadingState label="Loading work orders…" /> : null}
        {error ? <ErrorState message={error} /> : null}
        {!isLoading && !error && rows.length === 0 ? (
          <EmptyState
            title="No work orders yet"
            description="Work orders you create will show up here with status, bids, and recommended winners."
          />
        ) : null}
        {!isLoading && !error && rows.length > 0 ? (
          <Table columns={columns} rows={rows} getRowKey={(row) => row.workOrder.id} />
        ) : null}
      </div>
    </AppShell>
  );
}
