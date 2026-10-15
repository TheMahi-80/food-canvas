"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { CheckoutReview } from "@/components/checkout/checkout-review";
import { CustomerForm } from "@/components/checkout/customer-form";
import { useCustomerDetails } from "@/components/checkout/customer-store";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { ClosedNotice } from "@/components/layout/open-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { normalizeCouponCode } from "@/lib/cart/storage";
import { formatTaka, messages, toBanglaDigits } from "@/lib/i18n";
import type { PricedLine } from "@/lib/pricing";

const c = messages.cart;

export function CartSheet() {
  const { cartOpen, setCartOpen, priced, state, menu, site, clear, storageAvailable, restoreFocus, couponCheck } = useCart();
  const customer = useCustomerDetails();
  const [confirmClear, setConfirmClear] = useState(false);
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [editingDetails, setEditingDetails] = useState(false);
  const isEmpty = state.lines.length === 0;
  const settings = site.settings;
  const canCheckout = priced.orderable && menu !== null && couponCheck !== "checking";
  // If the cart stops being orderable mid-checkout (item removed / became unavailable), show the cart again.
  const inCheckout = step === "checkout" && canCheckout;

  return (
    <Sheet
      open={cartOpen}
      onOpenChange={(open) => {
        setCartOpen(open);
        if (!open) {
          setConfirmClear(false);
          setStep("cart");
          setEditingDetails(false);
        }
      }}
    >
      <SheetContent side="right" className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md" onCloseAutoFocus={restoreFocus}>
        <SheetHeader className="border-b border-border pr-12">
          <SheetTitle className="text-lg font-semibold">{c.title}</SheetTitle>
          <SheetDescription>{isEmpty ? c.emptyBody : c.itemCount(toBanglaDigits(priced.itemCount))}</SheetDescription>
        </SheetHeader>

        {inCheckout ? (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setStep("cart"); setEditingDetails(false); }}>
              <ArrowLeft aria-hidden />
              {messages.checkout.backToCart}
            </Button>
            {customer.details === null || editingDetails ? (
              <CustomerForm
                initial={customer.details}
                onSaved={() => setEditingDetails(false)}
                onCancel={() => (customer.details ? setEditingDetails(false) : setStep("cart"))}
              />
            ) : (
              <CheckoutReview details={customer.details} saveFailed={customer.saveFailed} onEdit={() => setEditingDetails(true)} />
            )}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <ShoppingBag aria-hidden className="size-12 text-muted-foreground" />
            <p className="text-lg font-semibold">{c.emptyTitle}</p>
            <Button asChild size="lg" onClick={() => setCartOpen(false)}>
              <Link href="/menu">{messages.actions.exploreMenu}</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <ClosedNotice hours={site.hours} temporarilyClosed={settings.temporarilyClosed} />
              {!menu && <Notice>{c.menuUnavailable}</Notice>}
              {!storageAvailable && <Notice>{c.storageWarning}</Notice>}

              <ul className="space-y-3">
                {priced.lines.map((line) => (
                  <CartLineRow key={line.key} line={line} />
                ))}
              </ul>

              <div className="flex justify-end">
                {confirmClear ? (
                  <div className="flex flex-wrap items-center justify-end gap-2" role="group" aria-label={c.clearConfirm}>
                    <span className="text-sm">{c.clearConfirm}</span>
                    <Button type="button" size="sm" variant="destructive" onClick={() => { clear(); setConfirmClear(false); }}>
                      {c.clearYes}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setConfirmClear(false)}>
                      {c.cancel}
                    </Button>
                  </div>
                ) : (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmClear(true)}>
                    <Trash2 aria-hidden />
                    {c.clear}
                  </Button>
                )}
              </div>

              <CouponForm />
            </div>

            <SheetFooter className="gap-3 border-t border-border bg-card">
              <Totals />
              {!priced.orderable && <Notice>{c.blocked}</Notice>}
              {settings.minOrder !== null && priced.subtotal < settings.minOrder && (
                <p className="text-xs text-muted-foreground">{c.minOrderWarning(formatTaka(settings.minOrder))}</p>
              )}
              {priced.orderable && couponCheck === "checking" && <p className="text-xs text-muted-foreground">{messages.checkout.waitCoupon}</p>}
              <Button type="button" size="lg" className="w-full" disabled={!canCheckout} onClick={() => setStep("checkout")}>
                {messages.actions.orderNow}
              </Button>
              <p className="text-xs text-muted-foreground">{c.estimateNote}</p>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
      <span>{children}</span>
    </p>
  );
}

function CartLineRow({ line }: { line: PricedLine }) {
  const { setQuantity, remove } = useCart();
  const name = line.product?.nameBn ?? "—";
  const options = [line.variant?.nameBn, ...line.addons.map((a) => `+ ${a.nameBn}`)].filter(Boolean).join(", ");
  const problem =
    line.status === "unavailable" ? c.lineUnavailable : line.status === "missing" ? c.lineMissing : line.status === "invalid_options" ? c.lineInvalid : null;

  return (
    <li className="space-y-2 rounded-xl border border-border p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="leading-snug font-semibold">{name}</p>
          {options && <p className="text-sm text-muted-foreground">{options}</p>}
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(line.key)} aria-label={c.remove(name)}>
          <X aria-hidden />
        </Button>
      </div>

      {problem ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-destructive">{problem}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => remove(line.key)}>
            {c.removeShort}
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <QuantityStepper value={line.quantity} onChange={(q) => setQuantity(line.key, q)} itemName={name} />
          <div className="text-right">
            <p className="font-bold">{formatTaka(line.lineTotal)}</p>
            <p className="text-xs text-muted-foreground">
              {c.each} {formatTaka(line.unitPrice)}
              {line.itemDiscount && (
                <>
                  {" "}
                  <span className="sr-only">{messages.menu.regularPrice}: </span>
                  <s>{formatTaka(line.regularUnitPrice)}</s>
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </li>
  );
}

function Totals() {
  const { priced } = useCart();
  const discount = priced.cartDiscount;
  return (
    <dl className="space-y-1.5 text-sm">
      <div className="flex justify-between">
        <dt>{c.subtotal}</dt>
        <dd className="font-medium">{formatTaka(priced.subtotal)}</dd>
      </div>
      {priced.itemDiscountTotal > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <dt>{c.itemSavings}</dt>
          <dd>{formatTaka(priced.itemDiscountTotal)}</dd>
        </div>
      )}
      {discount && (
        <div className="flex justify-between text-success">
          <dt>
            {c.discount} ({discount.couponCode ?? discount.nameBn})
          </dt>
          <dd>−{formatTaka(discount.amount)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt>{c.deliveryFee}</dt>
        <dd>{priced.deliveryFee === null ? c.deliveryTbc : formatTaka(priced.deliveryFee)}</dd>
      </div>
      <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
        <dt>{c.estimatedTotal}</dt>
        <dd className="text-gold">{formatTaka(priced.estimatedTotal)}</dd>
      </div>
    </dl>
  );
}

function CouponForm() {
  const { state, setCoupon, couponCheck, priced } = useCart();
  const [draft, setDraft] = useState("");
  const [formatError, setFormatError] = useState(false);
  const inputId = useId();
  const k = messages.coupon;

  if (state.couponCode) {
    const status =
      couponCheck === "checking"
        ? k.checking
        : couponCheck === "error"
          ? k.error
          : priced.couponStatus === "applied"
            ? k.applied(state.couponCode)
            : priced.couponStatus === "not_best"
              ? k.notBest
              : priced.couponStatus === "min_not_met"
                ? k.minNotMet(formatTaka(priced.couponMinimum ?? 0))
                : k.invalid;
    const good = couponCheck === "done" && priced.couponStatus === "applied";
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
        <p role="status" className={good ? "text-success" : couponCheck === "checking" ? "text-muted-foreground" : "text-destructive"}>
          <span className="font-mono font-semibold" dir="ltr">{state.couponCode}</span> — {status}
        </p>
        <Button type="button" size="sm" variant="ghost" onClick={() => setCoupon(null)}>
          {k.remove}
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const code = normalizeCouponCode(draft);
        setFormatError(code === null);
        if (code) {
          setCoupon(code);
          setDraft("");
        }
      }}
    >
      <label htmlFor={inputId} className="text-sm font-medium">
        {k.label}
      </label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          dir="ltr"
          aria-invalid={formatError}
        />
        <Button type="submit" variant="outline" className="h-11" disabled={!draft.trim()}>
          {k.apply}
        </Button>
      </div>
      {formatError && (
        <p role="alert" className="text-sm text-destructive">
          {k.formatInvalid}
        </p>
      )}
    </form>
  );
}
