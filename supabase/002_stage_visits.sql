-- Visites stage (attribution ?src=mail|sms|ig) — service_role uniquement
create table if not exists public.stage_visits (
  id text primary key,
  status text not null default 'pageview',
  src text not null default 'direct',
  path text,
  created_at timestamptz not null default now()
);

create index if not exists stage_visits_created_idx on public.stage_visits (created_at desc);
create index if not exists stage_visits_src_idx on public.stage_visits (src, created_at desc);

alter table public.stage_visits enable row level security;

alter table public.stage_orders add column if not exists marketing jsonb;
