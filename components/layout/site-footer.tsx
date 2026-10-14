import Image from "next/image";
import { Clock, MessageCircle } from "lucide-react";
import { messages } from "@/lib/i18n";
import { formatWhatsAppDisplay, getFallbackWhatsAppNumber, whatsAppChatUrl } from "@/lib/whatsapp/number";

export function SiteFooter() {
  const whatsapp = getFallbackWhatsAppNumber();

  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:grid-cols-2">
        <div className="flex items-center gap-3">
          <Image src="/brand/logo.png" alt="" width={504} height={495} sizes="56px" className="h-14 w-auto" />
          <div>
            <p className="font-semibold">{messages.meta.siteName}</p>
            <p className="text-sm text-muted-foreground">{messages.footer.tagline}</p>
          </div>
        </div>
        <ul className="space-y-2 text-sm sm:justify-self-end">
          <li className="flex items-center gap-2">
            <Clock aria-hidden className="size-4 shrink-0 text-gold" />
            <span>{messages.hours.everyDayDefault}</span>
          </li>
          <li className="flex items-center gap-2">
            <MessageCircle aria-hidden className="size-4 shrink-0 text-gold" />
            <span className="sr-only">{messages.contact.whatsappLabel}:</span>
            <a
              href={whatsAppChatUrl(whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-4 hover:underline"
            >
              <span dir="ltr">{formatWhatsAppDisplay(whatsapp)}</span>
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
