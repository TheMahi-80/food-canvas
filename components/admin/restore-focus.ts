import type { RefObject } from "react";

/**
 * For dialogs opened from code (no Radix trigger): when the dialog closes, put focus back on the
 * button that opened it. If that button is gone (e.g. its row was just deleted), focus <main>.
 */
export function restoreFocus(ref: RefObject<HTMLElement | null> | undefined) {
  return (event: Event) => {
    event.preventDefault();
    const target = ref?.current;
    if (target?.isConnected) {
      target.focus();
      return;
    }
    const main = document.getElementById("main");
    if (main) {
      if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
      main.focus();
    }
  };
}
