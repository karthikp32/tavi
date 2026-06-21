"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Table, type TableColumn } from "@/components/ui/Table";
import { getFacilities } from "@/lib/api/facilities";
import { getSession, type Session } from "@/lib/auth";
import type { Facility } from "@/lib/types";

export default function FacilitiesPage() {
  const [session] = useState<Session | null>(() => getSession());
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || session.type !== "facility_manager") return;
    let isCancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getFacilities();
        if (!isCancelled) setFacilities(result);
      } catch {
        if (!isCancelled) setError("Could not load facilities. Please try again.");
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [session]);

  if (!session || session.type !== "facility_manager") {
    return null;
  }

  const columns: TableColumn<Facility>[] = [
    { key: "name", header: "Name", render: (facility) => facility.name },
    { key: "address", header: "Address", render: (facility) => facility.address },
    { key: "city", header: "City", render: (facility) => facility.city ?? "—" },
    { key: "state", header: "State", render: (facility) => facility.state ?? "—" },
    {
      key: "postal_code",
      header: "Postal Code",
      render: (facility) => facility.postal_code ?? "—",
    },
  ];

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-tavi-navy">Facilities</h1>

        {isLoading ? <LoadingState label="Loading facilities…" /> : null}
        {error ? <ErrorState message={error} /> : null}
        {!isLoading && !error && facilities.length === 0 ? (
          <EmptyState
            title="No facilities found"
            description="Facilities you manage will appear here."
          />
        ) : null}
        {!isLoading && !error && facilities.length > 0 ? (
          <Table columns={columns} rows={facilities} getRowKey={(facility) => facility.id} />
        ) : null}
      </div>
    </AppShell>
  );
}
