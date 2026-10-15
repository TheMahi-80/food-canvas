"use client";

import { useId, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { ClosedNotice } from "@/components/layout/open-status";
import { ProductCard } from "@/components/menu/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNow } from "@/hooks/use-now";
import { useUrlSearch } from "@/hooks/use-url-search";
import { messages, toBanglaDigits } from "@/lib/i18n";
import { DEFAULT_FILTERS, filterMenuItems, filtersToSearch, hasActiveFilters, parseFilters, type MenuFilters, type MenuSort } from "@/lib/menu/filter";
import { productPriceInfo } from "@/lib/pricing";
import { toAsciiDigits } from "@/lib/validation/customer";
import { cn } from "@/lib/utils";
import type { PublicMenu, SiteInfo } from "@/types/menu";

const m = messages.menu;

function parsePriceInput(value: string): number | null {
  const digits = toAsciiDigits(value).replace(/\D/g, "").slice(0, 7);
  return digits ? Number(digits) : null;
}

/** Menu data comes from the CartProvider context (loaded once in the public layout). */
export function MenuBrowser() {
  const { menu, site } = useCart();
  if (!menu) return <EmptyState title={m.loadErrorTitle} body={m.loadErrorBody} />;
  return <MenuBrowserInner menu={menu} hours={site.hours} temporarilyClosed={site.settings.temporarilyClosed} />;
}

function MenuBrowserInner({
  menu,
  hours,
  temporarilyClosed,
}: {
  menu: PublicMenu;
  hours: SiteInfo["hours"];
  temporarilyClosed: boolean;
}) {
  const [search, setSearch] = useUrlSearch();
  const filters = useMemo(() => parseFilters(new URLSearchParams(search)), [search]);
  const now = useNow() ?? menu.fetchedAt;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const ids = { search: useId(), min: useId(), max: useId(), sort: useId(), available: useId() };

  const update = (patch: Partial<MenuFilters>) => setSearch(filtersToSearch({ ...filters, ...patch }));

  const categoryById = useMemo(() => new Map(menu.categories.map((c) => [c.id, c])), [menu.categories]);
  const priceInfo = useMemo(() => {
    const date = new Date(now);
    return new Map(menu.items.map((item) => [item.id, productPriceInfo(item, menu.discounts, date)]));
  }, [menu.items, menu.discounts, now]);

  const visibleCategories = useMemo(
    () => menu.categories.filter((c) => menu.items.some((item) => item.categoryId === c.id)),
    [menu.categories, menu.items],
  );

  const results = useMemo(
    () => filterMenuItems(menu.items, menu.categories, filters, (item) => priceInfo.get(item.id)!.price),
    [menu.items, menu.categories, filters, priceInfo],
  );

  const active = hasActiveFilters(filters);
  const menuIsEmpty = menu.items.length === 0;

  return (
    <div className="space-y-5">
      <ClosedNotice hours={hours} temporarilyClosed={temporarilyClosed} />

      {/* Search */}
      <div className="relative">
        <label htmlFor={ids.search} className="sr-only">
          {m.searchLabel}
        </label>
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={ids.search}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder={m.search}
          value={filters.query}
          onChange={(e) => update({ query: e.target.value })}
          className="pr-11 pl-10"
        />
        {filters.query && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1 -translate-y-1/2"
            onClick={() => update({ query: "" })}
          >
            <X aria-hidden />
            <span className="sr-only">{m.clearSearch}</span>
          </Button>
        )}
      </div>

      {/* Categories */}
      {visibleCategories.length > 0 && (
        <nav aria-label={m.categoryNav} className="-mx-4 overflow-x-auto px-4 pb-1">
          <ul className="flex w-max gap-2">
            {[{ slug: null, nameBn: m.allItems }, ...visibleCategories].map((c) => {
              const selected = filters.category === c.slug;
              return (
                <li key={c.slug ?? "all"}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => update({ category: c.slug })}
                    className={cn(
                      "h-10 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-accent",
                    )}
                  >
                    {c.nameBn}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {/* Filters & sort */}
      <details
        open={filtersOpen}
        onToggle={(e) => setFiltersOpen(e.currentTarget.open)}
        className="rounded-xl border border-border bg-card"
      >
        <summary className="flex h-12 cursor-pointer list-none items-center gap-2 rounded-xl px-4 font-medium [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal aria-hidden className="size-4 text-gold" />
          {m.filtersButton}
        </summary>
        <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label htmlFor={ids.min} className="text-sm font-medium">
              {m.minPrice}
            </label>
            <Input
              id={ids.min}
              inputMode="numeric"
              autoComplete="off"
              value={filters.minPrice === null ? "" : String(filters.minPrice)}
              onChange={(e) => update({ minPrice: parsePriceInput(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={ids.max} className="text-sm font-medium">
              {m.maxPrice}
            </label>
            <Input
              id={ids.max}
              inputMode="numeric"
              autoComplete="off"
              value={filters.maxPrice === null ? "" : String(filters.maxPrice)}
              onChange={(e) => update({ maxPrice: parsePriceInput(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={ids.sort} className="text-sm font-medium">
              {m.sortLabel}
            </label>
            <select
              id={ids.sort}
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value as MenuSort })}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base dark:bg-input/30"
            >
              <option value="default">{m.sortDefault}</option>
              <option value="price_asc">{m.sortPriceAsc}</option>
              <option value="price_desc">{m.sortPriceDesc}</option>
            </select>
          </div>
          <label htmlFor={ids.available} className="flex min-h-11 cursor-pointer items-center gap-3 self-end text-sm font-medium">
            <input
              id={ids.available}
              type="checkbox"
              checked={filters.availableOnly}
              onChange={(e) => update({ availableOnly: e.target.checked })}
              className="size-5 accent-[var(--primary)]"
            />
            {m.availableOnly}
          </label>
        </div>
      </details>

      {/* Result summary */}
      <h2 className="sr-only">{m.resultsHeading}</h2>
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {menuIsEmpty ? "" : m.resultCount(toBanglaDigits(results.length))}
        </p>
        {active && (
          <Button type="button" variant="outline" size="sm" onClick={() => setSearch(filtersToSearch(DEFAULT_FILTERS))}>
            <X aria-hidden />
            {m.clearFilters}
          </Button>
        )}
      </div>

      {menuIsEmpty ? (
        <EmptyState title={m.emptyMenuTitle} body={m.emptyMenuBody} />
      ) : results.length === 0 ? (
        <EmptyState title={m.noResultsTitle} body={m.noResultsBody}>
          <Button type="button" onClick={() => setSearch(filtersToSearch(DEFAULT_FILTERS))}>
            {m.clearFilters}
          </Button>
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {results.map((item, index) => (
            <li key={item.id}>
              <ProductCard
                item={item}
                categoryName={categoryById.get(item.categoryId)?.nameBn ?? null}
                priceInfo={priceInfo.get(item.id)!}
                priority={index < 2}
              />
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">{m.priceNote}</p>
    </div>
  );
}

export function EmptyState({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-4 py-12 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}
