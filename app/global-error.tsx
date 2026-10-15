"use client";

import "./globals.css";
import { messages } from "@/lib/i18n";

// Last-resort error page when the root layout itself fails. Never shows error details.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="bn" data-theme="dark">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground">
        <h1 className="text-2xl font-bold">{messages.errors.genericTitle}</h1>
        <p className="max-w-md text-muted-foreground">{messages.errors.genericBody}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => retry()} className="h-12 rounded-lg bg-primary px-5 font-medium text-primary-foreground">
            {messages.actions.retry}
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the app router may be broken here */}
          <a href="/" className="inline-flex h-12 items-center rounded-lg border border-border px-5 font-medium">
            {messages.actions.backHome}
          </a>
        </div>
      </body>
    </html>
  );
}
