import Link from "next/link";
import { messages } from "@/lib/i18n";
import type { PublicMenu } from "@/types/menu";

export function CategoryLinks({ menu }: { menu: PublicMenu }) {
  const categories = menu.categories.filter((c) => menu.items.some((i) => i.categoryId === c.id));
  if (categories.length === 0) return null;

  return (
    <section aria-labelledby="home-categories" className="mx-auto w-full max-w-6xl px-4 pt-8">
      <h2 id="home-categories" className="mb-4 text-2xl font-bold">
        {messages.menu.categories}
      </h2>
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href="/menu"
            className="inline-flex h-10 items-center rounded-full border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            {messages.menu.allItems}
          </Link>
        </li>
        {categories.map((c) => (
          <li key={c.id}>
            <Link
              href={`/menu?category=${encodeURIComponent(c.slug)}`}
              className="inline-flex h-10 items-center rounded-full border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
            >
              {c.nameBn}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
