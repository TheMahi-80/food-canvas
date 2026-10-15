-- Food Canvas core schema.
-- Money: whole taka as integer. Percentages: whole integers.
-- There is deliberately NO orders table and NO customer table (orders go through WhatsApp only).

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admins: a row here grants admin rights. Rows are added only via the SQL editor
-- (no write policies exist), so nobody can promote themselves from the app.
-- ---------------------------------------------------------------------------
create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Menu
-- ---------------------------------------------------------------------------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  name_bn    text not null check (length(btrim(name_bn)) between 1 and 80),
  name_en    text check (name_en is null or length(btrim(name_en)) between 1 and 80),
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index categories_active_sort_idx on public.categories (is_active, sort_order);

create table public.products (
  id             uuid primary key default gen_random_uuid(),
  -- RESTRICT: a category with products cannot be deleted silently (see public.delete_category).
  category_id    uuid not null references public.categories (id) on delete restrict,
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 120),
  name_bn        text not null check (length(btrim(name_bn)) between 1 and 120),
  name_en        text check (name_en is null or length(btrim(name_en)) between 1 and 120),
  description_bn text check (description_bn is null or length(description_bn) <= 600),
  description_en text check (description_en is null or length(description_en) <= 600),
  -- Base price; used when the product has no available variants.
  price          integer not null check (price between 0 and 1000000),
  -- Path inside the menu-images storage bucket.
  image_path     text check (image_path is null or (image_path ~ '^products/[A-Za-z0-9/_.-]+$' and length(image_path) <= 300)),
  is_active      boolean not null default true,  -- visible on the site at all
  is_available   boolean not null default true,  -- visible but not orderable when false
  is_featured    boolean not null default false,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index products_category_sort_idx on public.products (category_id, sort_order);
create index products_featured_idx on public.products (sort_order) where is_featured;

-- One required "pick one" choice per product (e.g. size). If a product has at least one
-- available variant the customer must pick exactly one; its price REPLACES products.price.
create table public.product_variants (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  name_bn      text not null check (length(btrim(name_bn)) between 1 and 80),
  name_en      text check (name_en is null or length(btrim(name_en)) between 1 and 80),
  price        integer not null check (price between 0 and 1000000),
  is_available boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (product_id, name_bn)
);
create index product_variants_product_sort_idx on public.product_variants (product_id, sort_order);

-- Optional extras, pick any (each at most once per cart line); price is ADDED to the unit price.
create table public.product_addons (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  name_bn      text not null check (length(btrim(name_bn)) between 1 and 80),
  name_en      text check (name_en is null or length(btrim(name_en)) between 1 and 80),
  price        integer not null check (price between 0 and 1000000),
  is_available boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (product_id, name_bn)
);
create index product_addons_product_sort_idx on public.product_addons (product_id, sort_order);

-- ---------------------------------------------------------------------------
-- Discounts. Priority rule (implemented in lib/pricing):
--   1. Item level: per cart line, the single applicable product/category discount giving the
--      LOWEST unit price wins (no stacking). Applies to base/variant price only, never add-ons.
--      Percentages round the discount DOWN to whole taka. Unit price never below 0.
--   2. Cart level: at most one per order. Among automatic cart discounts whose minimum is met and
--      at most one entered coupon whose minimum is met, the LARGEST reduction wins. Computed on
--      the subtotal after item discounts and capped at that subtotal.
-- ---------------------------------------------------------------------------
create table public.discounts (
  id             uuid primary key default gen_random_uuid(),
  name_bn        text not null check (length(btrim(name_bn)) between 1 and 120),
  scope          text not null check (scope in ('product', 'category', 'cart')),
  type           text not null check (type in ('percentage', 'fixed', 'sale_price')),
  value          integer not null,
  product_id     uuid references public.products (id) on delete cascade,
  category_id    uuid references public.categories (id) on delete cascade,
  min_cart_value integer check (min_cart_value is null or min_cart_value between 0 and 1000000),
  coupon_code    text unique check (coupon_code is null or coupon_code ~ '^[A-Z0-9_-]{3,32}$'),
  starts_at      timestamptz,
  ends_at        timestamptz,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint discounts_value_range check (
    (type = 'percentage' and value between 1 and 100)
    or (type = 'fixed' and value between 1 and 1000000)
    or (type = 'sale_price' and value between 0 and 1000000)
  ),
  constraint discounts_sale_price_product_only check (type <> 'sale_price' or scope = 'product'),
  constraint discounts_product_target check ((scope = 'product') = (product_id is not null)),
  constraint discounts_category_target check ((scope = 'category') = (category_id is not null)),
  constraint discounts_cart_only_fields check (scope = 'cart' or (min_cart_value is null and coupon_code is null)),
  constraint discounts_window check (starts_at is null or ends_at is null or ends_at > starts_at)
);
create index discounts_product_idx on public.discounts (product_id) where product_id is not null;
create index discounts_category_idx on public.discounts (category_id) where category_id is not null;

-- ---------------------------------------------------------------------------
-- Restaurant settings: exactly one typed row (id = 1). Every column is public-safe.
-- NULL means "not set / to be confirmed" (delivery fee, minimum order, address, ...).
-- ---------------------------------------------------------------------------
create table public.restaurant_settings (
  id                 smallint primary key default 1 check (id = 1),
  restaurant_name    text not null default 'Food Canvas' check (length(btrim(restaurant_name)) between 1 and 80),
  whatsapp_number    text not null default '8801845690533' check (whatsapp_number ~ '^8801[3-9][0-9]{8}$'),
  contact_phone      text check (contact_phone is null or contact_phone ~ '^\+?[0-9 -]{6,20}$'),
  email              text check (email is null or (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 200)),
  facebook_url       text check (facebook_url is null or (facebook_url ~ '^https://' and length(facebook_url) <= 500)),
  address_bn         text check (address_bn is null or length(address_bn) <= 300),
  map_url            text check (map_url is null or (map_url ~ '^https://' and length(map_url) <= 1000)),
  temporarily_closed boolean not null default false,
  closure_note_bn    text check (closure_note_bn is null or length(closure_note_bn) <= 300),
  delivery_enabled   boolean,  -- NULL = to be confirmed
  pickup_enabled     boolean,  -- NULL = to be confirmed
  delivery_fee       integer check (delivery_fee is null or delivery_fee between 0 and 100000),
  min_order          integer check (min_order is null or min_order between 0 and 1000000),
  hero_headline_bn   text not null default 'পছন্দের খাবার, এখন আপনার হাতের নাগালে।' check (length(btrim(hero_headline_bn)) between 1 and 160),
  hero_subtext_bn    text not null default 'CUET ও আশেপাশের সবার জন্য মজার খাবার, সহজ অর্ডার।' check (length(hero_subtext_bn) <= 300),
  hero_image_path    text check (hero_image_path is null or (hero_image_path ~ '^site/[A-Za-z0-9/_.-]+$' and length(hero_image_path) <= 300)),
  about_bn           text check (about_bn is null or length(about_bn) <= 2000),
  logo_path          text check (logo_path is null or (logo_path ~ '^site/[A-Za-z0-9/_.-]+$' and length(logo_path) <= 300)),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Weekly hours in Asia/Dhaka local time. day_of_week: 0 = Sunday ... 6 = Saturday.
-- Open while opens_at <= local time < closes_at (same-day hours only).
create table public.opening_hours (
  day_of_week smallint primary key check (day_of_week between 0 and 6),
  opens_at    time not null,
  closes_at   time not null,
  is_closed   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint opening_hours_order check (closes_at > opens_at)
);

-- updated_at triggers
create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger product_variants_set_updated_at before update on public.product_variants for each row execute function public.set_updated_at();
create trigger product_addons_set_updated_at before update on public.product_addons for each row execute function public.set_updated_at();
create trigger discounts_set_updated_at before update on public.discounts for each row execute function public.set_updated_at();
create trigger restaurant_settings_set_updated_at before update on public.restaurant_settings for each row execute function public.set_updated_at();
create trigger opening_hours_set_updated_at before update on public.opening_hours for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Confirmed business configuration (real data, not sample): applied in production too.
-- WhatsApp +8801845690533; every day 15:00-22:00 Asia/Dhaka. All editable in admin.
-- ---------------------------------------------------------------------------
insert into public.restaurant_settings (id) values (1) on conflict (id) do nothing;

insert into public.opening_hours (day_of_week, opens_at, closes_at)
select d, time '15:00', time '22:00' from generate_series(0, 6) as d
on conflict (day_of_week) do nothing;
