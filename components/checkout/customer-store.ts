"use client";

import { useSyncExternalStore } from "react";
import { CUSTOMER_STORAGE_KEY, parseStoredCustomer, serializeCustomer } from "@/lib/customer/storage";
import type { CustomerDetails } from "@/lib/validation/customer";

/**
 * Customer name + WhatsApp number, remembered only on this device. If localStorage is
 * unavailable, details live in memory for this page session and `saveFailed` is true.
 */
interface CustomerState {
  details: CustomerDetails | null;
  saveFailed: boolean;
}

const EMPTY: CustomerState = { details: null, saveFailed: false };
const listeners = new Set<() => void>();
let state: CustomerState = EMPTY;
let loaded = false;

function read(): CustomerDetails | null {
  try {
    return parseStoredCustomer(window.localStorage.getItem(CUSTOMER_STORAGE_KEY));
  } catch {
    return null;
  }
}

function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    state = { details: read(), saveFailed: false };
    loaded = true;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function onStorage(event: StorageEvent) {
  if (event.key === CUSTOMER_STORAGE_KEY || event.key === null) {
    state = { details: read(), saveFailed: false };
    emit();
  }
}

function subscribe(listener: () => void) {
  ensureLoaded();
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  ensureLoaded();
  return state;
}

/** Saves validated details. Returns false if the device could not store them (kept in memory). */
export function saveCustomerDetails(details: CustomerDetails): boolean {
  let ok = true;
  try {
    window.localStorage.setItem(CUSTOMER_STORAGE_KEY, serializeCustomer(details));
  } catch {
    ok = false;
  }
  state = { details, saveFailed: !ok };
  emit();
  return ok;
}

export function clearCustomerDetails() {
  try {
    window.localStorage.removeItem(CUSTOMER_STORAGE_KEY);
  } catch {
    // Nothing stored or storage blocked; in-memory copy is cleared below either way.
  }
  state = EMPTY;
  emit();
}

export function useCustomerDetails(): CustomerState {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}
