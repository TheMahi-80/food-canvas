import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink, LogOut } from "lucide-react";
import { signOut } from "@/app/admin/actions";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminCheck } from "@/lib/auth/admin";
import { messages } from "@/lib/i18n";

const a = messages.admin;

/**
 * Admin chrome. Hiding this UI is NOT the protection: proxy.ts, requireAdminPage() in every page,
 * requireAdminAction() in every mutation and RLS in the database are.
 */
export default function AdminDashboardLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <Image src="/brand/logo.png" alt="" width={504} height={495} sizes="40px" className="h-10 w-auto" />
            <span>{a.panelTitle}</span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/" target="_blank" rel="noopener noreferrer">
                {a.viewSite}
                <ExternalLink aria-hidden />
              </Link>
            </Button>
            <ThemeToggle />
            <Suspense fallback={<Skeleton className="h-9 w-24" />}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
        <nav aria-label={a.navLabel} className="border-t border-border">
          <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2">
            <li>
              <Link href="/admin" className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-gold">
                {a.nav.overview}
              </Link>
            </li>
          </ul>
        </nav>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>{children}</Suspense>
      </main>
    </>
  );
}

async function UserMenu() {
  const check = await getAdminCheck();
  if (check.status !== "admin") return null;
  return (
    <form action={signOut} className="flex items-center gap-2">
      <span className="hidden max-w-48 truncate text-sm text-muted-foreground md:inline" title={check.user.email ?? undefined}>
        <span className="sr-only">{a.signedInAs}: </span>
        {check.user.email}
      </span>
      <Button type="submit" variant="outline" size="sm">
        <LogOut aria-hidden />
        {a.signOut}
      </Button>
    </form>
  );
}
