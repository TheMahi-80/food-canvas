import type { Metadata } from "next";
import Link from "next/link";
import { CategoryLinks } from "@/components/home/category-links";
import { Hero } from "@/components/home/hero";
import { AboutSection, ContactSection } from "@/components/home/info-sections";
import { ProductGrid } from "@/components/menu/product-grid";
import { Button } from "@/components/ui/button";
import { messages } from "@/lib/i18n";
import { getPublicMenu, getSiteInfo } from "@/lib/menu/queries";
import { buildLocalBusinessJsonLd, serializeJsonLd } from "@/lib/seo/local-business";
import { resolveSiteUrl } from "@/lib/seo/site-url";
import type { PublicMenu } from "@/types/menu";

async function loadMenu(): Promise<PublicMenu | null> {
  try {
    return await getPublicMenu();
  } catch {
    return null;
  }
}

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const [site, menu] = await Promise.all([getSiteInfo(), loadMenu()]);
  const jsonLd = buildLocalBusinessJsonLd({ settings: site.settings, hours: site.hours, siteUrl: resolveSiteUrl(), description: messages.meta.description });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <Hero settings={site.settings} />

      {menu ? (
        <>
          <CategoryLinks menu={menu} />
          <ProductGrid mode="offers" title={messages.menu.specialOffers} />
          <ProductGrid mode="featured" title={messages.menu.popularItems} />
          {menu.items.length > 0 && (
            <div className="mx-auto w-full max-w-6xl px-4 pb-10">
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="/menu">{messages.home.viewFullMenu}</Link>
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="mx-auto w-full max-w-6xl px-4 py-8">
          <p role="alert" className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
            {messages.home.sectionErrorBody}{" "}
            <Link href="/menu" className="font-medium text-gold underline-offset-4 hover:underline">
              {messages.home.viewFullMenu}
            </Link>
          </p>
        </div>
      )}

      <AboutSection site={site} />
      <ContactSection site={site} />
    </>
  );
}
