-- Permite que o middleware (chave anon) resolva a URL pública para a LP.
-- Sem isso, /teste-1 não encontra o registro em landing_pages e retorna 404.

-- Leitura pública de landing_pages (só para mapear path_slug -> slug e variant)
create policy "select_landing_pages_anon"
  on public.landing_pages
  for select
  to anon
  using (true);

-- Leitura pública de page_variants (para resolver variant_slug no middleware)
create policy "select_page_variants_anon"
  on public.page_variants
  for select
  to anon
  using (true);

-- Leitura pública de experiments (para saber se há A/B ativo e qual variante servir)
create policy "select_experiments_anon"
  on public.experiments
  for select
  to anon
  using (true);
