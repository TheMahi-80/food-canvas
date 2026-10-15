"use client";

import { useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { saveCustomerDetails } from "@/components/checkout/customer-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFocusOnMount } from "@/hooks/use-focus-on-mount";
import { messages } from "@/lib/i18n";
import { customerDetailsSchema, type CustomerDetails, type CustomerDetailsInput } from "@/lib/validation/customer";

const k = messages.checkout;

/** Name + WhatsApp number, validated and normalized (+8801XXXXXXXXX) before saving on this device. */
export function CustomerForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial: CustomerDetails | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const heading = useFocusOnMount<HTMLHeadingElement>();
  const ids = { name: useId(), phone: useId(), nameError: useId(), phoneError: useId(), phoneHint: useId() };
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerDetailsInput, unknown, CustomerDetails>({
    resolver: zodResolver(customerDetailsSchema),
    defaultValues: { name: initial?.name ?? "", phone: initial?.phone ?? "" },
    // Validate on submit, not on blur: an error appearing on blur pushed the Save button down,
    // so the press that caused the blur missed it and the form never submitted.
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((details) => {
        saveCustomerDetails(details);
        onSaved();
      })}
      className="space-y-4"
    >
      <div>
        <h3 ref={heading} tabIndex={-1} className="text-lg font-semibold outline-none">
          {k.detailsTitle}
        </h3>
        <p className="text-sm text-muted-foreground">{k.detailsIntro}</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={ids.name} className="text-sm font-medium">
          {messages.customer.name}
        </label>
        <Input
          id={ids.name}
          autoComplete="name"
          enterKeyHint="next"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? ids.nameError : undefined}
          {...register("name")}
        />
        {errors.name && (
          <p id={ids.nameError} role="alert" className="text-sm text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor={ids.phone} className="text-sm font-medium">
          {messages.customer.whatsapp}
        </label>
        <Input
          id={ids.phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          enterKeyHint="done"
          dir="ltr"
          placeholder={k.phonePlaceholder}
          aria-invalid={errors.phone ? true : undefined}
          aria-describedby={[ids.phoneHint, errors.phone ? ids.phoneError : null].filter(Boolean).join(" ")}
          {...register("phone")}
        />
        <p id={ids.phoneHint} className="text-xs text-muted-foreground">
          {k.phoneHint}
        </p>
        {errors.phone && (
          <p id={ids.phoneError} role="alert" className="text-sm text-destructive">
            {errors.phone.message}
          </p>
        )}
      </div>

      <p className="flex gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
        <ShieldCheck aria-hidden className="size-4 shrink-0 text-success" />
        {k.privacyNote}
      </p>

      <div className="flex flex-col gap-2">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {k.saveAndContinue}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {k.backToCart}
        </Button>
      </div>
    </form>
  );
}
