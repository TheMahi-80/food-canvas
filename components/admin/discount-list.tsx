"use client";

import Link from "next/link";
import { useId, useOptimistic, useState } from "react";
import { Info, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteDiscount, setDiscountActive } from "@/app/admin/discount-actions";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { StatusText } from "@/components/admin/status-text";
import { useAdminAction, type ActionStatus } from "@/components/admin/use-admin-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { discountStatus, type DiscountStatus } from "@/lib/admin/discount-status";
import { formatDhakaDateTimeBn } from "@/lib/hours/datetime";
import { formatTaka, messages, toBanglaDigits } from "@/lib/i18n";
import type { Discount } from "@/types/menu";

const c = messages.admin.common;
const k = messages.admin.discounts;

export function discountValueLabel(d: Pick<Discount, "type" | "value">): string {
  if (d.type === "percentage") return `${toBanglaDigits(d.value)}% ${messages.menu.off}`;
  if (d.type === "fixed") return `${formatTaka(d.value)} ${messages.menu.off}`;
  return `${k.types.sale_price.split(" (")[0]}: ${formatTaka(d.value)}`;
}

const STATUS_STYLE: Record<DiscountStatus, "default" | "secondary" | "outline"> = { live: "default", scheduled: "outline", ended: "secondary", off: "secondary" };

export function RulesNote() {
  return (
    <details className="rounded-xl border border-border bg-card p-4 text-sm">
      <summary className="flex cursor-pointer items-center gap-2 font-semibold">
        <Info aria-hidden className="size-4 text-gold" />
        {k.ruleTitle}
      </summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
        {k.rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </details>
  );
}

export function DiscountList({
  discounts,
  productNames,
  categoryNames,
  now,
}: {
  discounts: Discount[];
  productNames: Record<string, string>;
  categoryNames: Record<string, string>;
  now: number;
}) {
  const [notice, setNotice] = useState<ActionStatus>(null);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="lg">
          <Link href="/admin/discounts/new">
            <Plus aria-hidden />
            {k.add}
          </Link>
        </Button>
      </div>
      <RulesNote />
      <StatusText status={notice} />
      {discounts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">{k.empty}</p>
      ) : (
        <ul className="space-y-2">
          {discounts.map((d) => (
            <DiscountRow
              key={d.id}
              discount={d}
              target={d.scope === "product" ? productNames[d.productId ?? ""] : d.scope === "category" ? categoryNames[d.categoryId ?? ""] : null}
              now={now}
              onDeleted={() => setNotice({ kind: "success", text: k.deleted })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function DiscountRow({ discount: d, target, now, onDeleted }: { discount: Discount; target: string | null | undefined; now: number; onDeleted: () => void }) {
  const [active, setActive] = useOptimistic(d.isActive);
  const [deleting, setDeleting] = useState(false);
  const toggle = useAdminAction();
  const switchId = useId();
  const status = discountStatus({ ...d, isActive: active }, new Date(now));

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">{d.nameBn}</h2>
        <Badge variant={STATUS_STYLE[status]}>{k.status[status]}</Badge>
        {d.nameBn.startsWith("[নমুনা]") && <Badge variant="outline">{c.sample}</Badge>}
      </div>
      <p className="mt-1 text-sm">
        <span className="font-semibold text-gold">{discountValueLabel(d)}</span>
        {" · "}
        {k.scopes[d.scope]}
        {target ? `: ${target}` : ""}
      </p>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {d.couponCode && (
          <span>
            {k.couponShort("")}
            <code dir="ltr" className="font-semibold text-foreground">
              {d.couponCode}
            </code>
          </span>
        )}
        {d.minCartValue !== null && <span>{k.minCartShort(formatTaka(d.minCartValue))}</span>}
        {d.startsAt && <span>{`${k.from}: ${formatDhakaDateTimeBn(d.startsAt)}`}</span>}
        {d.endsAt && <span>{`${k.until}: ${formatDhakaDateTimeBn(d.endsAt)}`}</span>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3">
        <label htmlFor={switchId} className="flex min-h-9 items-center gap-2 text-sm">
          <Switch
            id={switchId}
            checked={active}
            disabled={toggle.pending}
            onCheckedChange={(next) => toggle.run(() => setDiscountActive({ id: d.id, isActive: next }), { optimistic: () => setActive(next) })}
          />
          {k.active}
        </label>
        <div className="ml-auto flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/discounts/${d.id}`} aria-label={`${c.edit}: ${d.nameBn}`}>
              <Pencil aria-hidden />
              {c.edit}
            </Link>
          </Button>
          <Button type="button" size="sm" variant="destructive" onClick={() => setDeleting(true)} aria-label={`${c.delete}: ${d.nameBn}`}>
            <Trash2 aria-hidden />
            {c.delete}
          </Button>
        </div>
      </div>
      <StatusText status={toggle.status} className="mt-2" />
      <ConfirmDeleteDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={k.deleteTitle(d.nameBn)}
        body={k.deleteBody}
        confirmLabel={k.deleteConfirm}
        onConfirm={() => deleteDiscount(d.id)}
        onDeleted={onDeleted}
      />
    </li>
  );
}
