import Image from "next/image";
import { Clock, MapPin, MessageCircle } from "lucide-react";
import { messages } from "@/lib/i18n";
import { formatWhatsAppDisplay, getFallbackWhatsAppNumber, whatsAppChatUrl } from "@/lib/whatsapp/number";

export default function HomePage() {
  const whatsapp = getFallbackWhatsAppNumber();

  return (
    <>
      <section aria-labelledby="hero-title" className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-12 text-center sm:py-20 md:flex-row md:text-left">
          <div className="flex-1 space-y-4">
            <h1 id="hero-title" className="text-3xl leading-tight font-bold sm:text-5xl sm:leading-tight">
              {messages.hero.headline}
            </h1>
            <p className="text-lg text-muted-foreground">{messages.hero.subtext}</p>
          </div>
          <Image
            src="/brand/logo.png"
            alt={messages.meta.siteName}
            width={504}
            height={495}
            sizes="(min-width: 768px) 288px, 208px"
            className="h-auto w-52 md:w-72"
          />
        </div>
      </section>

      <section id="contact" aria-labelledby="contact-title" className="scroll-mt-20">
        <div className="mx-auto w-full max-w-6xl px-4 py-12">
          <h2 id="contact-title" className="mb-6 text-2xl font-bold">
            {messages.contact.title}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            <li className="rounded-xl border border-border bg-card p-5">
              <p className="mb-1 flex items-center gap-2 font-semibold">
                <Clock aria-hidden className="size-5 text-gold" />
                {messages.hours.title}
              </p>
              <p className="text-muted-foreground">{messages.hours.everyDayDefault}</p>
            </li>
            <li className="rounded-xl border border-border bg-card p-5">
              <p className="mb-1 flex items-center gap-2 font-semibold">
                <MessageCircle aria-hidden className="size-5 text-gold" />
                {messages.contact.whatsappLabel}
              </p>
              <a
                href={whatsAppChatUrl(whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gold underline-offset-4 hover:underline"
              >
                <span dir="ltr">{formatWhatsAppDisplay(whatsapp)}</span>
              </a>
              <p className="mt-1 text-sm text-muted-foreground">{messages.contact.whatsappHint}</p>
            </li>
            <li className="rounded-xl border border-border bg-card p-5">
              <p className="mb-1 flex items-center gap-2 font-semibold">
                <MapPin aria-hidden className="size-5 text-gold" />
                {messages.contact.addressLabel}
              </p>
              <p className="text-muted-foreground">{messages.contact.toBeConfirmed}</p>
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}
