import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { messages } from "@/lib/i18n";

const navItems = [
  { href: "/", label: messages.nav.home },
  { href: "/#contact", label: messages.nav.contact },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4">
        <Link href="/" aria-label={messages.a11y.homeLink} className="flex shrink-0 items-center gap-2 rounded-full">
          <Image
            src="/brand/logo.png"
            alt=""
            width={504}
            height={495}
            priority
            sizes="44px"
            className="h-11 w-auto"
          />
          <span className="hidden text-lg font-semibold tracking-tight sm:inline">{messages.meta.siteName}</span>
        </Link>

        <nav aria-label={messages.a11y.mainNav} className="ml-auto sm:ml-6">
          <ul className="flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:ml-auto">
          <p className="hidden items-center gap-1.5 text-sm text-muted-foreground md:flex">
            <Clock aria-hidden className="size-4 text-gold" />
            <span>{messages.hours.everyDayDefault}</span>
          </p>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
