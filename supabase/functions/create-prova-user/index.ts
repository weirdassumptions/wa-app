import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (obj: { ok: boolean; error?: string }) =>
    new Response(JSON.stringify(obj), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    /* Verifica che il chiamante sia admin (JWT non verificato dal gateway) */
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "")?.trim();
    if (!token) {
      return json({ ok: false, error: "Non autorizzato." });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    if (userError || !user?.id) {
      return json({ ok: false, error: "Sessione non valida. Accedi di nuovo." });
    }
    const { data: profile } = await authClient.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    if (!profile?.is_admin) {
      return json({ ok: false, error: "Solo gli admin possono creare account di prova." });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "Body JSON non valido." });
    }

    const password = typeof body?.password === "string" ? body.password : "";
    const username = typeof body?.username === "string" ? body.username.trim() : "";

    if (!password || !username) {
      return json({ ok: false, error: "Password e username obbligatori." });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const usernameNorm = username.toLowerCase().replace(/\s+/g, "_");
    const { data: existing } = await admin.from("profiles").select("id").eq("username", usernameNorm).maybeSingle();
    if (existing) {
      return json({ ok: false, error: "Username già in uso." });
    }

    /* Account prova: email interna, non mostrata all'utente; accesso solo con username + password */
    const email = `prova_${usernameNorm}@wa.local`;

    const display_name = typeof body?.display_name === "string" ? body.display_name.trim() : "";
    const bio = typeof body?.bio === "string" ? body.bio.trim() : "";
    const avatar_color = typeof body?.avatar_color === "string" ? body.avatar_color.trim() : "#6366f1";
    const avatar_base64 = typeof body?.avatar_base64 === "string" ? body.avatar_base64 : "";

    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username: usernameNorm,
        display_name: display_name || usernameNorm,
        bio: bio || null,
        avatar_color: avatar_color || "#6366f1",
        email,
      },
    });

    if (createError || !createData?.user) {
      return json({ ok: false, error: createError?.message ?? "Errore creazione utente." });
    }

    const userId = createData.user.id;
    await admin.auth.admin.updateUserById(userId, { email_confirm: true });

    let avatar_url: string | null = null;
    if (avatar_base64 && avatar_base64.startsWith("data:image/")) {
      const match = avatar_base64.match(/^data:image\/(\w+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === "jpeg" ? "jpg" : match[1];
        const base64Data = match[2];
        try {
          const binary = atob(base64Data);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const path = `${userId}/avatar.${ext}`;
          const { error: upErr } = await admin.storage.from("avatars").upload(path, new Blob([bytes]), {
            contentType: `image/${match[1]}`,
            upsert: true,
          });
          if (!upErr) {
            const { data: urlData } = admin.storage.from("avatars").getPublicUrl(path);
            avatar_url = urlData.publicUrl + "?t=" + Date.now();
          }
        } catch {
          /* ignore avatar upload failure */
        }
      }
    }

    const { error: profileError } = await admin.from("profiles").upsert(
      [{
        id: userId,
        username: usernameNorm,
        display_name: display_name || usernameNorm,
        bio: bio || null,
        avatar_url,
        avatar_color: avatar_color || "#6366f1",
        email,
      }],
      { onConflict: "id" }
    );

    if (profileError) {
      return json({ ok: false, error: "Profilo: " + (profileError.message ?? "errore") });
    }

    return json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore interno.";
    return json({ ok: false, error: msg });
  }
});
