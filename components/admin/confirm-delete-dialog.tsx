"use client";

import type { RefObject } from "react";
import { Trash2 } from "lucide-react";
import { restoreFocus } from "@/components/admin/restore-focus";
import { StatusText } from "@/components/admin/status-text";
import { useAdminAction } from "@/components/admin/use-admin-action";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/admin/action-result";
import { messages } from "@/lib/i18n";

const c = messages.admin.common;

/** Confirmation before a permanent delete. Stays open (with the error) if the delete fails. */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  onConfirm,
  onDeleted,
  returnFocusRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => Promise<ActionResult<unknown>>;
  onDeleted: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const action = useAdminAction();
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (action.pending) return;
        onOpenChange(next);
        if (!next) action.setStatus(null);
      }}
    >
      <AlertDialogContent
        className="data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-md"
        onCloseAutoFocus={restoreFocus(returnFocusRef)}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <StatusText status={action.status} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={action.pending}>{c.cancel}</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={action.pending}
            onClick={() =>
              action.run(onConfirm, {
                onSuccess: () => {
                  onOpenChange(false);
                  onDeleted();
                },
              })
            }
          >
            <Trash2 aria-hidden />
            {action.pending ? c.deleting : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
