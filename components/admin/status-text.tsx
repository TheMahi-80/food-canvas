import { CircleAlert, CircleCheck } from "lucide-react";
import type { ActionStatus } from "@/components/admin/use-admin-action";
import { cn } from "@/lib/utils";

/** Live region for action results. Always rendered so screen readers announce changes. */
export function StatusText({ status, className }: { status: ActionStatus; className?: string }) {
  return (
    <p role="status" aria-live="polite" className={cn("text-sm empty:hidden", className)}>
      {status && (
        <span className={cn("inline-flex items-start gap-1.5", status.kind === "error" ? "text-destructive" : "text-success")}>
          {status.kind === "error" ? <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" /> : <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0" />}
          {status.text}
        </span>
      )}
    </p>
  );
}
