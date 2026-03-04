"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { TweetCard, Avatar, UAv, Badge, displayFor, handleFor, fmt, isOfficial, useTick, OFFICIAL_LOGO, OFFICIAL_USERNAME, AVATAR_COLORS, avatarGrad, initial, type Profile, type Comment } from "./components/tweet-card";

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

  /* ── mobile menu ── */
  const [menuOpen, setMenuOpen] = useState(false);

  /* ── dark mode ── */
  const [dark, setDark] = useState(false);
  const [darkReady, setDarkReady] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme") === "dark";
    setDark(saved);
    setDarkReady(true);
  }, []);
  useEffect(() => {
    if (!darkReady) return;
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark, darkReady]);

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

  const editPost = async (id: string, newText: string) => {
    await supabase.from("assumptions").update({ text: newText, edited: true }).eq("id", id);
    fetchAll(user);
  };

  const editComment = async (id: string, newText: string) => {
    await supabase.from("comments").update({ text: newText, edited: true }).eq("id", id);
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
        [data-theme="dark"] {
          --bg:#0f0d0b; --bg2:#1a1510; --surface:#141210;
          --border:#2e2820; --border2:#241f18;
          --text:#f0e8dc; --muted:#7a7060; --muted2:#4a4438;
          --red:#c84040; --red-h:#b83232; --red-pale:#1e1210; --red-ring:rgba(200,64,64,0.15);
        }
        [data-theme="dark"] .x-header{background:rgba(20,18,16,0.92);}
        [data-theme="dark"] .sidebar{background:var(--bg);}
        [data-theme="dark"] .right-col{background:var(--bg);}
        [data-theme="dark"] .tweet-row:hover{background:#1a1510;}
        [data-theme="dark"] .comment-item:hover{background:rgba(30,25,20,0.7);}
        [data-theme="dark"] .modal{background:#1a1510;}
        [data-theme="dark"] .f-inp{background:#0f0d0b;}
        [data-theme="dark"] .overlay{background:rgba(0,0,0,0.7);}
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;}
        /* ── layout desktop ── */
        .page-layout{display:grid;grid-template-columns:240px minmax(0,600px) 1fr;min-height:100vh;max-width:1200px;margin:0 auto;}
        .sidebar{position:sticky;top:0;height:100vh;overflow-y:auto;padding:20px 16px;display:flex;flex-direction:column;gap:2px;border-right:1px solid var(--border);}
        .sidebar-logo{display:flex;align-items:center;gap:10px;padding:8px 10px;margin-bottom:20px;cursor:pointer;border-radius:12px;transition:background 0.15s;text-decoration:none;}
        .sidebar-logo:hover{background:var(--bg2);}
        .sidebar-logo img{border-radius:8px;border:1.5px solid var(--border);flex-shrink:0;}
        .sidebar-logo-text{font-family:'Playfair Display',serif;font-weight:700;font-size:15px;line-height:1.2;color:var(--text);}
        .nav-item{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;cursor:pointer;font-size:15px;font-weight:500;color:var(--text);text-decoration:none;transition:background 0.15s;border:none;background:none;font-family:inherit;width:100%;}
        .nav-item:hover{background:var(--bg2);}
        .nav-item svg{width:22px;height:22px;flex-shrink:0;}
        .nav-item.active{font-weight:700;}
        .sidebar-bottom{margin-top:auto;display:flex;flex-direction:column;gap:4px;padding-top:12px;border-top:1px solid var(--border2);}
        .sidebar-user{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;cursor:pointer;transition:background 0.15s;text-decoration:none;}
        .sidebar-user:hover{background:var(--bg2);}
        .sidebar-user-info{flex:1;min-width:0;}
        .sidebar-user-name{font-size:14px;font-weight:600;color:var(--text);}
        .sidebar-user-handle{font-size:12px;color:var(--muted);}
        .right-col{padding:20px 20px;}
        .right-widget{background:var(--bg2);border-radius:16px;padding:16px;margin-bottom:16px;}
        .right-widget-title{font-family:'Playfair Display',serif;font-weight:700;font-size:15px;margin-bottom:10px;color:var(--text);}

        /* ── feed wrap ── */
        .wrap{min-height:100vh;background:var(--surface);border-left:1px solid var(--border);border-right:1px solid var(--border);}

        /* ── mobile header ── */
        .x-header{position:sticky;top:0;z-index:50;background:rgba(253,250,245,0.92);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);padding:0 16px;height:52px;display:flex;align-items:center;gap:12px;}
        .header-logo{cursor:pointer;border-radius:8px;object-fit:cover;user-select:none;border:1.5px solid var(--border);flex-shrink:0;transition:opacity 0.15s,border-color 0.15s;}
        .header-logo:hover{opacity:0.75;border-color:var(--red);}
        .header-title{font-family:'Playfair Display',serif;font-weight:700;font-size:17px;line-height:1.1;letter-spacing:-0.01em;}
        .header-sub{font-size:11px;color:var(--muted);margin-top:1px;}
        .admin-pill{background:var(--red-pale);border:1px solid rgba(184,50,50,0.3);border-radius:999px;color:var(--red);font-size:10px;font-weight:600;letter-spacing:0.1em;padding:3px 10px;text-transform:uppercase;}
        .user-btn{display:flex;align-items:center;gap:8px;background:none;border:1px solid var(--border);border-radius:999px;cursor:pointer;padding:5px 12px 5px 6px;transition:border-color 0.15s,background 0.15s;font-family:inherit;}
        .user-btn:hover{border-color:var(--red);background:var(--red-pale);}
        .login-btn{background:var(--red);border:none;border-radius:999px;color:#fff;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;padding:7px 16px;transition:background 0.15s;white-space:nowrap;}
        .login-btn:hover{background:var(--red-h);}

        /* ── mobile menu dropdown ── */
        .mob-menu{position:absolute;top:56px;right:12px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:8px;min-width:200px;box-shadow:0 8px 32px rgba(0,0,0,0.12);z-index:100;display:flex;flex-direction:column;gap:2px;}
        .mob-menu-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:500;color:var(--text);border:none;background:none;font-family:inherit;width:100%;text-align:left;text-decoration:none;transition:background 0.15s;}
        .mob-menu-item:hover{background:var(--bg2);}
        .mob-menu-item.danger{color:var(--red);}
        .mob-menu-item svg{width:18px;height:18px;flex-shrink:0;}
        [data-theme="dark"] .mob-menu{background:var(--surface);}

        /* ── responsive ── */
        @media(max-width:900px){.page-layout{grid-template-columns:1fr;}.sidebar{display:none;}.right-col{display:none;}}
        @media(min-width:901px){.x-header{display:none;}}
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
        .tweet-meta{display:flex;align-items:flex-start;gap:5px;margin-bottom:4px;}
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
        .comment-item{display:flex;gap:10px;padding:10px 16px;transition:background 0.12s;}
        .comment-item:hover{background:rgba(245,240,232,0.5);}
        .comment-children{padding-left:0;border-left:2px solid var(--border2);margin-left:52px;}
        .c-name{font-weight:600;font-size:13px;color:var(--text);}
        .c-time{font-size:12px;color:var(--muted);}
        .c-body{font-size:14px;color:var(--text);line-height:1.55;margin-top:2px;}
        .c-reply-btn{background:none;border:none;cursor:pointer;font-size:12px;font-weight:600;color:var(--muted);font-family:inherit;padding:3px 0;margin-top:4px;transition:color 0.15s;}
        .c-reply-btn:hover{color:var(--red);}
        .reply-box{display:flex;flex-direction:column;gap:8px;padding:10px 16px 12px;border-top:1px solid var(--border2);background:var(--surface);}
        .reply-col{flex:1;display:flex;flex-direction:column;gap:5px;min-width:0;}
        .reply-inp{background:transparent;border:none;outline:none;color:var(--text);font-family:'DM Sans',sans-serif;font-size:15px;width:100%;}
        .reply-inp::placeholder{color:var(--muted2);font-style:italic;}
        .reply-send{background:var(--red);border:none;border-radius:999px;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;padding:5px 14px;white-space:nowrap;flex-shrink:0;transition:background 0.15s;}
        .reply-send:hover{background:var(--red-h);}
        .empty{padding:72px 20px;text-align:center;color:var(--muted);}
        .empty-icon{font-size:40px;margin-bottom:14px;}
        .empty-title{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:var(--text);margin-bottom:6px;}
        .podium-wrap{padding:16px;border-bottom:6px solid var(--bg2);}
        .podium-wrap.sidebar-mode{padding:0;border:none;background:none;}
        .podium-label{font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:6px;}
        .podium-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;align-items:end;}
        .podium-grid.sidebar-mode{grid-template-columns:1fr;gap:8px;align-items:stretch;}
        .podium-col{display:flex;flex-direction:column;align-items:center;gap:0;}
        .podium-col.sidebar-mode{flex-direction:row;align-items:flex-start;gap:10px;background:var(--bg2);border-radius:12px;padding:10px 12px;border:1px solid var(--border2);}
        .podium-card{width:100%;background:var(--bg2);border-radius:12px 12px 0 0;padding:10px 8px 8px;border:1px solid var(--border2);border-bottom:none;display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;}
        .podium-rank{font-size:18px;margin-bottom:2px;}
        .podium-bar{width:100%;border-radius:0 0 4px 4px;border:1px solid var(--border2);border-top:none;}
        .podium-name{font-size:11px;font-weight:700;color:var(--text);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;}
        .podium-text{font-size:11px;color:var(--muted);line-height:1.35;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;text-align:center;}
        .podium-text.sidebar-mode{text-align:left;-webkit-line-clamp:2;}
        .podium-likes{font-size:11px;color:var(--muted2);margin-top:2px;}
        @media(min-width:901px){.podium-wrap:not(.sidebar-mode){display:none;}}
        [data-theme="dark"] .podium-card{background:var(--bg2);}
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

      <div className="page-layout">

        {/* ── SIDEBAR DESKTOP ── */}
        <aside className="sidebar">
          <a href="/" className="sidebar-logo">
            <img src="/logo.jpeg" alt="WA" width={36} height={36} />
            <span className="sidebar-logo-text">Weird<br/>Assumptions</span>
          </a>

          <a href="/" className="nav-item active">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            Home
          </a>
          {profile && (
            <a href={`/${profile.username}`} className="nav-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Profilo
            </a>
          )}

          <div className="sidebar-bottom">
            {isAdmin && <span className="admin-pill" style={{ textAlign:"center", marginBottom:4 }}>Admin</span>}
            <button className="nav-item" onClick={() => setDark(d => !d)} style={{ color:"var(--muted)", fontSize:14 }}>
              {dark
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
              {dark ? "Modalità chiara" : "Modalità scura"}
            </button>
            {user && profile ? (
              <>
                <a href={`/${profile.username}`} className="sidebar-user">
                  <Avatar profile={profile} size={36} />
                  <div className="sidebar-user-info">
                    <div className="sidebar-user-name">{displayFor(profile.username, profile.display_name)}</div>
                    <div className="sidebar-user-handle">@{handleFor(profile.username)}</div>
                  </div>
                </a>
                <button className="nav-item" onClick={handleLogout} style={{ color:"var(--muted)", fontSize:14 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Logout
                </button>
              </>
            ) : (
              <button className="login-btn" style={{ margin:"8px 10px" }} onClick={() => openAuth("login")}>Accedi</button>
            )}
          </div>
        </aside>

        {/* ── FEED ── */}
        <div className="wrap">
          {/* HEADER MOBILE */}
          <div className="x-header" style={{ position:"relative" }}>
            <img src="/logo.jpeg" alt="logo" className="header-logo" width={28} height={28} style={{ borderRadius:7, border:"1.5px solid var(--border)" }} />
            <div style={{ flex: 1 }}>
              <div className="header-title" style={{ fontSize:15 }}>Weird Assumptions</div>
            </div>
            <button onClick={() => setDark(d => !d)} style={{ background:"none", border:"1px solid var(--border)", borderRadius:999, cursor:"pointer", padding:"5px 8px", display:"flex", alignItems:"center", color:"var(--muted)" }}>
              {dark
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
            </button>
            {user && profile ? (
              <>
                <button
                  onClick={() => setMenuOpen(m => !m)}
                  style={{ background:"none", border:"none", cursor:"pointer", padding:4, borderRadius:"50%", display:"flex" }}>
                  <Avatar profile={profile} size={32} />
                </button>
                {menuOpen && (
                  <div className="mob-menu" onClick={() => setMenuOpen(false)}>
                    <a href={`/${profile.username}`} className="mob-menu-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Profilo
                    </a>

                    <button className="mob-menu-item danger" onClick={handleLogout}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Logout
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button className="login-btn" onClick={() => openAuth("login")}>Accedi</button>
            )}
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

        {/* PODIO MOBILE */}
        {assumptions.length > 0 && <Podium assumptions={assumptions} />}

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
            onDeleteComment={deleteComment} onAddComment={addComment}
            onEditPost={editPost} onEditComment={editComment} />
        ))}

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
                        {AVATAR_COLORS.map((c: string) => (
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
              {!isOfficial(profile.username) && !avatarPreview && !profile.avatar_url && (
                <div>
                  <div className="f-label" style={{ marginBottom: 8 }}>Colore avatar <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(se non carichi foto)</span></div>
                  <div className="color-row">
                    {AVATAR_COLORS.map((c: string) => (
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
        </div>{/* /wrap */}

        {/* ── COLONNA DESTRA DESKTOP ── */}
        <aside className="right-col">
          {assumptions.length > 0 && <Podium assumptions={assumptions} sidebar />}
        </aside>
      </div>{/* /page-layout */}
    </>
  );
}


/* ─── Podium ─── */
function Podium({ assumptions, sidebar = false }: { assumptions: any[]; sidebar?: boolean }) {
  const top3 = [...assumptions].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 3);
  if (top3.length === 0) return null;

  // ordine visivo podio: 2°, 1°, 3°
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  const barHeights = [70, 100, 50]; // altezze barre podio in px
  const medals = ["🥈", "🥇", "🥉"];
  const rankColors = ["#a0a0b0", "#c4a436", "#b87040"];
  const ranks = [2, 1, 3];

  if (sidebar) {
    return (
      <div className="podium-wrap sidebar-mode">
        <div className="podium-label">🔥 Top questa settimana</div>
        <div className="podium-grid sidebar-mode">
          {top3.map((a, i) => (
            <div key={a.id} className="podium-col sidebar-mode">
              <div style={{ flexShrink: 0, display:"flex", alignItems:"center", justifyContent:"center", width:28, height:28, borderRadius:8, background: i===0 ? "rgba(196,164,54,0.15)" : i===1 ? "rgba(160,160,176,0.15)" : "rgba(184,112,64,0.12)", fontSize:14 }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
                  <UAv username={a.username} size={16} avatarUrl={a.avatar_url} avatarColor={a.avatar_color} />
                  <span style={{ fontSize:11, fontWeight:700, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{displayFor(a.username, a.display_name)}</span>
                </div>
                <div style={{ fontSize:12, color:"var(--muted)", lineHeight:1.4, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{a.text}</div>
                <div style={{ fontSize:11, color:"var(--muted2)", marginTop:3 }}>♡ {a.likes || 0}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="podium-wrap">
      <div className="podium-label">🔥 Top questa settimana</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, alignItems:"end", padding:"0 4px" }}>
        {order.map((a, i) => {
          const rank = ranks[i];
          const medal = medals[i];
          const color = rankColors[i];
          const barH = barHeights[i];
          const isFirst = rank === 1;
          return (
            <div key={a.id} style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
              {/* card sopra la barra */}
              <div style={{
                width:"100%", background:"var(--bg2)", border:`1px solid ${color}40`,
                borderRadius:"12px 12px 0 0", padding: isFirst ? "12px 8px 10px" : "10px 6px 8px",
                display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                boxShadow: isFirst ? `0 0 20px ${color}30` : "none",
                position:"relative"
              }}>
                {isFirst && (
                  <div style={{ position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)", fontSize:20 }}>👑</div>
                )}
                <UAv username={a.username} size={isFirst ? 36 : 28} avatarUrl={a.avatar_url} avatarColor={a.avatar_color} />
                <div style={{ fontSize:10, fontWeight:700, color:"var(--text)", textAlign:"center", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", width:"100%", maxWidth:80 }}>
                  {displayFor(a.username, a.display_name)}
                </div>
                <div style={{ fontSize:10, color:"var(--muted)", lineHeight:1.3, textAlign:"center", overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                  {a.text}
                </div>
                <div style={{ fontSize:11, color: color, fontWeight:700, marginTop:2 }}>
                  ♡ {a.likes || 0}
                </div>
              </div>
              {/* barra podio */}
              <div style={{
                width:"100%", height: barH,
                background: `linear-gradient(to bottom, ${color}40, ${color}20)`,
                border:`1px solid ${color}50`, borderTop:"none",
                borderRadius:"0 0 8px 8px",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize: isFirst ? 22 : 18
              }}>
                {medal}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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