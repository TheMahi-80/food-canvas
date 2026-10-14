-- =============================================================================
-- SAMPLE DATA ONLY. NOT the real Food Canvas menu, prices, or offers.
-- Every sample name is prefixed with "[নমুনা]" and every slug with "sample-" so it is
-- obvious on the site and in admin. Replace or delete it before going live:
--   delete from public.discounts  where name_bn like '[নমুনা]%';
--   delete from public.products   where slug like 'sample-%';
--   delete from public.categories where slug like 'sample-%';
--
-- Restaurant settings (WhatsApp number) and opening hours are NOT here: they are real,
-- confirmed configuration and are inserted by migration 20261014120000_core_schema.sql.
-- Safe to run more than once.
-- =============================================================================

insert into public.categories (id, slug, name_bn, name_en, sort_order, is_active) values
  ('5a000000-0000-4000-8000-000000000001', 'sample-burgers', '[নমুনা] বার্গার',   'Sample Burgers', 10, true),
  ('5a000000-0000-4000-8000-000000000002', 'sample-pizza',   '[নমুনা] পিৎজা',     'Sample Pizza',   20, true),
  ('5a000000-0000-4000-8000-000000000003', 'sample-drinks',  '[নমুনা] ড্রিংকস',   'Sample Drinks',  30, true),
  ('5a000000-0000-4000-8000-000000000004', 'sample-hidden',  '[নমুনা] লুকানো ক্যাটাগরি', 'Sample Hidden Category', 40, false)
on conflict (id) do nothing;

insert into public.products
  (id, category_id, slug, name_bn, name_en, description_bn, price, is_active, is_available, is_featured, sort_order)
values
  ('5a000000-0000-4000-8000-000000000101', '5a000000-0000-4000-8000-000000000001', 'sample-chicken-burger',
   '[নমুনা] চিকেন বার্গার', 'Sample Chicken Burger', 'নমুনা ডেটা — আসল মেনু নয়। এক্সট্রা চিজ যোগ করা যায়।', 180, true, true, true, 10),
  ('5a000000-0000-4000-8000-000000000102', '5a000000-0000-4000-8000-000000000001', 'sample-beef-burger',
   '[নমুনা] বিফ বার্গার', 'Sample Beef Burger', 'নমুনা ডেটা — আসল মেনু নয়। এই মুহূর্তে নেই দেখানোর উদাহরণ।', 220, true, false, false, 20),
  ('5a000000-0000-4000-8000-000000000103', '5a000000-0000-4000-8000-000000000002', 'sample-chicken-pizza',
   '[নমুনা] চিকেন পিৎজা', 'Sample Chicken Pizza', 'নমুনা ডেটা — আসল মেনু নয়। সাইজ বেছে নিতে হবে।', 350, true, true, true, 10),
  ('5a000000-0000-4000-8000-000000000104', '5a000000-0000-4000-8000-000000000003', 'sample-cold-coffee',
   '[নমুনা] কোল্ড কফি', 'Sample Cold Coffee', 'নমুনা ডেটা — আসল মেনু নয়।', 120, true, true, false, 10),
  ('5a000000-0000-4000-8000-000000000105', '5a000000-0000-4000-8000-000000000003', 'sample-hidden-drink',
   '[নমুনা] লুকানো ড্রিংক', 'Sample Hidden Drink', 'নমুনা ডেটা — নিষ্ক্রিয় পণ্য, সাইটে দেখা যাবে না।', 90, false, true, false, 20),
  ('5a000000-0000-4000-8000-000000000106', '5a000000-0000-4000-8000-000000000004', 'sample-item-in-hidden-category',
   '[নমুনা] লুকানো ক্যাটাগরির খাবার', 'Sample Item In Hidden Category', 'নমুনা ডেটা — নিষ্ক্রিয় ক্যাটাগরিতে, সাইটে দেখা যাবে না।', 150, true, true, false, 10)
on conflict (id) do nothing;

insert into public.product_variants (id, product_id, name_bn, name_en, price, sort_order) values
  ('5a000000-0000-4000-8000-000000000201', '5a000000-0000-4000-8000-000000000103', '৮ ইঞ্চি',  '8 inch',  350, 10),
  ('5a000000-0000-4000-8000-000000000202', '5a000000-0000-4000-8000-000000000103', '১০ ইঞ্চি', '10 inch', 480, 20),
  ('5a000000-0000-4000-8000-000000000203', '5a000000-0000-4000-8000-000000000103', '১২ ইঞ্চি', '12 inch', 620, 30)
on conflict (id) do nothing;

insert into public.product_addons (id, product_id, name_bn, name_en, price, sort_order) values
  ('5a000000-0000-4000-8000-000000000301', '5a000000-0000-4000-8000-000000000101', 'এক্সট্রা চিজ', 'Extra Cheese', 30, 10),
  ('5a000000-0000-4000-8000-000000000302', '5a000000-0000-4000-8000-000000000101', 'এক্সট্রা প্যাটি', 'Extra Patty', 80, 20),
  ('5a000000-0000-4000-8000-000000000303', '5a000000-0000-4000-8000-000000000103', 'এক্সট্রা চিজ', 'Extra Cheese', 50, 10)
on conflict (id) do nothing;

insert into public.discounts (id, name_bn, scope, type, value, product_id, category_id, min_cart_value, coupon_code, is_active) values
  ('5a000000-0000-4000-8000-000000000401', '[নমুনা] চিকেন বার্গারে ১০% ছাড়', 'product', 'percentage', 10,
   '5a000000-0000-4000-8000-000000000101', null, null, null, true),
  ('5a000000-0000-4000-8000-000000000402', '[নমুনা] কোল্ড কফি বিশেষ দাম', 'product', 'sale_price', 99,
   '5a000000-0000-4000-8000-000000000104', null, null, null, true),
  ('5a000000-0000-4000-8000-000000000403', '[নমুনা] কুপন: ৫০০ টাকার বেশি অর্ডারে ৫০ টাকা ছাড়', 'cart', 'fixed', 50,
   null, null, 500, 'SAMPLE50', true)
on conflict (id) do nothing;
