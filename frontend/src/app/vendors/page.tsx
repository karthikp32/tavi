"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { Table, type TableColumn } from "@/components/ui/Table";
import { getVendors, type VendorSearchFilters } from "@/lib/api/vendors";
import type { Vendor } from "@/lib/types";

const inputClassName =
  "rounded-md border border-tavi-navy/20 px-3 py-2 text-sm text-tavi-navy focus:border-tavi-indigo focus:outline-none";

const cities = ["New York", "Los Angeles", "Chicago"];
const trades = ["Plumbing", "Electrical", "HVAC", "Cleaning", "Lawncare", "General maintenance"];
const ratingMarks = ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5"];
const MIN_PAGE_SIZE = 6;
const MAX_PAGE_SIZE = 18;

const statusRank: Record<string, number> = {
  verified: 0,
  not_required: 1,
  unknown: 2,
  unverified: 3,
  expired: 4,
};

function compareDescending(a: number | null, b: number | null): number {
  return (b ?? -1) - (a ?? -1);
}

function compareAscending(a: number | null, b: number | null): number {
  return (a ?? Infinity) - (b ?? Infinity);
}

function compareStatus(a: string | null, b: string | null): number {
  return (statusRank[a ?? "unknown"] ?? 2) - (statusRank[b ?? "unknown"] ?? 2);
}

function compareVendors(a: Vendor, b: Vendor): number {
  return (
    compareDescending(a.rating, b.rating) ||
    compareDescending(a.quality_score, b.quality_score) ||
    compareDescending(a.availability_score, b.availability_score) ||
    compareAscending(a.risk_score, b.risk_score) ||
    compareStatus(a.license_status, b.license_status) ||
    compareStatus(a.insurance_status, b.insurance_status)
  );
}

function getViewportPageSize() {
  if (typeof window === "undefined") return 10;

  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const availableTableHeight = viewportHeight - 360;
  return Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, Math.floor(availableTableHeight / 48)));
}

export default function VendorsPage() {
  const [city, setCity] = useState("");
  const [trade, setTrade] = useState("");
  const [minRating, setMinRating] = useState("4");

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(getViewportPageSize);

  useEffect(() => {
    const updatePageSize = () => {
      setPageSize(getViewportPageSize());
      setPage(1);
    };

    window.addEventListener("resize", updatePageSize);
    window.visualViewport?.addEventListener("resize", updatePageSize);
    return () => {
      window.removeEventListener("resize", updatePageSize);
      window.visualViewport?.removeEventListener("resize", updatePageSize);
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const filters: VendorSearchFilters = {};
    if (city) filters.city = city;
    if (trade) filters.trade = trade;
    if (minRating) filters.rating = Number(minRating);

    getVendors(filters)
      .then((result) => {
        if (!isCancelled) setVendors(result);
      })
      .catch(() => {
        if (!isCancelled) setError("Could not load vendors. Please try again.");
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [city, trade, minRating]);

  const sortedVendors = useMemo(() => [...vendors].sort(compareVendors), [vendors]);

  const totalPages = Math.max(1, Math.ceil(sortedVendors.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedVendors = useMemo(
    () => sortedVendors.slice(pageStart, pageStart + pageSize),
    [sortedVendors, pageStart, pageSize],
  );

  const columns: TableColumn<Vendor>[] = [
    {
      key: "name",
      header: "Name",
      render: (vendor) => (
        <Link href={`/vendors/${vendor.id}`} className="font-medium text-tavi-indigo underline">
          {vendor.name}
        </Link>
      ),
    },
    { key: "trade", header: "Trade", render: (vendor) => vendor.trade },
    { key: "city", header: "City", render: (vendor) => vendor.city ?? "—" },
    {
      key: "rating",
      header: "Rating",
      render: (vendor) => (vendor.rating !== null ? vendor.rating.toFixed(1) : "—"),
    },
    {
      key: "quality_score",
      header: "Quality",
      render: (vendor) => <ScoreBadge label="Quality" score={vendor.quality_score} />,
    },
    {
      key: "availability_score",
      header: "Availability",
      render: (vendor) => <ScoreBadge label="Availability" score={vendor.availability_score} />,
    },
    {
      key: "risk_score",
      header: "Risk",
      render: (vendor) => <ScoreBadge label="Risk" score={vendor.risk_score} />,
    },
    {
      key: "license_status",
      header: "License",
      render: (vendor) => vendor.license_status ?? "—",
    },
    {
      key: "insurance_status",
      header: "Insurance",
      render: (vendor) => vendor.insurance_status ?? "—",
    },
  ];

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-tavi-navy">Vendors</h1>

        <form className="flex flex-wrap gap-3" onSubmit={(event) => event.preventDefault()}>
          <select
            aria-label="City"
            value={city}
            onChange={(event) => {
              setPage(1);
              setIsLoading(true);
              setError(null);
              setCity(event.target.value);
            }}
            className={inputClassName}
          >
            <option value="">All cities</option>
            {cities.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            aria-label="Trade"
            value={trade}
            onChange={(event) => {
              setPage(1);
              setIsLoading(true);
              setError(null);
              setTrade(event.target.value);
            }}
            className={inputClassName}
          >
            <option value="">All trades</option>
            {trades.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-3 text-sm text-tavi-navy/80">
            <span>Min rating: {Number(minRating).toFixed(1)}</span>
            <input
              aria-label="Minimum rating"
              type="range"
              min="1"
              max="5"
              step="0.5"
              list="min-rating-marks"
              value={minRating}
              onChange={(event) => {
                setPage(1);
                setIsLoading(true);
                setError(null);
                setMinRating(event.target.value);
              }}
              className="h-1 w-40 cursor-pointer accent-tavi-navy-dark"
            />
            <datalist id="min-rating-marks">
              {ratingMarks.map((mark) => (
                <option key={mark} value={mark} />
              ))}
            </datalist>
          </label>
        </form>

        {isLoading ? <LoadingState label="Loading vendors…" /> : null}
        {error ? <ErrorState message={error} /> : null}
        {!isLoading && !error && vendors.length === 0 ? (
          <EmptyState
            title="No vendors found"
            description="Search vendors in NYC, LA, or Chicago by trade, rating, license, and score."
          />
        ) : null}
        {!isLoading && !error && vendors.length > 0 ? (
          <div className="flex flex-col gap-3">
            <Table columns={columns} rows={paginatedVendors} getRowKey={(vendor) => vendor.id} />
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-tavi-navy/70">
              <span>
                Showing {pageStart + 1}-{Math.min(pageStart + pageSize, vendors.length)} of {vendors.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage === 1}
                  className="rounded-md border border-tavi-navy/20 px-3 py-2 font-medium text-tavi-navy disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span aria-live="polite">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-md border border-tavi-navy/20 px-3 py-2 font-medium text-tavi-navy disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
