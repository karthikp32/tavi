"use client";

import { useState } from "react";
import { Button } from "../ui/Button";

export function ChatInput() {
  const [value, setValue] = useState("");

  return (
    <form
      className="flex w-full max-w-2xl flex-col gap-3"
      onSubmit={(event) => event.preventDefault()}
    >
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Describe your work order and Tavi will finding matching vendors for your needs"
        rows={3}
        className="w-full resize-none rounded-lg border border-zinc-300 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none"
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={value.trim().length === 0}>
          Send
        </Button>
      </div>
    </form>
  );
}
