-- Commandes stages enfants (persistance Vercel serverless)
-- Execute dans le SQL Editor Supabase du projet lie a SUPABASE_URL.

create table if not exists public.stage_orders (
  id text primary key,
  access_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  stage_id text,
  club text not null,
  club_label text,
  is_member boolean not null default false,
  amount_cents integer not null,
  currency text not null default 'EUR',
  status text not null default 'draft',
  payment jsonb,
  parent jsonb,
  child jsonb,
  documents jsonb,
  reminders_sent integer not null default 0,
  last_reminder_at timestamptz
);

create index if not exists stage_orders_club_created_idx
  on public.stage_orders (club, created_at desc);

create index if not exists stage_orders_status_idx
  on public.stage_orders (status);

create index if not exists stage_orders_updated_at_idx
  on public.stage_orders (updated_at desc);

alter table public.stage_orders enable row level security;

-- Acces uniquement via service_role (bypass RLS). Pas de policy anon/authenticated.
