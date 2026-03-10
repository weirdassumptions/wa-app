import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const bad = (msg: string, status: number) =>
    new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return bad("Body JSON non valido.", 400);
    }

    const user_id = body?.user_id ?? body?.userId;
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const username = typeof body?.username === "string" ? body.username.trim() : "";

    if (!user_id || !email || !username) {
      return bad("user_id, email e username obbligatori.", 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: authData, error: authError } = await admin.auth.admin.getUserById(String(user_id));
    if (authError) {
      return bad("Utente non trovato: " + (authError.message ?? "errore auth"), 403);
    }
    const user = (authData as { user?: { email?: string; created_at?: string } })?.user;
    if (!user) {
      return bad("Utente non trovato.", 403);
    }
    const userEmail = (user.email ?? "").toLowerCase();
    if (userEmail !== email.toLowerCase()) {
      return bad("Email non corrisponde all'utente.", 403);
    }
    const createdMs = user.created_at ? new Date(user.created_at).getTime() : 0;
    if (createdMs && Date.now() - createdMs > 30 * 60 * 1000) {
      return bad("Troppo tempo dalla registrazione. Riprova ad accedere.", 403);
    }

    const display_name = typeof body?.display_name === "string" ? body.display_name.trim() : "";
    const bio = typeof body?.bio === "string" ? body.bio.trim() : "";
    const avatar_color = typeof body?.avatar_color === "string" ? body.avatar_color.trim() : "#6366f1";

    const usernameNorm = username.toLowerCase().replace(/\s+/g, "_");
    const { error: upsertError } = await admin.from("profiles").upsert(
      [{
        id: user_id,
        username: usernameNorm,
        display_name: display_name || usernameNorm,
        bio: bio || null,
        avatar_url: null,
        avatar_color: avatar_color || "#6366f1",
        email: email,
      }],
      { onConflict: "id" }
    );

    if (upsertError) {
      return bad("Salvataggio profilo: " + (upsertError.message ?? "errore DB"), 400);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore interno.";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
