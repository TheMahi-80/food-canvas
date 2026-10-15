import type { Metadata } from "next";
import { HoursForm } from "@/components/admin/hours-form";
import { SettingsForm } from "@/components/admin/settings-form";
import { loadAdminSiteInfo } from "@/lib/admin/menu-data";
import { requireAdminPage } from "@/lib/auth/admin";
import { messages } from "@/lib/i18n";

const k = messages.admin.settings;

export const metadata: Metadata = { title: k.title };

export default async function AdminSettingsPage() {
  const { supabase } = await requireAdminPage();
  let site;
  try {
    site = await loadAdminSiteInfo(supabase);
  } catch {
    return (
      <p role="alert" className="text-destructive">
        {messages.admin.common.loadError}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{k.title}</h1>
        <p className="text-sm text-muted-foreground">{k.intro}</p>
      </div>
      <SettingsForm settings={site.settings} />
      <section aria-labelledby="hours-title" className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 id="hours-title" className="font-semibold">
          {k.sections.hours}
        </h2>
        <HoursForm hours={site.hours} />
      </section>
    </div>
  );
}
