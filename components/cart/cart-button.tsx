"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { messages, toBanglaDigits } from "@/lib/i18n";

/** Header cart icon with live item count. */
export function CartButton() {
  const { priced, setCartOpen, hydrated } = useCart();
  const count = hydrated ? priced.itemCount : 0;
  return (
    <Button type="button" variant="ghost" size="icon" className="relative" onClick={() => setCartOpen(true)} aria-haspopup="dialog" data-cart-button>
      <ShoppingBag aria-hidden className="size-5" />
      <span className="sr-only">
        {messages.cart.open}
        {count > 0 && `, ${messages.cart.itemCount(toBanglaDigits(count))}`}
      </span>
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs leading-5 font-bold text-primary-foreground"
        >
          {toBanglaDigits(count > 99 ? "99+" : count)}
        </span>
      )}
    </Button>
  );
}
