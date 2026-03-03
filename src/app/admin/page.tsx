"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowserClient } from "@/lib/supabaseClient";

type LandingPageRow = {
  id: string;
  name: string;
  slug: string;
  path_slug: string;
  production_variant_id: string | null;
};

function getBaseHtmlForRow(row: LandingPageRow): string {
  const lpId = row.id;
  const variantId = row.production_variant_id ?? "COLOQUE_O_ID_DA_VARIANT_DEFAULT";

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>${row.name}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #050a30;
        color: #ffffff;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      .wrapper {
        max-width: 640px;
        width: 100%;
        padding: 32px 24px;
        border-radius: 18px;
        border: 1px solid rgba(244, 182, 9, 0.35);
        background: rgba(5, 10, 48, 0.9);
      }
      h1 { margin: 0 0 8px; font-size: 1.9rem; }
      p { margin: 0 0 16px; color: rgba(255,255,255,0.85); }
      .cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 10px 18px;
        border-radius: 999px;
        border: none;
        font-size: 0.9rem;
        font-weight: 600;
        color: #050a30;
        background: #f4b609;
        cursor: pointer;
      }
      .cta:hover { background: #ffd94b; }
    </style>
    <script>
      async function trackClick(buttonId) {
        try {
          await fetch("/api/track-click", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              landing_page_id: "${lpId}",
              page_variant_id: "${variantId}",
              experiment_id: null,
              button_id: buttonId
            }),
            keepalive: true
          });
        } catch (e) {}
      }
    </script>
  </head>
  <body>
    <div class="wrapper">
      <h1>Título da sua oferta</h1>
      <p>Subtítulo ou descrição. Edite o conteúdo aqui.</p>
      <button type="button" class="cta" data-track="cta-principal" onclick="trackClick('cta-principal')">
        Botão principal (CTA)
      </button>
    </div>
  </body>
</html>
`;
}

function getCursorPromptForRow(row: LandingPageRow): string {
  const variantId =
    row.production_variant_id ?? "COLOQUE_O_ID_DA_VARIANT_DEFAULT";
  const pasta = `landingpages/${row.slug}/default`;
  const filePath = `${pasta}/index.html`;

  return `Crie a primeira versão da landing page no caminho exato abaixo.

**Dados desta LP (use no arquivo e no caminho):**
- Nome da página: ${row.name}
- Slug da pasta (obrigatório para o sistema servir a página): ${row.slug}
- URL pública em que a página será acessada: /${row.path_slug}

**Caminho obrigatório do arquivo (a pasta deve bater com o slug acima):**
\`${filePath}\`

Ou seja: crie a pasta \`${pasta}\` e dentro dela o arquivo \`index.html\`. O sistema só encontra a LP se o arquivo estiver em \`landingpages/${row.slug}/default/index.html\`.

**Instruções:**

1. Crie a pasta \`${pasta}\` se não existir e o arquivo \`${filePath}\`.

2. Use no <title> e no conteúdo o nome da página: "${row.name}". O HTML deve ser estático (só HTML e CSS), otimizado para performance. Cores da marca: fundo #050a30, destaque/CTA #f4b609, texto #ffffff, verde #1b9054.

3. Inclua no <head> um script que envia cliques para a API com estes IDs (não altere): \`landing_page_id: "${row.id}"\`, \`page_variant_id: "${variantId}"\`. A função deve chamar \`fetch('/api/track-click', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ landing_page_id: "${row.id}", page_variant_id: "${variantId}", experiment_id: null, button_id: buttonId }), keepalive: true })\`. Exponha \`trackClick(buttonId)\` globalmente.

4. Em cada botão/CTA que quiser medir: \`data-track="id-do-botao"\` e \`onclick="trackClick('id-do-botao')"\` (mesmo valor). Ex.: \`data-track="cta-hero"\`, \`onclick="trackClick('cta-hero')"\`.

5. Estrutura inicial: hero com título (ex.: "${row.name}"), subtítulo e um CTA principal. Simples; foco em caminho correto e tracking com os IDs acima.

Salve o \`index.html\` completo em \`${filePath}\`.`;
}

export default function AdminHomePage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LandingPageRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formPathSlug, setFormPathSlug] = useState("");

  async function loadRows() {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
        error: userError
      } = await supabaseBrowserClient.auth.getUser();

      if (userError || !user) {
        window.location.href = "/login";
        return;
      }

      const { data, error: lpError } = await supabaseBrowserClient
        .from("landing_pages")
        .select("id, name, slug, path_slug, production_variant_id")
        .order("created_at", { ascending: false });

      if (lpError) {
        setError(lpError.message);
      } else if (data) {
        setRows(data as LandingPageRow[]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRows();
  }, []);

  async function handleCreate() {
    setCreateError(null);
    setCreating(true);

    try {
      if (!formName.trim() || !formSlug.trim() || !formPathSlug.trim()) {
        setCreateError("Preencha todos os campos.");
        setCreating(false);
        return;
      }

      const slug = formSlug.trim();
      const pathSlug = formPathSlug.trim();

      const { data: lp, error: lpError } = await supabaseBrowserClient
        .from("landing_pages")
        .insert({
          name: formName.trim(),
          slug,
          path_slug: pathSlug
        })
        .select("id")
        .single();

      if (lpError || !lp) {
        setCreateError(lpError?.message ?? "Erro ao criar landing page.");
        setCreating(false);
        return;
      }

      const { data: variant, error: variantError } =
        await supabaseBrowserClient
          .from("page_variants")
          .insert({
            landing_page_id: lp.id,
            variant_slug: "default",
            label: "Controle"
          })
          .select("id")
          .single();

      if (variantError || !variant) {
        setCreateError(
          variantError?.message ?? "Erro ao criar variante padrão."
        );
        setCreating(false);
        return;
      }

      const { error: updateError } = await supabaseBrowserClient
        .from("landing_pages")
        .update({ production_variant_id: variant.id })
        .eq("id", lp.id);

      if (updateError) {
        setCreateError(
          updateError.message ??
            "Landing criada, mas houve erro ao definir a variante de produção."
        );
        setCreating(false);
        return;
      }

      setFormName("");
      setFormSlug("");
      setFormPathSlug("");
      setShowCreateModal(false);
      await loadRows();
    } finally {
      setCreating(false);
    }
  }

  const baseDomain =
    process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "https://oferta.doutoresdoexcel.com.br";

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback não necessário para HTTPS
    }
  }

  async function copyBaseCode(row: LandingPageRow) {
    const html = getBaseHtmlForRow(row);
    try {
      await navigator.clipboard.writeText(html);
      setCopiedCodeId(row.id);
      setTimeout(() => setCopiedCodeId(null), 2000);
    } catch {
      // fallback não necessário para HTTPS
    }
  }

  async function copyCursorPrompt(row: LandingPageRow) {
    const prompt = getCursorPromptForRow(row);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedPromptId(row.id);
      setTimeout(() => setCopiedPromptId(null), 2000);
    } catch {
      // fallback não necessário para HTTPS
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Landing pages</h1>
          <p className="text-sm text-white/70">
            Administre as LPs, URLs públicas e testes A/B.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center rounded-full bg-brand-yellow px-4 py-2 text-xs font-semibold text-brand-navy hover:bg-[#ffd94b] transition-colors"
        >
          + Nova landing page
        </button>
      </div>

      {/* Instruções sobre o ID */}
      <div className="rounded-xl border border-brand-yellow/30 bg-brand-yellow/5 px-4 py-3 text-sm">
        <p className="font-semibold text-brand-yellow mb-2">O que é o ID e onde usar?</p>
        <ul className="text-white/85 space-y-1 list-disc list-inside">
          <li>
            <strong>ID da LP</strong> é o identificador único dessa landing page no banco. Cada LP tem um ID diferente.
          </li>
          <li>
            <strong>Onde usar:</strong> dentro do HTML da sua LP, no script que envia os cliques para o painel. Na chamada <code className="px-1 py-0.5 rounded bg-black/30 text-xs">/api/track-click</code>, você envia <code className="px-1 py-0.5 rounded bg-black/30 text-xs">landing_page_id</code> e <code className="px-1 py-0.5 rounded bg-black/30 text-xs">page_variant_id</code> para que cada clique fique ligado à LP e à variante certas.
          </li>
          <li>
            <strong>Como:</strong> copie o ID abaixo (botão &quot;Copiar&quot;) e cole no seu <code className="px-1 py-0.5 rounded bg-black/30 text-xs">index.html</code>, na função que chama <code className="px-1 py-0.5 rounded bg-black/30 text-xs">fetch(&#39;/api/track-click&#39;, ...)</code>, no campo <code className="px-1 py-0.5 rounded bg-black/30 text-xs">landing_page_id</code>. Assim os relatórios de botões e A/B saberão de qual LP veio o clique.
          </li>
        </ul>
      </div>

      {loading && <p className="text-sm text-white/80">Carregando...</p>}
      {error && (
        <p className="text-sm text-red-300 bg-red-950/40 border border-red-900 px-3 py-2 rounded-md">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="border border-white/10 rounded-lg overflow-hidden bg-black/20">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-black/40 border-b border-white/10 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">ID (copiar)</th>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Slug interno</th>
                <th className="px-4 py-2 font-medium">Path</th>
                <th className="px-4 py-2 font-medium">URL pública</th>
                <th className="px-4 py-2 font-medium">Código base</th>
                <th className="px-4 py-2 font-medium">Prompt Cursor</th>
                <th className="px-4 py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-4 text-center text-white/60"
                  >
                    Nenhuma landing page cadastrada ainda.
                  </td>
                </tr>
              )}
              {rows.map((row) => {
                const publicUrl = `${baseDomain.replace(/\/$/, "")}/${row.path_slug}`;
                const idShort = row.id.slice(0, 8) + "…";
                return (
                  <tr
                    key={row.id}
                    className="border-t border-white/10 hover:bg-white/5"
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <code className="text-[11px] text-white/70 font-mono truncate max-w-[120px]" title={row.id}>
                          {idShort}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(row.id, row.id)}
                          className="shrink-0 inline-flex items-center gap-1 rounded-md border border-white/20 px-2 py-1 text-[11px] font-medium text-white/90 hover:bg-white/10 transition-colors"
                        >
                          {copiedId === row.id ? "Copiado!" : "Copiar"}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2">{row.name}</td>
                    <td className="px-4 py-2 text-white/80">{row.slug}</td>
                    <td className="px-4 py-2 text-white/80">
                      /{row.path_slug}
                    </td>
                    <td className="px-4 py-2">
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-yellow underline underline-offset-4"
                      >
                        {publicUrl}
                      </a>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => copyBaseCode(row)}
                        className="inline-flex items-center gap-1 rounded-md border border-brand-yellow/50 bg-brand-yellow/10 px-2 py-1 text-[11px] font-medium text-brand-yellow hover:bg-brand-yellow/20 transition-colors"
                      >
                        {copiedCodeId === row.id ? "Copiado!" : "Copiar HTML base"}
                      </button>
                      <p className="text-[10px] text-white/50 mt-1 max-w-[140px]">
                        index.html com IDs já preenchidos
                      </p>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => copyCursorPrompt(row)}
                        className="inline-flex items-center gap-1 rounded-md border border-brand-green/50 bg-brand-green/10 px-2 py-1 text-[11px] font-medium text-brand-green hover:bg-brand-green/20 transition-colors"
                      >
                        {copiedPromptId === row.id ? "Copiado!" : "Copiar prompt"}
                      </button>
                      <p className="text-[10px] text-white/50 mt-1 max-w-[160px]">
                        Cole no Cursor para criar a pasta e o index.html
                      </p>
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/lp/${row.id}`}
                        className="inline-flex items-center rounded-md border border-brand-green/50 bg-brand-green/10 px-2 py-1 text-[11px] font-medium text-brand-green hover:bg-brand-green/20 transition-colors"
                      >
                        Gerenciar / A/B
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-white/15 bg-brand-navy px-6 py-5 shadow-brand-soft">
            <h2 className="text-lg font-semibold mb-1">Nova landing page</h2>
            <p className="text-xs text-white/70 mb-4">
              Cadastre a LP e depois crie a pasta{" "}
              <code className="px-1 py-0.5 rounded bg-black/40 text-[11px]">
                landingpages/&lt;slug&gt;/default/index.html
              </code>{" "}
              aqui no projeto para o conteúdo.
            </p>

            {createError && (
              <p className="mb-3 text-xs text-red-300 bg-red-950/40 border border-red-900/80 px-3 py-2 rounded-md">
                {createError}
              </p>
            )}

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs text-white/80" htmlFor="lp-name">
                  Nome interno
                </label>
                <input
                  id="lp-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-black/30 border border-white/15 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-yellow/80 focus:border-transparent"
                  placeholder="Ex: LP Curso Power BI"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs text-white/80" htmlFor="lp-slug">
                  Slug interno (pasta)
                </label>
                <input
                  id="lp-slug"
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-black/30 border border-white/15 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-yellow/80 focus:border-transparent"
                  placeholder="Ex: curso-power-bi"
                />
              </div>

              <div className="space-y-1">
                <label
                  className="block text-xs text-white/80"
                  htmlFor="lp-path-slug"
                >
                  Path público (URL)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">
                    {baseDomain.replace(/\/$/, "")}/
                  </span>
                  <input
                    id="lp-path-slug"
                    type="text"
                    value={formPathSlug}
                    onChange={(e) => setFormPathSlug(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-md bg-black/30 border border-white/15 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-yellow/80 focus:border-transparent"
                    placeholder="Ex: curso-power-bi"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3 text-xs">
              <button
                type="button"
                className="px-3 py-1.5 rounded-full border border-white/20 text-white/80 hover:bg-white/10 transition-colors"
                onClick={() => {
                  if (!creating) {
                    setShowCreateModal(false);
                    setCreateError(null);
                  }
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={() => void handleCreate()}
                className="px-4 py-1.5 rounded-full bg-brand-yellow text-brand-navy font-semibold hover:bg-[#ffd94b] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? "Criando..." : "Criar landing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

