"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { lookupCoupon, type CouponLookupResult } from "@/app/actions/coupon";
import { useNow } from "@/hooks/use-now";
import { addCartLine, removeCartLine, setCartLineQuantity, type CartLine } from "@/lib/cart";
import { EMPTY_CART, MAX_CART_LINES, type CartState } from "@/lib/cart/storage";
import { priceCart, type PricedCart } from "@/lib/pricing";
import type { MenuItem, PublicMenu, SiteInfo } from "@/types/menu";
import { getCartSnapshot, getServerCartSnapshot, isCartStorageAvailable, setCartState, subscribeCart } from "./cart-store";

export type CouponCheck = "none" | "checking" | "error" | "done";

interface CartContextValue {
  menu: PublicMenu | null;
  site: SiteInfo;
  state: CartState;
  priced: PricedCart;
  /** False on the server and during hydration, until the stored cart has been read. */
  hydrated: boolean;
  storageAvailable: boolean;
  couponCheck: CouponCheck;
  add: (line: CartLine, item: MenuItem) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setCoupon: (code: string | null) => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  optionsFor: MenuItem | null;
  /** Adds directly if the item has no options, otherwise opens the option picker. */
  requestAdd: (item: MenuItem) => void;
  closeOptions: () => void;
  lastAdded: { name: string; at: number } | null;
  /** Pass to a sheet's onCloseAutoFocus: returns focus to the element that opened it. */
  restoreFocus: (event: Event) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

export function itemNeedsOptions(item: MenuItem): boolean {
  return item.variants.length > 0 || item.addons.some((a) => a.isAvailable);
}

export function CartProvider({ menu, site, children }: { menu: PublicMenu | null; site: SiteInfo; children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribeCart, getCartSnapshot, getServerCartSnapshot);
  const hydrated = useSyncExternalStore(
    subscribeCart,
    () => true,
    () => false,
  );
  const now = useNow() ?? menu?.fetchedAt ?? 0;
  const [cartOpen, setCartOpen] = useState(false);
  const [optionsFor, setOptionsFor] = useState<MenuItem | null>(null);
  const [lastAdded, setLastAdded] = useState<{ name: string; at: number } | null>(null);
  const [lookup, setLookup] = useState<{ code: string; result: CouponLookupResult } | null>(null);
  // Sheets are opened from many buttons (no single Radix Trigger), so remember the opener.
  const openerRef = useRef<HTMLElement | null>(null);
  const rememberOpener = () => {
    if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
      openerRef.current = document.activeElement;
    }
  };
  const restoreFocus = useCallback((event: Event) => {
    // Fall back to the header cart button if the opener has since disappeared (e.g. a toast).
    const target = openerRef.current?.isConnected ? openerRef.current : document.querySelector<HTMLElement>("[data-cart-button]");
    if (target) {
      event.preventDefault();
      target.focus();
    }
  }, []);

  // Validate the stored/entered coupon code against the server whenever it changes.
  const code = state.couponCode;
  useEffect(() => {
    if (!code || lookup?.code === code) return;
    let cancelled = false;
    lookupCoupon(code)
      .then((result) => !cancelled && setLookup({ code, result }))
      .catch(() => !cancelled && setLookup({ code, result: { ok: false } }));
    return () => {
      cancelled = true;
    };
  }, [code, lookup?.code]);

  const couponCheck: CouponCheck = !code ? "none" : lookup?.code !== code ? "checking" : lookup.result.ok ? "done" : "error";
  const coupon = couponCheck === "done" && lookup?.result.ok ? lookup.result.coupon : null;

  const priced = useMemo(
    () =>
      priceCart({
        lines: state.lines,
        products: menu?.items ?? [],
        discounts: menu?.discounts ?? [],
        coupon,
        couponEntered: couponCheck === "done",
        // A configured delivery fee is only added when delivery is explicitly enabled.
        deliveryFee: site.settings.deliveryEnabled === true ? site.settings.deliveryFee : null,
        now: new Date(now),
      }),
    [state.lines, menu, coupon, couponCheck, site.settings.deliveryEnabled, site.settings.deliveryFee, now],
  );

  const add = useCallback((line: CartLine, item: MenuItem) => {
    // Never report "added" for a line that would not fit.
    if (addCartLine(getCartSnapshot().lines, line).length > MAX_CART_LINES) return;
    setCartState((s) => ({ ...s, lines: addCartLine(s.lines, line) }));
    setLastAdded({ name: item.nameBn, at: Date.now() });
  }, []);

  const requestAdd = useCallback(
    (item: MenuItem) => {
      if (!item.isAvailable) return;
      rememberOpener();
      if (itemNeedsOptions(item)) setOptionsFor(item);
      else add({ productId: item.id, variantId: null, addonIds: [], quantity: 1 }, item);
    },
    [add],
  );

  const value: CartContextValue = {
    menu,
    site,
    state,
    priced,
    hydrated,
    storageAvailable: hydrated ? isCartStorageAvailable() : true,
    couponCheck,
    add,
    setQuantity: (key, quantity) => setCartState((s) => ({ ...s, lines: setCartLineQuantity(s.lines, key, quantity) })),
    remove: (key) => setCartState((s) => ({ ...s, lines: removeCartLine(s.lines, key) })),
    clear: () => setCartState(() => EMPTY_CART),
    setCoupon: (next) => setCartState((s) => ({ ...s, couponCode: next })),
    cartOpen,
    setCartOpen: (open) => {
      if (open) rememberOpener();
      setCartOpen(open);
    },
    optionsFor,
    requestAdd,
    closeOptions: () => setOptionsFor(null),
    lastAdded,
    restoreFocus,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
