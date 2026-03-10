import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (obj: { ok: boolean; error?: string }) =>
    new Response(JSON.stringify(obj), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "")?.trim();
    if (!token) {
      return json({ ok: false, error: "Non autorizzato." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!anonKey) {
      return json({ ok: false, error: "Configura SUPABASE_ANON_KEY tra i secret della function." });
    }
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: { user: caller } } = await authClient.auth.getUser(token);
    if (!caller?.id) {
      return json({ ok: false, error: "Sessione non valida. Accedi di nuovo e riprova." });
    }

    let body: { user_id?: string };
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "Body non valido." });
    }
    const user_id = body?.user_id;
    if (!user_id) {
      return json({ ok: false, error: "user_id mancante." });
    }
    if (caller.id !== user_id) {
      return json({ ok: false, error: "Puoi eliminare solo il tuo account." });
    }

    const adminClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await adminClient.auth.admin.deleteUser(user_id);
    if (error) {
      return json({ ok: false, error: error.message });
    }

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});