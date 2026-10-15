"use client";

import { useCallback, useSyncExternalStore } from "react";

const URL_CHANGE_EVENT = "fc:urlchange";

function subscribe(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener(URL_CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener(URL_CHANGE_EVENT, listener);
  };
}

/**
 * The current URL query string, kept in sync without a page reload.
 * Server render and hydration see "" (default view, so the full menu is prerendered);
 * the client then switches to the real query string.
 */
export function useUrlSearch(): [string, (search: string) => void] {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  const setSearch = useCallback((next: string) => {
    const url = `${window.location.pathname}${next}${window.location.hash}`;
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event(URL_CHANGE_EVENT));
  }, []);
  return [search, setSearch];
}
