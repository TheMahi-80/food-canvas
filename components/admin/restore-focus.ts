import type { RefObject } from "react";

/**
 * For dialogs opened from code (no Radix trigger): when the dialog closes, put focus back on the
 * button that opened it. After a successful delete (`deleted`), or if that button is gone,
 * focus <main> instead: the deleted row may still be in the DOM until the refreshed list arrives,
 * and focusing its button would lose focus to <body> once the row is removed.
 */
export function restoreFocus(event: Event, ref: RefObject<HTMLElement | null> | undefined, deleted = false) {
  event.preventDefault();
  const target = ref?.current;
  if (!deleted && target?.isConnected) {
    target.focus();
    return;
  }
  const main = document.getElementById("main");
  if (main) {
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    main.focus();
  }
}
