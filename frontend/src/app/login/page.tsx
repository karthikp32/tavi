"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { FormField } from "@/components/ui/FormField";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { homePathForSession, setSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const identity = await login(token.trim());
      const session = {
        id: identity.id,
        type: identity.type,
        name: identity.name,
        trade: identity.trade,
        company_id: identity.company_id,
      };
      setSession(session);
      router.push(homePathForSession(session));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Invalid token");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-6 bg-tavi-pale-blue/40 px-4">
      <h1 className="text-2xl font-semibold text-tavi-navy">Tavi</h1>
      <form
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-white p-6 shadow-sm"
        onSubmit={handleSubmit}
      >
        <FormField label="Login token" htmlFor="token">
          <input
            id="token"
            name="token"
            autoFocus
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="facility-manager-1"
            className="rounded-md border border-tavi-navy/20 px-3 py-2 text-sm text-tavi-navy focus:border-tavi-indigo focus:outline-none"
          />
        </FormField>
        {error ? <ErrorState message={error} /> : null}
        <Button type="submit" disabled={isSubmitting || !token.trim()}>
          Log in
        </Button>
      </form>
    </div>
  );
}
