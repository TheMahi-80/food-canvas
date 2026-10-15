"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Controller, useFieldArray, useForm, useWatch, type Control, type FieldErrors, type Resolver, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { saveProduct } from "@/app/admin/menu-actions";
import { Field, fieldAria } from "@/components/admin/field";
import { NativeSelect } from "@/components/admin/native-select";
import { DeleteProductDialog } from "@/components/admin/product-list";
import { ImageField, useImagePicker } from "@/components/admin/image-field";
import { StatusText } from "@/components/admin/status-text";
import { useAdminAction } from "@/components/admin/use-admin-action";
import { ProductCard } from "@/components/menu/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { AdminCategory, AdminProduct } from "@/lib/admin/menu-data";
import { messages, toBanglaDigits } from "@/lib/i18n";
import { productPriceInfo } from "@/lib/pricing";
import { menuImageUrl } from "@/lib/supabase/storage";
import {
  MAX_ADDONS,
  MAX_VARIANTS,
  productInputSchema,
  takaSchema,
  type ProductFormValues,
  type ProductInput,
} from "@/lib/validation/admin-menu";
import type { Discount, MenuItem } from "@/types/menu";

const c = messages.admin.common;
const k = messages.admin.products;

type OptionList = "variants" | "addons";

function toFormValues(product: AdminProduct | null, defaultCategoryId: string): ProductFormValues {
  const option = (o: { id: string; nameBn: string; nameEn: string | null; price: number; isAvailable: boolean }) => ({
    id: o.id,
    nameBn: o.nameBn,
    nameEn: o.nameEn ?? "",
    price: String(o.price),
    isAvailable: o.isAvailable,
  });
  return {
    categoryId: product?.categoryId ?? defaultCategoryId,
    nameBn: product?.nameBn ?? "",
    nameEn: product?.nameEn ?? "",
    descriptionBn: product?.descriptionBn ?? "",
    descriptionEn: product?.descriptionEn ?? "",
    price: product ? String(product.price) : "",
    isActive: product?.isActive ?? true,
    isAvailable: product?.isAvailable ?? true,
    isFeatured: product?.isFeatured ?? false,
    variants: product?.variants.map(option) ?? [],
    addons: product?.addons.map(option) ?? [],
    removeImage: false,
  };
}

const priceOrZero = (value: unknown) => {
  const parsed = takaSchema.safeParse(value);
  return parsed.success ? parsed.data : 0;
};

export function ProductForm({
  product,
  categories,
  discounts,
  initialCategoryId,
  justCreated = false,
}: {
  product: AdminProduct | null;
  categories: AdminCategory[];
  discounts: Discount[];
  initialCategoryId?: string;
  justCreated?: boolean;
}) {
  const router = useRouter();
  const action = useAdminAction();
  const [deleting, setDeleting] = useState(false);
  const defaultCategory = initialCategoryId && categories.some((cat) => cat.id === initialCategoryId) ? initialCategoryId : (categories[0]?.id ?? "");
  const defaults = useMemo(() => toFormValues(product, defaultCategory), [product, defaultCategory]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ProductFormValues, unknown, ProductInput>({
    resolver: zodResolver(productInputSchema) as Resolver<ProductFormValues, unknown, ProductInput>,
    defaultValues: defaults,
    mode: "onTouched",
  });

  const picker = useImagePicker();
  const removeImage = useWatch({ control, name: "removeImage" });

  // Whenever the saved product changes (after a save), start from what is in the database.
  useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);
  const dirty = isDirty || picker.image !== null;

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const status = justCreated && !action.status && !dirty ? { kind: "success" as const, text: k.created } : action.status;

  const submit = handleSubmit((values) => {
    const formData = new FormData();
    formData.set("payload", JSON.stringify(values));
    if (product) formData.set("id", product.id);
    if (picker.image) formData.set("image", picker.image.file);
    action.run(() => saveProduct(formData), {
      success: c.saved,
      onSuccess: ({ id, created }) => {
        picker.clear();
        // Edits: the refreshed page passes the saved product back in and the form resets to it
        // (new sizes/extras get their database ids). New products open their edit page.
        if (created) router.replace(`/admin/products/${id}?created=1`);
      },
      onError: (result) => {
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          if (field === "image") picker.setError(message);
          else setError(field as Parameters<typeof setError>[0], { message });
        }
      },
    });
  });

  const savedImageUrl = menuImageUrl(product?.imagePath ?? null);
  const shownImage = picker.image?.url ?? (removeImage ? null : savedImageUrl);

  const ids = {
    nameBn: useId(),
    nameEn: useId(),
    descriptionBn: useId(),
    descriptionEn: useId(),
    category: useId(),
    price: useId(),
  };

  const hasVariants = (useWatch({ control, name: "variants" }) ?? []).length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form noValidate onSubmit={submit} className="space-y-6">
        {product?.slug.startsWith("sample-") && (
          <p className="rounded-xl border border-primary/50 bg-primary/10 p-3 text-sm">{k.sampleNote}</p>
        )}

        <Section title={k.sections.basics}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={ids.nameBn} label={k.nameBn} error={errors.nameBn?.message}>
              <Input {...fieldAria(ids.nameBn, { error: errors.nameBn?.message })} {...register("nameBn")} />
            </Field>
            <Field id={ids.nameEn} label={k.nameEn} optional={c.optional} hint={k.nameEnHint} error={errors.nameEn?.message}>
              <Input lang="en" {...fieldAria(ids.nameEn, { hint: k.nameEnHint, error: errors.nameEn?.message })} {...register("nameEn")} />
            </Field>
            <Field id={ids.category} label={k.category} error={errors.categoryId?.message}>
              <NativeSelect {...fieldAria(ids.category, { error: errors.categoryId?.message })} {...register("categoryId")}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.nameBn}
                    {category.isActive ? "" : ` (${messages.admin.categories.hiddenNote})`}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field id={ids.descriptionBn} label={k.descriptionBn} optional={c.optional} error={errors.descriptionBn?.message}>
            <Textarea rows={3} {...fieldAria(ids.descriptionBn, { error: errors.descriptionBn?.message })} {...register("descriptionBn")} />
          </Field>
          <Field id={ids.descriptionEn} label={k.descriptionEn} optional={c.optional} error={errors.descriptionEn?.message}>
            <Textarea lang="en" rows={2} {...fieldAria(ids.descriptionEn, { error: errors.descriptionEn?.message })} {...register("descriptionEn")} />
          </Field>
        </Section>

        <Section title={k.sections.price}>
          {hasVariants ? (
            <p className="text-sm text-muted-foreground">{k.priceFromVariants}</p>
          ) : (
            <Field id={ids.price} label={k.price} hint={k.priceHint} error={errors.price?.message} className="max-w-48">
              <Input inputMode="numeric" autoComplete="off" {...fieldAria(ids.price, { hint: k.priceHint, error: errors.price?.message })} {...register("price")} />
            </Field>
          )}
        </Section>

        <Section title={k.sections.options}>
          <OptionEditor list="variants" title={k.variants} hint={k.variantsHint} addLabel={k.addVariant} max={MAX_VARIANTS} control={control} register={register} errors={errors} />
          <OptionEditor list="addons" title={k.addons} hint={k.addonsHint} addLabel={k.addAddon} max={MAX_ADDONS} control={control} register={register} errors={errors} />
        </Section>

        <Section title={k.sections.image}>
          <ImageField
            label={k.image}
            hint={k.imageHint}
            picker={picker}
            savedUrl={savedImageUrl}
            remove={removeImage}
            onRemoveChange={(remove) => setValue("removeImage", remove, { shouldDirty: true })}
          />
        </Section>

        <Section title={k.sections.visibility}>
          <SwitchRow control={control} name="isActive" label={k.visible} hint={k.visibleHint} />
          <SwitchRow control={control} name="isAvailable" label={k.available} hint={k.availableHint} />
          <SwitchRow control={control} name="isFeatured" label={k.featured} hint={k.featuredHint} />
        </Section>

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
          <Button type="submit" size="lg" disabled={action.pending || picker.preparing}>
            {action.pending ? c.saving : c.save}
          </Button>
          <Button asChild variant="ghost">
            <Link href="/admin/products">{k.viewAll}</Link>
          </Button>
          {product && (
            <Button type="button" variant="destructive" className="ml-auto" onClick={() => setDeleting(true)}>
              <Trash2 aria-hidden />
              {c.delete}
            </Button>
          )}
          <div className="basis-full">
            {dirty && !action.pending && <p className="text-xs text-muted-foreground">{k.unsaved}</p>}
            <StatusText status={status} />
          </div>
        </div>
      </form>

      <aside aria-labelledby="product-preview" className="space-y-2 lg:sticky lg:top-32 lg:self-start">
        <h2 id="product-preview" className="font-semibold">
          {k.preview}
        </h2>
        <Preview control={control} product={product} categories={categories} discounts={discounts} imageSrc={shownImage} />
        <p className="text-xs text-muted-foreground">{k.previewNote}</p>
      </aside>

      {product && (
        <DeleteProductDialog
          product={product}
          open={deleting}
          onOpenChange={setDeleting}
          onDeleted={() => router.replace("/admin/products")}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-xl border border-border bg-card p-4">
      <legend className="px-1 font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function SwitchRow({
  control,
  name,
  label,
  hint,
}: {
  control: Control<ProductFormValues, unknown, ProductInput>;
  name: "isActive" | "isAvailable" | "isFeatured";
  label: string;
  hint: string;
}) {
  const id = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex items-start gap-3">
          <Switch id={id} checked={field.value} onCheckedChange={field.onChange} aria-describedby={`${id}-hint`} className="mt-1" />
          <div>
            <label htmlFor={id} className="text-sm font-medium">
              {label}
            </label>
            <p id={`${id}-hint`} className="text-xs text-muted-foreground">
              {hint}
            </p>
          </div>
        </div>
      )}
    />
  );
}

function OptionEditor({
  list,
  title,
  hint,
  addLabel,
  max,
  control,
  register,
  errors,
}: {
  list: OptionList;
  title: string;
  hint: string;
  addLabel: string;
  max: number;
  control: Control<ProductFormValues, unknown, ProductInput>;
  register: UseFormRegister<ProductFormValues>;
  errors: FieldErrors<ProductFormValues>;
}) {
  const { fields, append, remove, move } = useFieldArray({ control, name: list, keyName: "key" });
  const baseId = useId();
  const listErrors = errors[list];
  const rowLabel = list === "variants" ? k.variantLabel : k.addonLabel;
  const lastAdded = useRef<number | null>(null);

  useEffect(() => {
    if (lastAdded.current === null) return;
    document.getElementById(`${baseId}-${lastAdded.current}-nameBn`)?.focus();
    lastAdded.current = null;
  }, [fields.length, baseId]);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {fields.length > 0 && (
        <ol className="space-y-3">
          {fields.map((row, index) => {
            const rowErrors = Array.isArray(listErrors) ? listErrors[index] : undefined;
            const id = (field: string) => `${baseId}-${index}-${field}`;
            const label = rowLabel(toBanglaDigits(index + 1));
            return (
              <li key={row.key} className="rounded-lg border border-border p-3">
                <fieldset className="space-y-3">
                  <legend className="sr-only">{label}</legend>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem]">
                    <Field id={id("nameBn")} label={k.optionName} error={rowErrors?.nameBn?.message}>
                      <Input {...fieldAria(id("nameBn"), { error: rowErrors?.nameBn?.message })} {...register(`${list}.${index}.nameBn`)} />
                    </Field>
                    <Field id={id("nameEn")} label={k.optionNameEn} optional={c.optional} error={rowErrors?.nameEn?.message}>
                      <Input lang="en" {...fieldAria(id("nameEn"), { error: rowErrors?.nameEn?.message })} {...register(`${list}.${index}.nameEn`)} />
                    </Field>
                    <Field id={id("price")} label={k.optionPrice} error={rowErrors?.price?.message}>
                      <Input inputMode="numeric" autoComplete="off" {...fieldAria(id("price"), { error: rowErrors?.price?.message })} {...register(`${list}.${index}.price`)} />
                    </Field>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Controller
                      control={control}
                      name={`${list}.${index}.isAvailable`}
                      render={({ field }) => (
                        <label htmlFor={id("available")} className="mr-auto flex min-h-9 items-center gap-2 text-sm">
                          <Switch id={id("available")} checked={field.value} onCheckedChange={field.onChange} />
                          {k.optionAvailable}
                        </label>
                      )}
                    />
                    <Button type="button" size="icon-sm" variant="ghost" disabled={index === 0} onClick={() => move(index, index - 1)} aria-label={c.moveUp(label)}>
                      <ArrowUp aria-hidden />
                    </Button>
                    <Button type="button" size="icon-sm" variant="ghost" disabled={index === fields.length - 1} onClick={() => move(index, index + 1)} aria-label={c.moveDown(label)}>
                      <ArrowDown aria-hidden />
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => remove(index)} aria-label={`${c.remove}: ${label}`}>
                      <Trash2 aria-hidden />
                      {c.remove}
                    </Button>
                  </div>
                </fieldset>
              </li>
            );
          })}
        </ol>
      )}
      {!Array.isArray(listErrors) && listErrors?.message && (
        <p role="alert" className="text-sm text-destructive">
          {listErrors.message}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={fields.length >= max}
        onClick={() => {
          lastAdded.current = fields.length;
          append({ id: null, nameBn: "", nameEn: "", price: "", isAvailable: true }, { shouldFocus: false });
        }}
      >
        <Plus aria-hidden />
        {addLabel}
      </Button>
    </div>
  );
}

function Preview({
  control,
  product,
  categories,
  discounts,
  imageSrc,
}: {
  control: Control<ProductFormValues, unknown, ProductInput>;
  product: AdminProduct | null;
  categories: AdminCategory[];
  discounts: Discount[];
  imageSrc: string | null;
}) {
  const values = useWatch({ control });
  const [now] = useState(() => new Date());

  const item: MenuItem = {
    id: product?.id ?? "preview",
    categoryId: values.categoryId ?? "",
    slug: product?.slug ?? "preview",
    nameBn: values.nameBn?.trim() || k.nameBn,
    nameEn: values.nameEn?.trim() || null,
    descriptionBn: values.descriptionBn?.trim() || null,
    descriptionEn: values.descriptionEn?.trim() || null,
    price: priceOrZero(values.price),
    imagePath: null,
    isAvailable: values.isAvailable ?? true,
    isFeatured: values.isFeatured ?? false,
    sortOrder: 0,
    variants: (values.variants ?? []).map((v, i) => ({
      id: v?.id ?? `new-${i}`,
      nameBn: v?.nameBn ?? "",
      nameEn: v?.nameEn || null,
      price: priceOrZero(v?.price),
      isAvailable: v?.isAvailable ?? true,
    })),
    addons: (values.addons ?? []).map((a, i) => ({
      id: a?.id ?? `new-${i}`,
      nameBn: a?.nameBn ?? "",
      nameEn: a?.nameEn || null,
      price: priceOrZero(a?.price),
      isAvailable: a?.isAvailable ?? true,
    })),
  };
  const category = categories.find((cat) => cat.id === item.categoryId) ?? null;

  return (
    <div className="max-w-80">
      <ProductCard item={item} categoryName={category?.nameBn ?? null} priceInfo={productPriceInfo(item, discounts, now)} preview={{ imageSrc }} />
    </div>
  );
}
