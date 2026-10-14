Food Canvas is a real, Bangla-first restaurant ordering website for a local fast-food business serving CUET students, teachers, staff and nearby residents in Chattogram, Bangladesh. It is not a demo.

Two interfaces:

Public site: browse menu, filter, manage cart, send an order request through WhatsApp.
Protected /admin: manage menu, prices, discounts, availability, settings, homepage content.

Core rule: WhatsApp is the only channel for submitting orders. No order backend, no payment gateway, no mandatory customer accounts, no order-management system, no fake tracking, no fake confirmations. Do not create an orders table. If you think one has a genuine purpose, explain and ask first.

Build the simplest complete system that real customers can use and a non-programmer owner can run.

Working rules (important)
Work one stage at a time. Stop at the end of each stage, report what was built, what was verified, and what is not verified. Do not start the next stage unprompted.
Inspect the repo and package manager before changing anything. Do not overwrite working features.
Never fabricate credentials, test results, or "configured" integrations. If something needs real credentials, finish what you can and list the remaining manual steps.
Never invent business facts: no street address, delivery fee, minimum order, ratings, awards, years of experience, customer counts, sales figures.
Do not add libraries, services or abstractions that are not needed. No separate backend server.
No nonfunctional buttons or placeholder handlers for core flows.
Run tsc --noEmit, lint, and tests before declaring any stage done.
Stack

Next.js (App Router), TypeScript (strict), Tailwind CSS, shadcn/ui, Supabase (Postgres, Auth, Storage), Zod, React Hook Form, Lucide icons, Vercel-compatible. Use current stable, mutually compatible versions. Use a localization approach with a single message catalog (default bn), not strings scattered through components.

Confirmed business facts
Name: Food Canvas
WhatsApp ordering number: +8801845690533. Use digits 8801845690533 in links: https://wa.me/8801845690533?text=<encodeURIComponent(message)>. Stored in settings, editable by admin, env fallback FOOD_CANVAS_WHATSAPP_NUMBER.
Hours: every day 3:00 PM to 10:00 PM. Display: প্রতিদিন: বিকাল ৩টা – রাত ১০টা
Timezone: Asia/Dhaka. Open/closed status must be computed in Asia/Dhaka, never from the visitor's device timezone.
Currency: BDT (৳). Store money as integers (whole taka, or paisa if you choose; be consistent). No floats.
Delivery fee, minimum order, address, map link: unknown. Leave empty and configurable. Show "to be confirmed" where relevant.
Brand and design
Logo is the primary brand asset. Never recreate or distort it. Assets live in public/brand/ (see Part 3 for which files exist).
Dark theme (primary): bg 
#050505, cards 
#151515, text 
#FFFFFF, muted 
#A3A3A3, accent 
#FFE500, secondary gold 
#D6B900, subtle dark borders.
Light theme (genuinely designed, not inverted): warm off-white bg, white cards, near-black text, accessible mid-gray secondary text, gold adjusted for contrast, light gray borders.
Theme toggle (sun/moon, accessible label) in nav, desktop and mobile. Persist in localStorage, respect OS preference when unset, no flash of wrong theme, no hydration mismatch. Use design tokens (CSS variables) so every component supports both themes. Admin follows the same theme.
Mobile-first. Android phones are the main device. Accessible contrast, keyboard navigation, visible focus states. Loading, empty, error, success states. No excessive animation.
Gold for primary actions, selected categories, promo prices. Never sacrifice usability for looks.
Language
Bangla is the default and primary language. Keep English where natural (brand name, food names, technical terms). Natural conversational Bangladeshi Bangla, not mechanical translation.
Fonts: Hind Siliguri or Noto Sans Bengali plus a Latin font, loaded efficiently with fallbacks. Verify conjuncts, vowel signs and mixed Bangla/English render correctly on mobile.
Product names/descriptions are admin-controlled; support Bangla and English content fields (name_bn, name_en, etc.) where practical.
No language switcher unless you implement English across the entire UI.

Preferred copy:

English	Bangla
Home / Menu / About / Contact	হোম / মেনু / আমাদের সম্পর্কে / যোগাযোগ
Explore Menu	মেনু দেখুন
Order Now	অর্ডার করুন
Add to Cart	কার্টে যোগ করুন
Shopping Cart	আপনার কার্ট
Search	খাবার খুঁজুন...
All Items	সব খাবার
Popular Items	জনপ্রিয় খাবার
Categories	খাবারের ক্যাটাগরি
Special Offers	বিশেষ অফার
Available / Unavailable	পাওয়া যাচ্ছে / এই মুহূর্তে নেই
Subtotal	সাবটোটাল
Discount	ছাড়
Estimated Total	আনুমানিক মোট
Customer Name	আপনার নাম
WhatsApp Number	আপনার হোয়াটসঅ্যাপ নম্বর
Continue to WhatsApp	হোয়াটসঅ্যাপে অর্ডার করুন
Opening Hours	খোলার সময়
Open Now / Closed Now	এখন খোলা / এখন বন্ধ

Hero (initial, admin-editable): headline পছন্দের খাবার, এখন আপনার হাতের নাগালে। Subtext: "CUET ও আশেপাশের সবার জন্য মজার খাবার, সহজ অর্ডার।" Buttons: "মেনু দেখুন" (primary), "অর্ডার করুন" (secondary).

Opening-hours behavior

Show hours in header, contact section, footer. When open show "এখন খোলা". When closed show "এখন বন্ধ" plus next opening time if determinable. Menu stays browsable and the cart stays usable when closed. Warn that orders may wait until opening. Never claim an order is accepted or scheduled. Hours are editable in admin; confirmed schedule is the default.

Public site requirements
Header: logo, nav, menu shortcut, contact/location, cart icon with live count, prominent order CTA, theme toggle, open/closed status.
Hero: headline, short text, two buttons, real food imagery. No invented claims. Text/imagery editable in admin where practical.
Categories: from DB, plus "সব খাবার". Admin can create, rename, reorder, activate, deactivate. Client-side filtering without a full page reload.
Search/filters: search by name, category, price range, sort by price, availability filter, clear-filters. Dietary filters only if attributes exist. Popularity sorting only if real data exists. Filters and search combine correctly. Friendly empty state.
Product card: image, name, short description, category, price in ৳, original price + discount label when a discount is active, availability, add-to-cart. Unavailable items cannot be ordered. All data from DB. Any sample data is clearly labeled as sample.
Customization: optional variants and add-ons with admin-set prices. Products without options add directly. Required options must be chosen first.
Cart

Add, increase/decrease, remove, clear. Show names, variants, add-ons, quantities, prices, subtotal, discounts, estimated total, delivery fee only if configured. Persist across navigation and reload (localStorage, separate from customer details). Feedback when adding. Block unavailable products. Identical product + identical variants + identical add-ons merge into one line with quantity; any difference stays a separate line. Integer money only. Mobile: drawer or full-screen cart with an obvious checkout button.

Customer details (privacy)
Collect only name and WhatsApp number, only at checkout. No account, email, or Google login.
Phone input supports Bangladesh +880; validate; normalize consistently.
Save to localStorage after validation. Returning customer: reuse silently, show "Edit my details", allow update and removal. Short Bangla privacy note explaining details are remembered on their device.
Never store customer details in a database, analytics, or logs. Never expose phone numbers in public data. Handle storage failures gracefully. localStorage is convenience, never authorization.
WhatsApp checkout (most important workflow)
Cart, then "অর্ডার করুন".
If details missing, show form.
Validate details and cart.
Build a readable order summary.
encodeURIComponent it. Open the official number via https://wa.me/8801845690533?text=... (never the customer's number).
Customer reviews and manually presses Send in WhatsApp.
Restaurant confirms directly with the customer.

Rules: use same-tab navigation or a flow that mobile browsers do not block; avoid pop-up patterns. Include every item, quantity, variant, add-on, unit price, line total, subtotal, valid discounts only, estimated total, and delivery fee as "to be confirmed" unless configured. Do not truncate unnecessarily. Show this notice (in Bangla): "Your order request is not submitted until you send the message in WhatsApp." Never claim the order is placed or confirmed because WhatsApp opened. Provide a fallback (copy message + visible link) if WhatsApp cannot open. Do not auto-clear the cart. Message format follows:

Hello Food Canvas! I'd like to place an order.

Customer Name: ...
Customer WhatsApp: ...

ORDER DETAILS

1. <item> (<variant>, <add-ons>)
   Quantity: 2
   Unit Price: ৳180
   Line Total: ৳360

Subtotal: ৳...
Discount: ৳...
Delivery Fee: To be confirmed, if applicable
Estimated Total: ৳...

Order Type: To be confirmed with the restaurant

Please confirm availability and delivery or pickup details. Thank you!

Explain in the UI that totals are estimates from the latest menu and the restaurant confirms availability and final price.

Admin dashboard

Protected /admin. Supabase Auth login, no public registration. Documented secure creation of the first admin. No hardcoded credentials, no service-role key in browser code, never rely on hiding links.

Overview: real counts only (menu items, active categories, available vs unavailable, active discounts, open status). No invented sales or order stats.
Menu: create, edit, delete (with confirmation), upload/replace image (limit type and size, handle errors), name/description, category, price, sale price/discount, availability, variants and add-ons, featured flag, reordering of items and categories, preview. Deleting a category must force a reassignment or explicit deletion flow; never silently orphan products.
Discounts: product sale price, percentage, fixed amount, optional start/expiry, optional minimum cart value, optional coupon code. Activate/deactivate/edit. Define and document one clear priority rule and do not stack unexpectedly. Prevent negative prices and discounts above the allowed amount. Checkout numbers must match the active menu configuration.
Settings: restaurant name, logo, WhatsApp number, contact info, address and map link, opening hours, temporary closure, delivery/pickup toggles, delivery fee, minimum order, homepage content and featured products. Initialize with the confirmed WhatsApp number and hours; all editable.
Admin UI in Bangla where practical, English technical terms allowed. Same theme system.
Database and security
Supabase Postgres with migrations in supabase/migrations/, normalized schema, foreign keys, constraints, indexes, timestamps. Seed in supabase/seed.sql (clearly labeled sample data).
Tables: categories, products, product_variants, product_addons (add option-group tables only if needed), discounts, restaurant_settings (typed, validated structure, not an arbitrary key-value bag).
RLS on every exposed table. Public read only for active menu and public settings. Writes only for authenticated admins, enforced in the database (for example an admin_users table or a JWT app_metadata claim checked in policies), not only in client code.
Server-side validation of every admin mutation with Zod. Storage bucket policies restrict who can write and which paths.
Safe error handling that leaks no secrets. Validate URLs and use safe external navigation.
Customers must not be able to change prices, discounts, menu, or the WhatsApp destination by manipulating client state.
Structure
app/            public pages, layouts
app/admin/      protected dashboard
components/ui/  primitives
components/menu/  components/cart/  components/admin/
lib/supabase/   lib/validation/   lib/pricing/   lib/whatsapp/   lib/i18n/
types/
supabase/migrations/   supabase/seed.sql

Business logic (pricing, discounts, message building, open/closed) lives in lib/ as pure functions with unit tests. No duplicated logic in components. The cart total and the WhatsApp message must come from the same pricing function.

Performance, accessibility, SEO

Optimized responsive images, lazy loading, efficient menu fetching with caching and correct invalidation after admin changes (no stale prices or availability indefinitely), skeletons, accessible labels and focus handling, page titles, meta descriptions, Open Graph, LocalBusiness structured data only with real confirmed fields, friendly 404 and error pages.

Definition of done (every stage)

Typecheck, lint, tests pass; the stage's workflows manually verified or honestly reported as unverified; no secrets committed; .env.example updated with placeholders only.