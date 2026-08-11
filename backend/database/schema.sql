create extension if not exists pgcrypto;

do $$ begin
  create type user_role as enum ('admin', 'capturista');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type vehicle_status as enum ('activo', 'cancelado');
exception
  when duplicate_object then null;
end $$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name varchar(120) not null,
  email varchar(180) not null unique,
  password_hash text not null,
  role user_role not null default 'capturista',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vehicle_folio_sequence (
  id integer generated always as identity primary key,
  created_at timestamptz not null default now(),
  check (id between 1 and 999999)
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  folio char(6) not null unique check (folio ~ '^[0-9]{6}$'),
  issue_date date not null,
  expiration_date date not null,
  brand varchar(80) not null,
  line varchar(80) not null,
  model_year integer not null check (model_year between 1000 and 9999),
  color varchar(60) not null,
  owner_name varchar(160) not null,
  serial_number varchar(17) not null,
  engine_number varchar(40) not null,
  qr_payload text,
  qr_data_url text,
  status vehicle_status not null default 'activo',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vehicles_folio on vehicles(folio);
create index if not exists idx_vehicles_serial_number on vehicles(serial_number);
create index if not exists idx_vehicles_created_at on vehicles(created_at desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
before update on users
for each row execute function set_updated_at();

drop trigger if exists trg_vehicles_updated_at on vehicles;
create trigger trg_vehicles_updated_at
before update on vehicles
for each row execute function set_updated_at();
