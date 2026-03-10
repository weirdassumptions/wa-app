import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { login, password } = await req.json();

    // client con service_role per leggere auth.users
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let email = (login ?? "").trim();

    // se non contiene @ lo trattiamo come username (ricerca case-insensitive per profili con maiuscole)
    if (!login.includes("@")) {
      const usernameNorm = login.trim().toLowerCase().replace(/\s+/g, "_");
      const { data, error } = await admin
        .from("profiles")
        .select("email")
        .ilike("username", usernameNorm)
        .maybeSingle();

      if (error || !data?.email) {
        return new Response(
          JSON.stringify({ error: "Username non trovato." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      email = (data.email ?? "").trim();
    }

    // login: funziona per email verificate e non (in quel caso confermiamo e riproviamo)
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    let authResult = await client.auth.signInWithPassword({ email: email.trim(), password });

    if (authResult.error) {
      const msg = authResult.error.message?.toLowerCase() ?? "";
      const emailNotConfirmed = msg.includes("email not confirmed") || msg.includes("email_not_confirmed");
      if (emailNotConfirmed) {
        const { data: profileRow } = await admin
          .from("profiles")
          .select("id")
          .ilike("email", email.trim())
          .maybeSingle();
        if (profileRow?.id) {
          const { data: authUser } = await admin.auth.admin.getUserById(profileRow.id);
          const created = (authUser as { user?: { created_at?: string } })?.user?.created_at;
          const cutoff = "2025-03-06T00:00:00Z";
          if (created && created < cutoff) {
            await admin.auth.admin.updateUserById(profileRow.id, { email_confirm: true });
            authResult = await client.auth.signInWithPassword({ email: email.trim(), password });
          }
        }
      }
      if (authResult.error || !authResult.data?.session) {
        const isStillUnconfirmed = authResult.error && (authResult.error.message?.toLowerCase().includes("email not confirmed") || authResult.error.message?.toLowerCase().includes("email_not_confirmed"));
        const errMsg = isStillUnconfirmed
          ? "Verifica la tua email: controlla la casella e clicca il link di conferma."
          : (authResult.error?.message ?? "Email o password errati.");
        return new Response(
          JSON.stringify({ error: errMsg }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ session: authResult.data.session }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Errore interno." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});