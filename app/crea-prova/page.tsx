"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { AVATAR_COLORS, initial } from "../components/helpers";

export default function CreaProvaPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).maybeSingle();
      if (!profile?.is_admin) {
        router.replace("/");
        return;
      }
      setIsAdmin(true);
      setReady(true);
    };
    check();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const usernameLower = username.trim().toLowerCase().replace(/\s+/g, "_");
    if (!usernameLower) { setErr("Username obbligatorio."); return; }
    if (!password) { setErr("Password obbligatoria."); return; }
    const RESERVED_USERNAMES = ["privacy", "termini", "app", "crea-prova", "segnalazioni", "random"];
    if (RESERVED_USERNAMES.includes(usernameLower)) {
      setErr("Questo username è riservato (conflitto con le pagine del sito).");
      return;
    }
    setLoading(true); setErr("");
    let avatarBase64: string | undefined;
    if (avatarFile) {
      try {
        avatarBase64 = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(String(r.result));
          r.onerror = rej;
          r.readAsDataURL(avatarFile);
        });
      } catch {
        setErr("Errore lettura immagine.");
        setLoading(false);
        return;
      }
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setErr("Sessione scaduta. Esci e accedi di nuovo.");
      setLoading(false);
      return;
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const res = await fetch(`${url}/functions/v1/create-prova-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        password,
        username: usernameLower,
        display_name: displayName.trim() || usernameLower,
        bio: bio.trim(),
        avatar_color: avatarColor,
        avatar_base64: avatarBase64,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr((data as { error?: string }).error ?? `Errore ${res.status}`);
      setLoading(false);
      return;
    }
    if (!(data as { ok?: boolean }).ok || (data as { error?: string }).error) {
      setErr((data as { error?: string }).error ?? "Errore.");
      setLoading(false);
      return;
    }
    setDone(true);
    setPassword(""); setUsername(""); setDisplayName(""); setBio("");
    setAvatarFile(null); setAvatarPreview(null);
    setLoading(false);
  };

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ color: "var(--muted)" }}>Caricamento…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: 24 }}>
      <div style={{ maxWidth: 400, margin: "0 auto" }}>
        <Link href="/app" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 14, marginBottom: 20, textDecoration: "none" }}>
          ← Torna alla home
        </Link>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
          <h1 style={{ fontFamily: "Playfair Display", fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Crea account di prova</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
            L&apos;utente potrà accedere subito con Accedi (nessuna verifica email).
          </p>
          {done ? (
            <div style={{ padding: "12px 0", color: "var(--text)", fontWeight: 500 }}>
              Account creato. L&apos;utente può accedere con username e password.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
                <div className="av-upload" onClick={() => fileRef.current?.click()}>
                  {avatarPreview
                    ? <img src={avatarPreview} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }} />
                    : <div className="av" style={{ width: 64, height: 64, background: avatarColor, fontSize: 24 }}>{username ? initial(username) : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}</div>}
                  <div className="av-upload-overlay">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); } }} />
              </div>
              <div>
                <label className="f-label">Username</label>
                <input className="f-inp" placeholder="minuscole, senza spazi" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, "_"))} required />
              </div>
              <div>
                <label className="f-label">Password</label>
                <input className="f-inp" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <div>
                <label className="f-label">Nome visualizzato (opzionale)</label>
                <input className="f-inp" placeholder={username || "Come apparire"} value={displayName} onChange={e => setDisplayName(e.target.value)} />
              </div>
              <div>
                <label className="f-label">Bio (opzionale)</label>
                <input className="f-inp" placeholder="Una riga…" value={bio} onChange={e => setBio(e.target.value)} />
              </div>
              {!avatarPreview && (
                <div>
                  <label className="f-label" style={{ marginBottom: 8 }}>Colore avatar <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(se non carichi foto)</span></label>
                  <div className="color-row">
                    {AVATAR_COLORS.map((c) => (
                      <div key={c} className={`color-dot${avatarColor === c ? " sel" : ""}`} style={{ background: c }} onClick={() => setAvatarColor(c)} />
                    ))}
                  </div>
                </div>
              )}
              {err && <div className="auth-err">{err}</div>}
              <button type="submit" className="btn-post" disabled={loading}>
                {loading ? "Creazione…" : "Crea account di prova"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
