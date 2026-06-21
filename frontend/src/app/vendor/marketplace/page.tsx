"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, type TableColumn } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { getWorkOrders } from "@/lib/api/work-orders";
import { getSession, type Session } from "@/lib/auth";
import { VendorPlaceBidForm } from "./VendorPlaceBidForm";
import type { WorkOrder, WorkOrderStatus } from "@/lib/types";

const OPEN_STATUSES: WorkOrderStatus[] = ["ready_for_vendor_discovery", "discovering_vendors"];

function formatCents(cents: number | null): string {
  if (cents === null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

export default function VendorMarketplacePage() {
  const [session] = useState<Session | null>(() => getSession());
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bidWorkOrder, setBidWorkOrder] = useState<WorkOrder | null>(null);

  useEffect(() => {
    if (!session || session.type !== "vendor") return;
    let isCancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const all = await getWorkOrders();
        const open = all.filter(
          (wo) => wo.trade === session!.trade && OPEN_STATUSES.includes(wo.status),
        );
        if (!isCancelled) setWorkOrders(open);
      } catch {
        if (!isCancelled) setError("Could not load the marketplace. Please try again.");
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [session]);

  if (!session || session.type !== "vendor") {
    return null;
  }

  const columns: TableColumn<WorkOrder>[] = [
    { key: "title", header: "Title", render: (wo) => wo.title },
    {
      key: "location",
      header: "Location",
      render: (wo) => wo.facility?.city ?? wo.facility?.name ?? "—",
    },
    {
      key: "target_budget",
      header: "Target budget",
      render: (wo) => formatCents(wo.target_budget_cents),
    },
    {
      key: "bid_deadline_at",
      header: "Bid deadline",
      render: (wo) => (wo.bid_deadline_at ? new Date(wo.bid_deadline_at).toLocaleString() : "—"),
    },
    {
      key: "status",
      header: "Status",
      render: (wo) => <StatusBadge status={wo.status} />,
    },
    {
      key: "action",
      header: "",
      render: (wo) => (
        <Button variant="secondary" onClick={() => setBidWorkOrder(wo)}>
          Place Bid
        </Button>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-tavi-navy">Marketplace</h1>

        {isLoading ? <LoadingState label="Loading open work orders…" /> : null}
        {error ? <ErrorState message={error} /> : null}
        {!isLoading && !error && workOrders.length === 0 ? (
          <EmptyState
            title="No open work orders right now"
            description={`There are no ${session.trade ?? ""} work orders open for bidding at the moment.`}
          />
        ) : null}
        {!isLoading && !error && workOrders.length > 0 ? (
          <Table columns={columns} rows={workOrders} getRowKey={(wo) => wo.id} />
        ) : null}
      </div>

      {bidWorkOrder ? (
        <Modal title={`Place Bid: ${bidWorkOrder.title}`} onClose={() => setBidWorkOrder(null)}>
          <VendorPlaceBidForm
            workOrderId={bidWorkOrder.id}
            vendorId={session.id}
            onSuccess={() => {
              setWorkOrders((current) => current.filter((wo) => wo.id !== bidWorkOrder.id));
              setBidWorkOrder(null);
            }}
          />
        </Modal>
      ) : null}
    </AppShell>
  );
}
