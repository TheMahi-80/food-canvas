"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNow } from "@/hooks/use-now";
import { formatTaka, messages } from "@/lib/i18n";
import { priceCart } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { MenuItem } from "@/types/menu";

const o = messages.options;

/** Option picker: one required variant (if the product has variants) + optional add-ons. */
export function OptionsSheet() {
  const { optionsFor, closeOptions, restoreFocus } = useCart();
  return (
    <Sheet open={optionsFor !== null} onOpenChange={(open) => !open && closeOptions()}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] w-full max-w-lg gap-0 rounded-t-2xl" onCloseAutoFocus={restoreFocus}>
        {/* Remount per product so selections never leak between products. */}
        {optionsFor && <OptionsForm key={optionsFor.id} item={optionsFor} />}
      </SheetContent>
    </Sheet>
  );
}

function OptionsForm({ item }: { item: MenuItem }) {
  const { add, closeOptions, menu } = useCart();
  const now = useNow() ?? menu?.fetchedAt ?? 0;
  const availableVariants = item.variants.filter((v) => v.isAvailable);
  const [variantId, setVariantId] = useState<string | null>(availableVariants.length === 1 ? availableVariants[0].id : null);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [showVariantError, setShowVariantError] = useState(false);
  const variantGroupRef = useRef<HTMLFieldSetElement>(null);
  const ids = { variants: useId(), error: useId() };

  const needsVariant = item.variants.length > 0;
  const missingVariant = needsVariant && variantId === null;

  // Same pricing function as the cart and the WhatsApp message.
  const preview = useMemo(() => {
    if (missingVariant) return null;
    const line = { productId: item.id, variantId, addonIds, quantity };
    return priceCart({ lines: [line], products: [item], discounts: menu?.discounts ?? [], deliveryFee: null, now: new Date(now) }).lines[0];
  }, [item, variantId, addonIds, quantity, missingVariant, menu?.discounts, now]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (missingVariant) {
      setShowVariantError(true);
      variantGroupRef.current?.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus();
      return;
    }
    if (!preview || preview.status !== "ok") return;
    add({ productId: item.id, variantId, addonIds, quantity }, item);
    closeOptions();
  }

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="pr-12">
        <SheetTitle className="text-lg font-semibold">{item.nameBn}</SheetTitle>
        <SheetDescription>{item.descriptionBn ?? item.descriptionEn ?? messages.menu.hasVariants}</SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        {needsVariant && (
          <fieldset
            ref={variantGroupRef}
            aria-describedby={showVariantError && missingVariant ? ids.error : undefined}
            aria-invalid={showVariantError && missingVariant}
            className={cn("space-y-2 rounded-xl", showVariantError && missingVariant && "ring-2 ring-destructive ring-offset-4 ring-offset-popover")}
          >
            <legend className="mb-2 flex w-full items-center justify-between font-semibold">
              {o.variantLegend}
              <span className="rounded-full bg-primary px-2 text-xs font-medium text-primary-foreground">{o.required}</span>
            </legend>
            {item.variants.map((v) => (
              <label
                key={v.id}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-border px-3",
                  variantId === v.id && "border-primary bg-primary/10",
                  !v.isAvailable && "cursor-not-allowed opacity-50",
                )}
              >
                <input
                  type="radio"
                  name={ids.variants}
                  value={v.id}
                  checked={variantId === v.id}
                  disabled={!v.isAvailable}
                  onChange={() => {
                    setVariantId(v.id);
                    setShowVariantError(false);
                  }}
                  className="size-5 accent-[var(--primary)]"
                />
                <span className="flex-1">{v.nameBn}</span>
                <span className="font-medium">{v.isAvailable ? formatTaka(v.price) : o.unavailable}</span>
              </label>
            ))}
            {showVariantError && missingVariant && (
              <p id={ids.error} role="alert" className="text-sm font-medium text-destructive">
                {o.chooseVariant}
              </p>
            )}
          </fieldset>
        )}

        {item.addons.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="mb-2 font-semibold">{o.addonsLegend}</legend>
            {item.addons.map((a) => (
              <label
                key={a.id}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-border px-3",
                  addonIds.includes(a.id) && "border-primary bg-primary/10",
                  !a.isAvailable && "cursor-not-allowed opacity-50",
                )}
              >
                <input
                  type="checkbox"
                  checked={addonIds.includes(a.id)}
                  disabled={!a.isAvailable}
                  onChange={(e) => setAddonIds((ids) => (e.target.checked ? [...ids, a.id] : ids.filter((x) => x !== a.id)))}
                  className="size-5 accent-[var(--primary)]"
                />
                <span className="flex-1">{a.nameBn}</span>
                <span className="font-medium">{a.isAvailable ? `+${formatTaka(a.price)}` : o.unavailable}</span>
              </label>
            ))}
          </fieldset>
        )}

        <div className="flex items-center justify-between">
          <span className="font-semibold">{messages.cart.quantity}</span>
          <QuantityStepper value={quantity} onChange={setQuantity} itemName={item.nameBn} />
        </div>
      </div>

      <SheetFooter className="border-t border-border">
        {preview?.itemDiscount && (
          <p className="text-sm text-muted-foreground">
            {messages.menu.regularPrice}: <s>{formatTaka(preview.regularUnitPrice * quantity)}</s>
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={preview !== null && preview.status !== "ok"}>
          {preview ? o.addWithTotal(formatTaka(preview.lineTotal)) : messages.actions.addToCart}
        </Button>
      </SheetFooter>
    </form>
  );
}
