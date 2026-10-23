-- Dudu Shop · esquema inicial
-- Tablas, políticas RLS y almacenamiento de imágenes.
-- Ejecutar una sola vez en Supabase → SQL Editor (o con `supabase db push`).

-- ─────────────────────────────────────────────
-- Administradores
-- Solo los usuarios incluidos aquí pueden modificar datos.
-- Estar registrado en Auth NO basta para ser administrador.
-- ─────────────────────────────────────────────
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
-- Sin políticas: nadie puede leer ni escribir esta tabla desde la API.
-- Se gestiona solo desde el SQL Editor de Supabase.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ─────────────────────────────────────────────
-- Utilidades
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- Configuración de la tienda (una sola fila)
-- ─────────────────────────────────────────────
create table if not exists public.settings (
  id smallint primary key default 1 check (id = 1),
  store_name text not null default 'Dudu Shop' check (char_length(store_name) between 1 and 60),
  tagline text not null default '' check (char_length(tagline) <= 160),
  whatsapp_number text not null default '' check (whatsapp_number ~ '^[0-9]{0,15}$'),
  instagram text not null default '' check (char_length(instagram) <= 30),
  show_prices boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists settings_updated_at on public.settings;
create trigger settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

alter table public.settings enable row level security;

drop policy if exists "Settings are public" on public.settings;
create policy "Settings are public"
  on public.settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins update settings" on public.settings;
create policy "Admins update settings"
  on public.settings for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke insert, update, delete, truncate on public.settings from anon;

-- ─────────────────────────────────────────────
-- Productos
-- ─────────────────────────────────────────────
do $$
begin
  create type public.product_status as enum ('available', 'reserved', 'sold_out');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  category text not null default '' check (char_length(category) <= 40),
  price numeric(10, 2) check (price is null or price >= 0),
  show_price boolean not null default true,
  sizes text[] not null default '{}',
  colors text[] not null default '{}',
  stock integer not null default 1 check (stock >= 0),
  status public.product_status not null default 'available',
  is_new boolean not null default true,
  published boolean not null default true,
  position integer not null default 0,
  images text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_catalog_idx
  on public.products (published, position, created_at desc);

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

alter table public.products enable row level security;

-- El catálogo público solo ve productos publicados.
drop policy if exists "Published products are public" on public.products;
create policy "Published products are public"
  on public.products for select
  to anon, authenticated
  using (published);

-- El administrador ve y gestiona todo (incluidos los ocultos).
drop policy if exists "Admins read all products" on public.products;
create policy "Admins read all products"
  on public.products for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins insert products" on public.products;
create policy "Admins insert products"
  on public.products for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins update products" on public.products;
create policy "Admins update products"
  on public.products for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins delete products" on public.products;
create policy "Admins delete products"
  on public.products for delete
  to authenticated
  using ((select public.is_admin()));

revoke insert, update, delete, truncate on public.products from anon;

-- Reordenar en una sola llamada. Se ejecuta con los permisos del usuario
-- (security invoker), así que las políticas RLS siguen aplicándose.
create or replace function public.reorder_products(ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.products as p
  set position = o.ord
  from unnest(ids) with ordinality as o(id, ord)
  where p.id = o.id;
$$;

revoke execute on function public.reorder_products(uuid[]) from public, anon;
grant execute on function public.reorder_products(uuid[]) to authenticated;

-- ─────────────────────────────────────────────
-- Almacenamiento de imágenes
-- Bucket público para LEER por URL directa (necesario para mostrar fotos).
-- Solo el administrador puede subir, modificar, borrar o listar archivos.
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins read product images" on storage.objects;
create policy "Admins read product images"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists "Admins upload product images" on storage.objects;
create policy "Admins upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists "Admins update product images" on storage.objects;
create policy "Admins update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists "Admins delete product images" on storage.objects;
create policy "Admins delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
