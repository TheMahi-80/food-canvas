import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { signOut } from "@/app/admin/actions";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminCheck } from "@/lib/auth/admin";
import { safeAdminNext } from "@/lib/auth/routes";
import { messages } from "@/lib/i18n";
import { LoginForm } from "./login-form";

const a = messages.admin;

export const metadata: Metadata = { title: a.loginTitle };

export default function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="absolute top-3 right-3">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Image src="/brand/logo.png" alt="" width={504} height={495} sizes="72px" className="h-18 w-auto" priority />
          <h1 className="text-xl font-bold">{a.loginTitle}</h1>
          <p className="text-sm text-muted-foreground">{a.loginIntro}</p>
        </div>
        <Suspense fallback={<Skeleton className="h-56 w-full" />}>
          <LoginGate searchParams={searchParams} />
        </Suspense>
        <Link href="/" className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
          {a.viewSite}
        </Link>
      </div>
    </main>
  );
}

async function LoginGate({ searchParams }: { searchParams: PageProps<"/admin/login">["searchParams"] }) {
  const params = await searchParams;
  const next = safeAdminNext(typeof params.next === "string" ? params.next : null);
  const check = await getAdminCheck();

  if (check.status === "admin") redirect(next);

  if (check.status === "forbidden") {
    return (
      <div className="space-y-4 text-center">
        <p role="alert" className="font-semibold text-destructive">
          {a.deniedTitle}
        </p>
        <p className="text-sm text-muted-foreground">{a.deniedBody}</p>
        <form action={signOut}>
          <Button type="submit" variant="outline" className="w-full">
            {a.signOut}
          </Button>
        </form>
      </div>
    );
  }

  return <LoginForm next={next} />;
}
