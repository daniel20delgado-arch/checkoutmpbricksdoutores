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
    const { landing_page_id, page_variant_id, experiment_id, button_id } =
      await request.json();

    if (!landing_page_id || !page_variant_id || !button_id) {
      return NextResponse.json(
        { error: "Campos obrigatórios ausentes." },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("click_events").insert({
      landing_page_id,
      page_variant_id,
      experiment_id: experiment_id ?? null,
      button_id
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
      { error: "Erro ao registrar clique." },
      { status: 500 }
    );
  }
}

