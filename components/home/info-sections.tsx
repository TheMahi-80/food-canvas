import { Clock, ExternalLink, MapPin, MessageCircle, Phone } from "lucide-react";
import { OpenStatus } from "@/components/layout/open-status";
import { formatHoursSummaryBn } from "@/lib/hours";
import { messages } from "@/lib/i18n";
import { formatWhatsAppDisplay, whatsAppChatUrl } from "@/lib/whatsapp/number";
import type { SiteInfo } from "@/types/menu";

const c = messages.contact;

/** Only https URLs are rendered as links (DB constraint also enforces this). */
function safeHttpsUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function AboutSection({ site }: { site: SiteInfo }) {
  return (
    <section id="about" aria-labelledby="about-title" className="scroll-mt-32 border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <h2 id="about-title" className="mb-3 text-2xl font-bold">
          {messages.nav.about}
        </h2>
        <p className="max-w-3xl whitespace-pre-line text-muted-foreground">{site.settings.aboutBn ?? messages.home.aboutDefault}</p>
      </div>
    </section>
  );
}

export function ContactSection({ site }: { site: SiteInfo }) {
  const { settings } = site;
  const mapUrl = safeHttpsUrl(settings.mapUrl);
  const facebookUrl = safeHttpsUrl(settings.facebookUrl);

  return (
    <section id="contact" aria-labelledby="contact-title" className="scroll-mt-32 border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <h2 id="contact-title" className="mb-6 text-2xl font-bold">
          {c.title}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          <li className="space-y-2 rounded-xl border border-border bg-card p-5">
            <p className="flex items-center gap-2 font-semibold">
              <Clock aria-hidden className="size-5 text-gold" />
              {messages.hours.title}
            </p>
            {formatHoursSummaryBn(site.hours).map((line) => (
              <p key={line} className="text-muted-foreground">
                {line}
              </p>
            ))}
            <OpenStatus hours={site.hours} temporarilyClosed={settings.temporarilyClosed} variant="full" />
            {settings.temporarilyClosed && settings.closureNoteBn && <p className="text-sm">{settings.closureNoteBn}</p>}
          </li>
          <li className="space-y-1 rounded-xl border border-border bg-card p-5">
            <p className="flex items-center gap-2 font-semibold">
              <MessageCircle aria-hidden className="size-5 text-gold" />
              {c.whatsappLabel}
            </p>
            <a
              href={whatsAppChatUrl(settings.whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-gold underline-offset-4 hover:underline"
            >
              <span dir="ltr">{formatWhatsAppDisplay(settings.whatsappNumber)}</span>
            </a>
            <p className="text-sm text-muted-foreground">{c.whatsappHint}</p>
            {settings.contactPhone && (
              <p className="flex items-center gap-2 pt-2 text-sm">
                <Phone aria-hidden className="size-4 text-gold" />
                <span className="sr-only">{c.phoneLabel}:</span>
                <a href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`} className="underline-offset-4 hover:underline" dir="ltr">
                  {settings.contactPhone}
                </a>
              </p>
            )}
            {facebookUrl && (
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 pt-1 text-sm underline-offset-4 hover:underline">
                <ExternalLink aria-hidden className="size-4 text-gold" />
                {c.facebookLabel}
              </a>
            )}
          </li>
          <li className="space-y-1 rounded-xl border border-border bg-card p-5">
            <p className="flex items-center gap-2 font-semibold">
              <MapPin aria-hidden className="size-5 text-gold" />
              {c.addressLabel}
            </p>
            <p className="whitespace-pre-line text-muted-foreground">{settings.addressBn ?? c.toBeConfirmed}</p>
            {mapUrl && (
              <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-gold underline-offset-4 hover:underline">
                {c.mapLink}
                <ExternalLink aria-hidden className="size-3.5" />
              </a>
            )}
          </li>
        </ul>
      </div>
    </section>
  );
}
