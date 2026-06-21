import { AppShell } from "@/components/layout/AppShell";
import { ChatInput } from "@/components/chat/ChatInput";

export default function HomePage() {
  return (
    <AppShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-24 text-center">
        <h1 className="text-3xl font-semibold text-tavi-navy">Tavi</h1>
        <p className="max-w-xl text-tavi-navy/70">
          Your command center for trade work orders. Describe what you need and Tavi will find,
          contact, and compare vendors for you.
        </p>
        <ChatInput />
      </div>
    </AppShell>
  );
}
