import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Em ambiente de build/CI podemos querer apenas avisar em vez de lançar erro,
  // mas para o MVP é melhor falhar cedo caso as variáveis não estejam definidas.
  console.warn(
    "Variáveis NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas."
  );
}

export const supabaseBrowserClient = createClient(
  supabaseUrl ?? "",
  supabaseAnonKey ?? ""
);

