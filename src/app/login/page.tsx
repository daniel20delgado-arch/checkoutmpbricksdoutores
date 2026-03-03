"use client";

import { FormEvent, useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabaseBrowserClient.auth.signUp({
          email,
          password
        });
        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }
      }

      const { error: signInError } =
        await supabaseBrowserClient.auth.signInWithPassword({
          email,
          password
        });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push("/admin");
    } catch (err) {
      setError("Erro ao autenticar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="card-shell">
        <div className="mb-6 text-center space-y-2">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-brand-yellow">
            Doutores do Excel
          </p>
          <h1 className="text-2xl font-semibold">
            {mode === "login" ? "Entrar no painel" : "Criar conta"}
          </h1>
          <p className="text-xs text-white/75">
            Use seu e-mail para acessar a administração das landing pages.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm text-white/80" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-black/30 border border-white/15 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-yellow/80 focus:border-transparent"
              placeholder="voce@doutoresdoexcel.com.br"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm text-white/80" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-black/30 border border-white/15 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-yellow/80 focus:border-transparent"
              placeholder="Digite sua senha"
            />
          </div>

          {error && (
            <p className="text-sm text-red-300 bg-red-950/40 border border-red-900/80 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-full bg-brand-yellow px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-[#ffd94b] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? "Enviando..."
              : mode === "login"
              ? "Entrar"
              : "Criar conta e entrar"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            className="text-xs text-white/75 underline underline-offset-4"
            onClick={() =>
              setMode((prev) => (prev === "login" ? "signup" : "login"))
            }
          >
            {mode === "login"
              ? "Não tem conta? Criar conta"
              : "Já tem conta? Entrar"}
          </button>
        </div>
      </div>
    </main>
  );
}

