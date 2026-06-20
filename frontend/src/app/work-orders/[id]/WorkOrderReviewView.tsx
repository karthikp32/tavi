import { AppShell } from "@/components/layout/AppShell";
import { CommandCenterLayout } from "@/components/layout/CommandCenterLayout";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

interface WorkOrderReviewViewProps {
  workOrderId: string;
}

export function WorkOrderReviewView({ workOrderId }: WorkOrderReviewViewProps) {
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-zinc-900">Work Order {workOrderId}</h1>
        <CommandCenterLayout
          left={
            <Card>
              <p className="text-sm text-zinc-500">Work order summary and current state.</p>
            </Card>
          }
          center={
            <EmptyState
              title="No activity yet"
              description="Communication history, bids, and status changes will appear here."
            />
          }
          right={
            <Card>
              <p className="text-sm text-zinc-500">
                Candidate pipeline, bid table, and recommendation.
              </p>
            </Card>
          }
        />
      </div>
    </AppShell>
  );
}
