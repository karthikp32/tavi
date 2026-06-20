import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";

export default function VendorsPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-zinc-900">Vendors</h1>
        <EmptyState
          title="No vendors found"
          description="Search vendors in NYC, LA, or Chicago by trade, rating, license, and score."
        />
      </div>
    </AppShell>
  );
}
