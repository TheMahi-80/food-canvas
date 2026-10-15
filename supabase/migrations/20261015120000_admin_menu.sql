-- Admin menu management (Stage 8): atomic product save and reordering.
-- All functions run with the caller's rights (RLS applies) and additionally refuse non-admins.

-- Renaming or swapping option names inside one save must not trip the uniqueness check
-- halfway through; it is checked at commit instead.
alter table public.product_variants
  drop constraint product_variants_product_id_name_bn_key,
  add constraint product_variants_product_id_name_bn_key unique (product_id, name_bn) deferrable initially deferred;
alter table public.product_addons
  drop constraint product_addons_product_id_name_bn_key,
  add constraint product_addons_product_id_name_bn_key unique (product_id, name_bn) deferrable initially deferred;

-- ---------------------------------------------------------------------------
-- Save a product together with its variants and add-ons in one transaction.
--   p_create = true  -> insert a new product with id p_id (placed last in its category)
--   p_create = false -> update product p_id (must exist)
-- Options are synced by id so customers' saved carts keep working after an edit:
--   element with an id     -> update that option (must belong to this product)
--   element without an id  -> insert a new option
--   existing option absent -> deleted
-- Array order becomes sort_order. Field validation happens in the app (Zod) and in the
-- table constraints; this function only moves data.
-- ---------------------------------------------------------------------------
create or replace function public.save_product(
  p_id uuid,
  p_create boolean,
  p_product jsonb,
  p_variants jsonb,
  p_addons jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_category uuid := (p_product ->> 'category_id')::uuid;
  v_item jsonb;
  v_ord bigint;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_id is null or jsonb_typeof(p_product) <> 'object'
     or jsonb_typeof(p_variants) <> 'array' or jsonb_typeof(p_addons) <> 'array' then
    raise exception 'invalid arguments' using errcode = '22023';
  end if;

  if p_create then
    insert into public.products (
      id, category_id, slug, name_bn, name_en, description_bn, description_en, price,
      image_path, is_active, is_available, is_featured, sort_order
    ) values (
      p_id, v_category, p_product ->> 'slug', p_product ->> 'name_bn', p_product ->> 'name_en',
      p_product ->> 'description_bn', p_product ->> 'description_en', (p_product ->> 'price')::integer,
      p_product ->> 'image_path', (p_product ->> 'is_active')::boolean,
      (p_product ->> 'is_available')::boolean, (p_product ->> 'is_featured')::boolean,
      coalesce((select max(sort_order) + 10 from public.products where category_id = v_category), 0)
    );
  else
    update public.products p set
      -- Moving to another category places the product last there.
      sort_order = case when p.category_id = v_category then p.sort_order
                        else coalesce((select max(q.sort_order) + 10 from public.products q where q.category_id = v_category), 0) end,
      category_id    = v_category,
      name_bn        = p_product ->> 'name_bn',
      name_en        = p_product ->> 'name_en',
      description_bn = p_product ->> 'description_bn',
      description_en = p_product ->> 'description_en',
      price          = (p_product ->> 'price')::integer,
      image_path     = p_product ->> 'image_path',
      is_active      = (p_product ->> 'is_active')::boolean,
      is_available   = (p_product ->> 'is_available')::boolean,
      is_featured    = (p_product ->> 'is_featured')::boolean
    where p.id = p_id;
    if not found then
      raise exception 'product not found' using errcode = 'P0002';
    end if;
  end if;

  -- Variants
  delete from public.product_variants v
  where v.product_id = p_id
    and not (v.id = any (array(select (e ->> 'id')::uuid from jsonb_array_elements(p_variants) e where e ->> 'id' is not null)));
  for v_item, v_ord in select e, o from jsonb_array_elements(p_variants) with ordinality as t(e, o) loop
    if v_item ->> 'id' is null then
      insert into public.product_variants (product_id, name_bn, name_en, price, is_available, sort_order)
      values (p_id, v_item ->> 'name_bn', v_item ->> 'name_en', (v_item ->> 'price')::integer,
              (v_item ->> 'is_available')::boolean, v_ord * 10);
    else
      update public.product_variants set
        name_bn = v_item ->> 'name_bn', name_en = v_item ->> 'name_en', price = (v_item ->> 'price')::integer,
        is_available = (v_item ->> 'is_available')::boolean, sort_order = v_ord * 10
      where id = (v_item ->> 'id')::uuid and product_id = p_id;
      if not found then
        raise exception 'variant not found' using errcode = 'P0002';
      end if;
    end if;
  end loop;

  -- Add-ons
  delete from public.product_addons a
  where a.product_id = p_id
    and not (a.id = any (array(select (e ->> 'id')::uuid from jsonb_array_elements(p_addons) e where e ->> 'id' is not null)));
  for v_item, v_ord in select e, o from jsonb_array_elements(p_addons) with ordinality as t(e, o) loop
    if v_item ->> 'id' is null then
      insert into public.product_addons (product_id, name_bn, name_en, price, is_available, sort_order)
      values (p_id, v_item ->> 'name_bn', v_item ->> 'name_en', (v_item ->> 'price')::integer,
              (v_item ->> 'is_available')::boolean, v_ord * 10);
    else
      update public.product_addons set
        name_bn = v_item ->> 'name_bn', name_en = v_item ->> 'name_en', price = (v_item ->> 'price')::integer,
        is_available = (v_item ->> 'is_available')::boolean, sort_order = v_ord * 10
      where id = (v_item ->> 'id')::uuid and product_id = p_id;
      if not found then
        raise exception 'add-on not found' using errcode = 'P0002';
      end if;
    end if;
  end loop;

  return p_id;
end;
$$;

revoke execute on function public.save_product(uuid, boolean, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_product(uuid, boolean, jsonb, jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Reordering: the array order becomes sort_order (0, 10, 20, ...). Ids not in the array are
-- left alone; unknown ids are ignored.
-- ---------------------------------------------------------------------------
create or replace function public.reorder_categories(p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  update public.categories c set sort_order = (t.ord - 1) * 10
  from unnest(p_ids) with ordinality as t(id, ord)
  where c.id = t.id and c.sort_order is distinct from (t.ord - 1) * 10;
end;
$$;

create or replace function public.reorder_products(p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  update public.products p set sort_order = (t.ord - 1) * 10
  from unnest(p_ids) with ordinality as t(id, ord)
  where p.id = t.id and p.sort_order is distinct from (t.ord - 1) * 10;
end;
$$;

revoke execute on function public.reorder_categories(uuid[]) from public, anon;
revoke execute on function public.reorder_products(uuid[]) from public, anon;
grant execute on function public.reorder_categories(uuid[]) to authenticated;
grant execute on function public.reorder_products(uuid[]) to authenticated;
