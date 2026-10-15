"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/admin/action-result";
import { messages } from "@/lib/i18n";

export type ActionStatus = { kind: "success" | "error"; text: string } | null;

/** Runs an admin Server Action in a transition and keeps a Bangla status message for the UI. */
export function useAdminAction() {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<ActionStatus>(null);

  function run<T>(
    action: () => Promise<ActionResult<T>>,
    options: { success?: string; onSuccess?: (data: T) => void; onError?: (result: Extract<ActionResult<T>, { ok: false }>) => void; optimistic?: () => void } = {},
  ) {
    setStatus(null);
    startTransition(async () => {
      options.optimistic?.();
      try {
        const result = await action();
        if (result.ok) {
          if (options.success) setStatus({ kind: "success", text: options.success });
          options.onSuccess?.(result.data);
        } else {
          setStatus({ kind: "error", text: result.error });
          options.onError?.(result);
        }
      } catch {
        // Network failure or server crash: the action never reported back.
        setStatus({ kind: "error", text: messages.admin.common.errorGeneric });
      }
    });
  }

  return { run, pending, status, setStatus };
}
