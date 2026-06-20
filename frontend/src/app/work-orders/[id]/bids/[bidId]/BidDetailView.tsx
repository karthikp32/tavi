import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

interface BidDetailViewProps {
  workOrderId: string;
  bidId: string;
}

export function BidDetailView({ workOrderId, bidId }: BidDetailViewProps) {
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-zinc-900">Bid {bidId}</h1>
        <p className="text-sm text-zinc-500">For work order {workOrderId}</p>
        <Card>
          <EmptyState
            title="Bid details unavailable"
            description="Bid amount, arrival window, scope notes, and AI notes will appear here."
          />
        </Card>
      </div>
    </AppShell>
  );
}
