"use client";

import { useNow } from "@/hooks/use-now";
import { formatOpenStatusBn, getOpenStatus } from "@/lib/hours";
import { messages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { OpeningHoursDay } from "@/types/menu";

/**
 * Open/closed indicator computed in Asia/Dhaka from the device's current instant.
 * Renders a neutral placeholder on the server and during hydration (status depends on "now").
 */
export function OpenStatus({
  hours,
  temporarilyClosed,
  variant = "compact",
  className,
}: {
  hours: OpeningHoursDay[];
  temporarilyClosed: boolean;
  variant?: "compact" | "full";
  className?: string;
}) {
  const now = useNow();

  if (now === null) {
    return (
      <span className={cn("inline-flex h-7 w-20 animate-pulse rounded-full bg-muted", className)} aria-hidden />
    );
  }

  const status = getOpenStatus(new Date(now), hours, temporarilyClosed);
  const { label, detail } = formatOpenStatusBn(status);
  const isOpen = status.state === "open";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-medium",
        isOpen ? "border-success/40 text-success" : "border-destructive/40 text-destructive",
        className,
      )}
    >
      <span aria-hidden className={cn("size-2 rounded-full", isOpen ? "bg-success" : "bg-destructive")} />
      <span>{label}</span>
      {variant === "full" && detail && <span className="font-normal text-muted-foreground">· {detail}</span>}
      {variant === "compact" && detail && <span className="sr-only">, {detail}</span>}
    </span>
  );
}

/** True when the restaurant is currently not open (null until the client clock is known). */
export function useIsClosed(hours: OpeningHoursDay[], temporarilyClosed: boolean): boolean | null {
  const now = useNow();
  if (now === null) return null;
  return getOpenStatus(new Date(now), hours, temporarilyClosed).state !== "open";
}

export function ClosedNotice({ hours, temporarilyClosed }: { hours: OpeningHoursDay[]; temporarilyClosed: boolean }) {
  const closed = useIsClosed(hours, temporarilyClosed);
  if (!closed) return null;
  return (
    <p role="status" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
      {messages.menu.closedNotice}
    </p>
  );
}
