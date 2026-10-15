import type { Metadata } from "next";
import { OpenStatus } from "@/components/layout/open-status";
import { computeOverview } from "@/lib/admin/overview";
import { requireAdminPage } from "@/lib/auth/admin";
import { formatHoursSummaryBn } from "@/lib/hours";
import { messages, toBanglaDigits } from "@/lib/i18n";
import { fallbackHours, mapDiscount, mapHours } from "@/lib/menu/mappers";
import { formatWhatsAppDisplay } from "@/lib/whatsapp/number";

const o = messages.admin.overview;

export const metadata: Metadata = { title: o.title };

export default async function AdminOverviewPage() {
  // Page-level check (layouts alone are not enough). Queries then run as this admin under RLS.
  const { supabase } = await requireAdminPage();

  const [products, categories, discounts, settings, hours] = await Promise.all([
    supabase.from("products").select("is_active, is_available, slug, category_id"),
    supabase.from("categories").select("id, is_active"),
    supabase.from("discounts").select("*"),
    supabase.from("restaurant_settings").select("whatsapp_number, temporarily_closed").eq("id", 1).maybeSingle(),
    supabase.from("opening_hours").select("*"),
  ]);

  if (products.error || categories.error || discounts.error || settings.error || hours.error) {
    console.error("admin overview failed", products.error?.code, categories.error?.code, discounts.error?.code);
    return <p role="alert" className="text-destructive">{o.loadError}</p>;
  }

  const overview = computeOverview(
    { products: products.data, categories: categories.data, discounts: discounts.data.map(mapDiscount) },
    new Date(),
  );
  const weekly = hours.data.length === 7 ? mapHours(hours.data) : fallbackHours();
  const n = (value: number) => toBanglaDigits(value);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{o.title}</h1>

      {overview.products.sample > 0 && (
        <p role="status" className="rounded-xl border border-primary/50 bg-primary/10 p-3 text-sm">
          {o.sampleWarning(n(overview.products.sample))}
        </p>
      )}

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={o.menuItems} value={n(overview.products.total)} />
        <Stat label={o.visibleOnSite} value={n(overview.products.visible)} hint={`${o.hidden}: ${n(overview.products.hidden)}`} />
        <Stat label={o.available} value={n(overview.products.available)} hint={`${o.unavailable}: ${n(overview.products.unavailable)}`} />
        <Stat label={o.categories} value={n(overview.categories.active)} hint={o.ofTotal(n(overview.categories.total))} />
        <Stat label={o.liveDiscounts} value={n(overview.discounts.live)} hint={`${o.scheduledDiscounts}: ${n(overview.discounts.scheduled)}`} />
        <Stat label={o.liveCoupons} value={n(overview.discounts.liveCoupons)} />
      </dl>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="space-y-2 rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold">{o.status}</h2>
          <OpenStatus hours={weekly} temporarilyClosed={settings.data?.temporarily_closed ?? false} variant="full" />
          {formatHoursSummaryBn(weekly).map((line) => (
            <p key={line} className="text-sm text-muted-foreground">
              {line}
            </p>
          ))}
        </section>
        <section className="space-y-2 rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold">{o.whatsapp}</h2>
          <p dir="ltr" className="text-lg font-medium">
            {settings.data ? formatWhatsAppDisplay(settings.data.whatsapp_number) : "—"}
          </p>
        </section>
      </div>

      <p className="text-sm text-muted-foreground">{o.note}</p>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-3xl font-bold">{value}</dd>
      {hint && <dd className="mt-1 text-xs text-muted-foreground">{hint}</dd>}
    </div>
  );
}
