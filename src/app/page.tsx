import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <div className="card-shell text-center space-y-5">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-brand-yellow">
          Doutores do Excel
        </p>
        <h1 className="text-3xl font-semibold leading-tight">
          Painel de landing pages
        </h1>
        <p className="text-sm text-white/80">
          Administre suas landing pages estáticas, configure testes A/B e
          acompanhe a performance dos botões usados nas campanhas de tráfego.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-full bg-brand-yellow px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-[#ffd94b] transition-colors"
        >
          Entrar no painel
        </Link>
      </div>
    </main>
  );
}

