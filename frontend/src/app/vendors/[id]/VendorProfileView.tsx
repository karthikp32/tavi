import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";

interface VendorProfileViewProps {
  vendorId: string;
}

export function VendorProfileView({ vendorId }: VendorProfileViewProps) {
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-zinc-900">Vendor {vendorId}</h1>
        <Card>
          <p className="text-sm text-zinc-500">
            Vendor name, trade, location, contact info, ratings, and scores will appear here.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
