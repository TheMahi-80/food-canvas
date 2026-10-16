"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";

type HomeLinkProps = Omit<ComponentProps<typeof Link>, "href">;

/**
 * Link to the homepage. Already on the homepage, Next.js would do nothing,
 * so scroll back to the top (and drop any #about / #contact hash) instead.
 */
export function HomeLink({ onClick, ...props }: HomeLinkProps) {
  const pathname = usePathname();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || pathname !== "/") return;
    // Let ctrl/cmd/shift/middle-click open a new tab as usual.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    if (window.location.hash) {
      window.history.replaceState(window.history.state, "", "/");
    }
  }

  return <Link href="/" onClick={handleClick} {...props} />;
}
