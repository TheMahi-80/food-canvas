-- =============================================================================
-- RLS / privilege checks for Food Canvas.
--
-- Proves that:
--   * anonymous visitors read ONLY public, active data;
--   * anonymous visitors cannot write anything (tables, RPCs, storage);
--   * a signed-in NON-admin cannot write anything either;
--   * an admin CAN write (positive control, so "deny everything" would not pass);
--   * key constraints reject invalid data.
--
-- Everything runs inside one transaction that is ROLLED BACK at the end: no test users,
-- rows, or files are left behind. Safe to run in the Supabase SQL editor of a real project.
-- Success: the final result row says ALL RLS CHECKS PASSED. Failure: an error starting with
-- "FAIL:" names the check that failed.
--
-- Also executed automatically by `npm test` (supabase/tests/rls.test.ts) against an
-- in-memory Postgres with a minimal Supabase auth/storage stand-in.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Helpers (schema is dropped by the rollback)
-- ---------------------------------------------------------------------------
create schema rls_test;
grant usage on schema rls_test to anon, authenticated;

-- Passes if the statement is rejected with a privilege/RLS error, or (for non-INSERT
-- statements) silently affects zero rows because RLS hides every row.
create function rls_test.expect_denied(p_sql text, p_label text) returns void
language plpgsql as $$
declare
  n bigint;
begin
  begin
    execute p_sql;
    get diagnostics n = row_count;
  exception when insufficient_privilege then
    return;
  end;
  if n = 0 and p_sql !~* '^\s*insert' then
    return;
  end if;
  raise exception 'FAIL: % was allowed (% rows affected)', p_label, n;
end;
$$;

-- Passes only if the statement fails with one of the given SQLSTATEs (comma-separated).
create function rls_test.expect_error(p_sql text, p_state text, p_label text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlstate = any (string_to_array(p_state, ',')) then
      return;
    end if;
    raise exception 'FAIL: % raised % (%) instead of %', p_label, sqlstate, sqlerrm, p_state;
  end;
  raise exception 'FAIL: % succeeded but should have failed with %', p_label, p_state;
end;
$$;

-- Passes only if the statement succeeds and affects exactly p_rows rows.
create function rls_test.expect_rows(p_sql text, p_rows bigint, p_label text) returns void
language plpgsql as $$
declare
  n bigint;
begin
  begin
    execute p_sql;
  exception when others then
    raise exception 'FAIL: % errored: % (%)', p_label, sqlerrm, sqlstate;
  end;
  get diagnostics n = row_count;
  if n <> p_rows then
    raise exception 'FAIL: % affected % rows, expected %', p_label, n, p_rows;
  end if;
end;
$$;

grant execute on all functions in schema rls_test to anon, authenticated;

-- Every write a client could attempt. Values are otherwise valid, so only RLS/privileges
-- can stop them.
create function rls_test.write_attempts() returns table (label text, sql text)
language sql as $$
  values
    ('insert categories',          $q$insert into public.categories (slug, name_bn) values ('zz-test-hack', 'x')$q$),
    ('update categories',          $q$update public.categories set name_bn = 'hacked'$q$),
    ('delete categories',          $q$delete from public.categories where slug like 'zz-test-%'$q$),
    ('insert products',            $q$insert into public.products (category_id, slug, name_bn, price) values ('f1000000-0000-4000-8000-0000000000c1', 'zz-test-hack', 'x', 1)$q$),
    ('update products price',      $q$update public.products set price = 0$q$),
    ('delete products',            $q$delete from public.products where slug like 'zz-test-%'$q$),
    ('insert product_variants',    $q$insert into public.product_variants (product_id, name_bn, price) values ('f1000000-0000-4000-8000-0000000000b1', 'hack', 1)$q$),
    ('update product_variants',    $q$update public.product_variants set price = 0$q$),
    ('delete product_variants',    $q$delete from public.product_variants$q$),
    ('insert product_addons',      $q$insert into public.product_addons (product_id, name_bn, price) values ('f1000000-0000-4000-8000-0000000000b1', 'hack', 1)$q$),
    ('update product_addons',      $q$update public.product_addons set price = 0$q$),
    ('delete product_addons',      $q$delete from public.product_addons$q$),
    ('insert discounts',           $q$insert into public.discounts (name_bn, scope, type, value) values ('hack', 'cart', 'percentage', 100)$q$),
    ('update discounts',           $q$update public.discounts set value = 100 where type = 'percentage'$q$),
    ('delete discounts',           $q$delete from public.discounts$q$),
    ('update whatsapp number',     $q$update public.restaurant_settings set whatsapp_number = '8801700000000'$q$),
    ('insert restaurant_settings', $q$insert into public.restaurant_settings (id) values (1)$q$),
    ('delete restaurant_settings', $q$delete from public.restaurant_settings$q$),
    ('update opening_hours',       $q$update public.opening_hours set is_closed = true$q$),
    ('insert opening_hours',       $q$insert into public.opening_hours (day_of_week, opens_at, closes_at) values (0, '10:00', '11:00')$q$),
    ('delete opening_hours',       $q$delete from public.opening_hours$q$),
    ('insert admin_users',         $q$insert into public.admin_users (user_id) values ('f1000000-0000-4000-8000-0000000000a2')$q$),
    ('delete admin_users',         $q$delete from public.admin_users$q$),
    ('rpc delete_category',        $q$select public.delete_category('f1000000-0000-4000-8000-0000000000c3')$q$),
    ('rpc save_product',           $q$select public.save_product('f1000000-0000-4000-8000-0000000000b1', false, '{"category_id":"f1000000-0000-4000-8000-0000000000c1","name_bn":"hacked","price":0,"is_active":true,"is_available":true,"is_featured":false}', '[]', '[]')$q$),
    ('rpc reorder_categories',     $q$select public.reorder_categories(array['f1000000-0000-4000-8000-0000000000c3', 'f1000000-0000-4000-8000-0000000000c1']::uuid[])$q$),
    ('rpc reorder_products',       $q$select public.reorder_products(array['f1000000-0000-4000-8000-0000000000b2', 'f1000000-0000-4000-8000-0000000000b1']::uuid[])$q$),
    ('storage upload',             $q$insert into storage.objects (bucket_id, name) values ('menu-images', 'products/zz-test-hack.jpg')$q$),
    ('storage update',             $q$update storage.objects set name = 'products/zz-renamed.jpg' where bucket_id = 'menu-images'$q$),
    ('storage delete',             $q$delete from storage.objects where bucket_id = 'menu-images'$q$),
    ('storage bucket change',      $q$update storage.buckets set public = false where id = 'menu-images'$q$)
$$;

-- ---------------------------------------------------------------------------
-- Fixtures (inserted as the table owner, which RLS does not restrict)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, aud, role) values
  ('f1000000-0000-4000-8000-0000000000a1', 'rls-test-admin@example.invalid', 'authenticated', 'authenticated'),
  ('f1000000-0000-4000-8000-0000000000a2', 'rls-test-user@example.invalid',  'authenticated', 'authenticated');
insert into public.admin_users (user_id) values ('f1000000-0000-4000-8000-0000000000a1');

insert into public.categories (id, slug, name_bn, is_active) values
  ('f1000000-0000-4000-8000-0000000000c1', 'zz-test-active',   'টেস্ট সক্রিয়', true),
  ('f1000000-0000-4000-8000-0000000000c2', 'zz-test-inactive', 'টেস্ট নিষ্ক্রিয়', false),
  ('f1000000-0000-4000-8000-0000000000c3', 'zz-test-empty',    'টেস্ট খালি', true);

insert into public.products (id, category_id, slug, name_bn, price, is_active) values
  ('f1000000-0000-4000-8000-0000000000b1', 'f1000000-0000-4000-8000-0000000000c1', 'zz-test-visible',          'দৃশ্যমান', 100, true),
  ('f1000000-0000-4000-8000-0000000000b2', 'f1000000-0000-4000-8000-0000000000c1', 'zz-test-inactive-product', 'নিষ্ক্রিয়', 100, false),
  ('f1000000-0000-4000-8000-0000000000b3', 'f1000000-0000-4000-8000-0000000000c2', 'zz-test-in-hidden-cat',    'লুকানো ক্যাটাগরিতে', 100, true);

insert into public.product_variants (id, product_id, name_bn, price) values
  ('f1000000-0000-4000-8000-0000000000e1', 'f1000000-0000-4000-8000-0000000000b1', 'ছোট', 100),
  ('f1000000-0000-4000-8000-0000000000e2', 'f1000000-0000-4000-8000-0000000000b2', 'ছোট', 100),
  ('f1000000-0000-4000-8000-0000000000e3', 'f1000000-0000-4000-8000-0000000000b3', 'ছোট', 100);

insert into public.product_addons (id, product_id, name_bn, price) values
  ('f1000000-0000-4000-8000-0000000000f1', 'f1000000-0000-4000-8000-0000000000b1', 'চিজ', 20),
  ('f1000000-0000-4000-8000-0000000000f2', 'f1000000-0000-4000-8000-0000000000b2', 'চিজ', 20),
  ('f1000000-0000-4000-8000-0000000000f3', 'f1000000-0000-4000-8000-0000000000b3', 'চিজ', 20);

insert into public.discounts (id, name_bn, scope, type, value, product_id, coupon_code, min_cart_value, starts_at, ends_at, is_active) values
  ('f1000000-0000-4000-8000-0000000000d1', 'public active',   'product', 'percentage', 10, 'f1000000-0000-4000-8000-0000000000b1', null, null, null, null, true),
  ('f1000000-0000-4000-8000-0000000000d2', 'inactive',        'product', 'percentage', 10, 'f1000000-0000-4000-8000-0000000000b1', null, null, null, null, false),
  ('f1000000-0000-4000-8000-0000000000d3', 'expired',         'product', 'percentage', 10, 'f1000000-0000-4000-8000-0000000000b1', null, null, now() - interval '2 days', now() - interval '1 day', true),
  ('f1000000-0000-4000-8000-0000000000d6', 'starts tomorrow', 'product', 'percentage', 10, 'f1000000-0000-4000-8000-0000000000b1', null, null, now() + interval '1 day', null, true);
insert into public.discounts (id, name_bn, scope, type, value, coupon_code, min_cart_value, starts_at, ends_at, is_active) values
  ('f1000000-0000-4000-8000-0000000000d4', 'valid coupon',    'cart', 'fixed', 50, 'ZZTESTCOUPON',   300, null, null, true),
  ('f1000000-0000-4000-8000-0000000000d5', 'expired coupon',  'cart', 'fixed', 50, 'ZZEXPIRED',      null, now() - interval '2 days', now() - interval '1 day', true),
  ('f1000000-0000-4000-8000-0000000000d7', 'inactive coupon', 'cart', 'fixed', 50, 'ZZINACTIVE',     null, null, null, false);

-- ===========================================================================
-- 1. ANONYMOUS: reads only public active data
-- ===========================================================================
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

do $$
begin
  if public.is_admin() then raise exception 'FAIL: anon is_admin() returned true'; end if;

  -- categories
  if exists (select 1 from public.categories where not is_active) then
    raise exception 'FAIL: anon can read an inactive category'; end if;
  if not exists (select 1 from public.categories where id = 'f1000000-0000-4000-8000-0000000000c1') then
    raise exception 'FAIL: anon cannot read an active category'; end if;

  -- products: never inactive, never inside an inactive category
  if exists (select 1 from public.products where not is_active) then
    raise exception 'FAIL: anon can read an inactive product'; end if;
  if exists (select 1 from public.products p
             join public.categories c on c.id = p.category_id where not c.is_active) then
    raise exception 'FAIL: anon can read a product in an inactive category (join)'; end if;
  if exists (select 1 from public.products p
             where not exists (select 1 from public.categories c where c.id = p.category_id)) then
    raise exception 'FAIL: anon can read a product whose category is hidden'; end if;
  if exists (select 1 from public.products where id in ('f1000000-0000-4000-8000-0000000000b2', 'f1000000-0000-4000-8000-0000000000b3')) then
    raise exception 'FAIL: anon can read hidden test products'; end if;
  if not exists (select 1 from public.products where id = 'f1000000-0000-4000-8000-0000000000b1') then
    raise exception 'FAIL: anon cannot read an active product'; end if;

  -- variants / add-ons follow the parent product
  if exists (select 1 from public.product_variants v
             where not exists (select 1 from public.products p where p.id = v.product_id)) then
    raise exception 'FAIL: anon can read a variant of a hidden product'; end if;
  if exists (select 1 from public.product_variants where id in ('f1000000-0000-4000-8000-0000000000e2', 'f1000000-0000-4000-8000-0000000000e3')) then
    raise exception 'FAIL: anon can read hidden test variants'; end if;
  if not exists (select 1 from public.product_variants where id = 'f1000000-0000-4000-8000-0000000000e1') then
    raise exception 'FAIL: anon cannot read a visible variant'; end if;
  if exists (select 1 from public.product_addons a
             where not exists (select 1 from public.products p where p.id = a.product_id)) then
    raise exception 'FAIL: anon can read an add-on of a hidden product'; end if;
  if exists (select 1 from public.product_addons where id in ('f1000000-0000-4000-8000-0000000000f2', 'f1000000-0000-4000-8000-0000000000f3')) then
    raise exception 'FAIL: anon can read hidden test add-ons'; end if;
  if not exists (select 1 from public.product_addons where id = 'f1000000-0000-4000-8000-0000000000f1') then
    raise exception 'FAIL: anon cannot read a visible add-on'; end if;

  -- discounts: never coupons, inactive or ended ones
  if exists (select 1 from public.discounts where coupon_code is not null) then
    raise exception 'FAIL: anon can list coupon codes'; end if;
  if exists (select 1 from public.discounts where not is_active) then
    raise exception 'FAIL: anon can read an inactive discount'; end if;
  if exists (select 1 from public.discounts where ends_at is not null and ends_at <= now()) then
    raise exception 'FAIL: anon can read an ended discount'; end if;
  if not exists (select 1 from public.discounts where id = 'f1000000-0000-4000-8000-0000000000d1') then
    raise exception 'FAIL: anon cannot read an active discount'; end if;
  if not exists (select 1 from public.discounts where id = 'f1000000-0000-4000-8000-0000000000d6') then
    raise exception 'FAIL: anon cannot read a scheduled (future) discount'; end if;

  -- coupons only via exact-code lookup, only when currently valid
  if (select count(*) from public.lookup_coupon('  zztestcoupon ')) <> 1 then
    raise exception 'FAIL: valid coupon lookup did not return exactly one row'; end if;
  if exists (select 1 from public.lookup_coupon('ZZEXPIRED')) then
    raise exception 'FAIL: expired coupon returned by lookup'; end if;
  if exists (select 1 from public.lookup_coupon('ZZINACTIVE')) then
    raise exception 'FAIL: inactive coupon returned by lookup'; end if;
  if exists (select 1 from public.lookup_coupon('%')) then
    raise exception 'FAIL: wildcard coupon lookup returned rows'; end if;

  -- public settings and hours
  if (select count(*) from public.restaurant_settings) <> 1 then
    raise exception 'FAIL: anon cannot read the settings row'; end if;
  if (select whatsapp_number from public.restaurant_settings) <> '8801845690533' then
    raise exception 'FAIL: settings WhatsApp number is not the confirmed number'; end if;
  if (select count(*) from public.opening_hours where opens_at = '15:00' and closes_at = '22:00' and not is_closed) <> 7 then
    raise exception 'FAIL: opening hours are not 15:00-22:00 on all 7 days'; end if;
end $$;

-- admin list is not readable by anon at all
select rls_test.expect_denied($q$select * from public.admin_users$q$, 'anon read admin_users');
-- storage objects are not listable by anon
select rls_test.expect_denied($q$select * from storage.objects where bucket_id = 'menu-images'$q$, 'anon list storage');

-- ===========================================================================
-- 2. ANONYMOUS: cannot write anything
-- ===========================================================================
select rls_test.expect_denied(sql, 'anon: ' || label) from rls_test.write_attempts();

reset role;

-- ===========================================================================
-- 3. SIGNED-IN NON-ADMIN: cannot write anything, sees what anon sees
-- ===========================================================================
select set_config('request.jwt.claims', '{"sub":"f1000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  if auth.uid() <> 'f1000000-0000-4000-8000-0000000000a2' then
    raise exception 'FAIL: test setup, auth.uid() is not the non-admin user'; end if;
  if public.is_admin() then raise exception 'FAIL: non-admin is_admin() returned true'; end if;
  if exists (select 1 from public.categories where not is_active) then
    raise exception 'FAIL: non-admin can read an inactive category'; end if;
  if exists (select 1 from public.products where id in ('f1000000-0000-4000-8000-0000000000b2', 'f1000000-0000-4000-8000-0000000000b3')) then
    raise exception 'FAIL: non-admin can read hidden products'; end if;
  if exists (select 1 from public.discounts where coupon_code is not null) then
    raise exception 'FAIL: non-admin can list coupon codes'; end if;
  if exists (select 1 from public.admin_users) then
    raise exception 'FAIL: non-admin can read admin_users rows'; end if;
end $$;

select rls_test.expect_denied(sql, 'non-admin: ' || label) from rls_test.write_attempts();

reset role;

-- Nothing changed after all denied attempts (checked as owner)
do $$
begin
  if (select whatsapp_number from public.restaurant_settings) <> '8801845690533' then
    raise exception 'FAIL: WhatsApp number changed by a denied writer'; end if;
  if (select name_bn from public.categories where id = 'f1000000-0000-4000-8000-0000000000c1') <> 'টেস্ট সক্রিয়' then
    raise exception 'FAIL: category renamed by a denied writer'; end if;
  if (select price from public.products where id = 'f1000000-0000-4000-8000-0000000000b1') <> 100 then
    raise exception 'FAIL: price changed by a denied writer'; end if;
  if (select count(*) from public.admin_users where user_id = 'f1000000-0000-4000-8000-0000000000a2') <> 0 then
    raise exception 'FAIL: non-admin became admin'; end if;
  if exists (select 1 from public.categories where slug = 'zz-test-hack') then
    raise exception 'FAIL: denied insert left a row behind'; end if;
  if (select count(*) from public.opening_hours where is_closed) <> 0 then
    raise exception 'FAIL: opening hours changed by a denied writer'; end if;
end $$;

-- ===========================================================================
-- 4. ADMIN: positive control (writes succeed, hidden data visible)
-- ===========================================================================
select set_config('request.jwt.claims', '{"sub":"f1000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  if not public.is_admin() then raise exception 'FAIL: admin is_admin() returned false'; end if;
  if not exists (select 1 from public.categories where id = 'f1000000-0000-4000-8000-0000000000c2') then
    raise exception 'FAIL: admin cannot see an inactive category'; end if;
  if not exists (select 1 from public.products where id = 'f1000000-0000-4000-8000-0000000000b3') then
    raise exception 'FAIL: admin cannot see a product in an inactive category'; end if;
  if not exists (select 1 from public.discounts where id = 'f1000000-0000-4000-8000-0000000000d4') then
    raise exception 'FAIL: admin cannot see coupon discounts'; end if;
  if (select count(*) from public.admin_users) <> 1 then
    raise exception 'FAIL: admin cannot read own admin_users row'; end if;
end $$;

select rls_test.expect_rows($q$insert into public.categories (slug, name_bn) values ('zz-test-new', 'নতুন')$q$, 1, 'admin insert category');
select rls_test.expect_rows($q$update public.products set price = 150 where id = 'f1000000-0000-4000-8000-0000000000b1'$q$, 1, 'admin update price');
select rls_test.expect_rows($q$insert into public.product_variants (product_id, name_bn, price) values ('f1000000-0000-4000-8000-0000000000b1', 'বড়', 160)$q$, 1, 'admin insert variant');
select rls_test.expect_rows($q$delete from public.product_addons where id = 'f1000000-0000-4000-8000-0000000000f1'$q$, 1, 'admin delete add-on');
select rls_test.expect_rows($q$insert into public.discounts (name_bn, scope, type, value) values ('admin test', 'cart', 'percentage', 5)$q$, 1, 'admin insert discount');
select rls_test.expect_rows($q$update public.restaurant_settings set delivery_fee = 30 where id = 1$q$, 1, 'admin update settings');
select rls_test.expect_rows($q$update public.opening_hours set opens_at = '15:00' where day_of_week = 5$q$, 1, 'admin update hours');
select rls_test.expect_rows($q$insert into storage.objects (bucket_id, name) values ('menu-images', 'products/zz-test-admin.jpg')$q$, 1, 'admin storage upload under products/');

-- even admins: wrong storage folder, wrong bucket, or self-service admin grants are refused
select rls_test.expect_denied($q$insert into storage.objects (bucket_id, name) values ('menu-images', 'other/zz-test.jpg')$q$, 'admin storage upload outside allowed folders');
select rls_test.expect_denied($q$insert into storage.objects (bucket_id, name) values ('menu-images', 'zz-test-root.jpg')$q$, 'admin storage upload at bucket root');
select rls_test.expect_denied($q$insert into public.admin_users (user_id) values ('f1000000-0000-4000-8000-0000000000a2')$q$, 'admin granting admin from the app');

-- save_product: atomic create/update with option sync that keeps option ids stable
select public.save_product(
  'f1000000-0000-4000-8000-0000000000b9', true,
  '{"category_id":"f1000000-0000-4000-8000-0000000000c1","slug":"zz-test-saved","name_bn":"সেভ টেস্ট","name_en":null,"description_bn":null,"description_en":null,"price":120,"image_path":null,"is_active":true,"is_available":true,"is_featured":true}',
  '[{"id":null,"name_bn":"ছোট","name_en":null,"price":120,"is_available":true},{"id":null,"name_bn":"বড়","name_en":null,"price":200,"is_available":true}]',
  '[{"id":null,"name_bn":"চিজ","name_en":"Cheese","price":30,"is_available":true}]'
);
do $$
declare
  v_small uuid := (select id from public.product_variants where product_id = 'f1000000-0000-4000-8000-0000000000b9' and name_bn = 'ছোট');
  v_big uuid := (select id from public.product_variants where product_id = 'f1000000-0000-4000-8000-0000000000b9' and name_bn = 'বড়');
begin
  if (select count(*) from public.product_variants where product_id = 'f1000000-0000-4000-8000-0000000000b9') <> 2
     or (select count(*) from public.product_addons where product_id = 'f1000000-0000-4000-8000-0000000000b9') <> 1 then
    raise exception 'FAIL: save_product create did not insert options'; end if;
  -- swap the two names (deferred uniqueness), drop the add-on, add a new one
  perform public.save_product(
    'f1000000-0000-4000-8000-0000000000b9', false,
    '{"category_id":"f1000000-0000-4000-8000-0000000000c1","name_bn":"সেভ টেস্ট ২","name_en":null,"description_bn":null,"description_en":null,"price":130,"image_path":null,"is_active":true,"is_available":false,"is_featured":false}',
    jsonb_build_array(
      jsonb_build_object('id', v_big, 'name_bn', 'ছোট', 'name_en', null, 'price', 130, 'is_available', true),
      jsonb_build_object('id', v_small, 'name_bn', 'বড়', 'name_en', null, 'price', 210, 'is_available', true)),
    '[{"id":null,"name_bn":"সস","name_en":null,"price":10,"is_available":true}]');
  if (select name_bn || price from public.products where id = 'f1000000-0000-4000-8000-0000000000b9') <> 'সেভ টেস্ট ২130' then
    raise exception 'FAIL: save_product update did not change the product'; end if;
  if (select name_bn from public.product_variants where id = v_small) <> 'বড়'
     or (select sort_order from public.product_variants where id = v_big) <> 10 then
    raise exception 'FAIL: save_product did not keep variant ids / order'; end if;
  if exists (select 1 from public.product_addons where product_id = 'f1000000-0000-4000-8000-0000000000b9' and name_bn = 'চিজ')
     or not exists (select 1 from public.product_addons where product_id = 'f1000000-0000-4000-8000-0000000000b9' and name_bn = 'সস') then
    raise exception 'FAIL: save_product did not sync add-ons'; end if;
end $$;
-- an option id from another product is refused (and nothing is changed)
select rls_test.expect_error($q$select public.save_product('f1000000-0000-4000-8000-0000000000b9', false, '{"category_id":"f1000000-0000-4000-8000-0000000000c1","name_bn":"x","price":1,"is_active":true,"is_available":true,"is_featured":false}', '[{"id":"f1000000-0000-4000-8000-0000000000e1","name_bn":"চুরি","price":1,"is_available":true}]', '[]')$q$, 'P0002', 'save_product with a foreign variant id');
select rls_test.expect_error($q$select public.save_product('f1000000-0000-4000-8000-00000000ffff', false, '{"category_id":"f1000000-0000-4000-8000-0000000000c1","name_bn":"x","price":1,"is_active":true,"is_available":true,"is_featured":false}', '[]', '[]')$q$, 'P0002', 'save_product update of a missing product');
select rls_test.expect_error($q$select public.save_product('f1000000-0000-4000-8000-0000000000b9', false, '{"category_id":"f1000000-0000-4000-8000-0000000000c1","name_bn":"x","price":-5,"is_active":true,"is_available":true,"is_featured":false}', '[]', '[]')$q$, '23514', 'save_product negative price');
-- duplicate option names: uniqueness is deferred to commit, so force the check here
do $$
begin
  begin
    perform public.save_product('f1000000-0000-4000-8000-0000000000b9', false,
      '{"category_id":"f1000000-0000-4000-8000-0000000000c1","name_bn":"x","price":1,"is_active":true,"is_available":true,"is_featured":false}',
      '[{"id":null,"name_bn":"এক","price":1,"is_available":true},{"id":null,"name_bn":"এক","price":2,"is_available":true}]', '[]');
    set constraints all immediate;
    raise exception 'FAIL: save_product accepted duplicate variant names';
  exception when unique_violation then
    null;
  end;
end $$;
set constraints all deferred;

select public.reorder_categories(array['f1000000-0000-4000-8000-0000000000c3', 'f1000000-0000-4000-8000-0000000000c1']::uuid[]);
select public.reorder_products(array['f1000000-0000-4000-8000-0000000000b9', 'f1000000-0000-4000-8000-0000000000b1']::uuid[]);
do $$
begin
  if (select sort_order from public.categories where id = 'f1000000-0000-4000-8000-0000000000c1') <> 10
     or (select sort_order from public.categories where id = 'f1000000-0000-4000-8000-0000000000c3') <> 0 then
    raise exception 'FAIL: reorder_categories'; end if;
  if (select sort_order from public.products where id = 'f1000000-0000-4000-8000-0000000000b1') <> 10 then
    raise exception 'FAIL: reorder_products'; end if;
end $$;

-- category deletion never orphans products
-- ON DELETE RESTRICT: 23503 on Postgres 17 (Supabase), 23001 on Postgres 18+ (PGlite)
select rls_test.expect_error($q$delete from public.categories where id = 'f1000000-0000-4000-8000-0000000000c1'$q$, '23503,23001', 'direct delete of category with products');
select rls_test.expect_error($q$select public.delete_category('f1000000-0000-4000-8000-0000000000c1')$q$, '23503', 'delete_category with products and no choice');
select rls_test.expect_error($q$select public.delete_category('f1000000-0000-4000-8000-0000000000c1', 'f1000000-0000-4000-8000-0000000000c1')$q$, '22023', 'delete_category reassign to itself');
select public.delete_category('f1000000-0000-4000-8000-0000000000c3');
select public.delete_category('f1000000-0000-4000-8000-0000000000c2', 'f1000000-0000-4000-8000-0000000000c1');

do $$
begin
  if exists (select 1 from public.categories where id in ('f1000000-0000-4000-8000-0000000000c2', 'f1000000-0000-4000-8000-0000000000c3')) then
    raise exception 'FAIL: delete_category did not delete'; end if;
  if (select category_id from public.products where id = 'f1000000-0000-4000-8000-0000000000b3') <> 'f1000000-0000-4000-8000-0000000000c1' then
    raise exception 'FAIL: delete_category did not reassign products'; end if;
end $$;

select public.delete_category('f1000000-0000-4000-8000-0000000000c1', null, true);
do $$
begin
  if exists (select 1 from public.products where slug like 'zz-test-%') then
    raise exception 'FAIL: delete_category(delete products) left products'; end if;
end $$;

reset role;

-- ===========================================================================
-- 5. CONSTRAINTS (owner role; constraints apply to everyone)
-- ===========================================================================
insert into public.categories (id, slug, name_bn) values ('f1000000-0000-4000-8000-0000000000c9', 'zz-test-constraints', 'টেস্ট');
select rls_test.expect_error($q$insert into public.products (category_id, slug, name_bn, price) values ('f1000000-0000-4000-8000-0000000000c9', 'zz-test-neg', 'x', -1)$q$, '23514', 'negative product price');
select rls_test.expect_error($q$insert into public.discounts (name_bn, scope, type, value) values ('x', 'cart', 'percentage', 101)$q$, '23514', 'percentage above 100');
select rls_test.expect_error($q$insert into public.discounts (name_bn, scope, type, value) values ('x', 'cart', 'fixed', -5)$q$, '23514', 'negative fixed discount');
select rls_test.expect_error($q$insert into public.discounts (name_bn, scope, type, value) values ('x', 'cart', 'sale_price', 10)$q$, '23514', 'sale_price on cart scope');
select rls_test.expect_error($q$insert into public.discounts (name_bn, scope, type, value) values ('x', 'product', 'percentage', 10)$q$, '23514', 'product discount without product');
select rls_test.expect_error($q$insert into public.discounts (name_bn, scope, type, value, coupon_code) values ('x', 'cart', 'fixed', 10, 'lower')$q$, '23514', 'lowercase coupon code');
select rls_test.expect_error($q$insert into public.discounts (name_bn, scope, type, value, starts_at, ends_at) values ('x', 'cart', 'fixed', 10, now(), now() - interval '1 hour')$q$, '23514', 'discount ending before it starts');
select rls_test.expect_error($q$update public.restaurant_settings set whatsapp_number = '01845690533'$q$, '23514', 'non-international WhatsApp number');
select rls_test.expect_error($q$update public.restaurant_settings set delivery_fee = -1$q$, '23514', 'negative delivery fee');
select rls_test.expect_error($q$update public.restaurant_settings set map_url = 'javascript:alert(1)'$q$, '23514', 'non-https map URL');
select rls_test.expect_error($q$insert into public.restaurant_settings (id) values (2)$q$, '23514', 'second settings row');
select rls_test.expect_error($q$update public.opening_hours set closes_at = '14:00' where day_of_week = 1$q$, '23514', 'closing before opening');

rollback;

select 'ALL RLS CHECKS PASSED' as result;
