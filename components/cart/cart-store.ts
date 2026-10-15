"use client";

import { CART_STORAGE_KEY, EMPTY_CART, parseCartState, serializeCartState, type CartState } from "@/lib/cart/storage";

/**
 * Cart state persisted in localStorage (separate from customer details).
 * If storage is unavailable (private mode, blocked, quota), the cart still works in memory
 * for this page session and `storageAvailable` reports false.
 */
const listeners = new Set<() => void>();
let state: CartState = EMPTY_CART;
let loaded = false;
let storageAvailable = true;

function read(): CartState {
  try {
    return parseCartState(window.localStorage.getItem(CART_STORAGE_KEY));
  } catch {
    storageAvailable = false;
    return EMPTY_CART;
  }
}

function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    state = read();
    loaded = true;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function onStorage(event: StorageEvent) {
  // Another tab changed the cart.
  if (event.key === CART_STORAGE_KEY || event.key === null) {
    state = read();
    emit();
  }
}

export function subscribeCart(listener: () => void) {
  ensureLoaded();
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function getCartSnapshot(): CartState {
  ensureLoaded();
  return state;
}

export function getServerCartSnapshot(): CartState {
  return EMPTY_CART;
}

export function setCartState(updater: (current: CartState) => CartState) {
  ensureLoaded();
  state = updater(state);
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, serializeCartState(state));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  emit();
}

export function isCartStorageAvailable() {
  return storageAvailable;
}
