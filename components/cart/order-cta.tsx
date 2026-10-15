"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { messages } from "@/lib/i18n";

/** "অর্ডার করুন": opens the cart when it has items, otherwise goes to the menu to pick food. */
export function OrderCta({ className, size, variant }: Pick<React.ComponentProps<typeof Button>, "className" | "size" | "variant">) {
  const { priced, hydrated, setCartOpen } = useCart();
  if (hydrated && priced.itemCount > 0) {
    return (
      <Button type="button" className={className} size={size} variant={variant} onClick={() => setCartOpen(true)} aria-haspopup="dialog">
        {messages.actions.orderNow}
      </Button>
    );
  }
  return (
    <Button asChild className={className} size={size} variant={variant}>
      <Link href="/menu">{messages.actions.orderNow}</Link>
    </Button>
  );
}
