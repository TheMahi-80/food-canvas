"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { messages } from "@/lib/i18n";

// Keeps the site header/footer. Never renders error.message (may contain internal details).
export default function PublicError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">{messages.menu.loadErrorTitle}</h1>
      <p className="text-muted-foreground">{messages.menu.loadErrorBody}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button" size="lg" onClick={() => retry()}>
          {messages.actions.retry}
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/">{messages.actions.backHome}</Link>
        </Button>
      </div>
    </div>
  );
}
