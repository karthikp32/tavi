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
import { getWorkOrderBids } from "@/lib/api/bids";
import { getSession, type Session } from "@/lib/auth";
import { VendorPlaceBidForm } from "./VendorPlaceBidForm";
import type { Bid, WorkOrder, WorkOrderStatus } from "@/lib/types";

const CLOSED_STATUSES: WorkOrderStatus[] = [
  "ready_for_award",
  "awarded",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
];
const isOpenForBidding = (status: WorkOrderStatus) => !CLOSED_STATUSES.includes(status);
const ACTIVE_BID_STATUSES: Bid["status"][] = ["submitted", "accepted"];

function formatCents(cents: number | null): string {
  if (cents === null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function getLowestActiveBid(bids: Bid[]): Bid | null {
  const active = bids.filter((bid) => ACTIVE_BID_STATUSES.includes(bid.status));
  if (active.length === 0) return null;
  return active.reduce((lowest, bid) => (bid.amount_cents < lowest.amount_cents ? bid : lowest));
}

function getVendorBid(bids: Bid[], vendorId: string): Bid | null {
  return bids.find((bid) => bid.candidate?.vendor_id === vendorId) ?? null;
}

function formatBidStatus(status: Bid["status"]): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function VendorMarketplacePage() {
  const [session] = useState<Session | null>(() => getSession());
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [bidsByWorkOrderId, setBidsByWorkOrderId] = useState<Record<string, Bid[]>>({});
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
        const tradeWorkOrders = all.filter((wo) => wo.trade === session!.trade);
        const bidLists = await Promise.all(tradeWorkOrders.map((wo) => getWorkOrderBids(wo.id)));
        const bidsMap: Record<string, Bid[]> = {};
        tradeWorkOrders.forEach((wo, index) => {
          bidsMap[wo.id] = bidLists[index];
        });
        const relevant = tradeWorkOrders.filter(
          (wo) => {
            const hasVendorBid = bidsMap[wo.id].some(
              (bid) => bid.candidate?.vendor_id === session!.id,
            );
            return (
              hasVendorBid ||
              (wo.bidding_mode === "transparent_auction" && isOpenForBidding(wo.status))
            );
          },
        );
        if (!isCancelled) {
          setWorkOrders(relevant);
          setBidsByWorkOrderId(bidsMap);
        }
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
      key: "arrival_window",
      header: "Requested arrival window",
      render: (wo) => {
        if (!wo.required_arrival_window_start || !wo.required_arrival_window_end) return "—";
        const start = new Date(wo.required_arrival_window_start).toLocaleString();
        const end = new Date(wo.required_arrival_window_end).toLocaleString();
        return `${start} – ${end}`;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (wo) => <StatusBadge status={wo.status} />,
    },
    {
      key: "vendor_bid",
      header: "Your bid",
      render: (wo) => {
        const vendorBid = getVendorBid(bidsByWorkOrderId[wo.id] ?? [], session.id);
        if (!vendorBid) return "—";
        return `${formatBidStatus(vendorBid.status)} · ${formatCents(vendorBid.amount_cents)}`;
      },
    },
    {
      key: "lowest_bid",
      header: "Lowest bid",
      render: (wo) => {
        const lowestBid = getLowestActiveBid(bidsByWorkOrderId[wo.id] ?? []);
        return lowestBid ? formatCents(lowestBid.amount_cents) : "No bids yet";
      },
    },
    {
      key: "leading_bidder",
      header: "Leading bidder",
      render: (wo) => {
        const lowestBid = getLowestActiveBid(bidsByWorkOrderId[wo.id] ?? []);
        if (!lowestBid) return "—";
        return lowestBid.candidate?.vendor_id === session.id ? "You" : "Another vendor";
      },
    },
    {
      key: "action",
      header: "",
      render: (wo) => {
        if (wo.status === "awarded") {
          return wo.selected_vendor_id === session.id ? (
            <span className="text-sm font-medium text-tavi-indigo">Bid accepted</span>
          ) : (
            <span className="text-sm text-tavi-navy/50">Not selected</span>
          );
        }
        if (!isOpenForBidding(wo.status)) {
          return <span className="text-sm text-tavi-navy/50">Bidding closed</span>;
        }
        const lowestBid = getLowestActiveBid(bidsByWorkOrderId[wo.id] ?? []);
        const youHaveLowestBid = lowestBid?.candidate?.vendor_id === session.id;
        return youHaveLowestBid ? (
          <span className="text-sm text-tavi-navy/50">You have the lowest bid</span>
        ) : (
          <Button variant="secondary" onClick={() => setBidWorkOrder(wo)}>
            Place Bid
          </Button>
        );
      },
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
            title="No work orders right now"
            description={`There are no open ${session.trade ?? ""} work orders, and you haven't placed any bids yet.`}
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
            onSuccess={async () => {
              const bids = await getWorkOrderBids(bidWorkOrder.id);
              setBidsByWorkOrderId((current) => ({ ...current, [bidWorkOrder.id]: bids }));
              setBidWorkOrder(null);
            }}
          />
        </Modal>
      ) : null}
    </AppShell>
  );
}
