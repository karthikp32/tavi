import { AppShell } from "@/components/layout/AppShell";
import { NewWorkOrderForm } from "./NewWorkOrderForm";

export default function NewWorkOrderPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-zinc-900">New Work Order</h1>
        <NewWorkOrderForm />
      </div>
    </AppShell>
  );
}
