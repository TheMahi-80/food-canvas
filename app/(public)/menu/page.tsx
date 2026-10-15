import type { Metadata } from "next";
import { MenuBrowser } from "@/components/menu/menu-browser";
import { messages } from "@/lib/i18n";
import { getPublicMenu } from "@/lib/menu/queries";

export const metadata: Metadata = {
  title: messages.menu.pageTitle,
  description: messages.menu.pageIntro,
  alternates: { canonical: "/menu" },
  openGraph: { title: `${messages.menu.pageTitle} | ${messages.meta.siteName}`, description: messages.menu.pageIntro },
};

export default async function MenuPage() {
  // Throws on failure so the error boundary shows a retry; the data itself reaches the
  // browser once, through the CartProvider in the layout.
  await getPublicMenu();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
      <h1 className="text-3xl font-bold">{messages.menu.pageTitle}</h1>
      <p className="mt-1 mb-6 text-muted-foreground">{messages.menu.pageIntro}</p>
      <MenuBrowser />
    </div>
  );
}
