import { useEffect, useRef } from "react";

/**
 * For views that replace each other inside one dialog (cart -> details -> review): the button that
 * was pressed disappears, so focus would fall to the dialog. Moving it to the new view's heading
 * (tabIndex -1) announces the step and keeps keyboard order, without opening the phone keyboard.
 */
export function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}
