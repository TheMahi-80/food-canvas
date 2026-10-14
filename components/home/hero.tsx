import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { messages } from "@/lib/i18n";
import { menuImageUrl } from "@/lib/supabase/storage";
import type { PublicSettings } from "@/types/menu";

export function Hero({ settings }: { settings: PublicSettings }) {
  const heroImage = menuImageUrl(settings.heroImagePath);

  return (
    <section aria-labelledby="hero-title" className="border-b border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-10 text-center sm:py-16 md:flex-row md:text-left">
        <div className="flex-1 space-y-4">
          <h1 id="hero-title" className="text-3xl leading-tight font-bold sm:text-5xl sm:leading-tight">
            {settings.heroHeadlineBn}
          </h1>
          <p className="text-lg text-muted-foreground">{settings.heroSubtextBn}</p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row md:justify-start sm:justify-center">
            <Button asChild size="lg">
              <Link href="/menu">{messages.actions.exploreMenu}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/menu">{messages.actions.orderNow}</Link>
            </Button>
          </div>
        </div>
        {heroImage ? (
          <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl md:w-[28rem]">
            <Image src={heroImage} alt="" fill priority sizes="(min-width: 768px) 448px, 100vw" className="object-cover" />
          </div>
        ) : (
          <Image
            src="/brand/logo.png"
            alt={settings.restaurantName}
            width={504}
            height={495}
            priority
            sizes="(min-width: 768px) 288px, 208px"
            className="h-auto w-52 md:w-72"
          />
        )}
      </div>
    </section>
  );
}
