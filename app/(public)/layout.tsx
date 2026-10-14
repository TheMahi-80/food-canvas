import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getSiteInfo } from "@/lib/menu/queries";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const site = await getSiteInfo();
  return (
    <>
      <SiteHeader site={site} />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      <SiteFooter site={site} />
    </>
  );
}
