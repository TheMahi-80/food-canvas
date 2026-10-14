import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";
import { NavLinks } from "@/components/layout/nav-links";
import { OpenStatus } from "@/components/layout/open-status";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { formatHoursSummaryBn } from "@/lib/hours";
import { messages } from "@/lib/i18n";
import type { SiteInfo } from "@/types/menu";

export function SiteHeader({ site }: { site: SiteInfo }) {
  const hoursSummary = formatHoursSummaryBn(site.hours);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4">
        <Link href="/" aria-label={messages.a11y.homeLink} className="flex shrink-0 items-center gap-2 rounded-full">
          <Image src="/brand/logo.png" alt="" width={504} height={495} priority sizes="44px" className="h-11 w-auto" />
          <span className="hidden text-lg font-semibold tracking-tight lg:inline">{site.settings.restaurantName}</span>
        </Link>

        <nav aria-label={messages.a11y.mainNav} className="ml-4 hidden md:block">
          <NavLinks />
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {hoursSummary.length === 1 && (
            <p className="hidden items-center gap-1.5 text-sm text-muted-foreground xl:flex">
              <Clock aria-hidden className="size-4 text-gold" />
              <span>{hoursSummary[0]}</span>
            </p>
          )}
          <OpenStatus hours={site.hours} temporarilyClosed={site.settings.temporarilyClosed} />
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/menu">{messages.actions.orderNow}</Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile: second row with navigation */}
      <nav aria-label={messages.a11y.mainNav} className="border-t border-border md:hidden">
        <NavLinks className="mx-auto max-w-6xl justify-between px-2" />
      </nav>
    </header>
  );
}
