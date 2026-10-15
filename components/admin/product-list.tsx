"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useMemo, useOptimistic, useRef, useState, type RefObject } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Search, Trash2, UtensilsCrossed } from "lucide-react";
import { deleteProduct, reorderProducts, setProductFlag } from "@/app/admin/menu-actions";
import { NativeSelect } from "@/components/admin/native-select";
import { restoreFocus } from "@/components/admin/restore-focus";
import { StatusText } from "@/components/admin/status-text";
import { useAdminAction, type ActionStatus } from "@/components/admin/use-admin-action";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { AdminCategory, AdminProduct } from "@/lib/admin/menu-data";
import { formatTaka, messages, toBanglaDigits } from "@/lib/i18n";
import { menuImageUrl } from "@/lib/supabase/storage";

const c = messages.admin.common;
const k = messages.admin.products;

type Flag = "is_active" | "is_available" | "is_featured";

function matches(product: AdminProduct, query: string) {
  if (!query) return true;
  const q = query.toLocaleLowerCase();
  return product.nameBn.toLocaleLowerCase().includes(q) || (product.nameEn ?? "").toLocaleLowerCase().includes(q);
}

export function ProductList({ products, categories }: { products: AdminProduct[]; categories: AdminCategory[] }) {
  const [ordered, setOrdered] = useOptimistic(products);
  const [categoryId, setCategoryId] = useState("");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<ActionStatus>(null);
  const reorder = useAdminAction();
  const ids = { search: useId(), category: useId() };

  const groups = useMemo(() => {
    const q = query.trim();
    return categories
      .filter((category) => !categoryId || category.id === categoryId)
      .map((category) => ({ category, items: ordered.filter((p) => p.categoryId === category.id && matches(p, q)) }))
      .filter((group) => group.items.length > 0 || (!q && categoryId === group.category.id));
  }, [categories, categoryId, ordered, query]);

  const canReorder = query.trim() === "";

  function move(group: AdminProduct[], index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= group.length) return;
    const next = [...group];
    [next[index], next[target]] = [next[target], next[index]];
    // Put the group's items back into their slots in the full list, in the new order.
    const inGroup = new Set(next.map((p) => p.id));
    let slot = 0;
    const reordered = ordered.map((p) => (inGroup.has(p.id) ? next[slot++] : p));
    reorder.run(() => reorderProducts(next.map((p) => p.id)), { optimistic: () => setOrdered(reordered) });
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <p className="text-muted-foreground">{k.needCategory}</p>
        <Button asChild className="mt-3">
          <Link href="/admin/categories">{k.goToCategories}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <label htmlFor={ids.search} className="text-sm font-medium">
            {k.search}
          </label>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id={ids.search} type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" />
          </div>
        </div>
        <div className="space-y-1.5 sm:w-56">
          <label htmlFor={ids.category} className="text-sm font-medium">
            {k.filterCategory}
          </label>
          <NativeSelect id={ids.category} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">{k.allCategories}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.nameBn}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button asChild size="lg">
          <Link href="/admin/products/new">
            <Plus aria-hidden />
            {k.add}
          </Link>
        </Button>
      </div>

      <StatusText status={reorder.status ?? notice} />

      {products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">{k.empty}</p>
      ) : groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">{k.noMatch}</p>
      ) : (
        groups.map(({ category, items }) => (
          <section key={category.id} aria-labelledby={`group-${category.id}`} className="space-y-2">
            <h2 id={`group-${category.id}`} className="flex flex-wrap items-center gap-2 pt-2 font-semibold">
              {category.nameBn}
              <span className="text-sm font-normal text-muted-foreground">({toBanglaDigits(items.length)})</span>
              {!category.isActive && <Badge variant="secondary">{k.categoryHidden}</Badge>}
            </h2>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{k.empty}</p>
            ) : (
              <ol className="space-y-2">
                {items.map((product, index) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    canMoveUp={canReorder && index > 0}
                    canMoveDown={canReorder && index < items.length - 1}
                    reordering={reorder.pending}
                    onMove={(delta) => move(items, index, delta)}
                    onDeleted={() => setNotice({ kind: "success", text: k.deleted })}
                  />
                ))}
              </ol>
            )}
          </section>
        ))
      )}
    </div>
  );
}

function priceLabel(product: AdminProduct): string {
  if (product.variants.length === 0) return formatTaka(product.price);
  const prices = product.variants.map((variant) => variant.price);
  const min = Math.min(...prices);
  return new Set(prices).size > 1 ? `${formatTaka(min)} ${messages.menu.fromPrice}` : formatTaka(min);
}

function ProductRow({
  product,
  canMoveUp,
  canMoveDown,
  reordering,
  onMove,
  onDeleted,
}: {
  product: AdminProduct;
  canMoveUp: boolean;
  canMoveDown: boolean;
  reordering: boolean;
  onMove: (delta: -1 | 1) => void;
  onDeleted: () => void;
}) {
  const [flags, setFlags] = useOptimistic({
    is_active: product.isActive,
    is_available: product.isAvailable,
    is_featured: product.isFeatured,
  });
  const [deleting, setDeleting] = useState(false);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const toggle = useAdminAction();
  const imageUrl = menuImageUrl(product.imagePath);
  const switchIds = { is_active: useId(), is_available: useId(), is_featured: useId() };

  function setFlag(field: Flag, value: boolean) {
    toggle.run(() => setProductFlag({ id: product.id, field, value }), { optimistic: () => setFlags((f) => ({ ...f, [field]: value })) });
  }

  const switches: { field: Flag; label: string }[] = [
    { field: "is_active", label: k.visible },
    { field: "is_available", label: k.available },
    { field: "is_featured", label: k.featured },
  ];

  return (
    <li className="rounded-xl border border-border bg-card p-3">
      <div className="flex gap-3">
        <div className="flex flex-col gap-1">
          <Button type="button" size="icon-sm" variant="ghost" disabled={!canMoveUp || reordering} onClick={() => onMove(-1)} aria-label={c.moveUp(product.nameBn)}>
            <ArrowUp aria-hidden />
          </Button>
          <Button type="button" size="icon-sm" variant="ghost" disabled={!canMoveDown || reordering} onClick={() => onMove(1)} aria-label={c.moveDown(product.nameBn)}>
            <ArrowDown aria-hidden />
          </Button>
        </div>
        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
          {imageUrl ? (
            <Image src={imageUrl} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground" aria-hidden>
              <UtensilsCrossed className="size-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-semibold">{product.nameBn}</h3>
            {product.nameEn && <span className="text-sm text-muted-foreground">{product.nameEn}</span>}
          </div>
          <p className="font-semibold text-gold">{priceLabel(product)}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {!flags.is_active && <Badge variant="secondary">{k.hiddenBadge}</Badge>}
            {flags.is_active && !flags.is_available && <Badge variant="secondary">{k.unavailableBadge}</Badge>}
            {flags.is_featured && <Badge variant="outline">{k.featuredBadge}</Badge>}
            {product.slug.startsWith("sample-") && <Badge variant="outline">{c.sample}</Badge>}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3">
        {switches.map(({ field, label }) => (
          <label key={field} htmlFor={switchIds[field]} className="flex min-h-9 items-center gap-2 text-sm">
            <Switch id={switchIds[field]} checked={flags[field]} disabled={toggle.pending} onCheckedChange={(value) => setFlag(field, value)} />
            {label}
          </label>
        ))}
        <div className="ml-auto flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/products/${product.id}`} aria-label={`${c.edit}: ${product.nameBn}`}>
              <Pencil aria-hidden />
              {c.edit}
            </Link>
          </Button>
          <Button ref={deleteButton} type="button" size="sm" variant="destructive" onClick={() => setDeleting(true)} aria-label={`${c.delete}: ${product.nameBn}`}>
            <Trash2 aria-hidden />
            {c.delete}
          </Button>
        </div>
      </div>
      <StatusText status={toggle.status} className="mt-2" />
      <DeleteProductDialog product={product} open={deleting} onOpenChange={setDeleting} onDeleted={onDeleted} returnFocusRef={deleteButton} />
    </li>
  );
}

export function DeleteProductDialog({
  product,
  open,
  onOpenChange,
  onDeleted,
  returnFocusRef,
}: {
  product: { id: string; nameBn: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const action = useAdminAction();
  const deleted = useRef(false);
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
        onCloseAutoFocus={(event) => restoreFocus(event, returnFocusRef, deleted.current)}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{k.deleteTitle(product.nameBn)}</AlertDialogTitle>
          <AlertDialogDescription>{k.deleteBody}</AlertDialogDescription>
        </AlertDialogHeader>
        <StatusText status={action.status} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={action.pending}>{c.cancel}</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={action.pending}
            onClick={() =>
              action.run(() => deleteProduct(product.id), {
                onSuccess: () => {
                  deleted.current = true;
                  onOpenChange(false);
                  onDeleted();
                },
              })
            }
          >
            <Trash2 aria-hidden />
            {action.pending ? c.deleting : k.deleteConfirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
