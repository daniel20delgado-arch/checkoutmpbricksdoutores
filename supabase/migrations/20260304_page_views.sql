-- Contagem de carregamentos de página por variante (para admin e A/B)

create table public.page_views (
  id uuid primary key default gen_random_uuid(),
  landing_page_id uuid not null references public.landing_pages(id) on delete cascade,
  page_variant_id uuid not null references public.page_variants(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.page_views enable row level security;

create policy "insert_page_views_anon_or_authenticated"
  on public.page_views
  for insert
  to anon, authenticated
  with check (true);

create policy "select_page_views_authenticated"
  on public.page_views
  for select
  to authenticated
  using (true);
