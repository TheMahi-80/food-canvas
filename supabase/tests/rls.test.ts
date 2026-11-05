import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Runs the real migrations, seed and RLS check script against an in-memory Postgres (PGlite)
 * with a minimal Supabase auth/storage stand-in (supabase-shim.sql).
 * This is NOT a substitute for running supabase/tests/rls_checks.sql on the real project.
 */
const root = join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(join(root, ...parts), "utf8");
const migrations = readdirSync(join(root, "migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort();

async function freshDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(read("tests", "supabase-shim.sql"));
  for (const file of migrations) await db.exec(read("migrations", file));
  return db;
}

describe("database (PGlite + Supabase stand-in)", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await freshDb();
  }, 60_000);

  it("applies all migrations", () => {
    expect(migrations.length).toBeGreaterThan(0);
  });

  it("creates no orders or customer tables", async () => {
    const { rows } = await db.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public' order by 1",
    );
    const tables = rows.map((r) => r.table_name);
    expect(tables).toEqual([
      "admin_users",
      "categories",
      "discounts",
      "opening_hours",
      "product_addons",
      "product_variants",
      "products",
      "restaurant_settings",
    ]);
  });

  it("enables RLS on every public table", async () => {
    const { rows } = await db.query<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(rows).toEqual([]);
  });

  it("initializes settings with the confirmed WhatsApp number and 15:00-22:00 every day", async () => {
    const settings = await db.query<{ whatsapp_number: string; delivery_fee: number | null; min_order: number | null }>(
      "select whatsapp_number, delivery_fee, min_order from public.restaurant_settings",
    );
    expect(settings.rows).toEqual([{ whatsapp_number: "8801845690533", delivery_fee: null, min_order: null }]);

    const hours = await db.query<{ n: number }>(
      "select count(*)::int as n from public.opening_hours where opens_at = '15:00' and closes_at = '22:00' and not is_closed",
    );
    expect(hours.rows[0].n).toBe(7);
  });

  it("configures the storage bucket (public read, 5 MB, images only)", async () => {
    const { rows } = await db.query("select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'menu-images'");
    expect(rows).toEqual([
      { public: true, file_size_limit: 5242880, allowed_mime_types: ["image/jpeg", "image/png", "image/webp"] },
    ]);
  });

  it("loads seed.sql, every sample row is labeled, and it is idempotent", async () => {
    const seeded = await freshDb();
    await seeded.exec(read("seed.sql"));
    await seeded.exec(read("seed.sql"));
    const unlabeled = await seeded.query(
      `select slug from public.categories where slug not like 'sample-%' or name_bn not like '[নমুনা]%'
       union all select slug from public.products where slug not like 'sample-%' or name_bn not like '[নমুনা]%'
       union all select name_bn from public.discounts where name_bn not like '[নমুনা]%'`,
    );
    expect(unlabeled.rows).toEqual([]);
    const count = await seeded.query<{ n: number }>("select count(*)::int as n from public.products");
    expect(count.rows[0].n).toBe(24);
    await seeded.close();
  }, 60_000);

  it("passes supabase/tests/rls_checks.sql (anon read-only, no anon/non-admin writes, admin can write)", async () => {
    let results;
    try {
      results = await db.exec(read("tests", "rls_checks.sql"));
    } catch (error) {
      await db.exec("rollback");
      throw error;
    }
    expect(results.at(-1)?.rows).toEqual([{ result: "ALL RLS CHECKS PASSED" }]);
  }, 60_000);

  it("rolls back everything the check script created", async () => {
    const { rows } = await db.query<{ n: number }>(
      `select (select count(*) from public.categories where slug like 'zz-test-%')
            + (select count(*) from auth.users)
            + (select count(*) from storage.objects)
            + (select count(*) from information_schema.schemata where schema_name = 'rls_test') as n`,
    );
    expect(Number(rows[0].n)).toBe(0);
  });

  // Mutation tests: each breaks one policy the way a real mistake would, and the check script
  // must catch it. Proves the checks are not vacuous.
  const mutations: Array<[string, string, RegExp]> = [
    [
      "write policy forgets the admin check",
      `drop policy "products: admin update" on public.products;
       create policy "products: admin update" on public.products for update to authenticated using (true) with check (true);`,
      /FAIL: non-admin: update products price/,
    ],
    [
      "public read policy exposes inactive products",
      `drop policy "products: public reads active" on public.products;
       create policy "products: public reads active" on public.products for select to anon, authenticated using (true);`,
      /FAIL: anon can read an inactive product/,
    ],
    [
      "discount read policy exposes coupon codes",
      `drop policy "discounts: public reads active non-coupon" on public.discounts;
       create policy "discounts: public reads active non-coupon" on public.discounts for select to anon, authenticated using (is_active);`,
      /FAIL: anon can list coupon codes/,
    ],
    [
      "anon keeps Supabase's default write grants",
      `grant insert on public.categories to anon;
       create policy "oops" on public.categories for insert to anon with check (true);`,
      /FAIL: anon: insert categories/,
    ],
    [
      "storage upload policy allows any signed-in user",
      `drop policy "menu-images: admin insert" on storage.objects;
       create policy "menu-images: admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'menu-images');`,
      /FAIL: non-admin: storage upload/,
    ],
    [
      "admin_users becomes self-writable",
      `grant insert on public.admin_users to authenticated;
       create policy "oops" on public.admin_users for insert to authenticated with check (user_id = auth.uid());`,
      /FAIL: non-admin: insert admin_users/,
    ],
    [
      "reorder function bypasses RLS without an admin check",
      `create or replace function public.reorder_products(p_ids uuid[]) returns void
       language sql security definer set search_path = '' as $$
         update public.products p set sort_order = t.ord from unnest(p_ids) with ordinality as t(id, ord) where p.id = t.id;
       $$;`,
      /FAIL: non-admin: rpc reorder_products/,
    ],
  ];

  it.each(mutations)("check script catches: %s", async (_name, breakSql, expected) => {
    const broken = await freshDb();
    await broken.exec(breakSql);
    await expect(broken.exec(read("tests", "rls_checks.sql"))).rejects.toThrow(expected);
    await broken.close();
  }, 60_000);
});
