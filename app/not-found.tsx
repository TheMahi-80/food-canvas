import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { messages } from "@/lib/i18n";

export const metadata: Metadata = {
  title: messages.errors.notFoundTitle,
};

export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <Image src="/brand/logo.png" alt="" width={504} height={495} sizes="96px" className="h-24 w-auto" />
      <h1 className="text-2xl font-bold">{messages.errors.notFoundTitle}</h1>
      <p className="max-w-md text-muted-foreground">{messages.errors.notFoundBody}</p>
      <Button asChild size="lg">
        <Link href="/">{messages.actions.backHome}</Link>
      </Button>
    </main>
  );
}
