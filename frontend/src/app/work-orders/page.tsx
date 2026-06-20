import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function WorkOrdersPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-zinc-900">Work Orders</h1>
          <Link href="/work-orders/new">
            <Button>New Work Order</Button>
          </Link>
        </div>
        <EmptyState
          title="No work orders yet"
          description="Work orders you create will show up here with status, bids, and recommended winners."
        />
      </div>
    </AppShell>
  );
}
