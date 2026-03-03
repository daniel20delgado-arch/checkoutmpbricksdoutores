import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN;

// Middleware roda no edge; mantemos o client o mais simples possível.
const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;

  // Opção A: no host das LPs (oferta), não expor admin nem login — retorna 404
  let lpHost: string | null = null;
  if (baseDomain) {
    try {
      lpHost = new URL(baseDomain).hostname;
    } catch {
      lpHost = null;
    }
  }
  if (lpHost && hostname === lpHost) {
    if (
      pathname === "/" ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/login")
    ) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  // Apenas interceptar caminhos simples ("/algo"), ignorando /admin, /login, /api, /_next, etc.
  if (
    pathname === "/" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/lp") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Opcional: validar host, mas não bloquear caso variável não esteja definida.
  if (baseDomain) {
    try {
      const expectedHost = new URL(baseDomain).hostname;
      if (hostname !== expectedHost) {
        return NextResponse.next();
      }
    } catch {
      // Se baseDomain estiver mal configurado, apenas segue.
    }
  }

  if (!supabase) {
    return NextResponse.next();
  }

  const pathSlug = pathname.replace(/^\/+/, "");

  // Buscar landing page pelo path_slug
  const { data: landingPage, error: lpError } = await supabase
    .from("landing_pages")
    .select("id, slug, production_variant_id")
    .eq("path_slug", pathSlug)
    .maybeSingle();

  if (lpError || !landingPage) {
    return NextResponse.next();
  }

  const landingPageId = landingPage.id as string;

  // Verificar se há experimento ativo
  const { data: experiment } = await supabase
    .from("experiments")
    .select(
      "id, variant_control_id, variant_b_id, status"
    )
    .eq("landing_page_id", landingPageId)
    .eq("status", "running")
    .maybeSingle();

  let targetVariantSlug: string | null = null;

  if (experiment && experiment.variant_control_id && experiment.variant_b_id) {
    // 50/50 entre controle e B
    const useControl = Math.random() < 0.5;
    const variantId = useControl
      ? experiment.variant_control_id
      : experiment.variant_b_id;

    const { data: variant } = await supabase
      .from("page_variants")
      .select("variant_slug")
      .eq("id", variantId)
      .maybeSingle();

    if (variant?.variant_slug) {
      targetVariantSlug = variant.variant_slug;
    }
  }

  if (!targetVariantSlug) {
    // Sem teste ativo ou algo falhou: usa production_variant_id ou "default"
    if (landingPage.production_variant_id) {
      const { data: variant } = await supabase
        .from("page_variants")
        .select("variant_slug")
        .eq("id", landingPage.production_variant_id)
        .maybeSingle();

      if (variant?.variant_slug) {
        targetVariantSlug = variant.variant_slug;
      }
    }

    if (!targetVariantSlug) {
      // Fallback para slug "default"
      const { data: defaultVariant } = await supabase
        .from("page_variants")
        .select("variant_slug")
        .eq("landing_page_id", landingPageId)
        .eq("variant_slug", "default")
        .maybeSingle();

      targetVariantSlug = defaultVariant?.variant_slug ?? "default";
    }
  }

  const internalUrl = request.nextUrl.clone();
  internalUrl.pathname = `/lp/${landingPage.slug}/${targetVariantSlug}`;

  return NextResponse.redirect(internalUrl, 302);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

