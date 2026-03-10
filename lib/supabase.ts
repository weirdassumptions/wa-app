import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const isConfigured = supabaseUrl && supabaseUrl.includes("supabase.co") && supabaseAnonKey && supabaseAnonKey.startsWith("eyJ");
if (typeof window !== "undefined" && !isConfigured) {
  console.warn(
    "[Supabase] Configura .env.local con NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
    "Copia da Supabase Dashboard → Project Settings → API."
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || "https://placeholder.invalid",
  supabaseAnonKey || "placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  }
);