import Image from "next/image";
import { Clock, MessageCircle } from "lucide-react";
import { formatHoursSummaryBn } from "@/lib/hours";
import { messages } from "@/lib/i18n";
import { formatWhatsAppDisplay, whatsAppChatUrl } from "@/lib/whatsapp/number";
import type { SiteInfo } from "@/types/menu";

export function SiteFooter({ site }: { site: SiteInfo }) {
  const { settings } = site;

  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:grid-cols-2">
        <div className="flex items-center gap-3">
          <Image src="/brand/logo.png" alt="" width={504} height={495} sizes="56px" className="h-14 w-auto" />
          <div>
            <p className="font-semibold">{settings.restaurantName}</p>
            <p className="text-sm text-muted-foreground">{messages.footer.tagline}</p>
          </div>
        </div>
        <ul className="space-y-2 text-sm sm:justify-self-end">
          <li className="flex items-start gap-2">
            <Clock aria-hidden className="mt-1 size-4 shrink-0 text-gold" />
            <span className="sr-only">{messages.hours.title}:</span>
            <span>
              {formatHoursSummaryBn(site.hours).map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <MessageCircle aria-hidden className="size-4 shrink-0 text-gold" />
            <span className="sr-only">{messages.contact.whatsappLabel}:</span>
            <a
              href={whatsAppChatUrl(settings.whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-4 hover:underline"
            >
              <span dir="ltr">{formatWhatsAppDisplay(settings.whatsappNumber)}</span>
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
