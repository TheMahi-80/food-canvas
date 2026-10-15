"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { formatTaka, messages, toBanglaDigits } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const VISIBLE_MS = 3500;

/**
 * "Added to cart" confirmation (announced to screen readers) and, on phones, a sticky
 * bottom bar to open the cart whenever it has items.
 */
export function CartFeedback() {
  const { lastAdded, priced, hydrated, cartOpen, optionsFor, setCartOpen } = useCart();
  const [hiddenAt, setHiddenAt] = useState(0);

  useEffect(() => {
    if (!lastAdded) return;
    const timer = setTimeout(() => setHiddenAt(lastAdded.at), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [lastAdded]);

  const showToast = lastAdded !== null && hiddenAt !== lastAdded.at && !cartOpen;
  // The bar stays mounted while the cart is open (it sits under the overlay) so focus can return to it.
  const showBar = hydrated && priced.itemCount > 0 && optionsFor === null;

  return (
    <>
      {/* Always mounted so screen readers announce changes. */}
      <div aria-live="polite" role="status" className="sr-only">
        {showToast ? messages.cart.added(lastAdded.name) : ""}
      </div>

      {showToast && (
        <div
          className={cn(
            "fixed inset-x-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-popover p-3 shadow-lg",
            showBar ? "bottom-20 md:bottom-6" : "bottom-6",
          )}
        >
          <CheckCircle2 aria-hidden className="size-5 shrink-0 text-success" />
          <p className="flex-1 text-sm font-medium">{messages.cart.added(lastAdded.name)}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => setCartOpen(true)}>
            {messages.cart.viewCart}
          </Button>
        </div>
      )}

      {showBar && (
        <>
          <div aria-hidden className="h-20 md:hidden" />
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
            <Button type="button" size="lg" className="w-full justify-between" onClick={() => setCartOpen(true)}>
              <span className="flex items-center gap-2">
                <ShoppingBag aria-hidden />
                {messages.cart.viewCart} ({toBanglaDigits(priced.itemCount)})
              </span>
              <span>{formatTaka(priced.estimatedTotal)}</span>
            </Button>
          </div>
        </>
      )}
    </>
  );
}
