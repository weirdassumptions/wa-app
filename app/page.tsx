"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

/* ─── Types ─── */
type Profile = {
  id: string; username: string; display_name: string; bio: string;
  avatar_color: string; avatar_url?: string; is_admin?: boolean; is_verified?: boolean;
};
type Comment = {
  id: string; text: string; username: string; display_name?: string; is_verified?: boolean;
  assumption_id: string; created_at: string; parent_id: string | null;
  avatar_url?: string; avatar_color?: string;
};

/* ─── Constants ─── */
const OFFICIAL_USERNAME = "wa";
const OFFICIAL_NAME     = "Weird Assumptions";
const OFFICIAL_HANDLE   = "weirdassumptions";
const OFFICIAL_LOGO     = "/logo.jpeg";
const AVATAR_COLORS     = ["#b83232","#d4603a","#7a6a5a","#4a7a6a","#7a5a8a","#8a6a3a","#4a6a8a","#6a4a7a"];

/* ─── Helpers ─── */
const GRADS = [
  ["#b83232","#d4603a"],["#7a6a5a","#a08870"],["#4a7a6a","#6a9e8a"],
  ["#7a5a8a","#a07ab0"],["#8a6a3a","#b08a50"],["#4a6a8a","#6a8aaa"],
];
const avatarGrad = (n: string) => { const [a,b] = GRADS[n.charCodeAt(0) % GRADS.length]; return `linear-gradient(135deg,${a},${b})`; };
const initial    = (n: string) => n.charAt(0).toUpperCase();
const isOfficial = (u: string) => u === OFFICIAL_USERNAME;
const displayFor = (username: string, display_name?: string) =>
  isOfficial(username) ? OFFICIAL_NAME : (display_name || username);
const handleFor  = (username: string) =>
  isOfficial(username) ? OFFICIAL_HANDLE : username.toLowerCase().replace(/\s+/g,"_");
const fmt = (d: string) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s fa`;
  if (s < 3600) return `${Math.floor(s/60)}m fa`;
  if (s < 86400) return `${Math.floor(s/3600)}h fa`;
  return new Date(d).toLocaleDateString("it-IT");
};

const Badge = ({ size = 16 }: { size?: number }) => (
  <span className="badge-official" style={{ width: size, height: size }}>
    <svg viewBox="0 0 10 10" fill="none">
      <path d="M2 5.5L4 7.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </span>
);

function Avatar({ profile, size = 42 }: { profile: Profile | null; size?: number }) {
  if (!profile) return <div className="av" style={{ width: size, height: size, background: "#c8bfb0", fontSize: size*0.38 }}>?</div>;
  if (isOfficial(profile.username)) return <img src={OFFICIAL_LOGO} alt="WA" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--red)", flexShrink: 0 }} />;
  if (profile.avatar_url) return <img src={profile.avatar_url} alt={profile.username} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return <div className="av" style={{ width: size, height: size, background: profile.avatar_color, fontSize: size*0.38 }}>{initial(profile.display_name || profile.username)}</div>;
}

function UAv({ username, size = 42, avatarUrl, avatarColor }: { username: string; size?: number; avatarUrl?: string; avatarColor?: string }) {
  if (isOfficial(username)) return <img src={OFFICIAL_LOGO} alt="WA" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--red)", flexShrink: 0 }} />;
  if (avatarUrl) return <img src={avatarUrl} alt={username} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return <div className="av" style={{ width: size, height: size, background: avatarColor || avatarGrad(username), fontSize: size*0.35 }}>{initial(username)}</div>;
}

/* ════════════════════════════════════════════ */
export default function Home() {
  const [assumptions, setAssumptions]           = useState<any[]>([]);
  const [comments, setComments]                 = useState<Comment[]>([]);
  const [user, setUser]                         = useState<any>(null);
  const [profile, setProfile]                   = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin]                   = useState(false);
  const [text, setText]                         = useState("");
  const [isPosting, setIsPosting]               = useState(false);
  const [modal, setModal]                       = useState<"none"|"auth"|"profile">("none");
  const [authTab, setAuthTab]                   = useState<"login"|"register">("login");
  const [email, setEmail]                       = useState("");
  const [pwd, setPwd]                           = useState("");
  const [regUsername, setRegUsername]           = useState("");
  const [regDisplayName, setRegDisplayName]     = useState("");
  const [regBio, setRegBio]                     = useState("");
  const [regColor, setRegColor]                 = useState(AVATAR_COLORS[0]);
  const [authErr, setAuthErr]                   = useState("");
  const [authLoading, setAuthLoading]           = useState(false);
  const [editBio, setEditBio]                   = useState("");
  const [editColor, setEditColor]               = useState("");
  const [editDisplayName, setEditDisplayName]   = useState("");
  const [editSaving, setEditSaving]             = useState(false);
  const [avatarFile, setAvatarFile]             = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview]       = useState<string | null>(null);
  const [regAvatarFile, setRegAvatarFile]       = useState<File | null>(null);
  const [regAvatarPreview, setRegAvatarPreview] = useState<string | null>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const regFileRef = useRef<HTMLInputElement>(null);

  /* ── fetch feed ── */
  const fetchAll = async (currentUser?: any) => {
    const uid = (currentUser ?? user)?.id ?? null;
    const [{ data: aData }, { data: cData }, { data: lData }, { data: pData }] = await Promise.all([
      supabase.from("assumptions").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("comments").select("*").order("created_at", { ascending: true }),
      supabase.from("likes").select("assumption_id,user_id"),
      supabase.from("profiles").select("username,display_name,avatar_url,avatar_color,is_verified"),
    ]);
    const profileMap: Record<string, any> = {};
    pData?.forEach(p => { profileMap[p.username.trim()] = p; });

    if (aData) {
      setAssumptions(aData.map(a => {
        const pl = lData?.filter(l => l.assumption_id === a.id) ?? [];
        const prof = profileMap[a.username?.trim()];
        return {
          ...a,
          display_name: prof?.display_name || a.username,
          avatar_url: prof?.avatar_url ?? a.avatar_url,
          avatar_color: prof?.avatar_color ?? a.avatar_color,
          is_verified: prof?.is_verified === true,
          likes: pl.length,
          alreadyLiked: uid ? pl.some((l: any) => l.user_id === uid) : false,
        };
      }));
    }
    if (cData) {
      setComments(cData.map((c: any) => {
        const prof = profileMap[c.username?.trim()];
        return {
          ...c,
          display_name: prof?.display_name || c.username,
          avatar_url: prof?.avatar_url ?? c.avatar_url,
          avatar_color: prof?.avatar_color ?? c.avatar_color,
          is_verified: prof?.is_verified === true,
        };
      }));
    }
  };

  /* ── ensure profile ── */
  const ensureProfile = async (authUser: any) => {
    // ritenta fino a 5 volte con 300ms di attesa — serve dopo la registrazione
    // dove il profilo viene inserito in modo asincrono
    for (let i = 0; i < 5; i++) {
      const { data } = await supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
      if (data) { setProfile(data); setIsAdmin(data.is_admin === true); return; }
      await new Promise(r => setTimeout(r, 300));
    }
    // nessun profilo trovato dopo i tentativi — non creare nulla di automatico
    console.warn("Profilo non trovato per", authUser.id);
  };

  /* ── auth listener ── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); ensureProfile(session.user); fetchAll(session.user); }
      else fetchAll(null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) { setUser(session.user); ensureProfile(session.user); fetchAll(session.user); }
      else { setUser(null); setProfile(null); setIsAdmin(false); fetchAll(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  /* ── upload avatar ── */
  const uploadAvatar = async (file: File, userId: string): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl + "?t=" + Date.now();
  };

  /* ── login ── */
  const handleLogin = async () => {
    setAuthLoading(true); setAuthErr("");
    if (!pwd) { setAuthErr("Inserisci la password."); setAuthLoading(false); return; }
    try {
      const { data, error } = await supabase.functions.invoke("login-with-username", {
        body: { login: email.trim(), password: pwd },
      });
      if (error || !data?.session) { setAuthErr(data?.error ?? "Credenziali errate."); setAuthLoading(false); return; }
      await supabase.auth.setSession(data.session);
      setModal("none"); setEmail(""); setPwd("");
    } catch { setAuthErr("Errore di rete."); }
    setAuthLoading(false);
  };

  /* ── register ── */
  const handleRegister = async () => {
    if (!regUsername.trim()) { setAuthErr("Scegli un username."); return; }
    if (!pwd) { setAuthErr("Scegli una password."); return; }
    setAuthLoading(true); setAuthErr("");
    const { data: existing } = await supabase.from("profiles").select("id").eq("username", regUsername.trim()).maybeSingle();
    if (existing) { setAuthErr("Username già in uso."); setAuthLoading(false); return; }
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: pwd });
    if (error) { setAuthErr(error.message); setAuthLoading(false); return; }
    if (data.user) {
      // 1. carica avatar prima di tutto
      let avatarUrl: string | null = null;
      if (regAvatarFile) avatarUrl = await uploadAvatar(regAvatarFile, data.user.id);

      // 2. salva profilo con upsert — PRIMA che onAuthStateChange scatti
      const { error: profileError } = await supabase.from("profiles").upsert([{
        id: data.user.id,
        username: regUsername.trim(),
        display_name: regDisplayName.trim() || regUsername.trim(),
        bio: regBio.trim(),
        avatar_color: regColor,
        avatar_url: avatarUrl,
        email: email.trim(),
      }], { onConflict: "id" });

      if (profileError) {
        console.error("Errore salvataggio profilo:", profileError);
        setAuthErr("Errore nel salvataggio del profilo.");
        setAuthLoading(false);
        return;
      }

      // 3. ora imposta la sessione — ensureProfile troverà già il profilo corretto
      if (data.session) {
        await supabase.auth.setSession(data.session);
        setModal("none"); setEmail(""); setPwd("");
        setRegUsername(""); setRegDisplayName(""); setRegBio("");
        setRegAvatarFile(null); setRegAvatarPreview(null);
      } else {
        setAuthErr("Controlla la tua email per confermare l'account, poi accedi.");
      }
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  /* ── delete account ── */
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleteLoading(true);
    try {
      // 1. cancella tutti i dati dal db
      await Promise.all([
        supabase.from("likes").delete().eq("user_id", user.id),
        supabase.from("comments").delete().eq("username", profile?.username ?? ""),
        supabase.from("assumptions").delete().eq("username", profile?.username ?? ""),
        supabase.from("profiles").delete().eq("id", user.id),
      ]);

      // 2. cancella avatar storage
      if (profile?.avatar_url) {
        const ext = profile.avatar_url.split(".").pop()?.split("?")[0] ?? "jpg";
        await supabase.storage.from("avatars").remove([`${user.id}/avatar.${ext}`]);
      }

      // 3. cancella utente auth — funziona se hai abilitato "Allow users to delete their own account"
      const { error } = await supabase.rpc("delete_user");
      if (error) console.error("Errore cancellazione auth:", error);

      await supabase.auth.signOut();
      setModal("none");
    } catch (e) {
      console.error("Errore cancellazione account:", e);
    }
    setDeleteLoading(false);
  };

  /* ── save profile ── */
  const saveProfile = async () => {
    if (!user || !profile) return;
    setEditSaving(true);
    let avatarUrl = profile.avatar_url ?? null;
    if (avatarFile) avatarUrl = await uploadAvatar(avatarFile, user.id);
    await supabase.from("profiles").update({
      bio: editBio, avatar_color: editColor, avatar_url: avatarUrl, display_name: editDisplayName,
    }).eq("id", user.id);
    await ensureProfile(user);
    setModal("none"); setEditSaving(false); setAvatarFile(null); setAvatarPreview(null);
  };

  /* ── feed actions ── */
  const addAssumption = async () => {
    if (!text.trim()) return;
    setIsPosting(true);
    const poster = profile ? (isOfficial(profile.username) ? OFFICIAL_USERNAME : profile.username) : "anonimo";
    const dname  = profile ? displayFor(profile.username, profile.display_name) : "Anonimo";
    const { error } = await supabase.from("assumptions").insert([{
      text, username: poster, display_name: dname,
      avatar_color: profile?.avatar_color ?? null,
      avatar_url: profile?.avatar_url ?? null,
    }]);
    console.log("insert assumption error:", error);
    setText(""); await fetchAll(user); setIsPosting(false);
  };

  const likePost = async (id: string, alreadyLiked: boolean) => {
    if (!user) return;
    if (alreadyLiked) await supabase.from("likes").delete().eq("assumption_id", id).eq("user_id", user.id);
    else await supabase.from("likes").insert([{ assumption_id: id, user_id: user.id }]);
    fetchAll(user);
  };

  const deletePost = async (id: string) => {
    await Promise.all([
      supabase.from("likes").delete().eq("assumption_id", id),
      supabase.from("comments").delete().eq("assumption_id", id),
      supabase.from("assumptions").delete().eq("id", id),
    ]);
    fetchAll(user);
  };

  const pinPost = async (id: string, pinned: boolean) => {
    await supabase.from("assumptions").update({ pinned: !pinned }).eq("id", id);
    fetchAll(user);
  };

  const deleteComment = async (id: string) => {
    await supabase.from("comments").delete().eq("id", id);
    fetchAll(user);
  };

  const addComment = async (aid: string, t: string, parentId: string | null = null) => {
    if (!t.trim()) return;
    const poster = profile ? (isOfficial(profile.username) ? OFFICIAL_USERNAME : profile.username) : "anonimo";
    const dname  = profile ? displayFor(profile.username, profile.display_name) : "Anonimo";
    await supabase.from("comments").insert([{
      text: t, username: poster, display_name: dname, assumption_id: aid, parent_id: parentId,
      avatar_color: profile?.avatar_color ?? null,
      avatar_url: profile?.avatar_url ?? null,
    }]);
    fetchAll(user);
  };

  const openAuth = (tab: "login"|"register" = "login") => {
    setAuthTab(tab); setAuthErr(""); setPwd(""); setModal("auth");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        :root {
          --bg:#f5f0e8; --bg2:#ede8df; --surface:#fdfaf5;
          --border:#d8d0c2; --border2:#e8e0d4;
          --text:#1a1510; --muted:#8a7f72; --muted2:#b0a898;
          --red:#b83232; --red-h:#9c2020; --red-pale:#f5ebe8; --red-ring:rgba(184,50,50,0.12);
        }
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;}
        .wrap{min-height:100vh;max-width:600px;margin:0 auto;background:var(--surface);border-left:1px solid var(--border);border-right:1px solid var(--border);}
        .x-header{position:sticky;top:0;z-index:50;background:rgba(253,250,245,0.92);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);padding:0 20px;height:56px;display:flex;align-items:center;gap:14px;}
        .header-logo{cursor:pointer;border-radius:8px;object-fit:cover;user-select:none;border:1.5px solid var(--border);flex-shrink:0;transition:opacity 0.15s,border-color 0.15s;}
        .header-logo:hover{opacity:0.75;border-color:var(--red);}
        .header-title{font-family:'Playfair Display',serif;font-weight:700;font-size:18px;line-height:1.1;letter-spacing:-0.01em;}
        .header-sub{font-size:12px;color:var(--muted);margin-top:1px;}
        .admin-pill{background:var(--red-pale);border:1px solid rgba(184,50,50,0.3);border-radius:999px;color:var(--red);font-size:10px;font-weight:600;letter-spacing:0.1em;padding:3px 10px;text-transform:uppercase;}
        .user-btn{display:flex;align-items:center;gap:8px;background:none;border:1px solid var(--border);border-radius:999px;cursor:pointer;padding:5px 12px 5px 6px;transition:border-color 0.15s,background 0.15s;font-family:inherit;}
        .user-btn:hover{border-color:var(--red);background:var(--red-pale);}
        .login-btn{background:var(--red);border:none;border-radius:999px;color:#fff;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;padding:7px 16px;transition:background 0.15s;white-space:nowrap;}
        .login-btn:hover{background:var(--red-h);}
        .av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;flex-shrink:0;}
        .compose{display:flex;gap:14px;padding:16px 20px 0;border-bottom:6px solid var(--bg2);background:var(--surface);}
        .compose-col{flex:1;min-width:0;}
        .compose-who{display:flex;align-items:center;gap:5px;padding:4px 0 10px;border-bottom:1px solid var(--border2);margin-bottom:10px;font-size:14px;font-weight:600;color:var(--text);}
        .compose-anon{font-size:13px;color:var(--muted);font-style:italic;padding:4px 0 10px;border-bottom:1px solid var(--border2);margin-bottom:10px;}
        .compose-ta{width:100%;background:transparent;border:none;outline:none;color:var(--text);font-size:19px;font-family:'DM Sans',sans-serif;font-weight:300;line-height:1.5;resize:none;min-height:72px;padding-bottom:12px;}
        .compose-ta::placeholder{color:var(--muted2);font-style:italic;}
        .compose-footer{display:flex;align-items:center;justify-content:space-between;padding:10px 0 14px;border-top:1px solid var(--border2);}
        .cring{position:relative;display:flex;align-items:center;justify-content:center;}
        .cring-n{position:absolute;font-size:11px;font-weight:600;pointer-events:none;}
        .btn-post{background:var(--red);border:none;border-radius:999px;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;padding:9px 22px;transition:background 0.15s,transform 0.1s;}
        .btn-post:hover:not(:disabled){background:var(--red-h);}
        .btn-post:active:not(:disabled){transform:scale(0.97);}
        .btn-post:disabled{opacity:0.35;cursor:not-allowed;}
        .tweet-row{display:flex;gap:14px;padding:16px 20px 0;border-bottom:1px solid var(--border2);cursor:pointer;transition:background 0.12s;background:var(--surface);}
        .tweet-row:hover{background:#faf5ee;}
        .tweet-col{flex:1;min-width:0;padding-bottom:14px;}
        .tweet-meta{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:4px;}
        .tw-name{font-weight:600;font-size:14px;color:var(--text);}
        .tw-handle{font-size:13px;color:var(--muted);}
        .tw-dot{color:var(--muted2);}
        .tw-time{font-size:13px;color:var(--muted);}
        .tweet-body{font-size:16px;line-height:1.6;color:var(--text);white-space:pre-wrap;word-break:break-word;margin-bottom:14px;}
        .badge-official{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:var(--red);flex-shrink:0;}
        .badge-official svg{width:60%;height:60%;}
        .abar{display:flex;align-items:center;gap:2px;margin:0 -8px;}
        .act{display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;padding:7px 9px;border-radius:999px;font-size:13px;font-family:'DM Sans',sans-serif;font-weight:500;color:var(--muted);transition:color 0.15s,background 0.15s;min-width:42px;user-select:none;}
        .act svg{width:17px;height:17px;flex-shrink:0;transition:transform 0.15s;}
        .act.cmt:hover{color:#4a7aaa;background:rgba(74,122,170,0.1);}
        .act.cmt:hover svg{transform:scale(1.1);}
        .act.lk:hover{color:var(--red);background:var(--red-ring);}
        .act.lk:hover svg{transform:scale(1.15);}
        .act.lk.on{color:var(--red);}
        .act.lk.on svg{fill:var(--red);stroke:var(--red);}
        .act.del:hover{color:var(--red);background:var(--red-ring);}
        .act.pin:hover{color:#8a6a3a;background:rgba(138,106,58,0.1);}
        .act.pin.on{color:#8a6a3a;}
        .act.pin.on svg{fill:#8a6a3a;stroke:#8a6a3a;}
        .pin-banner{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:#8a6a3a;letter-spacing:0.04em;text-transform:uppercase;padding:6px 20px 0;background:var(--surface);}
        .thread-line{width:2px;flex:1;min-height:14px;background:var(--border);margin:6px auto 0;border-radius:1px;}
        .comments-area{border-bottom:1px solid var(--border2);background:var(--bg2);}
        .comment-root{border-bottom:1px solid var(--border2);}
        .comment-root:last-of-type{border-bottom:none;}
        .comment-item{display:flex;gap:10px;padding:12px 20px;transition:background 0.12s;}
        .comment-item:hover{background:rgba(245,240,232,0.7);}
        .comment-children{padding-left:20px;border-left:2px solid var(--border2);margin-left:36px;}
        .c-name{font-weight:600;font-size:13px;color:var(--text);}
        .c-time{font-size:12px;color:var(--muted);}
        .c-body{font-size:14px;color:var(--text);line-height:1.55;margin-top:2px;}
        .c-reply-btn{background:none;border:none;cursor:pointer;font-size:12px;font-weight:600;color:var(--muted);font-family:inherit;padding:3px 0;margin-top:4px;transition:color 0.15s;}
        .c-reply-btn:hover{color:var(--red);}
        .reply-box{display:flex;flex-direction:column;gap:8px;padding:12px 20px 14px;border-top:1px solid var(--border2);background:var(--surface);}
        .reply-col{flex:1;display:flex;flex-direction:column;gap:5px;min-width:0;}
        .reply-inp{background:transparent;border:none;outline:none;color:var(--text);font-family:'DM Sans',sans-serif;font-size:15px;width:100%;}
        .reply-inp::placeholder{color:var(--muted2);font-style:italic;}
        .reply-send{background:var(--red);border:none;border-radius:999px;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;padding:7px 18px;white-space:nowrap;flex-shrink:0;transition:background 0.15s;}
        .reply-send:hover{background:var(--red-h);}
        .empty{padding:72px 20px;text-align:center;color:var(--muted);}
        .empty-icon{font-size:40px;margin-bottom:14px;}
        .empty-title{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:var(--text);margin-bottom:6px;}
        .overlay{position:fixed;inset:0;z-index:200;background:rgba(26,21,16,0.5);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;}
        .modal{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:28px;width:100%;max-width:380px;box-shadow:0 24px 64px rgba(0,0,0,0.15);max-height:90vh;overflow-y:auto;}
        .modal-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:var(--text);margin-bottom:4px;}
        .tabs{display:flex;border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:20px;}
        .tab{flex:1;background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;padding:9px;color:var(--muted);transition:background 0.15s,color 0.15s;}
        .tab.on{background:var(--red);color:#fff;font-weight:600;}
        .f-inp{background:var(--bg);border:1px solid var(--border);border-radius:10px;outline:none;padding:11px 14px;font-size:14px;color:var(--text);font-family:'DM Sans',sans-serif;width:100%;transition:border-color 0.2s;}
        .f-inp:focus{border-color:var(--red);}
        .f-inp::placeholder{color:var(--muted2);}
        .f-label{font-size:12px;font-weight:600;color:var(--muted);margin-bottom:4px;letter-spacing:0.04em;text-transform:uppercase;}
        .color-row{display:flex;gap:8px;flex-wrap:wrap;}
        .color-dot{width:28px;height:28px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:transform 0.15s,border-color 0.15s;}
        .color-dot.sel{border-color:var(--text);transform:scale(1.15);}
        .auth-err{font-size:13px;color:var(--red);font-weight:500;text-align:center;padding:4px 0;}
        .modal-link{background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;font-family:inherit;text-align:center;padding:6px 0;text-decoration:underline;width:100%;display:block;}
        .modal-link:hover{color:var(--text);}
        .av-upload{position:relative;cursor:pointer;display:inline-block;}
        .av-upload-overlay{position:absolute;inset:0;border-radius:50%;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.15s;}
        .av-upload:hover .av-upload-overlay{opacity:1;}
        .av-upload-overlay svg{width:18px;height:18px;color:#fff;}
      `}</style>

      <div className="wrap">
        {/* HEADER */}
        <div className="x-header">
          <img src="/logo.jpeg" alt="logo" className="header-logo" width={36} height={36} />
          <div style={{ flex: 1 }}>
            <div className="header-title">Weird Assumptions</div>
            <div className="header-sub">{assumptions.length} post pubblicati</div>
          </div>
          {isAdmin && <span className="admin-pill">Admin</span>}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {user && profile ? (
              <>
                <button className="user-btn" onClick={() => {
                  setEditBio(profile.bio); setEditColor(profile.avatar_color);
                  setEditDisplayName(profile.display_name || profile.username);
                  setAvatarPreview(null); setModal("profile");
                }}>
                  <Avatar profile={profile} size={26} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    {isOfficial(profile.username) ? OFFICIAL_HANDLE : profile.username}
                  </span>
                </button>
                <button className="act del" style={{ minWidth: "unset", padding: "6px 8px" }} onClick={handleLogout} title="Logout">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </button>
              </>
            ) : (
              <button className="login-btn" onClick={() => openAuth("login")}>Accedi</button>
            )}
          </div>
        </div>

        {/* COMPOSE */}
        <div className="compose">
          <Avatar profile={profile} size={42} />
          <div className="compose-col">
            {profile ? (
              <div className="compose-who">
                {displayFor(profile.username, profile.display_name)}
                <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 13 }}>@{handleFor(profile.username)}</span>
                {profile.is_verified && <Badge />}
              </div>
            ) : (
              <div className="compose-anon">
                Stai postando come <strong>Anonimo</strong> —{" "}
                <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontWeight: 600, fontSize: 13, fontFamily: "inherit", padding: 0 }}
                  onClick={() => openAuth("login")}>accedi per usare il tuo profilo</button>
              </div>
            )}
            <textarea className="compose-ta"
              placeholder={isOfficial(profile?.username ?? "") ? "Scrivi un post ufficiale…" : "Scrivi la tua weird assumption…"}
              value={text} onChange={e => setText(e.target.value.slice(0, 280))} rows={3} />
            <div className="compose-footer">
              <CharRing count={text.length} max={280} />
              <button className="btn-post" onClick={addAssumption} disabled={!text.trim() || isPosting}>
                {isPosting ? "Posting…" : "Posta"}
              </button>
            </div>
          </div>
        </div>

        {/* FEED */}
        {assumptions.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">👀</div>
            <div className="empty-title">Nessuna assumption ancora</div>
            <div>Sii il primo a rompere il ghiaccio.</div>
          </div>
        ) : assumptions.map(a => (
          <TweetCard key={a.id} a={a}
            comments={comments.filter(c => c.assumption_id === a.id)}
            isAdmin={isAdmin} profile={profile}
            onLike={likePost} onDelete={deletePost} onPin={pinPost}
            onDeleteComment={deleteComment} onAddComment={addComment} />
        ))}
      </div>

      {/* AUTH MODAL */}
      {modal === "auth" && (
        <div className="overlay" onClick={() => setModal("none")}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <img src={OFFICIAL_LOGO} alt="WA" style={{ width: 38, height: 38, borderRadius: 9, objectFit: "cover", border: "1.5px solid var(--red)" }} />
              <div>
                <div className="modal-title">Weird Assumptions</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Entra nella community</div>
              </div>
            </div>
            <div className="tabs">
              <button className={`tab${authTab === "login" ? " on" : ""}`} onClick={() => { setAuthTab("login"); setAuthErr(""); }}>Accedi</button>
              <button className={`tab${authTab === "register" ? " on" : ""}`} onClick={() => { setAuthTab("register"); setAuthErr(""); }}>Registrati</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {authTab === "register" && (
                <>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
                    <div className="av-upload" onClick={() => regFileRef.current?.click()}>
                      {regAvatarPreview
                        ? <img src={regAvatarPreview} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }} />
                        : <div className="av" style={{ width: 64, height: 64, background: regColor, fontSize: 24 }}>{regUsername ? initial(regUsername) : "?"}</div>}
                      <div className="av-upload-overlay">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      </div>
                    </div>
                    <input ref={regFileRef} type="file" accept="image/*" style={{ display: "none" }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) { setRegAvatarFile(f); setRegAvatarPreview(URL.createObjectURL(f)); }}} />
                  </div>
                  <div>
                    <div className="f-label">Username</div>
                    <input className="f-inp" placeholder="il tuo @handle pubblico" value={regUsername} onChange={e => setRegUsername(e.target.value)} />
                  </div>
                  <div>
                    <div className="f-label">Nome visualizzato <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(opzionale)</span></div>
                    <input className="f-inp" placeholder={regUsername ? regUsername : "Come vuoi apparire…"} value={regDisplayName} onChange={e => setRegDisplayName(e.target.value)} />
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Se vuoto, verrà usato l'username</div>
                  </div>
                  <div>
                    <div className="f-label">Bio <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(opzionale)</span></div>
                    <input className="f-inp" placeholder="Descriviti in una riga…" value={regBio} onChange={e => setRegBio(e.target.value)} />
                  </div>
                  {!regAvatarPreview && (
                    <div>
                      <div className="f-label" style={{ marginBottom: 8 }}>Colore avatar</div>
                      <div className="color-row">
                        {AVATAR_COLORS.map(c => (
                          <div key={c} className={`color-dot${regColor === c ? " sel" : ""}`} style={{ background: c }} onClick={() => setRegColor(c)} />
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ borderTop: "1px solid var(--border2)" }} />
                </>
              )}
              <div>
                <div className="f-label">{authTab === "login" ? "Email o username" : "Email"}</div>
                <input className="f-inp"
                  placeholder={authTab === "login" ? "email@esempio.com oppure username" : "email@esempio.com"}
                  value={email} onChange={e => { setEmail(e.target.value); setAuthErr(""); }}
                  onKeyDown={e => e.key === "Enter" && (authTab === "login" ? handleLogin() : handleRegister())} />
              </div>
              <div>
                <div className="f-label">Password</div>
                <input className="f-inp" placeholder="••••••••" type="password"
                  value={pwd} onChange={e => setPwd(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (authTab === "login" ? handleLogin() : handleRegister())} />
              </div>
              {authErr && <div className="auth-err">{authErr}</div>}
              <button className="btn-post" style={{ marginTop: 4 }}
                onClick={authTab === "login" ? handleLogin : handleRegister}
                disabled={!email || !pwd || authLoading || (authTab === "register" && !regUsername)}>
                {authLoading ? "Caricamento…" : authTab === "login" ? "Accedi" : "Crea account"}
              </button>
              <button className="modal-link" onClick={() => setModal("none")}>Annulla</button>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {modal === "profile" && profile && (
        <div className="overlay" onClick={() => setModal("none")}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div className="av-upload"
                onClick={() => !isOfficial(profile.username) && fileRef.current?.click()}
                style={{ cursor: isOfficial(profile.username) ? "default" : "pointer" }}>
                {avatarPreview
                  ? <img src={avatarPreview} style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover" }} />
                  : <Avatar profile={{ ...profile, avatar_color: editColor }} size={52} />}
                {!isOfficial(profile.username) && (
                  <div className="av-upload-overlay">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }}} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                  {editDisplayName || profile.username}
                  {profile.is_verified && <Badge size={14} />}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>@{handleFor(profile.username)}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div className="f-label">Nome visualizzato</div>
                <input className="f-inp" placeholder="Come vuoi apparire…" value={editDisplayName} onChange={e => setEditDisplayName(e.target.value)} />
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>@{profile.username} — username non modificabile</div>
              </div>
              <div>
                <div className="f-label">Bio</div>
                <input className="f-inp" placeholder="Descriviti in una riga…" value={editBio} onChange={e => setEditBio(e.target.value)} />
              </div>
              {!isOfficial(profile.username) && !avatarPreview && (
                <div>
                  <div className="f-label" style={{ marginBottom: 8 }}>Colore avatar <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(se non carichi foto)</span></div>
                  <div className="color-row">
                    {AVATAR_COLORS.map(c => (
                      <div key={c} className={`color-dot${editColor === c ? " sel" : ""}`} style={{ background: c }} onClick={() => setEditColor(c)} />
                    ))}
                  </div>
                </div>
              )}
              <button className="btn-post" style={{ marginTop: 4 }} onClick={saveProfile} disabled={editSaving}>
                {editSaving ? "Salvataggio…" : "Salva profilo"}
              </button>

              {/* ── elimina account ── */}
              <div style={{ borderTop: "1px solid var(--border2)", marginTop: 8, paddingTop: 16 }}>
                {!deleteConfirm ? (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 13, fontFamily: "inherit", width: "100%", textAlign: "center", padding: "4px 0", transition: "color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--red)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}>
                    Elimina account
                  </button>
                ) : (
                  <div style={{ background: "var(--red-pale)", border: "1px solid rgba(184,50,50,0.25)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--red)", textAlign: "center" }}>
                      Sei sicuro? Questa azione è irreversibile.
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", lineHeight: 1.5 }}>
                      Verranno eliminati il tuo profilo, tutti i tuoi post, commenti e likes.
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setDeleteConfirm(false)}
                        style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: "8px 0", color: "var(--muted)", transition: "border-color 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--text)")}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                        Annulla
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteLoading}
                        style={{ flex: 1, background: "var(--red)", border: "none", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: "8px 0", color: "#fff", opacity: deleteLoading ? 0.6 : 1, transition: "background 0.15s" }}
                        onMouseEnter={e => { if (!deleteLoading) (e.currentTarget as HTMLButtonElement).style.background = "var(--red-h)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--red)"; }}>
                        {deleteLoading ? "Eliminando…" : "Sì, elimina"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button className="modal-link" onClick={() => setModal("none")}>Annulla</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Char ring ─── */
function CharRing({ count, max }: { count: number; max: number }) {
  const r = 11, circ = 2 * Math.PI * r, left = max - count;
  const color = left < 20 ? "#b83232" : left < 60 ? "#c4823a" : "#b0a898";
  return (
    <div className="cring">
      <svg width="30" height="30" viewBox="0 0 30 30">
        <circle cx="15" cy="15" r={r} fill="none" stroke="#d8d0c2" strokeWidth="2.5" />
        <circle cx="15" cy="15" r={r} fill="none" stroke={color} strokeWidth="2.5"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - count / max)}
          strokeLinecap="round" transform="rotate(-90 15 15)"
          style={{ transition: "stroke-dashoffset 0.2s,stroke 0.2s" }} />
      </svg>
      {left <= 20 && <span className="cring-n" style={{ color }}>{left}</span>}
    </div>
  );
}

/* ─── Tweet card ─── */
function TweetCard({ a, comments, isAdmin, profile, onLike, onDelete, onPin, onDeleteComment, onAddComment }: any) {
  const [open, setOpen] = useState(false);
  const roots = comments.filter((c: Comment) => !c.parent_id);
  return (
    <div>
      {a.pinned && (
        <div className="pin-banner">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="#8a6a3a" stroke="none"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
          Post in evidenza
        </div>
      )}
      <div className="tweet-row" onClick={() => setOpen(o => !o)}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {a.username !== "anonimo" ? (
            <a href={`/${a.username}`} onClick={e => e.stopPropagation()}>
              <UAv username={a.username} size={42} avatarUrl={a.avatar_url} avatarColor={a.avatar_color} />
            </a>
          ) : (
            <UAv username={a.username} size={42} avatarUrl={a.avatar_url} avatarColor={a.avatar_color} />
          )}
          {open && comments.length > 0 && <div className="thread-line" />}
        </div>
        <div className="tweet-col" onClick={e => e.stopPropagation()}>
          <div className="tweet-meta">
            {a.username !== "anonimo" ? (
              <a href={`/${a.username}`} style={{ fontWeight:600, fontSize:14, color:"var(--text)", textDecoration:"none" }}
                onClick={e => e.stopPropagation()}
                onMouseEnter={e => (e.currentTarget.style.textDecoration="underline")}
                onMouseLeave={e => (e.currentTarget.style.textDecoration="none")}>
                {displayFor(a.username, a.display_name)}
              </a>
            ) : (
              <span style={{ fontWeight:600, fontSize:14, color:"var(--text)" }}>{displayFor(a.username, a.display_name)}</span>
            )}
            {a.is_verified && <Badge size={15} />}
            <span className="tw-handle">@{handleFor(a.username)}</span>
            <span className="tw-dot">·</span>
            <span className="tw-time">{fmt(a.created_at)}</span>
          </div>
          <div className="tweet-body">{a.text}</div>
          <div className="abar">
            <button className="act cmt" onClick={() => setOpen(o => !o)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              {comments.length > 0 && <span>{comments.length}</span>}
            </button>
            <button className={`act lk${a.alreadyLiked ? " on" : ""}`} onClick={() => onLike(a.id, a.alreadyLiked)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {a.likes > 0 && <span>{a.likes}</span>}
            </button>
            {isAdmin && (
              <>
                <button className={`act pin${a.pinned ? " on" : ""}`} onClick={() => onPin(a.id, a.pinned)} title={a.pinned ? "Rimuovi pin" : "Pinna"}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
                </button>
                <button className="act del" onClick={() => onDelete(a.id)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {open && (
        <div className="comments-area">
          {roots.map((c: Comment) => (
            <CommentNode key={c.id} comment={c} allComments={comments}
              isAdmin={isAdmin} profile={profile} assumptionId={a.id}
              onDelete={onDeleteComment} onAdd={onAddComment} depth={0} />
          ))}
          <ReplyBox assumptionId={a.id} addComment={onAddComment}
            targetUsername={displayFor(a.username, a.display_name)}
            profile={profile} parentId={null} />
        </div>
      )}
    </div>
  );
}

/* ─── Comment node ─── */
function CommentNode({ comment: c, allComments, isAdmin, profile, assumptionId, onDelete, onAdd, depth }: {
  comment: Comment; allComments: Comment[]; isAdmin: boolean; profile: Profile | null;
  assumptionId: string; onDelete: (id: string) => void;
  onAdd: (aid: string, t: string, parentId: string | null) => void; depth: number;
}) {
  const [replying, setReplying] = useState(false);
  const children = allComments.filter(x => x.parent_id === c.id);
  return (
    <div className="comment-root">
      <div className="comment-item">
        {c.username !== "anonimo" ? (
          <a href={`/${c.username}`}>
            <UAv username={c.username} size={32} avatarUrl={c.avatar_url} avatarColor={c.avatar_color} />
          </a>
        ) : (
          <UAv username={c.username} size={32} avatarUrl={c.avatar_url} avatarColor={c.avatar_color} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {c.username !== "anonimo" ? (
              <a href={`/${c.username}`} style={{ fontWeight:600, fontSize:13, color:"var(--text)", textDecoration:"none" }}
                onMouseEnter={e => (e.currentTarget.style.textDecoration="underline")}
                onMouseLeave={e => (e.currentTarget.style.textDecoration="none")}>
                {displayFor(c.username, c.display_name)}
              </a>
            ) : (
              <span style={{ fontWeight:600, fontSize:13, color:"var(--text)" }}>{displayFor(c.username, c.display_name)}</span>
            )}
            {c.is_verified && <Badge size={13} />}
            <span className="c-time">· {fmt(c.created_at)}</span>
          </div>
          <div className="c-body">{c.text}</div>
          <button className="c-reply-btn" onClick={() => setReplying(r => !r)}>
            {replying ? "Annulla" : "↩ Rispondi"}
          </button>
        </div>
        {isAdmin && (
          <button className="act del" style={{ alignSelf: "flex-start", padding: "2px 6px", minWidth: "unset" }} onClick={() => onDelete(c.id)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
      </div>
      {replying && (
        <div style={{ paddingLeft: depth < 3 ? 52 : 20, background: "rgba(245,240,232,0.5)", borderTop: "1px solid var(--border2)" }}>
          <ReplyBox assumptionId={assumptionId}
            addComment={(aid, t, pid) => { onAdd(aid, t, pid); setReplying(false); }}
            targetUsername={displayFor(c.username, c.display_name)}
            profile={profile} parentId={c.id} />
        </div>
      )}
      {children.length > 0 && (
        <div className="comment-children" style={{ marginLeft: depth < 3 ? 36 : 12 }}>
          {children.map(child => (
            <CommentNode key={child.id} comment={child} allComments={allComments}
              isAdmin={isAdmin} profile={profile} assumptionId={assumptionId}
              onDelete={onDelete} onAdd={onAdd} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Reply box ─── */
function ReplyBox({ assumptionId, addComment, targetUsername, profile, parentId }: {
  assumptionId: string; addComment: (aid: string, t: string, pid: string | null) => void;
  targetUsername: string; profile: Profile | null; parentId: string | null;
}) {
  const [t, setT] = useState("");
  const submit = () => { if (!t.trim()) return; addComment(assumptionId, t, parentId); setT(""); };
  return (
    <div className="reply-box">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar profile={profile} size={34} />
        <div className="reply-col">
          <div style={{ fontSize: 13, fontWeight: 600, color: profile ? "var(--text)" : "var(--muted)", fontStyle: profile ? "normal" : "italic", paddingBottom: 3, display: "flex", alignItems: "center", gap: 5 }}>
            {profile ? displayFor(profile.username, profile.display_name) : "Anonimo"}
            {profile?.is_verified && <Badge size={12} />}
          </div>
          <input className="reply-inp" placeholder={`Rispondi a ${targetUsername}…`} value={t}
            onChange={e => setT(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        <button className="reply-send" onClick={submit}>Rispondi</button>
      </div>
    </div>
  );
}