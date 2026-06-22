"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { Table, type TableColumn } from "@/components/ui/Table";
import { formInputClassName } from "@/components/ui/styles";
import { getVendors, type VendorSearchFilters } from "@/lib/api/vendors";
import { VENDOR_CITIES, VENDOR_TRADES } from "@/lib/constants";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { Vendor } from "@/lib/types";

const ratingMarks = ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5"];
const MIN_PAGE_SIZE = 6;
const MAX_PAGE_SIZE = 18;

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

  const { data: vendors, isLoading, error } = useAsyncData<Vendor[]>(
    () => {
      const filters: VendorSearchFilters = {};
      if (city) filters.city = city;
      if (trade) filters.trade = trade;
      if (minRating) filters.rating = Number(minRating);
      return getVendors(filters);
    },
    [city, trade, minRating],
    [],
    "Could not load vendors. Please try again.",
  );

  const totalPages = Math.max(1, Math.ceil(vendors.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedVendors = useMemo(
    () => vendors.slice(pageStart, pageStart + pageSize),
    [vendors, pageStart, pageSize],
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
              setCity(event.target.value);
            }}
            className={formInputClassName}
          >
            <option value="">All cities</option>
            {VENDOR_CITIES.map((option) => (
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
              setTrade(event.target.value);
            }}
            className={formInputClassName}
          >
            <option value="">All trades</option>
            {VENDOR_TRADES.map((option) => (
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
