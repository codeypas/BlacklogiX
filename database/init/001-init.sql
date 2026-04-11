create extension if not exists pgcrypto;

create table if not exists analysts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  organization text not null,
  password_hash text,
  google_sub text unique,
  auth_provider text not null default 'local',
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table analysts
  alter column password_hash drop not null;

alter table analysts
  add column if not exists google_sub text unique;

alter table analysts
  add column if not exists auth_provider text not null default 'local';

alter table analysts
  add column if not exists avatar_url text;

create table if not exists log_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type text not null check (source_type in ('server', 'cloud_audit_trail')),
  host text,
  port text,
  provider text,
  account text,
  credential_label text not null,
  status text not null default 'ready' check (status in ('connected', 'ready', 'paused')),
  created_at timestamptz not null default now()
);

insert into log_sources (
  name,
  source_type,
  host,
  port,
  credential_label,
  status
)
values (
  'Windows Event Collector',
  'server',
  'win-srv-07.internal',
  '5985',
  'svc-blocklogix',
  'connected'
)
on conflict do nothing;
