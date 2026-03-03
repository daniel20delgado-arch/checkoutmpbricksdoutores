-- Migration inicial para o módulo de landing pages / experiments

-- Tipo enum para status de experimento
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'experiment_status'
  ) then
    create type public.experiment_status as enum ('draft', 'running', 'ended');
  end if;
end
$$;

-- Tabela de landing pages (sem a FK circular no início)
create table public.landing_pages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  path_slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela de variantes de página
create table public.page_variants (
  id uuid primary key default gen_random_uuid(),
  landing_page_id uuid not null references public.landing_pages(id) on delete cascade,
  variant_slug text not null,
  label text not null,
  created_at timestamptz not null default now(),
  unique (landing_page_id, variant_slug)
);

-- Adiciona coluna de variante de produção agora que page_variants já existe
alter table public.landing_pages
  add column production_variant_id uuid references public.page_variants(id);

-- Tabela de experimentos A/B
create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  landing_page_id uuid not null references public.landing_pages(id) on delete cascade,
  status public.experiment_status not null default 'draft',
  variant_control_id uuid not null references public.page_variants(id),
  variant_b_id uuid not null references public.page_variants(id),
  winner_variant_id uuid references public.page_variants(id),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela de eventos de clique
create table public.click_events (
  id uuid primary key default gen_random_uuid(),
  landing_page_id uuid not null references public.landing_pages(id) on delete cascade,
  page_variant_id uuid not null references public.page_variants(id) on delete cascade,
  experiment_id uuid references public.experiments(id),
  button_id text not null,
  created_at timestamptz not null default now()
);

-- RLS básica: apenas usuários autenticados podem escrever nas tabelas de admin.
alter table public.landing_pages enable row level security;
alter table public.page_variants enable row level security;
alter table public.experiments enable row level security;
alter table public.click_events enable row level security;

create policy "select_landing_pages_authenticated"
  on public.landing_pages
  for select
  to authenticated
  using (true);

create policy "modify_landing_pages_authenticated"
  on public.landing_pages
  for all
  to authenticated
  using (true)
  with check (true);

create policy "select_page_variants_authenticated"
  on public.page_variants
  for select
  to authenticated
  using (true);

create policy "modify_page_variants_authenticated"
  on public.page_variants
  for all
  to authenticated
  using (true)
  with check (true);

create policy "select_experiments_authenticated"
  on public.experiments
  for select
  to authenticated
  using (true);

create policy "modify_experiments_authenticated"
  on public.experiments
  for all
  to authenticated
  using (true)
  with check (true);

create policy "insert_click_events_anon_or_authenticated"
  on public.click_events
  for insert
  to anon, authenticated
  with check (true);

create policy "select_click_events_authenticated"
  on public.click_events
  for select
  to authenticated
  using (true);

