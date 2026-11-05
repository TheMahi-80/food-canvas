"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeLink } from "@/components/layout/home-link";
import { messages } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: messages.nav.home },
  { href: "/menu", label: messages.nav.menu },
  { href: "/#about", label: messages.nav.about },
  { href: "/#contact", label: messages.nav.contact },
] as const;

export function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <ul className={cn("flex items-center gap-1", className)}>
      {NAV_ITEMS.map((item) => {
        const current = !item.href.includes("#") && pathname === item.href;
        const linkProps = {
          "aria-current": current ? ("page" as const) : undefined,
          className: cn(
            "inline-flex h-10 items-center rounded-lg px-2.5 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent hover:text-foreground sm:px-3",
            current ? "text-gold" : "text-muted-foreground",
          ),
          children: item.label,
        };
        return (
          <li key={item.href}>
            {item.href === "/" ? <HomeLink {...linkProps} /> : <Link href={item.href} {...linkProps} />}
          </li>
        );
      })}
    </ul>
  );
}
