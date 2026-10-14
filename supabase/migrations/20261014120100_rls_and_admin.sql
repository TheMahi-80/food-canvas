-- Row Level Security and admin authorization.
-- Admin = a row in public.admin_users for auth.uid(). Checked in the database by every write policy.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Table privileges (defense in depth on top of RLS).
-- Supabase grants ALL on new public tables to anon/authenticated by default; reset that.
-- anon: read-only. authenticated: may attempt writes, but RLS only lets admins through.
-- ---------------------------------------------------------------------------
revoke all on table
  public.admin_users, public.categories, public.products, public.product_variants,
  public.product_addons, public.discounts, public.restaurant_settings, public.opening_hours
from anon, authenticated;

grant select on table
  public.categories, public.products, public.product_variants, public.product_addons,
  public.discounts, public.restaurant_settings, public.opening_hours
to anon, authenticated;

grant insert, update, delete on table
  public.categories, public.products, public.product_variants, public.product_addons, public.discounts
to authenticated;

-- Singleton settings and the 7 fixed weekday rows: update only.
grant update on table public.restaurant_settings, public.opening_hours to authenticated;

grant select on table public.admin_users to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.admin_users         enable row level security;
alter table public.categories          enable row level security;
alter table public.products            enable row level security;
alter table public.product_variants    enable row level security;
alter table public.product_addons      enable row level security;
alter table public.discounts           enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.opening_hours       enable row level security;

-- admin_users: a signed-in user can see only their own row (used to check "am I admin").
-- No insert/update/delete policies: admins are granted via the SQL editor only.
create policy "admin_users: read own row" on public.admin_users
  for select to authenticated
  using (user_id = (select auth.uid()));

-- categories
create policy "categories: public reads active" on public.categories
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy "categories: admin insert" on public.categories
  for insert to authenticated with check ((select public.is_admin()));
create policy "categories: admin update" on public.categories
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "categories: admin delete" on public.categories
  for delete to authenticated using ((select public.is_admin()));

-- products: public only if the product AND its category are active.
-- (The subquery on categories is itself filtered by categories' RLS.)
create policy "products: public reads active" on public.products
  for select to anon, authenticated
  using (
    (is_active and exists (select 1 from public.categories c where c.id = category_id and c.is_active))
    or (select public.is_admin())
  );
create policy "products: admin insert" on public.products
  for insert to authenticated with check ((select public.is_admin()));
create policy "products: admin update" on public.products
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "products: admin delete" on public.products
  for delete to authenticated using ((select public.is_admin()));

-- variants / add-ons: visible exactly when the parent product is visible to the caller
-- (the subquery on products is filtered by products' RLS).
create policy "product_variants: public reads visible" on public.product_variants
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id));
create policy "product_variants: admin insert" on public.product_variants
  for insert to authenticated with check ((select public.is_admin()));
create policy "product_variants: admin update" on public.product_variants
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "product_variants: admin delete" on public.product_variants
  for delete to authenticated using ((select public.is_admin()));

create policy "product_addons: public reads visible" on public.product_addons
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id));
create policy "product_addons: admin insert" on public.product_addons
  for insert to authenticated with check ((select public.is_admin()));
create policy "product_addons: admin update" on public.product_addons
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "product_addons: admin delete" on public.product_addons
  for delete to authenticated using ((select public.is_admin()));

-- discounts: public sees active, not-yet-ended, non-coupon discounts. Not-yet-started ones are
-- included on purpose so cached menu data starts them on time (lib/pricing filters by "now").
-- Coupon discounts are never listed publicly; see public.lookup_coupon.
create policy "discounts: public reads active non-coupon" on public.discounts
  for select to anon, authenticated
  using (
    (is_active and coupon_code is null and (ends_at is null or ends_at > now()))
    or (select public.is_admin())
  );
create policy "discounts: admin insert" on public.discounts
  for insert to authenticated with check ((select public.is_admin()));
create policy "discounts: admin update" on public.discounts
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "discounts: admin delete" on public.discounts
  for delete to authenticated using ((select public.is_admin()));

-- settings and hours: public read, admin update.
create policy "restaurant_settings: public read" on public.restaurant_settings
  for select to anon, authenticated using (true);
create policy "restaurant_settings: admin update" on public.restaurant_settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "opening_hours: public read" on public.opening_hours
  for select to anon, authenticated using (true);
create policy "opening_hours: admin update" on public.opening_hours
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Coupon lookup: returns the matching coupon only if it is currently valid.
-- Exact-code match only, so coupon codes cannot be listed.
-- ---------------------------------------------------------------------------
create or replace function public.lookup_coupon(p_code text)
returns table (
  id uuid,
  name_bn text,
  type text,
  value integer,
  min_cart_value integer,
  coupon_code text,
  starts_at timestamptz,
  ends_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.name_bn, d.type, d.value, d.min_cart_value, d.coupon_code, d.starts_at, d.ends_at
  from public.discounts d
  where d.scope = 'cart'
    and d.is_active
    and d.coupon_code = upper(btrim(p_code))
    and (d.starts_at is null or d.starts_at <= now())
    and (d.ends_at is null or d.ends_at > now());
$$;

revoke execute on function public.lookup_coupon(text) from public;
grant execute on function public.lookup_coupon(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Category deletion without orphaning products. Runs with the caller's rights (RLS applies)
-- and additionally refuses non-admins. Exactly one of:
--   p_reassign_to      -> move all products to that category, then delete
--   p_delete_products  -> delete the category's products (and their variants/add-ons/discounts)
--   neither            -> only succeeds if the category has no products
-- ---------------------------------------------------------------------------
create or replace function public.delete_category(
  p_category_id uuid,
  p_reassign_to uuid default null,
  p_delete_products boolean default false
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if not exists (select 1 from public.categories where id = p_category_id) then
    raise exception 'category not found' using errcode = 'P0002';
  end if;

  if p_reassign_to is not null and p_delete_products then
    raise exception 'choose either reassign or delete products, not both' using errcode = '22023';
  end if;

  if p_reassign_to is not null then
    if p_reassign_to = p_category_id then
      raise exception 'cannot reassign to the same category' using errcode = '22023';
    end if;
    if not exists (select 1 from public.categories where id = p_reassign_to) then
      raise exception 'target category not found' using errcode = 'P0002';
    end if;
    update public.products set category_id = p_reassign_to where category_id = p_category_id;
  elsif p_delete_products then
    delete from public.products where category_id = p_category_id;
  elsif exists (select 1 from public.products where category_id = p_category_id) then
    raise exception 'category has products; reassign or delete them explicitly' using errcode = '23503';
  end if;

  delete from public.categories where id = p_category_id;
end;
$$;

revoke execute on function public.delete_category(uuid, uuid, boolean) from public;
grant execute on function public.delete_category(uuid, uuid, boolean) to authenticated;
