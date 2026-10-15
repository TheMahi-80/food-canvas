"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { messages } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const a = messages.admin;

const LINKS = [
  { href: "/admin", label: a.nav.overview, exact: true },
  { href: "/admin/categories", label: a.nav.categories, exact: false },
  { href: "/admin/products", label: a.nav.products, exact: false },
  { href: "/admin/discounts", label: a.nav.discounts, exact: false },
  { href: "/admin/settings", label: a.nav.settings, exact: false },
] as const;

/** The links render in the static shell; the "current page" highlight streams in. */
export function AdminNav() {
  return (
    <Suspense fallback={<NavList pathname={null} />}>
      <CurrentNav />
    </Suspense>
  );
}

function CurrentNav() {
  return <NavList pathname={usePathname()} />;
}

function NavList({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label={a.navLabel} className="border-t border-border">
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2">
        {LINKS.map((link) => {
          const current =
            pathname !== null && (link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`));
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center rounded-lg border-b-2 border-transparent px-3 text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground",
                  current && "border-primary text-gold",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
