"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Copy, Info, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { clearCustomerDetails } from "@/components/checkout/customer-store";
import { Button } from "@/components/ui/button";
import { useFocusOnMount } from "@/hooks/use-focus-on-mount";
import { useNow } from "@/hooks/use-now";
import { formatOpenStatusBn, getOpenStatus } from "@/lib/hours";
import { formatTaka, messages } from "@/lib/i18n";
import type { CustomerDetails } from "@/lib/validation/customer";
import { formatBdPhone } from "@/lib/validation/customer";
import { buildOrderMessage, buildWhatsAppOrderUrl } from "@/lib/whatsapp/message";
import { formatWhatsAppDisplay } from "@/lib/whatsapp/number";

const k = messages.checkout;

/**
 * Final step. The message and totals come from the same PricedCart as the cart (lib/pricing).
 * The link always targets the restaurant's number from settings. Opening WhatsApp does NOT
 * place an order; the cart is never cleared automatically.
 */
export function CheckoutReview({ details, saveFailed, onEdit }: { details: CustomerDetails; saveFailed: boolean; onEdit: () => void }) {
  const { priced, site } = useCart();
  const now = useNow();
  const heading = useFocusOnMount<HTMLHeadingElement>();
  const restaurantNumber = site.settings.whatsappNumber;

  const { message, url } = useMemo(() => {
    const text = buildOrderMessage(priced, details);
    return { message: text, url: buildWhatsAppOrderUrl(restaurantNumber, text) };
  }, [priced, details, restaurantNumber]);

  const status = now === null ? null : getOpenStatus(new Date(now), site.hours, site.settings.temporarilyClosed);
  const closedDetail = status && status.state !== "open" ? formatOpenStatusBn(status).detail : null;

  return (
    <div className="space-y-4">
      <h3 ref={heading} tabIndex={-1} className="text-lg font-semibold outline-none">
        {k.reviewTitle}
      </h3>

      <div className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{k.orderingAs}</p>
          <p className="font-semibold">{details.name}</p>
          <p className="text-sm" dir="ltr">
            {formatBdPhone(details.phone)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
            <Pencil aria-hidden />
            {k.editDetails}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={clearCustomerDetails}>
            <Trash2 aria-hidden />
            {k.removeDetails}
          </Button>
        </div>
      </div>
      {saveFailed && <p className="text-xs text-muted-foreground">{k.storageFailed}</p>}

      {status && status.state !== "open" && (
        <p role="status" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          {k.closedWarning} {closedDetail && k.closedWhen(closedDetail)}
        </p>
      )}

      <div className="flex items-baseline justify-between rounded-xl bg-muted p-3">
        <span className="font-semibold">{messages.cart.estimatedTotal}</span>
        <span className="text-lg font-bold text-gold">{formatTaka(priced.estimatedTotal)}</span>
      </div>

      <p className="flex gap-2 rounded-lg border border-primary/50 bg-primary/10 p-3 text-sm font-medium">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" />
        {k.notSubmitted}
      </p>
      <p className="text-sm text-muted-foreground">{k.howItWorks}</p>

      {/* Same-tab navigation: mobile browsers hand wa.me links to the WhatsApp app; no popup to block. */}
      <Button asChild size="lg" className="w-full">
        <a href={url} data-whatsapp-order>
          <MessageCircle aria-hidden />
          {messages.actions.continueToWhatsApp}
        </a>
      </Button>

      <Fallback message={message} url={url} number={formatWhatsAppDisplay(restaurantNumber)} />
    </div>
  );
}

function Fallback({ message, url, number }: { message: string; url: string; number: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ids = { message: useId() };

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopyState("copied");
    } catch {
      // Older/locked-down browsers: select the text so the customer can copy it manually.
      const el = textareaRef.current;
      el?.focus();
      el?.select();
      setCopyState("failed");
    }
  }

  return (
    <details className="rounded-xl border border-border">
      <summary className="flex min-h-12 cursor-pointer items-center px-4 text-sm font-medium">{k.fallbackTitle}</summary>
      <div className="space-y-3 border-t border-border p-4">
        <p className="text-sm">{k.fallbackBody(number)}</p>
        <Button type="button" variant="outline" className="w-full" onClick={copy}>
          <Copy aria-hidden />
          {k.copyMessage}
        </Button>
        <p role="status" className="text-sm">
          {copyState === "copied" ? k.copied : copyState === "failed" ? k.copyFailed : ""}
        </p>
        <label htmlFor={ids.message} className="text-sm font-medium">
          {k.messageLabel}
        </label>
        <textarea
          id={ids.message}
          ref={textareaRef}
          readOnly
          value={message}
          rows={8}
          dir="auto"
          className="w-full rounded-lg border border-input bg-background p-3 font-mono text-xs"
        />
        <p className="text-sm font-medium">{k.linkLabel}</p>
        <a href={url} className="block text-sm break-all text-gold underline underline-offset-4" dir="ltr">
          {url.length > 120 ? `${url.slice(0, 120)}…` : url}
        </a>
      </div>
    </details>
  );
}
