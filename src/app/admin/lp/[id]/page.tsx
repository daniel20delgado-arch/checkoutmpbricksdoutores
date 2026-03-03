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
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creatingVariant, setCreatingVariant] = useState(false);
  const [showVariantBModal, setShowVariantBModal] = useState(false);
  const [variantBCreated, setVariantBCreated] = useState<PageVariant | null>(null);

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

  async function handleCreateVariantB() {
    if (!lp) return;
    setCreatingVariant(true);
    setError(null);
    try {
      const { data: newVariant, error: insertError } = await supabaseBrowserClient
        .from("page_variants")
        .insert({
          landing_page_id: lp.id,
          variant_slug: "b",
          label: "Variante B"
        })
        .select("id, variant_slug, label, created_at")
        .single();

      if (insertError || !newVariant) {
        setError(insertError?.message ?? "Erro ao criar variante B.");
        setCreatingVariant(false);
        return;
      }
      setVariantBCreated(newVariant as PageVariant);
      setShowVariantBModal(true);
      await load();
    } finally {
      setCreatingVariant(false);
    }
  }

  function getBaseHtmlForVariantB(variantId: string): string {
    if (!lp) return "";
    return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>${lp.name} - B</title>
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
          await fetch("/api/track-click", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ landing_page_id: "${lp.id}", page_variant_id: "${variantId}", experiment_id: null, button_id: buttonId }), keepalive: true });
        } catch (e) {}
      }
    </script>
  </head>
  <body>
    <div class="wrapper">
      <h1>Variante B - ${lp.name}</h1>
      <p>Altere o conteúdo desta variante para o teste A/B.</p>
      <button type="button" class="cta" data-track="cta-principal" onclick="trackClick('cta-principal')">CTA principal</button>
    </div>
  </body>
</html>
`;
  }

  function getCursorPromptForVariantB(variantId: string): string {
    if (!lp) return "";
    const pasta = `landingpages/${lp.slug}/b`;
    const filePath = `${pasta}/index.html`;
    return `Crie o arquivo da variante B para o teste A/B no caminho exato:

**Arquivo obrigatório:** \`${filePath}\`

**Contexto:** LP "${lp.name}", slug \`${lp.slug}\`. Esta é a variante B. Use os IDs abaixo no script de tracking.

**IDs para o fetch('/api/track-click'):**
- landing_page_id: "${lp.id}"
- page_variant_id: "${variantId}"

Crie a pasta \`${pasta}\` e o \`index.html\` com HTML estático, cores #050a30 e #f4b609, e a função trackClick(buttonId) chamando a API com os IDs acima. Botões com data-track e onclick="trackClick('id')".
Salve em \`${filePath}\`.`;
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

      {/* Variantes e cliques */}
      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h2 className="text-sm font-semibold mb-3">Variantes e cliques</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="py-2 pr-4">Variante</th>
              <th className="py-2 pr-4">Slug</th>
              <th className="py-2">Cliques</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id} className="border-b border-white/5">
                <td className="py-2 pr-4">{v.label}</td>
                <td className="py-2 pr-4 text-white/70">{v.variant_slug}</td>
                <td className="py-2 font-mono text-brand-yellow">
                  {clickCounts[v.id] ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {variants.length === 0 && (
          <p className="text-sm text-white/50 py-2">Nenhuma variante.</p>
        )}

        {!variants.some((v) => v.variant_slug === "b") && (
          <div className="mt-4">
            <button
              type="button"
              disabled={creatingVariant}
              onClick={() => void handleCreateVariantB()}
              className="rounded-full bg-brand-yellow px-4 py-2 text-xs font-semibold text-brand-navy hover:bg-[#ffd94b] disabled:opacity-60 transition-colors"
            >
              {creatingVariant ? "Criando..." : "+ Criar variante B"}
            </button>
          </div>
        )}
      </div>

      {/* Modal: variante B criada - instruções */}
      {showVariantBModal && variantBCreated && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg rounded-xl border border-white/15 bg-brand-navy p-5 shadow-brand-soft max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-2">Variante B criada</h3>
            <p className="text-sm text-white/80 mb-3">
              Crie a pasta e o arquivo no projeto para o teste A/B funcionar:
            </p>
            <p className="text-xs text-white/60 mb-2 font-mono">
              landingpages/{lp.slug}/b/index.html
            </p>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  const html = getBaseHtmlForVariantB(variantBCreated.id);
                  void navigator.clipboard.writeText(html);
                }}
                className="rounded-md border border-brand-yellow/50 bg-brand-yellow/10 px-3 py-1.5 text-xs font-medium text-brand-yellow"
              >
                Copiar HTML base
              </button>
              <button
                type="button"
                onClick={() => {
                  const prompt = getCursorPromptForVariantB(variantBCreated.id);
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
                setShowVariantBModal(false);
                setVariantBCreated(null);
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
                <strong className="text-brand-yellow">
                  {clickCounts[experiment.variant_control_id] ?? 0} cliques
                </strong>
              </span>
              <span>
                B:{" "}
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
              Inicie um teste 50/50 entre a variante default (A) e uma variante B.
            </p>
            {variantBOptions.length === 0 ? (
              <p className="text-xs text-white/50">
                Crie a variante B acima e o arquivo em landingpages/{lp.slug}/b/ antes de iniciar.
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
                      {v.label} ({v.variant_slug}) — {clickCounts[v.id] ?? 0} cliques
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
