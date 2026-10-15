"use client";

import { useId, useOptimistic, useRef, useState, type RefObject } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { createCategory, deleteCategory, reorderCategories, updateCategory } from "@/app/admin/menu-actions";
import { Field, fieldAria } from "@/components/admin/field";
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
import type { ActionResult } from "@/lib/admin/action-result";
import type { AdminCategory } from "@/lib/admin/menu-data";
import { messages, toBanglaDigits } from "@/lib/i18n";
import { categoryInputSchema, type CategoryFormValues, type CategoryInput } from "@/lib/validation/admin-menu";

const c = messages.admin.common;
const k = messages.admin.categories;

export function CategoryManager({ categories }: { categories: AdminCategory[] }) {
  const [ordered, setOrdered] = useOptimistic(categories);
  const reorder = useAdminAction();
  const [notice, setNotice] = useState<ActionStatus>(null);

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    reorder.run(() => reorderCategories(next.map((category) => category.id)), { optimistic: () => setOrdered(next) });
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="add-category" className="rounded-xl border border-border bg-card p-4">
        <h2 id="add-category" className="mb-3 font-semibold">
          {k.addTitle}
        </h2>
        <CategoryForm
          initial={{ nameBn: "", nameEn: "", isActive: true }}
          submitLabel={c.add}
          resetOnSuccess
          successText={k.created}
          onSubmit={(values) => createCategory(values)}
        />
      </section>

      <section aria-labelledby="category-list" className="space-y-3">
        <h2 id="category-list" className="font-semibold">
          {k.title} ({toBanglaDigits(ordered.length)})
        </h2>
        <StatusText status={reorder.status ?? notice} />
        {ordered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">{k.empty}</p>
        ) : (
          <ol className="space-y-2">
            {ordered.map((category, index) => (
              <CategoryRow
                key={category.id}
                category={category}
                others={categories.filter((other) => other.id !== category.id)}
                isFirst={index === 0}
                isLast={index === ordered.length - 1}
                reordering={reorder.pending}
                onMove={(delta) => move(index, delta)}
                onDeleted={() => setNotice({ kind: "success", text: k.deleted })}
              />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function CategoryRow({
  category,
  others,
  isFirst,
  isLast,
  reordering,
  onMove,
  onDeleted,
}: {
  category: AdminCategory;
  others: AdminCategory[];
  isFirst: boolean;
  isLast: boolean;
  reordering: boolean;
  onMove: (delta: -1 | 1) => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useOptimistic(category.isActive);
  const toggle = useAdminAction();
  const switchId = useId();

  function setVisibility(next: boolean) {
    toggle.run(() => updateCategory({ id: category.id, nameBn: category.nameBn, nameEn: category.nameEn, isActive: next }), {
      optimistic: () => setActive(next),
    });
  }

  return (
    <li className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-1">
          <Button type="button" size="icon-sm" variant="ghost" disabled={isFirst || reordering} onClick={() => onMove(-1)} aria-label={c.moveUp(category.nameBn)}>
            <ArrowUp aria-hidden />
          </Button>
          <Button type="button" size="icon-sm" variant="ghost" disabled={isLast || reordering} onClick={() => onMove(1)} aria-label={c.moveDown(category.nameBn)}>
            <ArrowDown aria-hidden />
          </Button>
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <CategoryForm
              initial={{ nameBn: category.nameBn, nameEn: category.nameEn ?? "", isActive: category.isActive }}
              submitLabel={c.save}
              successText={c.saved}
              onSubmit={(values) => updateCategory({ ...values, id: category.id })}
              onDone={() => setEditing(false)}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{category.nameBn}</h3>
                {category.nameEn && <span className="text-sm text-muted-foreground">{category.nameEn}</span>}
                {!active && <Badge variant="secondary">{k.hiddenNote}</Badge>}
                {category.slug.startsWith("sample-") && <Badge variant="outline">{c.sample}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{k.productCount(toBanglaDigits(category.productCount))}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <label htmlFor={switchId} className="flex min-h-9 items-center gap-2 text-sm">
                  <Switch id={switchId} checked={active} disabled={toggle.pending} onCheckedChange={setVisibility} />
                  {k.showOnSite}
                </label>
                <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Pencil aria-hidden />
                  {c.edit}
                </Button>
                <Button ref={deleteButton} type="button" size="sm" variant="destructive" onClick={() => setDeleting(true)}>
                  <Trash2 aria-hidden />
                  {c.delete}
                </Button>
              </div>
              <StatusText status={toggle.status} className="mt-2" />
            </>
          )}
        </div>
      </div>
      <DeleteCategoryDialog category={category} others={others} open={deleting} onOpenChange={setDeleting} onDeleted={onDeleted} returnFocusRef={deleteButton} />
    </li>
  );
}

function CategoryForm({
  initial,
  submitLabel,
  successText,
  resetOnSuccess = false,
  onSubmit,
  onDone,
  onCancel,
}: {
  initial: CategoryFormValues;
  submitLabel: string;
  successText: string;
  resetOnSuccess?: boolean;
  onSubmit: (values: CategoryInput) => Promise<ActionResult<unknown>>;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const ids = { nameBn: useId(), nameEn: useId(), active: useId() };
  const action = useAdminAction();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CategoryFormValues, unknown, CategoryInput>({
    resolver: zodResolver(categoryInputSchema) as Resolver<CategoryFormValues, unknown, CategoryInput>,
    defaultValues: initial,
  });

  const submit = handleSubmit((values) =>
    action.run(() => onSubmit(values), {
      success: successText,
      onSuccess: () => {
        if (resetOnSuccess) reset(initial);
        onDone?.();
      },
      onError: (result) => {
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          if (field === "nameBn" || field === "nameEn") setError(field, { message });
        }
      },
    }),
  );

  return (
    <form noValidate onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={ids.nameBn} label={k.nameBn} error={errors.nameBn?.message}>
          <Input {...fieldAria(ids.nameBn, { error: errors.nameBn?.message })} {...register("nameBn")} />
        </Field>
        <Field id={ids.nameEn} label={k.nameEn} optional={c.optional} error={errors.nameEn?.message}>
          <Input lang="en" {...fieldAria(ids.nameEn, { error: errors.nameEn?.message })} {...register("nameEn")} />
        </Field>
      </div>
      <Controller
        control={control}
        name="isActive"
        render={({ field }) => (
          <label htmlFor={ids.active} className="flex min-h-9 items-center gap-2 text-sm">
            <Switch id={ids.active} checked={field.value} onCheckedChange={field.onChange} />
            {k.showOnSite}
          </label>
        )}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={action.pending}>
          {!onCancel && <Plus aria-hidden />}
          {action.pending ? c.saving : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {c.cancel}
          </Button>
        )}
      </div>
      <StatusText status={action.status} />
    </form>
  );
}

type DeleteChoice = "reassign" | "delete_products";

function DeleteCategoryDialog({
  category,
  others,
  open,
  onOpenChange,
  onDeleted,
  returnFocusRef,
}: {
  category: AdminCategory;
  others: AdminCategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const hasProducts = category.productCount > 0;
  const [choice, setChoice] = useState<DeleteChoice>(others.length > 0 ? "reassign" : "delete_products");
  const [targetId, setTargetId] = useState("");
  const [understood, setUnderstood] = useState(false);
  const action = useAdminAction();
  const ids = { target: useId(), understood: useId() };
  const count = toBanglaDigits(category.productCount);

  const canSubmit =
    !action.pending && (!hasProducts || (choice === "reassign" ? targetId !== "" && others.length > 0 : understood));

  function confirm() {
    const input = !hasProducts
      ? { id: category.id, mode: "empty" as const }
      : choice === "reassign"
        ? { id: category.id, mode: "reassign" as const, targetId }
        : { id: category.id, mode: "delete_products" as const, confirmCount: category.productCount };
    action.run(() => deleteCategory(input), {
      onSuccess: () => {
        onOpenChange(false);
        onDeleted();
      },
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (action.pending) return;
        onOpenChange(next);
        if (!next) {
          setUnderstood(false);
          action.setStatus(null);
        }
      }}
    >
      <AlertDialogContent
        className="data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-md"
        onCloseAutoFocus={restoreFocus(returnFocusRef)}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{k.deleteTitle(category.nameBn)}</AlertDialogTitle>
          <AlertDialogDescription>{hasProducts ? k.deleteHasProducts(count) : k.deleteEmpty}</AlertDialogDescription>
        </AlertDialogHeader>

        {hasProducts && (
          <fieldset className="space-y-3">
            <legend className="sr-only">{k.deleteHasProducts(count)}</legend>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name={`delete-${category.id}`}
                className="mt-1 size-4 accent-primary"
                checked={choice === "reassign"}
                disabled={others.length === 0}
                onChange={() => setChoice("reassign")}
              />
              <span>{k.moveTo}</span>
            </label>
            {choice === "reassign" &&
              (others.length > 0 ? (
                <div className="pl-6">
                  <label htmlFor={ids.target} className="text-sm font-medium">
                    {k.moveTarget}
                  </label>
                  <NativeSelect id={ids.target} value={targetId} onChange={(event) => setTargetId(event.target.value)} className="mt-1">
                    <option value="">{k.chooseTarget}</option>
                    {others.map((other) => (
                      <option key={other.id} value={other.id}>
                        {other.nameBn}
                        {other.isActive ? "" : ` (${k.hiddenNote})`}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              ) : null)}
            {others.length === 0 && <p className="text-sm text-muted-foreground">{k.noOtherCategory}</p>}

            <label className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name={`delete-${category.id}`}
                className="mt-1 size-4 accent-primary"
                checked={choice === "delete_products"}
                onChange={() => setChoice("delete_products")}
              />
              <span>{k.deleteProducts(count)}</span>
            </label>
            {choice === "delete_products" && (
              <label htmlFor={ids.understood} className="flex items-start gap-2 pl-6 text-sm font-medium text-destructive">
                <input
                  id={ids.understood}
                  type="checkbox"
                  className="mt-1 size-4 accent-primary"
                  checked={understood}
                  onChange={(event) => setUnderstood(event.target.checked)}
                />
                {k.confirmDeleteProducts}
              </label>
            )}
          </fieldset>
        )}

        <StatusText status={action.status} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={action.pending}>{c.cancel}</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={!canSubmit} onClick={confirm}>
            <Trash2 aria-hidden />
            {action.pending ? c.deleting : k.deleteConfirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
