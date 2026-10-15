"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { messages } from "@/lib/i18n";

// Never render error.message: it may contain internal details.
export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">{messages.errors.genericTitle}</h1>
      <p className="max-w-md text-muted-foreground">{messages.errors.genericBody}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button" size="lg" onClick={() => retry()}>
          {messages.actions.retry}
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/">{messages.actions.backHome}</Link>
        </Button>
      </div>
    </main>
  );
}
