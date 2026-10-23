-- Dudu Shop · esquema de la base de datos (Postgres / Neon)
-- Se puede ejecutar varias veces sin problema.
-- La base de datos solo se usa desde el servidor (variable secreta DATABASE_URL):
-- el navegador nunca se conecta a ella directamente.

create table if not exists settings (
  id smallint primary key default 1 check (id = 1),
  store_name text not null default 'Dudu Shop' check (char_length(store_name) between 1 and 60),
  tagline text not null default '' check (char_length(tagline) <= 160),
  whatsapp_number text not null default '' check (whatsapp_number ~ '^[0-9]{0,15}$'),
  instagram text not null default '' check (char_length(instagram) <= 30),
  show_prices boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into settings (id) values (1) on conflict (id) do nothing;

do $$
begin
  create type product_status as enum ('available', 'reserved', 'sold_out');
exception
  when duplicate_object then null;
end
$$;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  category text not null default '' check (char_length(category) <= 40),
  price numeric(10, 2) check (price is null or price >= 0),
  show_price boolean not null default true,
  sizes text[] not null default '{}',
  colors text[] not null default '{}',
  stock integer not null default 1 check (stock >= 0),
  status product_status not null default 'available',
  is_new boolean not null default true,
  published boolean not null default true,
  position integer not null default 0,
  images text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_catalog_idx on products (published, position, created_at desc);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_updated_at on products;
create trigger products_updated_at before update on products
  for each row execute function set_updated_at();

drop trigger if exists settings_updated_at on settings;
create trigger settings_updated_at before update on settings
  for each row execute function set_updated_at();

-- Intentos de acceso fallidos, para frenar ataques de fuerza bruta al login.
create table if not exists login_attempts (
  ip text not null,
  at timestamptz not null default now()
);

create index if not exists login_attempts_ip_idx on login_attempts (ip, at);

-- Fotos de los productos (ya comprimidas en el móvil: ~100-300 KB cada una).
-- Se sirven en /img/<id> con caché de un año en el CDN.
create table if not exists images (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('image/webp', 'image/jpeg', 'image/png', 'image/avif')),
  data bytea not null check (octet_length(data) <= 2097152),
  created_at timestamptz not null default now()
);
