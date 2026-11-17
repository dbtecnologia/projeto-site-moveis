-- Montaí Móveis — núcleo de catálogo, configuração, preço e pedidos
-- Segurança: nenhuma regra de autorização depende de user_metadata.

create type public.app_role as enum ('customer', 'admin', 'superadmin');
create type public.quote_status as enum ('draft', 'sent', 'accepted', 'expired', 'cancelled');
create type public.order_status as enum ('pending', 'paid', 'in_production', 'shipped', 'completed', 'cancelled');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'superadmin')
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  image_url text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  sku text unique,
  description text,
  base_price numeric(12,2) not null check (base_price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= base_price),
  pix_discount numeric(5,4) not null default 0.05 check (pix_discount >= 0 and pix_discount <= 1),
  installment_count integer not null default 12 check (installment_count between 1 and 24),
  installment_interest numeric(5,4) not null default 0 check (installment_interest >= 0 and installment_interest <= 1),
  image_url text,
  metadata jsonb not null default '{}'::jsonb,
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  price_delta numeric(12,2) not null default 0 check (price_delta >= 0),
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.finishes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  price_delta numeric(12,2) not null default 0 check (price_delta >= 0),
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  material_id uuid references public.materials(id) on delete restrict,
  finish_id uuid references public.finishes(id) on delete restrict,
  label text not null,
  option_type text not null check (option_type in ('material', 'finish', 'component', 'dimension')),
  price_delta numeric(12,2) not null default 0 check (price_delta >= 0),
  config_schema jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  priority integer not null default 100,
  scope_product_id uuid references public.products(id) on delete cascade,
  scope_category_id uuid references public.categories(id) on delete cascade,
  conditions jsonb not null default '{}'::jsonb,
  action jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete set null,
  product_id uuid not null references public.products(id) on delete restrict,
  configuration jsonb not null default '{}'::jsonb,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  freight numeric(12,2) not null default 0 check (freight >= 0),
  total numeric(12,2) not null check (total >= 0),
  status public.quote_status not null default 'draft',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  status public.order_status not null default 'pending',
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  freight numeric(12,2) not null default 0 check (freight >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  payment_provider text,
  payment_reference text,
  shipping_address jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name_snapshot text not null,
  configuration jsonb not null default '{}'::jsonb,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  total numeric(12,2) not null check (total >= 0),
  created_at timestamptz not null default now()
);

create table public.integration_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,
  external_id text,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create table public.site_banners (
  id uuid primary key default gen_random_uuid(),
  eyebrow text not null default 'Móveis que transformam',
  title text not null,
  description text,
  image_url text not null,
  primary_label text not null default 'Conhecer coleção',
  primary_url text not null default '#produtos',
  secondary_label text,
  secondary_url text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  detail text,
  code text,
  discount_type text check (discount_type in ('percentage', 'fixed', 'message')),
  discount_value numeric(12,2) check (discount_value is null or discount_value >= 0),
  product_id uuid references public.products(id) on delete set null,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  subject text not null default 'Dúvida sobre meu pedido',
  status text not null default 'open' check (status in ('open', 'waiting_customer', 'waiting_admin', 'closed')),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role public.app_role not null,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  attachments jsonb not null default '[]'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index products_active_featured_idx on public.products (active, featured, created_at desc);
create index products_category_idx on public.products (category_id);
create index product_options_product_idx on public.product_options (product_id, active);
create index pricing_rules_scope_idx on public.pricing_rules (scope_product_id, scope_category_id, priority);
create index quotes_customer_idx on public.quotes (customer_id, created_at desc);
create index orders_customer_idx on public.orders (customer_id, created_at desc);
create index order_items_order_idx on public.order_items (order_id);
create index site_banners_active_order_idx on public.site_banners (active, sort_order);
create index site_offers_active_order_idx on public.site_offers (active, sort_order);
create index chat_threads_customer_idx on public.chat_threads (customer_id, last_message_at desc);
create index chat_messages_thread_idx on public.chat_messages (thread_id, created_at);

create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger categories_updated_at before update on public.categories for each row execute procedure public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute procedure public.set_updated_at();
create trigger materials_updated_at before update on public.materials for each row execute procedure public.set_updated_at();
create trigger finishes_updated_at before update on public.finishes for each row execute procedure public.set_updated_at();
create trigger product_options_updated_at before update on public.product_options for each row execute procedure public.set_updated_at();
create trigger pricing_rules_updated_at before update on public.pricing_rules for each row execute procedure public.set_updated_at();
create trigger quotes_updated_at before update on public.quotes for each row execute procedure public.set_updated_at();
create trigger orders_updated_at before update on public.orders for each row execute procedure public.set_updated_at();
create trigger site_banners_updated_at before update on public.site_banners for each row execute procedure public.set_updated_at();
create trigger site_offers_updated_at before update on public.site_offers for each row execute procedure public.set_updated_at();
create trigger site_settings_updated_at before update on public.site_settings for each row execute procedure public.set_updated_at();
create trigger chat_threads_updated_at before update on public.chat_threads for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.materials enable row level security;
alter table public.finishes enable row level security;
alter table public.product_options enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.quotes enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.integration_logs enable row level security;
alter table public.site_banners enable row level security;
alter table public.site_offers enable row level security;
alter table public.site_settings enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.categories, public.products, public.materials, public.finishes, public.product_options to anon, authenticated;
grant insert, update, delete on public.categories, public.products, public.materials, public.finishes, public.product_options to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.quotes to authenticated;
grant select, insert, update, delete on public.orders, public.order_items to authenticated;
grant select on public.site_banners, public.site_offers to anon, authenticated;
grant select on public.site_settings to authenticated;
grant insert, update, delete on public.site_banners, public.site_offers, public.site_settings to authenticated;
grant select, insert, update on public.chat_threads to authenticated;
grant select, insert, update on public.chat_messages to authenticated;
grant all on public.pricing_rules to authenticated;

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy categories_public_read on public.categories for select to anon, authenticated using (active = true);
create policy products_public_read on public.products for select to anon, authenticated using (active = true);
create policy materials_public_read on public.materials for select to anon, authenticated using (active = true);
create policy finishes_public_read on public.finishes for select to anon, authenticated using (active = true);
create policy product_options_public_read on public.product_options for select to anon, authenticated using (
  active = true and exists (select 1 from public.products p where p.id = product_id and p.active = true)
);
create policy site_banners_public_read on public.site_banners for select to anon, authenticated using (active = true);
create policy site_offers_public_read on public.site_offers for select to anon, authenticated using (
  active = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now())
);

create policy profiles_admin_all on public.profiles for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy categories_admin_all on public.categories for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy products_admin_all on public.products for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy materials_admin_all on public.materials for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy finishes_admin_all on public.finishes for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy product_options_admin_all on public.product_options for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy pricing_rules_admin_all on public.pricing_rules for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy site_banners_admin_all on public.site_banners for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy site_offers_admin_all on public.site_offers for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy site_settings_admin_all on public.site_settings for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy chat_threads_customer_read on public.chat_threads for select to authenticated using ((select auth.uid()) = customer_id);
create policy chat_threads_customer_insert on public.chat_threads for insert to authenticated with check ((select auth.uid()) = customer_id);
create policy chat_threads_customer_update on public.chat_threads for update to authenticated using ((select auth.uid()) = customer_id) with check ((select auth.uid()) = customer_id);
create policy chat_threads_admin_all on public.chat_threads for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy chat_messages_customer_read on public.chat_messages for select to authenticated using (
  exists (select 1 from public.chat_threads t where t.id = thread_id and t.customer_id = (select auth.uid()))
);
create policy chat_messages_customer_insert on public.chat_messages for insert to authenticated with check (
  sender_id = (select auth.uid()) and exists (select 1 from public.chat_threads t where t.id = thread_id and t.customer_id = (select auth.uid()))
);
create policy chat_messages_admin_all on public.chat_messages for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy quotes_own_read on public.quotes for select to authenticated using ((select auth.uid()) = customer_id);
create policy orders_own_read on public.orders for select to authenticated using ((select auth.uid()) = customer_id);
create policy order_items_own_read on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid()))
);
create policy quotes_admin_all on public.quotes for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy orders_admin_all on public.orders for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy order_items_admin_all on public.order_items for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy integration_logs_admin_read on public.integration_logs for select to authenticated using ((select public.is_admin()));

revoke all on function public.handle_new_user() from public;

-- Imagens públicas de produtos e banners; escrita restrita a administradores.
insert into storage.buckets (id, name, public)
values ('catalog', 'catalog', true)
on conflict (id) do update set public = excluded.public;

create policy catalog_images_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'catalog');

create policy catalog_images_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'catalog' and (select public.is_admin()));

create policy catalog_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'catalog' and (select public.is_admin()))
  with check (bucket_id = 'catalog' and (select public.is_admin()));

create policy catalog_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'catalog' and (select public.is_admin()));
