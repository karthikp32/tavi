"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { searchVendors, type VendorSearchParams, type VendorWithPriceFit } from "@/lib/api-client";
import { SelectField, TextField } from "@/components/ui/FormFields";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { EmptyState, ErrorState, Loading } from "@/components/ui/States";
import { ScoreBadge } from "@/components/ui/ScoreBadge";

const CITY_OPTIONS = [
  { value: "", label: "All cities" },
  { value: "New York", label: "New York" },
  { value: "Los Angeles", label: "Los Angeles" },
  { value: "Chicago", label: "Chicago" },
];

const TRADE_OPTIONS = [
  { value: "", label: "All trades" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC" },
  { value: "lawncare", label: "Lawncare" },
  { value: "cleaning", label: "Cleaning" },
  { value: "general_maintenance", label: "General Maintenance" },
];

const LICENSE_OPTIONS = [
  { value: "", label: "Any" },
  { value: "verified", label: "Verified" },
  { value: "unverified", label: "Unverified" },
];

export default function VendorSearchPage() {
  const [filters, setFilters] = useState<VendorSearchParams>({});
  const [vendors, setVendors] = useState<VendorWithPriceFit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => filters, [filters]);

  useEffect(() => {
    let cancelled = false;
    searchVendors(params)
      .then((results) => {
        if (!cancelled) {
          setVendors(results);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load vendors. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params]);

  function setFilter<K extends keyof VendorSearchParams>(key: K, value: VendorSearchParams[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Vendor Search</h1>

      <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-4">
        <SelectField
          label="City"
          options={CITY_OPTIONS}
          value={filters.city ?? ""}
          onChange={(e) => setFilter("city", e.target.value || undefined)}
        />
        <SelectField
          label="Trade"
          options={TRADE_OPTIONS}
          value={filters.trade ?? ""}
          onChange={(e) => setFilter("trade", e.target.value || undefined)}
        />
        <TextField
          label="Max distance (mi)"
          type="number"
          min="0"
          value={filters.max_distance_miles ?? ""}
          onChange={(e) =>
            setFilter("max_distance_miles", e.target.value ? Number(e.target.value) : undefined)
          }
        />
        <TextField
          label="Min rating"
          type="number"
          min="0"
          max="5"
          step="0.1"
          value={filters.min_rating ?? ""}
          onChange={(e) => setFilter("min_rating", e.target.value ? Number(e.target.value) : undefined)}
        />
        <TextField
          label="Min review count"
          type="number"
          min="0"
          value={filters.min_review_count ?? ""}
          onChange={(e) =>
            setFilter("min_review_count", e.target.value ? Number(e.target.value) : undefined)
          }
        />
        <SelectField
          label="License status"
          options={LICENSE_OPTIONS}
          value={filters.license_status ?? ""}
          onChange={(e) => setFilter("license_status", e.target.value || undefined)}
        />
        <SelectField
          label="Insurance status"
          options={LICENSE_OPTIONS}
          value={filters.insurance_status ?? ""}
          onChange={(e) => setFilter("insurance_status", e.target.value || undefined)}
        />
        <TextField
          label="Min quality score"
          type="number"
          min="0"
          max="1"
          step="0.05"
          value={filters.min_quality_score ?? ""}
          onChange={(e) =>
            setFilter("min_quality_score", e.target.value ? Number(e.target.value) : undefined)
          }
        />
        <TextField
          label="Min availability score"
          type="number"
          min="0"
          max="1"
          step="0.05"
          value={filters.min_availability_score ?? ""}
          onChange={(e) =>
            setFilter("min_availability_score", e.target.value ? Number(e.target.value) : undefined)
          }
        />
        <TextField
          label="Max risk score"
          type="number"
          min="0"
          max="1"
          step="0.05"
          value={filters.max_risk_score ?? ""}
          onChange={(e) =>
            setFilter("max_risk_score", e.target.value ? Number(e.target.value) : undefined)
          }
        />
        <TextField
          label="Min price fit"
          type="number"
          min="0"
          max="100"
          value={filters.min_price_fit ?? ""}
          onChange={(e) =>
            setFilter("min_price_fit", e.target.value ? Number(e.target.value) : undefined)
          }
        />
      </div>

      {loading && <Loading label="Loading vendors…" />}
      {error && <ErrorState message={error} />}
      {!loading && !error && vendors.length === 0 && (
        <EmptyState message="No vendors match these filters." />
      )}

      {!loading && !error && vendors.length > 0 && (
        <Table>
          <THead>
            <Tr>
              <Th>Vendor</Th>
              <Th>Trade</Th>
              <Th>City</Th>
              <Th>Rating</Th>
              <Th>License / Insurance</Th>
              <Th>Quality</Th>
              <Th>Price fit</Th>
              <Th>Availability</Th>
              <Th>Risk</Th>
            </Tr>
          </THead>
          <TBody>
            {vendors.map((vendor) => (
              <Tr key={vendor.id}>
                <Td>
                  <Link href={`/vendors/${vendor.id}`} className="font-medium text-slate-900 hover:underline">
                    {vendor.name}
                  </Link>
                </Td>
                <Td>{vendor.trade.replace(/_/g, " ")}</Td>
                <Td>{vendor.city}</Td>
                <Td>
                  {vendor.rating ?? "—"} ({vendor.review_count ?? 0})
                </Td>
                <Td>
                  {vendor.license_status ?? "unknown"} / {vendor.insurance_status ?? "unknown"}
                </Td>
                <Td>
                  <ScoreBadge label="Quality" value={vendor.quality_score} />
                </Td>
                <Td>
                  {vendor.price_fit != null ? (
                    <ScoreBadge label="Fit" value={vendor.price_fit} max={100} />
                  ) : (
                    "—"
                  )}
                </Td>
                <Td>
                  <ScoreBadge label="Avail" value={vendor.availability_score} />
                </Td>
                <Td>
                  <ScoreBadge label="Risk" value={vendor.risk_score} invert />
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
