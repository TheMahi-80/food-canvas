"use client";

import { Plus } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { messages } from "@/lib/i18n";
import type { MenuItem } from "@/types/menu";

export function AddToCartButton({ item }: { item: MenuItem }) {
  const { requestAdd } = useCart();

  if (!item.isAvailable) {
    return (
      <Button type="button" variant="secondary" size="sm" disabled className="w-full sm:w-auto">
        {messages.menu.unavailable}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      className="w-full sm:w-auto"
      onClick={() => requestAdd(item)}
      aria-label={`${item.nameBn}: ${messages.actions.addToCart}`}
      aria-haspopup={item.variants.length > 0 || item.addons.some((a) => a.isAvailable) ? "dialog" : undefined}
    >
      <Plus aria-hidden />
      {messages.actions.addToCart}
    </Button>
  );
}
