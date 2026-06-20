"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  contactVendor,
  getVendor,
  listCandidates,
  listWorkOrders,
  type VendorWithPriceFit,
} from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorState, Loading } from "@/components/ui/States";
import { SelectField, TextareaField } from "@/components/ui/FormFields";
import { formatCents, formatDateTime } from "@/lib/format";
import type { CommunicationEvent, WorkOrder, WorkOrderCandidate } from "@/types/models";

export default function VendorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const initialWorkOrderId = searchParams.get("workOrderId") ?? "";

  const [vendor, setVendor] = useState<VendorWithPriceFit | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState(initialWorkOrderId);
  const [candidate, setCandidate] = useState<WorkOrderCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [channel, setChannel] = useState<CommunicationEvent["channel"]>("email");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastEvent, setLastEvent] = useState<CommunicationEvent | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getVendor(id), listWorkOrders()])
      .then(([vendorResult, workOrdersResult]) => {
        if (cancelled) return;
        setVendor(vendorResult);
        setWorkOrders(workOrdersResult);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this vendor profile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!selectedWorkOrderId) return;
    let cancelled = false;
    listCandidates(selectedWorkOrderId)
      .then((candidates) => {
        if (cancelled) return;
        setCandidate(candidates.find((c) => c.vendor_id === id) ?? null);
      })
      .catch(() => {
        if (!cancelled) setCandidate(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedWorkOrderId, id]);

  async function handleContact() {
    if (!selectedWorkOrderId || !message.trim()) return;
    setSending(true);
    try {
      const result = await contactVendor(id, selectedWorkOrderId, { channel, body: message });
      setLastEvent(result.event);
      setCandidate(result.candidate);
      setMessage("");
    } catch {
      setError("Could not send that contact action. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <Loading label="Loading vendor profile…" />;
  if (error || !vendor) return <ErrorState message={error ?? "Vendor not found."} />;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{vendor.name}</h1>
        <p className="text-sm text-slate-500">
          {vendor.trade.replace(/_/g, " ")} · {vendor.city}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card>
          <CardHeader title="Vendor details" />
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Phone</dt>
            <dd>{vendor.phone ?? "—"}</dd>
            <dt className="text-slate-500">Email</dt>
            <dd>{vendor.email ?? "—"}</dd>
            <dt className="text-slate-500">Rating</dt>
            <dd>
              {vendor.rating ?? "—"} ({vendor.review_count ?? 0} reviews)
            </dd>
            <dt className="text-slate-500">License</dt>
            <dd>{vendor.license_status ?? "unknown"}</dd>
            <dt className="text-slate-500">Insurance</dt>
            <dd>{vendor.insurance_status ?? "unknown"}</dd>
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            <ScoreBadge label="Quality" value={vendor.quality_score} />
            <ScoreBadge label="Price fit" value={vendor.price_fit} max={100} />
            <ScoreBadge label="Availability" value={vendor.availability_score} />
            <ScoreBadge label="Risk" value={vendor.risk_score} invert />
          </div>
          {vendor.score_evidence && (
            <p className="mt-3 text-xs text-slate-500">
              {JSON.stringify(vendor.score_evidence)}
            </p>
          )}
        </Card>

        <Card>
          <CardHeader title="Work order context" />
          <SelectField
            label="Work order"
            options={[{ value: "", label: "Select a work order…" }, ...workOrders.map((w) => ({ value: w.id, label: w.title }))]}
            value={selectedWorkOrderId}
            onChange={(e) => setSelectedWorkOrderId(e.target.value)}
          />

          {candidate && selectedWorkOrderId && candidate.work_order_id === selectedWorkOrderId && (
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <dt className="text-slate-500">Status</dt>
              <dd>
                <StatusBadge status={candidate.status} />
              </dd>
              <dt className="text-slate-500">Distance</dt>
              <dd>{candidate.distance_miles != null ? `${candidate.distance_miles} mi` : "—"}</dd>
              <dt className="text-slate-500">Quoted price</dt>
              <dd>{formatCents(candidate.quoted_price_cents)}</dd>
              <dt className="text-slate-500">Last contacted</dt>
              <dd>{formatDateTime(candidate.last_contacted_at)}</dd>
              <dt className="text-slate-500">Next action</dt>
              <dd>{candidate.next_action ?? "—"}</dd>
            </dl>
          )}

          {selectedWorkOrderId && (
            <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-3">
              <SelectField
                label="Channel"
                options={[
                  { value: "email", label: "Email" },
                  { value: "sms", label: "Text message" },
                  { value: "phone", label: "Call" },
                ]}
                value={channel}
                onChange={(e) => setChannel(e.target.value as CommunicationEvent["channel"])}
              />
              <TextareaField
                label="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  channel === "phone" ? "Notes from the call" : "What should we tell the vendor?"
                }
              />
              <div className="flex justify-end gap-2">
                <Button onClick={handleContact} disabled={sending || !message.trim()}>
                  {channel === "phone" ? "Log call" : channel === "sms" ? "Send text" : "Send email"}
                </Button>
              </div>
              {lastEvent && (
                <p className="text-xs text-emerald-700">Logged: {lastEvent.body}</p>
              )}
            </div>
          )}
        </Card>
      </div>

      <Link href="/vendors" className="text-sm text-slate-500 underline">
        Back to vendor search
      </Link>
    </div>
  );
}
