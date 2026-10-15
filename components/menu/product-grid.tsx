"use client";

import { useMemo } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { ProductCard } from "@/components/menu/product-card";
import { useNow } from "@/hooks/use-now";
import { productPriceInfo } from "@/lib/pricing";
import type { PublicMenu } from "@/types/menu";

/**
 * Homepage product rows. "featured": items the admin marked as featured.
 * "offers": items with an item discount live right now (time-dependent, so computed on the client).
 * Renders nothing when there is nothing to show.
 */
export function ProductGrid({ mode, title, limit = 6 }: { mode: "featured" | "offers"; title: string; limit?: number }) {
  const { menu } = useCart();
  if (!menu) return null;
  return <Rows menu={menu} mode={mode} title={title} limit={limit} />;
}

function Rows({ menu, mode, title, limit }: { menu: PublicMenu; mode: "featured" | "offers"; title: string; limit: number }) {
  const now = useNow() ?? menu.fetchedAt;
  const categoryById = useMemo(() => new Map(menu.categories.map((c) => [c.id, c])), [menu.categories]);

  const rows = useMemo(() => {
    const date = new Date(now);
    const categoryOrder = (id: string) => categoryById.get(id)?.sortOrder ?? 0;
    return menu.items
      .filter((item) => categoryById.has(item.categoryId))
      .map((item) => ({ item, info: productPriceInfo(item, menu.discounts, date) }))
      .filter(({ item, info }) => (mode === "featured" ? item.isFeatured : info.discount !== null && item.isAvailable))
      .sort((a, b) => categoryOrder(a.item.categoryId) - categoryOrder(b.item.categoryId) || a.item.sortOrder - b.item.sortOrder)
      .slice(0, limit);
  }, [menu.items, menu.discounts, categoryById, mode, limit, now]);

  if (rows.length === 0) return null;

  const headingId = `home-${mode}`;
  return (
    <section aria-labelledby={headingId} className="mx-auto w-full max-w-6xl px-4 py-8">
      <h2 id={headingId} className="mb-4 text-2xl font-bold">
        {title}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {rows.map(({ item, info }) => (
          <li key={item.id}>
            <ProductCard item={item} categoryName={categoryById.get(item.categoryId)?.nameBn ?? null} priceInfo={info} />
          </li>
        ))}
      </ul>
    </section>
  );
}
