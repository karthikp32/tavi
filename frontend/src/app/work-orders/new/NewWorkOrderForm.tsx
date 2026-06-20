"use client";

import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";

export function NewWorkOrderForm() {
  return (
    <form className="flex max-w-xl flex-col gap-4" onSubmit={(event) => event.preventDefault()}>
      <FormField label="Trade" htmlFor="trade">
        <input
          id="trade"
          name="trade"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </FormField>
      <FormField label="Facility or service address" htmlFor="address">
        <input
          id="address"
          name="address"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </FormField>
      <FormField label="Scope of work" htmlFor="description">
        <textarea
          id="description"
          name="description"
          rows={4}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </FormField>
      <FormField label="Requested date and time" htmlFor="requested_start_at">
        <input
          id="requested_start_at"
          name="requested_start_at"
          type="datetime-local"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </FormField>
      <FormField label="Target budget" htmlFor="target_budget">
        <input
          id="target_budget"
          name="target_budget"
          type="number"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </FormField>
      <Button type="submit">Create Work Order</Button>
    </form>
  );
}
