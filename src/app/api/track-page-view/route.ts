import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export async function POST(request: Request) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase não configurado." },
      { status: 500 }
    );
  }

  try {
    const { landing_page_id, page_variant_id } = await request.json();

    if (!landing_page_id || !page_variant_id) {
      return NextResponse.json(
        { error: "landing_page_id e page_variant_id são obrigatórios." },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("page_views").insert({
      landing_page_id,
      page_variant_id
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: "Erro ao registrar carregamento." },
      { status: 500 }
    );
  }
}
