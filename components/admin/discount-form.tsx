"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveDiscount } from "@/app/admin/discount-actions";
import { RulesNote } from "@/components/admin/discount-list";
import { Field, fieldAria } from "@/components/admin/field";
import { NativeSelect } from "@/components/admin/native-select";
import { StatusText } from "@/components/admin/status-text";
import { useAdminAction } from "@/components/admin/use-admin-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { isoToDhakaLocal } from "@/lib/hours/datetime";
import { formatTaka, messages } from "@/lib/i18n";
import { discountInputSchema, type DiscountFormValues, type DiscountInput } from "@/lib/validation/admin-discounts";
import type { Discount } from "@/types/menu";

const c = messages.admin.common;
const k = messages.admin.discounts;

export interface DiscountTargetProduct {
  id: string;
  nameBn: string;
  price: number;
  hasSizes: boolean;
}

function toFormValues(d: Discount | null): DiscountFormValues {
  return {
    nameBn: d?.nameBn ?? "",
    scope: d?.scope ?? "product",
    type: d?.type ?? "percentage",
    value: d ? String(d.value) : "",
    productId: d?.productId ?? "",
    categoryId: d?.categoryId ?? "",
    minCartValue: d?.minCartValue != null ? String(d.minCartValue) : "",
    couponCode: d?.couponCode ?? "",
    startsAt: isoToDhakaLocal(d?.startsAt ?? null),
    endsAt: isoToDhakaLocal(d?.endsAt ?? null),
    isActive: d?.isActive ?? true,
  };
}

export function DiscountForm({
  discount,
  products,
  categories,
  justCreated = false,
}: {
  discount: Discount | null;
  products: DiscountTargetProduct[];
  categories: { id: string; nameBn: string }[];
  justCreated?: boolean;
}) {
  const router = useRouter();
  const action = useAdminAction();
  const defaults = useMemo(() => toFormValues(discount), [discount]);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm<DiscountFormValues, unknown, DiscountInput>({
    resolver: zodResolver(discountInputSchema) as Resolver<DiscountFormValues, unknown, DiscountInput>,
    defaultValues: defaults,
    mode: "onTouched",
  });

  useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  const scope = useWatch({ control, name: "scope" });
  const type = useWatch({ control, name: "type" });
  const productId = useWatch({ control, name: "productId" });
  const product = products.find((p) => p.id === productId) ?? null;
  const productHint = product
    ? `${messages.admin.products.price}: ${formatTaka(product.price)}${product.hasSizes ? ` (${messages.menu.hasVariants})` : ""}`
    : undefined;

  // A sale price only makes sense for one product.
  useEffect(() => {
    if (scope !== "product" && type === "sale_price") setValue("type", "percentage", { shouldDirty: true });
  }, [scope, type, setValue]);

  const ids = {
    name: useId(),
    scope: useId(),
    type: useId(),
    value: useId(),
    product: useId(),
    category: useId(),
    min: useId(),
    coupon: useId(),
    starts: useId(),
    ends: useId(),
    active: useId(),
  };

  const valueLabel = type === "percentage" ? k.valuePercent : type === "fixed" ? k.valueFixed : k.valueSale;
  const status = justCreated && !action.status && !isDirty ? { kind: "success" as const, text: k.created } : action.status;

  // The browser check passed; the server validates the raw form values again with the same schema.
  const submit = handleSubmit(() =>
    action.run(() => saveDiscount(discount?.id ?? null, getValues()), {
      success: c.saved,
      onSuccess: ({ id, created }) => {
        if (created) router.replace(`/admin/discounts/${id}?created=1`);
      },
      onError: (result) => {
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          setError(field as keyof DiscountFormValues, { message });
        }
      },
    }),
  );

  return (
    <form noValidate onSubmit={submit} className="max-w-2xl space-y-5">
      <RulesNote />
      <fieldset className="space-y-4 rounded-xl border border-border bg-card p-4">
        <Field id={ids.name} label={k.name} hint={k.nameHint} error={errors.nameBn?.message}>
          <Input {...fieldAria(ids.name, { hint: k.nameHint, error: errors.nameBn?.message })} {...register("nameBn")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={ids.scope} label={k.scope}>
            <NativeSelect {...fieldAria(ids.scope, {})} {...register("scope")}>
              {(["product", "category", "cart"] as const).map((s) => (
                <option key={s} value={s}>
                  {k.scopes[s]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id={ids.type} label={k.type} error={errors.type?.message}>
            <NativeSelect {...fieldAria(ids.type, { error: errors.type?.message })} {...register("type")}>
              <option value="percentage">{k.types.percentage}</option>
              <option value="fixed">{k.types.fixed}</option>
              {scope === "product" && <option value="sale_price">{k.types.sale_price}</option>}
            </NativeSelect>
          </Field>
        </div>

        {scope === "product" && (
          <Field
            id={ids.product}
            label={k.product}
            error={errors.productId?.message}
            hint={productHint}
          >
            <NativeSelect {...fieldAria(ids.product, { error: errors.productId?.message, hint: productHint })} {...register("productId")}>
              <option value="">{k.chooseProduct}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameBn}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}
        {scope === "category" && (
          <Field id={ids.category} label={k.category} error={errors.categoryId?.message}>
            <NativeSelect {...fieldAria(ids.category, { error: errors.categoryId?.message })} {...register("categoryId")}>
              <option value="">{k.chooseCategory}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nameBn}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}

        <Field id={ids.value} label={valueLabel} error={errors.value?.message} className="max-w-48">
          <Input inputMode="numeric" autoComplete="off" {...fieldAria(ids.value, { error: errors.value?.message })} {...register("value")} />
        </Field>

        {scope === "cart" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={ids.min} label={k.minCart} optional={c.optional} hint={k.minCartHint} error={errors.minCartValue?.message}>
              <Input inputMode="numeric" autoComplete="off" {...fieldAria(ids.min, { hint: k.minCartHint, error: errors.minCartValue?.message })} {...register("minCartValue")} />
            </Field>
            <Field id={ids.coupon} label={k.coupon} optional={c.optional} hint={k.couponHint} error={errors.couponCode?.message}>
              <Input
                dir="ltr"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                className="uppercase"
                {...fieldAria(ids.coupon, { hint: k.couponHint, error: errors.couponCode?.message })}
                {...register("couponCode")}
              />
            </Field>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={ids.starts} label={k.startsAt} optional={c.optional} hint={k.timeHint} error={errors.startsAt?.message}>
            <Input type="datetime-local" {...fieldAria(ids.starts, { hint: k.timeHint, error: errors.startsAt?.message })} {...register("startsAt")} />
          </Field>
          <Field id={ids.ends} label={k.endsAt} optional={c.optional} error={errors.endsAt?.message}>
            <Input type="datetime-local" {...fieldAria(ids.ends, { error: errors.endsAt?.message })} {...register("endsAt")} />
          </Field>
        </div>

        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <label htmlFor={ids.active} className="flex min-h-9 items-center gap-2 text-sm font-medium">
              <Switch id={ids.active} checked={field.value} onCheckedChange={field.onChange} />
              {k.active}
            </label>
          )}
        />
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="lg" disabled={action.pending}>
          {action.pending ? c.saving : c.save}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/admin/discounts">{k.viewAll}</Link>
        </Button>
      </div>
      <StatusText status={status} />
    </form>
  );
}
