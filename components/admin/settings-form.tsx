"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, type ReactNode } from "react";
import { Controller, useForm, useWatch, type Control, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveSettings } from "@/app/admin/settings-actions";
import { Field, fieldAria } from "@/components/admin/field";
import { ImageField, useImagePicker } from "@/components/admin/image-field";
import { StatusText } from "@/components/admin/status-text";
import { useAdminAction } from "@/components/admin/use-admin-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { messages } from "@/lib/i18n";
import { menuImageUrl } from "@/lib/supabase/storage";
import { boolToTri, settingsInputSchema, type SettingsFormValues, type SettingsInput } from "@/lib/validation/admin-settings";
import { normalizeBdPhone } from "@/lib/validation/customer";
import { formatWhatsAppDisplay } from "@/lib/whatsapp/number";
import type { PublicSettings } from "@/types/menu";

const c = messages.admin.common;
const k = messages.admin.settings;

function toFormValues(s: PublicSettings): SettingsFormValues {
  return {
    restaurantName: s.restaurantName,
    whatsappNumber: `0${s.whatsappNumber.slice(3)}`,
    contactPhone: s.contactPhone ?? "",
    email: s.email ?? "",
    facebookUrl: s.facebookUrl ?? "",
    addressBn: s.addressBn ?? "",
    mapUrl: s.mapUrl ?? "",
    temporarilyClosed: s.temporarilyClosed,
    closureNoteBn: s.closureNoteBn ?? "",
    deliveryEnabled: boolToTri(s.deliveryEnabled),
    pickupEnabled: boolToTri(s.pickupEnabled),
    deliveryFee: s.deliveryFee !== null ? String(s.deliveryFee) : "",
    minOrder: s.minOrder !== null ? String(s.minOrder) : "",
    heroHeadlineBn: s.heroHeadlineBn,
    heroSubtextBn: s.heroSubtextBn,
    aboutBn: s.aboutBn ?? "",
    removeHeroImage: false,
  };
}

export function SettingsForm({ settings }: { settings: PublicSettings }) {
  const action = useAdminAction();
  const picker = useImagePicker();
  const defaults = useMemo(() => toFormValues(settings), [settings]);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues, unknown, SettingsInput>({
    resolver: zodResolver(settingsInputSchema) as Resolver<SettingsFormValues, unknown, SettingsInput>,
    defaultValues: defaults,
    mode: "onTouched",
  });

  useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  const dirty = isDirty || picker.image !== null;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const typedNumber = useWatch({ control, name: "whatsappNumber" });
  const removeHero = useWatch({ control, name: "removeHeroImage" });
  const closed = useWatch({ control, name: "temporarilyClosed" });
  const normalized = normalizeBdPhone(typedNumber ?? "");
  const numberChanged = normalized !== null && normalized.slice(1) !== settings.whatsappNumber;

  // The browser check passed; the server validates the raw form values again with the same schema.
  const submit = handleSubmit(() => {
    const formData = new FormData();
    formData.set("payload", JSON.stringify(getValues()));
    if (picker.image) formData.set("heroImage", picker.image.file);
    action.run(() => saveSettings(formData), {
      success: k.saved,
      onSuccess: () => picker.clear(),
      onError: (result) => {
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          if (field === "heroImage") picker.setError(message);
          else setError(field as keyof SettingsFormValues, { message });
        }
      },
    });
  });

  const ids = {
    name: useId(),
    whatsapp: useId(),
    phone: useId(),
    email: useId(),
    facebook: useId(),
    address: useId(),
    map: useId(),
    note: useId(),
    fee: useId(),
    min: useId(),
    headline: useId(),
    subtext: useId(),
    about: useId(),
  };
  const err = (name: keyof SettingsFormValues) => errors[name]?.message;

  return (
    <form noValidate onSubmit={submit} className="space-y-6">
      <Section title={k.sections.general}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={ids.name} label={k.restaurantName} error={err("restaurantName")}>
            <Input {...fieldAria(ids.name, { error: err("restaurantName") })} {...register("restaurantName")} />
          </Field>
          <Field id={ids.whatsapp} label={k.whatsapp} hint={k.whatsappHint} error={err("whatsappNumber")}>
            <Input
              type="tel"
              inputMode="tel"
              dir="ltr"
              autoComplete="off"
              {...fieldAria(ids.whatsapp, { hint: k.whatsappHint, error: err("whatsappNumber") })}
              {...register("whatsappNumber")}
            />
          </Field>
        </div>
        {numberChanged && (
          <p role="status" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium">
            {k.whatsappChanged(formatWhatsAppDisplay(normalized!.slice(1)))}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={ids.phone} label={k.contactPhone} optional={c.optional} error={err("contactPhone")}>
            <Input type="tel" inputMode="tel" dir="ltr" {...fieldAria(ids.phone, { error: err("contactPhone") })} {...register("contactPhone")} />
          </Field>
          <Field id={ids.email} label={k.email} optional={c.optional} error={err("email")}>
            <Input type="email" dir="ltr" {...fieldAria(ids.email, { error: err("email") })} {...register("email")} />
          </Field>
          <Field id={ids.facebook} label={k.facebook} optional={c.optional} error={err("facebookUrl")}>
            <Input type="url" dir="ltr" placeholder="https://facebook.com/..." {...fieldAria(ids.facebook, { error: err("facebookUrl") })} {...register("facebookUrl")} />
          </Field>
          <Field id={ids.map} label={k.mapUrl} optional={c.optional} error={err("mapUrl")}>
            <Input type="url" dir="ltr" placeholder="https://maps.app.goo.gl/..." {...fieldAria(ids.map, { error: err("mapUrl") })} {...register("mapUrl")} />
          </Field>
        </div>
        <Field id={ids.address} label={k.address} optional={c.optional} hint={k.addressHint} error={err("addressBn")}>
          <Textarea rows={2} {...fieldAria(ids.address, { hint: k.addressHint, error: err("addressBn") })} {...register("addressBn")} />
        </Field>
      </Section>

      <Section title={k.sections.ordering}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TriStateField control={control} name="deliveryEnabled" label={k.delivery} />
          <TriStateField control={control} name="pickupEnabled" label={k.pickup} />
          <Field id={ids.fee} label={k.deliveryFee} optional={c.optional} hint={k.deliveryFeeHint} error={err("deliveryFee")}>
            <Input inputMode="numeric" autoComplete="off" {...fieldAria(ids.fee, { hint: k.deliveryFeeHint, error: err("deliveryFee") })} {...register("deliveryFee")} />
          </Field>
          <Field id={ids.min} label={k.minOrder} optional={c.optional} hint={k.minOrderHint} error={err("minOrder")}>
            <Input inputMode="numeric" autoComplete="off" {...fieldAria(ids.min, { hint: k.minOrderHint, error: err("minOrder") })} {...register("minOrder")} />
          </Field>
        </div>
      </Section>

      <Section title={k.sections.status}>
        <Controller
          control={control}
          name="temporarilyClosed"
          render={({ field }) => (
            <SwitchWithHint id={`${ids.note}-switch`} label={k.temporarilyClosed} hint={k.temporarilyClosedHint} checked={field.value} onChange={field.onChange} />
          )}
        />
        {closed && (
          <Field id={ids.note} label={k.closureNote} optional={c.optional} error={err("closureNoteBn")}>
            <Textarea rows={2} {...fieldAria(ids.note, { error: err("closureNoteBn") })} {...register("closureNoteBn")} />
          </Field>
        )}
      </Section>

      <Section title={k.sections.homepage}>
        <Field id={ids.headline} label={k.heroHeadline} error={err("heroHeadlineBn")}>
          <Input {...fieldAria(ids.headline, { error: err("heroHeadlineBn") })} {...register("heroHeadlineBn")} />
        </Field>
        <Field id={ids.subtext} label={k.heroSubtext} error={err("heroSubtextBn")}>
          <Textarea rows={2} {...fieldAria(ids.subtext, { error: err("heroSubtextBn") })} {...register("heroSubtextBn")} />
        </Field>
        <ImageField
          label={k.heroImage}
          hint={k.heroImageHint}
          picker={picker}
          savedUrl={menuImageUrl(settings.heroImagePath)}
          remove={removeHero}
          onRemoveChange={(remove) => setValue("removeHeroImage", remove, { shouldDirty: true })}
          previewClassName="aspect-[4/3] h-auto w-48"
        />
        <Field id={ids.about} label={k.about} optional={c.optional} hint={k.aboutHint} error={err("aboutBn")}>
          <Textarea rows={4} {...fieldAria(ids.about, { hint: k.aboutHint, error: err("aboutBn") })} {...register("aboutBn")} />
        </Field>
        <p className="text-sm text-muted-foreground">
          {k.featuredNote}{" "}
          <Link href="/admin/products" className="font-medium text-gold underline underline-offset-4">
            {k.goToProducts}
          </Link>
        </p>
      </Section>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Button type="submit" size="lg" disabled={action.pending || picker.preparing}>
          {action.pending ? c.saving : c.save}
        </Button>
        <div className="basis-full">
          {dirty && !action.pending && <p className="text-xs text-muted-foreground">{messages.admin.products.unsaved}</p>}
          <StatusText status={action.status} />
        </div>
      </div>
    </form>
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

function SwitchWithHint({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start gap-3">
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-describedby={`${id}-hint`} className="mt-1" />
      <div>
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      </div>
    </div>
  );
}

function TriStateField({
  control,
  name,
  label,
}: {
  control: Control<SettingsFormValues, unknown, SettingsInput>;
  name: "deliveryEnabled" | "pickupEnabled";
  label: string;
}) {
  const id = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">{label}</legend>
          <div className="flex flex-wrap gap-2">
            {(["yes", "no", "unknown"] as const).map((option) => (
              <label
                key={option}
                className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-input px-3 text-sm has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
              >
                <input
                  type="radio"
                  name={`${id}-${name}`}
                  value={option}
                  checked={field.value === option}
                  onChange={() => field.onChange(option)}
                  className="size-4 accent-primary"
                />
                {k.tri[option]}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    />
  );
}
