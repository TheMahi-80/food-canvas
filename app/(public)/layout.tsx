import { CartFeedback } from "@/components/cart/cart-feedback";
import { CartProvider } from "@/components/cart/cart-provider";
import { CartSheet } from "@/components/cart/cart-sheet";
import { OptionsSheet } from "@/components/cart/options-sheet";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getPublicMenu, getSiteInfo } from "@/lib/menu/queries";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  // The menu is needed site-wide to price the cart; pages handle a failed load themselves.
  const [site, menu] = await Promise.all([getSiteInfo(), getPublicMenu().catch(() => null)]);
  return (
    <CartProvider menu={menu} site={site}>
      <SiteHeader site={site} />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      <SiteFooter site={site} />
      <CartSheet />
      <OptionsSheet />
      <CartFeedback />
    </CartProvider>
  );
}
