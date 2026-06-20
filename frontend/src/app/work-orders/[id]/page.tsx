"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getTimeline,
  getWorkOrder,
  getVendor,
  listBids,
  listCandidates,
} from "@/lib/api-client";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { EmptyState, ErrorState, Loading } from "@/components/ui/States";
import { formatCents, formatDateTime } from "@/lib/format";
import type {
  Bid,
  CommunicationEvent,
  TimelineEntry,
  Vendor,
  WinnerRecommendation,
  WorkOrder,
  WorkOrderCandidate,
  WorkOrderState,
} from "@/types/models";

interface ReviewData {
  workOrder: WorkOrder;
  candidates: WorkOrderCandidate[];
  vendorsById: Record<string, Vendor>;
  bids: Bid[];
  timeline: TimelineEntry[];
  recommendation: WinnerRecommendation;
}

export default function WorkOrderReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ReviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [workOrder, candidates, bids, timelineResult] = await Promise.all([
          getWorkOrder(id),
          listCandidates(id),
          listBids(id),
          getTimeline(id),
        ]);

        const vendors = await Promise.all(
          candidates.map((c) => getVendor(c.vendor_id).catch(() => null))
        );
        const vendorsById: Record<string, Vendor> = {};
        vendors.forEach((v) => {
          if (v) vendorsById[v.id] = v;
        });

        if (!cancelled) {
          setData({
            workOrder,
            candidates,
            vendorsById,
            bids,
            timeline: timelineResult.timeline,
            recommendation: timelineResult.recommendation,
          });
        }
      } catch {
        if (!cancelled) setError("Could not load this work order.");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <ErrorState message={error} />;
  if (!data) return <Loading label="Loading work order…" />;

  const { workOrder, candidates, vendorsById, bids, timeline, recommendation } = data;

  function vendorName(vendorId: string): string {
    return vendorsById[vendorId]?.name ?? vendorId;
  }

  function candidateById(candidateId: string): WorkOrderCandidate | undefined {
    return candidates.find((c) => c.id === candidateId);
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-1">
        <Card>
          <CardHeader title="Summary" />
          <h2 className="mb-1 text-base font-semibold text-slate-900">{workOrder.title}</h2>
          <p className="mb-3 text-sm text-slate-600">{workOrder.description}</p>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Status</dt>
            <dd>
              <StatusBadge status={workOrder.status} />
            </dd>
            <dt className="text-slate-500">Trade</dt>
            <dd>{workOrder.trade.replace(/_/g, " ")}</dd>
            <dt className="text-slate-500">Target budget</dt>
            <dd>{formatCents(workOrder.target_budget_cents)}</dd>
            <dt className="text-slate-500">Bid deadline</dt>
            <dd>{formatDateTime(workOrder.bid_deadline_at)}</dd>
            <dt className="text-slate-500">Bidding mode</dt>
            <dd>{workOrder.bidding_mode?.replace(/_/g, " ") ?? "—"}</dd>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Candidate vendors" />
          {candidates.length === 0 ? (
            <EmptyState message="No candidate vendors yet." />
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {candidates.map((candidate) => (
                <li key={candidate.id} className="flex items-center justify-between">
                  <Link href={`/vendors/${candidate.vendor_id}?workOrderId=${workOrder.id}`} className="text-slate-900 hover:underline">
                    {vendorName(candidate.vendor_id)}
                  </Link>
                  <StatusBadge status={candidate.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="AI recommendation" />
          <p className="text-sm text-slate-700">{recommendation.reason}</p>
          {recommendation.recommended_candidate_id && (
            <p className="mt-2 text-sm">
              Recommended winner:{" "}
              <span className="font-medium">
                {vendorName(candidateById(recommendation.recommended_candidate_id)?.vendor_id ?? "")}
              </span>
            </p>
          )}
          <ul className="mt-2 text-xs text-slate-500">
            {recommendation.best_price_candidate_id && (
              <li>Best price: {vendorName(candidateById(recommendation.best_price_candidate_id)?.vendor_id ?? "")}</li>
            )}
            {recommendation.best_quality_candidate_id && (
              <li>Best quality: {vendorName(candidateById(recommendation.best_quality_candidate_id)?.vendor_id ?? "")}</li>
            )}
            {recommendation.fastest_candidate_id && (
              <li>Fastest available: {vendorName(candidateById(recommendation.fastest_candidate_id)?.vendor_id ?? "")}</li>
            )}
          </ul>
          {recommendation.risk_warnings.length > 0 && (
            <ul className="mt-2 text-xs text-red-600">
              {recommendation.risk_warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="flex flex-col gap-4 lg:col-span-1">
        <Card>
          <CardHeader title="Timeline" />
          {timeline.length === 0 ? (
            <EmptyState message="No activity yet." />
          ) : (
            <ul className="flex flex-col gap-3 text-sm">
              {timeline.map((entry) => (
                <li key={entry.id} className="border-l-2 border-slate-200 pl-3">
                  <p className="text-xs text-slate-400">{formatDateTime(entry.created_at)}</p>
                  <TimelineEntryView entry={entry} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="flex flex-col gap-4 lg:col-span-1">
        <Card>
          <CardHeader title="Bids" />
          {bids.length === 0 ? (
            <EmptyState message="No bids submitted yet." />
          ) : (
            <Table>
              <THead>
                <Tr>
                  <Th>Vendor</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                </Tr>
              </THead>
              <TBody>
                {bids.map((bid) => {
                  const candidate = candidateById(bid.work_order_candidate_id);
                  return (
                    <Tr key={bid.id}>
                      <Td>
                        <Link href={`/work-orders/${workOrder.id}/bids/${bid.id}`} className="text-slate-900 hover:underline">
                          {candidate ? vendorName(candidate.vendor_id) : "Unknown vendor"}
                        </Link>
                      </Td>
                      <Td>{formatCents(bid.amount_cents)}</Td>
                      <Td>
                        <StatusBadge status={bid.status} />
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}

function TimelineEntryView({ entry }: { entry: TimelineEntry }) {
  if (entry.kind === "communication_event") {
    const event = entry.data as CommunicationEvent;
    return (
      <p>
        <span className="font-medium">{event.actor_name ?? event.actor_type}</span> via {event.channel}:{" "}
        {event.body}
      </p>
    );
  }
  if (entry.kind === "bid") {
    const bid = entry.data as Bid;
    return <p>Bid submitted: {formatCents(bid.amount_cents)}</p>;
  }
  const state = entry.data as WorkOrderState;
  return <p>Status changed to {state.status.replace(/_/g, " ")}.</p>;
}
