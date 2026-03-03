"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowserClient } from "@/lib/supabaseClient";

type LandingPage = {
  id: string;
  name: string;
  slug: string;
  path_slug: string;
  production_variant_id: string | null;
};

type PageVariant = {
  id: string;
  variant_slug: string;
  label: string;
  created_at: string;
};

type Experiment = {
  id: string;
  status: string;
  variant_control_id: string;
  variant_b_id: string;
  winner_variant_id: string | null;
  started_at: string | null;
  ended_at: string | null;
};

export default function AdminLpDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [lp, setLp] = useState<LandingPage | null>(null);
  const [variants, setVariants] = useState<PageVariant[]>([]);
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creatingVariant, setCreatingVariant] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [variantCreated, setVariantCreated] = useState<PageVariant | null>(null);
  const [newVariantSlug, setNewVariantSlug] = useState("");
  const [newVariantLabel, setNewVariantLabel] = useState("");

  const [updatingProductionId, setUpdatingProductionId] = useState<string | null>(null);

  const [startingTest, setStartingTest] = useState(false);
  const [selectedVariantBId, setSelectedVariantBId] = useState<string>("");

  const [endingTest, setEndingTest] = useState(false);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string>("");

  const baseDomain =
    process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "https://oferta.doutoresdoexcel.com.br";
  const publicUrl = lp ? `${baseDomain.replace(/\/$/, "")}/${lp.path_slug}` : "";

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
        error: userError
      } = await supabaseBrowserClient.auth.getUser();
      if (userError || !user) {
        router.push("/login");
        return;
      }

      const { data: lpData, error: lpError } = await supabaseBrowserClient
        .from("landing_pages")
        .select("id, name, slug, path_slug, production_variant_id")
        .eq("id", id)
        .single();

      if (lpError || !lpData) {
        setError(lpError?.message ?? "LP não encontrada.");
        setLoading(false);
        return;
      }
      setLp(lpData as LandingPage);

      const { data: variantsData, error: vError } = await supabaseBrowserClient
        .from("page_variants")
        .select("id, variant_slug, label, created_at")
        .eq("landing_page_id", id)
        .order("variant_slug");

      if (vError) {
        setError(vError.message);
      } else {
        setVariants((variantsData as PageVariant[]) ?? []);
      }

      const { data: clicksData, error: cError } = await supabaseBrowserClient
        .from("click_events")
        .select("page_variant_id")
        .eq("landing_page_id", id);

      if (!cError && clicksData) {
        const counts: Record<string, number> = {};
        for (const row of clicksData as { page_variant_id: string }[]) {
          counts[row.page_variant_id] = (counts[row.page_variant_id] ?? 0) + 1;
        }
        setClickCounts(counts);
      }

      const { data: viewsData, error: vwError } = await supabaseBrowserClient
        .from("page_views")
        .select("page_variant_id")
        .eq("landing_page_id", id);

      if (!vwError && viewsData) {
        const counts: Record<string, number> = {};
        for (const row of viewsData as { page_variant_id: string }[]) {
          counts[row.page_variant_id] = (counts[row.page_variant_id] ?? 0) + 1;
        }
        setViewCounts(counts);
      }

      const { data: expData, error: expError } = await supabaseBrowserClient
        .from("experiments")
        .select("id, status, variant_control_id, variant_b_id, winner_variant_id, started_at, ended_at")
        .eq("landing_page_id", id)
        .eq("status", "running")
        .maybeSingle();

      if (!expError && expData) {
        setExperiment(expData as Experiment);
      } else {
        setExperiment(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function handleCreateVariant() {
    if (!lp) return;

    const slug = newVariantSlug.trim();
    const label =
      newVariantLabel.trim() || (slug ? `Variante ${slug.toUpperCase()}` : "");

    if (!slug) {
      setError("Informe o slug da variante (ex.: b, c, oferta-nova).");
      return;
    }
    if (slug === "default") {
      setError("O slug \"default\" é reservado para a variante padrão.");
      return;
    }
    if (variants.some((v) => v.variant_slug === slug)) {
      setError("Já existe uma variante com esse slug para esta LP.");
      return;
    }

    setCreatingVariant(true);
    setError(null);
    try {
      const { data: newVariant, error: insertError } = await supabaseBrowserClient
        .from("page_variants")
        .insert({
          landing_page_id: lp.id,
          variant_slug: slug,
          label: label || slug
        })
        .select("id, variant_slug, label, created_at")
        .single();

      if (insertError || !newVariant) {
        setError(insertError?.message ?? "Erro ao criar variante.");
        setCreatingVariant(false);
        return;
      }
      setVariantCreated(newVariant as PageVariant);
      setShowVariantModal(true);
      setNewVariantSlug("");
      setNewVariantLabel("");
      await load();
    } finally {
      setCreatingVariant(false);
    }
  }

  function getBaseHtmlForVariant(variant: PageVariant): string {
    if (!lp) return "";
    return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>${lp.name} - ${variant.label}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; font-family: system-ui,sans-serif; background: #050a30; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
      .wrapper { max-width: 640px; width: 100%; padding: 32px 24px; border-radius: 18px; border: 1px solid rgba(244,182,9,0.35); background: rgba(5,10,48,0.9); }
      h1 { margin: 0 0 8px; font-size: 1.9rem; }
      p { margin: 0 0 16px; color: rgba(255,255,255,0.85); }
      .cta { display: inline-flex; align-items: center; justify-content: center; padding: 10px 18px; border-radius: 999px; border: none; font-size: 0.9rem; font-weight: 600; color: #050a30; background: #f4b609; cursor: pointer; }
      .cta:hover { background: #ffd94b; }
    </style>
    <script>
      async function trackClick(buttonId) {
        try {
          await fetch("/api/track-click", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ landing_page_id: "${lp.id}", page_variant_id: "${variant.id}", experiment_id: null, button_id: buttonId }), keepalive: true });
        } catch (e) {}
      }
    </script>
  </head>
  <body>
    <div class="wrapper">
      <h1>${variant.label} - ${lp.name}</h1>
      <p>Altere o conteúdo desta variante para o teste A/B.</p>
      <button type="button" class="cta" data-track="cta-principal" onclick="trackClick('cta-principal')">CTA principal</button>
    </div>
  </body>
</html>
`;
  }

  function getCursorPromptForVariant(variant: PageVariant): string {
    if (!lp) return "";
    const pasta = `landingpages/${lp.slug}/${variant.variant_slug}`;
    const filePath = `${pasta}/index.html`;
    return `Crie o arquivo da variante para o teste A/B no caminho exato:

**Arquivo obrigatório:** \`${filePath}\`

**Contexto:** LP "${lp.name}", slug \`${lp.slug}\`. Esta é uma variante de teste para o A/B. Use os IDs abaixo no script de tracking.

**IDs para o fetch('/api/track-click'):**
- landing_page_id: "${lp.id}"
- page_variant_id: "${variant.id}"

Crie a pasta \`${pasta}\` e o \`index.html\` com HTML estático, cores #050a30 e #f4b609, e a função trackClick(buttonId) chamando a API com os IDs acima. Botões com data-track e onclick="trackClick('id')".
Salve em \`${filePath}\`.`;
  }

  async function handleSetProductionVariant(variantId: string) {
    if (!lp) return;
    setUpdatingProductionId(variantId);
    setError(null);
    try {
      const { error: updateError } = await supabaseBrowserClient
        .from("landing_pages")
        .update({ production_variant_id: variantId })
        .eq("id", lp.id);
      if (updateError) {
        setError(updateError.message);
      } else {
        await load();
      }
    } finally {
      setUpdatingProductionId(null);
    }
  }

  async function handleStartTest() {
    if (!lp || !selectedVariantBId) return;
    const defaultVariant = variants.find((v) => v.variant_slug === "default");
    if (!defaultVariant) {
      setError("É necessário ter a variante default.");
      return;
    }
    setStartingTest(true);
    setError(null);
    try {
      const { error: insertError } = await supabaseBrowserClient
        .from("experiments")
        .insert({
          landing_page_id: lp.id,
          status: "running",
          variant_control_id: defaultVariant.id,
          variant_b_id: selectedVariantBId,
          started_at: new Date().toISOString()
        });
      if (insertError) {
        setError(insertError.message);
      } else {
        await load();
      }
    } finally {
      setStartingTest(false);
    }
  }

  async function handleEndTest() {
    if (!lp || !selectedWinnerId) return;
    setEndingTest(true);
    setError(null);
    try {
      if (!experiment) return;
      const { error: updateExp } = await supabaseBrowserClient
        .from("experiments")
        .update({
          status: "ended",
          winner_variant_id: selectedWinnerId,
          ended_at: new Date().toISOString()
        })
        .eq("id", experiment.id);
      if (updateExp) {
        setError(updateExp.message);
        setEndingTest(false);
        return;
      }
      const { error: updateLp } = await supabaseBrowserClient
        .from("landing_pages")
        .update({ production_variant_id: selectedWinnerId })
        .eq("id", lp.id);
      if (updateLp) setError(updateLp.message);
      await load();
    } finally {
      setEndingTest(false);
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-white/80">Carregando...</div>
    );
  }
  if (error && !lp) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-300">{error}</p>
        <Link href="/admin" className="text-brand-yellow underline text-sm">
          Voltar à lista
        </Link>
      </div>
    );
  }
  if (!lp) return null;

  const defaultVariant = variants.find((v) => v.variant_slug === "default");
  const variantBOptions = variants.filter((v) => v.variant_slug !== "default");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="text-sm text-white/70 hover:text-brand-yellow transition-colors"
        >
          ← Voltar
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold">{lp.name}</h1>
        <p className="text-sm text-white/70">
          Slug: <code className="bg-black/30 px-1 rounded">{lp.slug}</code> · Path:{" "}
          <code className="bg-black/30 px-1 rounded">/{lp.path_slug}</code>
        </p>
        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-brand-yellow underline mt-1 inline-block"
        >
          {publicUrl}
        </a>
      </div>

      {error && (
        <p className="text-sm text-red-300 bg-red-950/40 border border-red-900 px-3 py-2 rounded-md">
          {error}
        </p>
      )}

      {/* Variantes, carregamentos e cliques */}
      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h2 className="text-sm font-semibold mb-3">Variantes, carregamentos e cliques</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="py-2 pr-4">Variante</th>
              <th className="py-2 pr-4">Slug</th>
              <th className="py-2 pr-4">Carregamentos</th>
              <th className="py-2 pr-4">Cliques</th>
              <th className="py-2 pr-4">Atual</th>
              <th className="py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id} className="border-b border-white/5">
                <td className="py-2 pr-4">{v.label}</td>
                <td className="py-2 pr-4 text-white/70">{v.variant_slug}</td>
                <td className="py-2 pr-4 font-mono text-white/90">
                  {viewCounts[v.id] ?? 0}
                </td>
                <td className="py-2 pr-4 font-mono text-brand-yellow">
                  {clickCounts[v.id] ?? 0}
                </td>
                <td className="py-2 pr-4 text-xs">
                  {lp.production_variant_id === v.id ? (
                    <span className="inline-flex items-center rounded-full border border-brand-green/50 px-2 py-0.5 text-[0.7rem] text-brand-green">
                      Atual
                    </span>
                  ) : (
                    <span className="text-[0.7rem] text-white/40">—</span>
                  )}
                </td>
                <td className="py-2 text-xs">
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`/lp/${lp.slug}/${v.variant_slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/20 px-2.5 py-0.5 text-[0.7rem] text-white/80 hover:border-brand-yellow hover:text-brand-yellow"
                    >
                      Acessar
                    </a>
                    <button
                      type="button"
                      disabled={
                        !!experiment ||
                        lp.production_variant_id === v.id ||
                        updatingProductionId === v.id
                      }
                      onClick={() => void handleSetProductionVariant(v.id)}
                      className="rounded-full bg-white/5 px-2.5 py-0.5 text-[0.7rem] text-white/80 hover:bg-white/10 disabled:opacity-40"
                    >
                      {updatingProductionId === v.id
                        ? "Definindo..."
                        : "Usar como atual"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {variants.length === 0 && (
          <p className="text-sm text-white/50 py-2">Nenhuma variante.</p>
        )}

        <div className="mt-4 space-y-2">
          <p className="text-xs text-white/60">
            Crie novas variantes para testar diferentes versões da sua LP. O slug
            define a pasta em <code className="bg-black/40 px-1 rounded text-[0.7rem]">landingpages/{lp.slug}/[slug]/index.html</code>.
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              value={newVariantSlug}
              onChange={(e) => setNewVariantSlug(e.target.value)}
              placeholder="Slug (ex.: b, c, oferta-nova)"
              className="rounded-md bg-black/30 border border-white/15 text-xs text-white px-2 py-1 w-40"
            />
            <input
              type="text"
              value={newVariantLabel}
              onChange={(e) => setNewVariantLabel(e.target.value)}
              placeholder="Nome da variante (opcional)"
              className="rounded-md bg-black/30 border border-white/15 text-xs text-white px-2 py-1 w-56"
            />
            <button
              type="button"
              disabled={creatingVariant}
              onClick={() => void handleCreateVariant()}
              className="rounded-full bg-brand-yellow px-4 py-2 text-xs font-semibold text-brand-navy hover:bg-[#ffd94b] disabled:opacity-60 transition-colors"
            >
              {creatingVariant ? "Criando..." : "+ Criar variante"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal: variante criada - instruções */}
      {showVariantModal && variantCreated && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg rounded-xl border border-white/15 bg-brand-navy p-5 shadow-brand-soft max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-2">Variante criada</h3>
            <p className="text-sm text-white/80 mb-3">
              Crie a pasta e o arquivo no projeto para o teste A/B funcionar:
            </p>
            <p className="text-xs text-white/60 mb-2 font-mono">
              landingpages/{lp.slug}/{variantCreated.variant_slug}/index.html
            </p>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  const html = getBaseHtmlForVariant(variantCreated);
                  void navigator.clipboard.writeText(html);
                }}
                className="rounded-md border border-brand-yellow/50 bg-brand-yellow/10 px-3 py-1.5 text-xs font-medium text-brand-yellow"
              >
                Copiar HTML base
              </button>
              <button
                type="button"
                onClick={() => {
                  const prompt = getCursorPromptForVariant(variantCreated);
                  void navigator.clipboard.writeText(prompt);
                }}
                className="rounded-md border border-brand-green/50 bg-brand-green/10 px-3 py-1.5 text-xs font-medium text-brand-green"
              >
                Copiar prompt Cursor
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowVariantModal(false);
                setVariantCreated(null);
              }}
              className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/80"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Teste A/B */}
      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h2 className="text-sm font-semibold mb-3">Teste A/B</h2>

        {experiment ? (
          <div className="space-y-3">
            <p className="text-sm text-brand-green">Teste em andamento (50/50).</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                A (controle):{" "}
                <strong className="text-white/90">{viewCounts[experiment.variant_control_id] ?? 0} carreg.</strong>
                {" · "}
                <strong className="text-brand-yellow">
                  {clickCounts[experiment.variant_control_id] ?? 0} cliques
                </strong>
              </span>
              <span>
                B:{" "}
                <strong className="text-white/90">{viewCounts[experiment.variant_b_id] ?? 0} carreg.</strong>
                {" · "}
                <strong className="text-brand-yellow">
                  {clickCounts[experiment.variant_b_id] ?? 0} cliques
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-xs text-white/70">Encerrar e escolher campeã:</label>
              <select
                value={selectedWinnerId}
                onChange={(e) => setSelectedWinnerId(e.target.value)}
                className="rounded-md bg-black/30 border border-white/15 text-sm text-white px-2 py-1"
              >
                <option value="">Selecione a variante vencedora</option>
                <option value={experiment.variant_control_id}>A (controle)</option>
                <option value={experiment.variant_b_id}>B</option>
              </select>
              <button
                type="button"
                disabled={endingTest || !selectedWinnerId}
                onClick={() => void handleEndTest()}
                className="rounded-full bg-brand-green px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {endingTest ? "Salvando..." : "Encerrar e definir campeã"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-white/70">
              Inicie um teste 50/50 entre a variante default (A) e uma variante de teste.
            </p>
            {variantBOptions.length === 0 ? (
              <p className="text-xs text-white/50">
                Crie ao menos uma variante acima (por exemplo, com slug &quot;b&quot;) e o arquivo correspondente em{" "}
                <code className="bg-black/30 px-1 rounded text-[0.7rem]">
                  landingpages/{lp.slug}/[slug-da-variante]/index.html
                </code>{" "}
                antes de iniciar.
              </p>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-xs text-white/70">Variante B:</label>
                <select
                  value={selectedVariantBId}
                  onChange={(e) => setSelectedVariantBId(e.target.value)}
                  className="rounded-md bg-black/30 border border-white/15 text-sm text-white px-2 py-1"
                >
                  <option value="">Selecione</option>
                  {variantBOptions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label} ({v.variant_slug}) — {viewCounts[v.id] ?? 0} carreg. / {clickCounts[v.id] ?? 0} cliques
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={startingTest || !selectedVariantBId}
                  onClick={() => void handleStartTest()}
                  className="rounded-full bg-brand-yellow px-3 py-1.5 text-xs font-semibold text-brand-navy hover:bg-[#ffd94b] disabled:opacity-50"
                >
                  {startingTest ? "Iniciando..." : "Ligar teste A/B"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
