import Image from "next/image";
import { UtensilsCrossed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatTaka, messages, toBanglaDigits } from "@/lib/i18n";
import type { ProductPriceInfo } from "@/lib/pricing";
import { menuImageUrl } from "@/lib/supabase/storage";
import type { MenuItem } from "@/types/menu";
import { cn } from "@/lib/utils";

const m = messages.menu;

export function discountLabel(discount: NonNullable<ProductPriceInfo["discount"]>): string {
  if (discount.type === "percentage") return `${toBanglaDigits(discount.value)}% ${m.off}`;
  if (discount.type === "fixed") return `${formatTaka(discount.value)} ${m.off}`;
  return m.specialPrice;
}

export function ProductCard({
  item,
  categoryName,
  priceInfo,
  priority = false,
}: {
  item: MenuItem;
  categoryName: string | null;
  priceInfo: ProductPriceInfo;
  priority?: boolean;
}) {
  const imageUrl = menuImageUrl(item.imagePath);
  const description = item.descriptionBn ?? item.descriptionEn;
  const hasDiscount = priceInfo.discount !== null && priceInfo.price < priceInfo.regularPrice;

  return (
    <article
      aria-labelledby={`product-${item.id}`}
      className="flex h-full gap-3 overflow-hidden rounded-xl border border-border bg-card p-3 sm:flex-col sm:gap-0 sm:p-0"
    >
      <div
        className={cn(
          "relative size-28 shrink-0 overflow-hidden rounded-lg bg-muted sm:aspect-[4/3] sm:size-auto sm:w-full sm:rounded-none",
          !item.isAvailable && "opacity-50 grayscale",
        )}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.nameBn}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 112px"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground" aria-hidden>
            <UtensilsCrossed className="size-8" />
          </div>
        )}
        {hasDiscount && (
          <Badge className="absolute top-2 left-2 shadow-sm">{discountLabel(priceInfo.discount!)}</Badge>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:p-4">
        {categoryName && <p className="text-xs text-muted-foreground">{categoryName}</p>}
        <h3 id={`product-${item.id}`} className="text-base leading-snug font-semibold">
          {item.nameBn}
        </h3>
        {description && <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>}

        <div className="mt-auto flex flex-wrap items-end gap-x-2 gap-y-1 pt-2">
          <p className="text-lg leading-none font-bold text-gold">
            {formatTaka(priceInfo.price)}
            {priceInfo.isFromPrice && <span className="ml-1 text-sm font-medium text-muted-foreground">{m.fromPrice}</span>}
          </p>
          {hasDiscount && (
            <p className="text-sm leading-none text-muted-foreground">
              <span className="sr-only">{m.regularPrice}: </span>
              <s>{formatTaka(priceInfo.regularPrice)}</s>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {item.isAvailable ? (
            <Badge variant="outline" className="border-success/40 text-success">
              {m.available}
            </Badge>
          ) : (
            <Badge variant="secondary">{m.unavailable}</Badge>
          )}
          {item.variants.length > 0 && <span className="text-xs text-muted-foreground">{m.hasVariants}</span>}
          {item.variants.length === 0 && item.addons.some((a) => a.isAvailable) && (
            <span className="text-xs text-muted-foreground">{m.hasAddons}</span>
          )}
        </div>
      </div>
    </article>
  );
}
