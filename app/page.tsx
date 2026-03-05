"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import {
  TweetCard, Avatar, UAv, Badge,
  displayFor, handleFor, isOfficial,
  OFFICIAL_LOGO, OFFICIAL_USERNAME, AVATAR_COLORS, avatarGrad, initial,
  type Profile, type Comment,
} from "./components/tweet-card";
import { CharRing } from "./components/CharRing";

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
  const taRef      = useRef<HTMLTextAreaElement>(null);
  const [composeFocused, setComposeFocused] = useState(false);
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);
  const [activeHashtag, setActiveHashtag] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  useEffect(() => {
    const tag = new URLSearchParams(window.location.search).get("tag");
    if (tag) setActiveHashtag(tag);
  }, []);
  const [waPlaceholder, setWaPlaceholder] = useState("");
  useEffect(() => { setWaPlaceholder(WA_PLACEHOLDERS[Math.floor(Math.random() * WA_PLACEHOLDERS.length)]); }, []);

  const [menuOpen, setMenuOpen]                 = useState(false);
  const [deleteConfirm, setDeleteConfirm]       = useState(false);
  const [deleteLoading, setDeleteLoading]       = useState(false);

  /* ── dark mode (darkReady evita il flash al primo render) ── */
  const [dark, setDark]           = useState(false);
  const [darkReady, setDarkReady] = useState(false);
  useEffect(() => {
    setDark(localStorage.getItem("theme") === "dark");
    setDarkReady(true);
  }, []);
  useEffect(() => {
    if (!darkReady) return;
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark, darkReady]);

  /* ── refs stabili per evitare stale closures ── */
  const userRef    = useRef<any>(null);
  const profileRef = useRef<Profile | null>(null);

  /* fetchAll: riceve uid come parametro esplicito → nessuna dipendenza da stato → stabile ── */
  const fetchAll = useCallback(async (uid: string | null) => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const weekStart = monday.toISOString();

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
        const pl   = lData?.filter(l => l.assumption_id === a.id) ?? [];
        const prof = profileMap[a.username?.trim()];
        return {
          ...a,
          display_name: prof?.display_name || a.username,
          avatar_url:   prof?.avatar_url   ?? a.avatar_url,
          avatar_color: prof?.avatar_color ?? a.avatar_color,
          is_verified:  prof?.is_verified  === true,
          likes:        pl.length,
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
          avatar_url:   prof?.avatar_url   ?? c.avatar_url,
          avatar_color: prof?.avatar_color ?? c.avatar_color,
          is_verified:  prof?.is_verified  === true,
        };
      }));
    }
  }, []); // nessuna dipendenza — stabile per tutta la vita del componente

  /* ensureProfile: stabile ── */
  const ensureProfile = useCallback(async (authUser: any) => {
    for (let i = 0; i < 5; i++) {
      const { data } = await supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
      if (data) { profileRef.current = data; setProfile(data); setIsAdmin(data.is_admin === true); return; }
      await new Promise(r => setTimeout(r, 300));
    }
    console.warn("Profilo non trovato per", authUser.id);
  }, []); // stabile

  /* ── auth listener: [] come deps — si iscrive UNA SOLA VOLTA ── */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        userRef.current = session.user;
        setUser(session.user);
        ensureProfile(session.user);
        fetchAll(session.user.id);
      } else {
        userRef.current = null;
        profileRef.current = null;
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        fetchAll(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── upload avatar ── */
  const uploadAvatar = async (file: File, userId: string): Promise<string | null> => {
    const ext  = file.name.split(".").pop();
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
    if (!pwd)                { setAuthErr("Scegli una password."); return; }
    setAuthLoading(true); setAuthErr("");

    const { data: existing } = await supabase.from("profiles").select("id").eq("username", regUsername.trim()).maybeSingle();
    if (existing) { setAuthErr("Username già in uso."); setAuthLoading(false); return; }

    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: pwd });
    if (error) { setAuthErr(error.message); setAuthLoading(false); return; }

    if (data.user) {
      // 1. Avatar
      let avatarUrl: string | null = null;
      if (regAvatarFile) avatarUrl = await uploadAvatar(regAvatarFile, data.user.id);

      // 2. Profilo — PRIMA di setSession così ensureProfile lo trova subito
      const { error: profileError } = await supabase.from("profiles").upsert([{
        id:           data.user.id,
        username:     regUsername.trim(),
        display_name: regDisplayName.trim() || regUsername.trim(),
        bio:          regBio.trim(),
        avatar_color: regColor,
        avatar_url:   avatarUrl,
        email:        email.trim(),
      }], { onConflict: "id" });

      if (profileError) {
        setAuthErr("Errore nel salvataggio del profilo.");
        setAuthLoading(false);
        return;
      }

      // 3. Sessione
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
  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleteLoading(true);
    try {
      await Promise.all([
        supabase.from("likes").delete().eq("user_id", user.id),
        supabase.from("comments").delete().eq("username", profile?.username ?? ""),
        supabase.from("assumptions").delete().eq("username", profile?.username ?? ""),
        supabase.from("profiles").delete().eq("id", user.id),
      ]);
      if (profile?.avatar_url) {
        const ext = profile.avatar_url.split(".").pop()?.split("?")[0] ?? "jpg";
        await supabase.storage.from("avatars").remove([`${user.id}/avatar.${ext}`]);
      }
      const { error } = await supabase.rpc("delete_user");
      if (error) console.error("Errore cancellazione auth:", error);
      await supabase.auth.signOut();
      setModal("none");
    } catch (e) {
      console.error("Errore cancellazione account:", e);
    }
    setDeleteLoading(false);
  };

  /* ── save profile (aggiornamento ottimistico — niente re-fetch) ── */
  const saveProfile = async () => {
    if (!user || !profile) return;
    setEditSaving(true);
    let avatarUrl = profile.avatar_url ?? null;
    if (avatarFile) avatarUrl = await uploadAvatar(avatarFile, user.id);

    await supabase.from("profiles").update({
      bio: editBio, avatar_color: editColor, avatar_url: avatarUrl, display_name: editDisplayName,
    }).eq("id", user.id);

    // Aggiorna stato locale senza ri-fetchare tutto
    const updated: Profile = { ...profile, bio: editBio, avatar_color: editColor, avatar_url: avatarUrl ?? undefined, display_name: editDisplayName };
    profileRef.current = updated;
    setProfile(updated);
    // Aggiorna anche i post del feed che appartengono a questo utente
    setAssumptions(prev => prev.map(a =>
      a.username === profile.username
        ? { ...a, display_name: editDisplayName, avatar_color: editColor, avatar_url: avatarUrl ?? a.avatar_url }
        : a
    ));

    setModal("none"); setEditSaving(false); setAvatarFile(null); setAvatarPreview(null);
  };

  /* ── feed actions ── */
  const addAssumption = async () => {
    if (!text.trim()) return;
    setIsPosting(true);
    const poster = profile ? (isOfficial(profile.username) ? OFFICIAL_USERNAME : profile.username) : "anonimo";
    const dname  = profile ? displayFor(profile.username, profile.display_name) : "Anonimo";

    const { data, error } = await supabase.from("assumptions").insert([{
      text, username: poster, display_name: dname,
      avatar_color: profile?.avatar_color ?? null,
      avatar_url:   profile?.avatar_url   ?? null,
    }]).select().single();

    if (!error && data) {
      // Aggiunta ottimistica: inserisce il post in cima senza re-fetch
      setAssumptions(prev => [{
        ...data,
        display_name: dname,
        avatar_url:   profile?.avatar_url   ?? null,
        avatar_color: profile?.avatar_color ?? null,
        is_verified:  profile?.is_verified  ?? false,
        likes:        0,
        alreadyLiked: false,
      }, ...prev]);
    }
    setText("");
    setIsPosting(false);
    if (taRef.current) { taRef.current.style.height = "auto"; }
  };

  const likePost = useCallback(async (id: string, alreadyLiked: boolean) => {
    const u = userRef.current;
    if (!u) return;
    setAssumptions(prev => prev.map(a => a.id !== id ? a : {
      ...a,
      alreadyLiked: !alreadyLiked,
      likes: (a.likes || 0) + (alreadyLiked ? -1 : 1),
    }));
    if (alreadyLiked) await supabase.from("likes").delete().eq("assumption_id", id).eq("user_id", u.id);
    else              await supabase.from("likes").insert([{ assumption_id: id, user_id: u.id }]);
  }, []); // userRef è stabile

  const deletePost = useCallback(async (id: string) => {
    setAssumptions(prev => prev.filter(a => a.id !== id));
    setComments(prev => prev.filter(c => c.assumption_id !== id));
    await Promise.all([
      supabase.from("likes").delete().eq("assumption_id", id),
      supabase.from("comments").delete().eq("assumption_id", id),
      supabase.from("assumptions").delete().eq("id", id),
    ]);
  }, []);

  const pinPost = useCallback(async (id: string, pinned: boolean) => {
    setAssumptions(prev => {
      const updated = prev.map(a => a.id !== id ? { ...a, pinned: false } : { ...a, pinned: !pinned });
      return [...updated].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    });
    await supabase.from("assumptions").update({ pinned: !pinned }).eq("id", id);
  }, []);

  const deleteComment = useCallback(async (id: string) => {
    setComments(prev => prev.filter(c => c.id !== id));
    await supabase.from("comments").delete().eq("id", id);
  }, []);

  const editPost = useCallback(async (id: string, newText: string) => {
    setAssumptions(prev => prev.map(a => a.id !== id ? a : { ...a, text: newText, edited: true }));
    await supabase.from("assumptions").update({ text: newText, edited: true }).eq("id", id);
  }, []);

  const editComment = useCallback(async (id: string, newText: string) => {
    setComments(prev => prev.map(c => c.id !== id ? c : { ...c, text: newText, edited: true }));
    await supabase.from("comments").update({ text: newText, edited: true }).eq("id", id);
  }, []);

  const addComment = useCallback(async (aid: string, t: string, parentId: string | null = null) => {
    if (!t.trim()) return;
    const mp     = profileRef.current;
    const poster = mp ? (isOfficial(mp.username) ? OFFICIAL_USERNAME : mp.username) : "anonimo";
    const dname  = mp ? displayFor(mp.username, mp.display_name) : "Anonimo";
    const { data } = await supabase.from("comments").insert([{
      text: t, username: poster, display_name: dname, assumption_id: aid, parent_id: parentId,
      avatar_color: mp?.avatar_color ?? null,
      avatar_url:   mp?.avatar_url   ?? null,
    }]).select().single();
    if (data) setComments(prev => [...prev, {
      ...data, display_name: dname,
      avatar_url:   mp?.avatar_url   ?? null,
      avatar_color: mp?.avatar_color ?? null,
      is_verified:  mp?.is_verified  ?? false,
    }]);
  }, []); // profileRef è stabile

  const commentsByPost = useMemo(() => {
    const map: Record<string, typeof comments> = {};
    for (const c of comments) {
      if (!map[c.assumption_id]) map[c.assumption_id] = [];
      map[c.assumption_id].push(c);
    }
    return map;
  }, [comments]);

  const openAuth = (tab: "login" | "register" = "login") => {
    setAuthTab(tab); setAuthErr(""); setPwd(""); setModal("auth");
  };

  /* ─── RENDER ─── */
  return (
    <>
      <div className="page-layout">

        {/* ── SIDEBAR DESKTOP ── */}
        <aside className="sidebar">
          <Link href="/" className="sidebar-logo">
            <img src={dark ? "/logo-full-dark.png" : "/logo-full.png"} alt="Weird Assumptions" height={44} style={{ objectFit: "contain", flexShrink: 0, maxWidth: 200 }} />
          </Link>

          <Link href="/" className="nav-item active">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            Home
          </Link>
          {profile && (
            <Link href={`/${profile.username}`} className="nav-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              Profilo
            </Link>
          )}

          <div className="sidebar-bottom">
            {isAdmin && <span className="admin-pill" style={{ textAlign: "center", marginBottom: 4 }}>Admin</span>}
            <button className="nav-item" onClick={() => setDark(d => !d)} style={{ color: "var(--muted)", fontSize: 14 }}>
              {dark
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
              {dark ? "Modalità chiara" : "Modalità scura"}
            </button>
            {user && profile ? (
              <>
                <Link href={`/${profile.username}`} className="sidebar-user">
                  <Avatar profile={profile} size={36} />
                  <div className="sidebar-user-info">
                    <div className="sidebar-user-name">{displayFor(profile.username, profile.display_name)}</div>
                    <div className="sidebar-user-handle">@{handleFor(profile.username)}</div>
                  </div>
                </Link>
                <button className="nav-item" onClick={handleLogout} style={{ color: "var(--muted)", fontSize: 14 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Logout
                </button>
              </>
            ) : (
              <button className="login-btn" style={{ margin: "8px 10px" }} onClick={() => openAuth("login")}>Accedi</button>
            )}
          </div>
        </aside>

        {/* ── FEED ── */}
        <div className="wrap">

          {/* HEADER MOBILE */}
          <div className="x-header" style={{ position: "relative" }}>
            {/* Logo + titolo centrati */}
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flex: 1 }}>
              <img src={dark ? "/logo-full-dark.png" : "/logo-full.png"} alt="Weird Assumptions" height={32} style={{ objectFit: "contain", maxWidth: 160 }} />
            </Link>
            {/* Dark mode — icona senza bordo */}
            <button onClick={() => setDark(d => !d)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex", alignItems: "center", color: "var(--muted)", borderRadius: 8, transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
              {dark
                ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
            </button>
            {user && profile ? (
              <>
                <button onClick={() => setMenuOpen(m => !m)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: "50%", display: "flex" }}>
                  <Avatar profile={profile} size={32} />
                </button>
                {menuOpen && (
                  <div className="mob-menu" onClick={() => setMenuOpen(false)}>
                    <Link href={`/${profile.username}`} className="mob-menu-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Profilo
                    </Link>
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
          <div className="compose" style={{ outline: composeFocused ? "2px solid var(--red-ring)" : "2px solid transparent", outlineOffset: -2, transition: "outline-color 0.2s" }}>
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
                  Stai pubblicando come <strong>Anonimo</strong>
                  <br/>
                  <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontWeight: 600, fontSize: 13, fontFamily: "inherit", padding: 0 }} onClick={() => openAuth("register")}>Crea un account</button>{" "}per apparire nel podio
                </div>
              )}
              <textarea
                ref={taRef}
                className="compose-ta"
                placeholder={isOfficial(profile?.username ?? "") ? "Scrivi un post ufficiale…" : waPlaceholder}
                value={text}
                onChange={e => {
                  setText(e.target.value.slice(0, 280));
                  if (taRef.current) { taRef.current.style.height = "auto"; taRef.current.style.height = taRef.current.scrollHeight + "px"; }
                }}
                onFocus={() => setComposeFocused(true)}
                onBlur={() => setComposeFocused(false)}
                rows={3}
                style={{ minHeight: 72 }}
              />
              <div className="compose-footer">
                <span style={{ fontSize: 12, color: text.length > 240 ? (text.length > 260 ? "var(--red)" : "#b87040") : "var(--muted2)", fontWeight: text.length > 240 ? 600 : 400 }}>
                  {text.length}/280
                </span>
                <button className="btn-post" onClick={addAssumption} disabled={!text.trim() || isPosting}>
                  {isPosting ? "Pubblicando…" : "Pubblica WA"}
                </button>
              </div>
            </div>
          </div>

          {/* UTENTE TOP MOBILE */}
          <TopUsers assumptions={assumptions} mobile />
          {/* PODIO MOBILE */}
          {assumptions.length > 0 && <Podium assumptions={assumptions} />}

          {/* HASHTAG FILTER BANNER */}
          {activeHashtag && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 16px", background: "var(--surface)",
              borderBottom: "1px solid var(--border2)", fontSize: 13,
            }}>
              <span style={{ color: "var(--text)", fontWeight: 600 }}>
                <span style={{ color: "var(--red)" }}>{activeHashtag}</span>
                <span style={{ color: "var(--muted)", fontWeight: 400, marginLeft: 8 }}>· filtrando il feed</span>
              </span>
              <button onClick={() => setActiveHashtag(null)} style={{
                background: "none", border: "1px solid var(--border2)", borderRadius: 999,
                cursor: "pointer", color: "var(--muted)", fontSize: 12, padding: "2px 10px",
                fontFamily: "inherit",
              }}>✕ rimuovi</button>
            </div>
          )}

          {/* FEED */}
          {assumptions.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">👀</div>
              <div className="empty-title">Nessuna WA ancora</div>
              <div>Sii il primo a rompere il ghiaccio.</div>
            </div>
          ) : assumptions
            .filter(a => !activeHashtag || a.text.toLowerCase().includes(activeHashtag))
            .flatMap((a, i) => {
              const card = (
                <TweetCard
                  key={a.id} a={a}
                  comments={commentsByPost[a.id] ?? []}
                  isAdmin={isAdmin} profile={profile}
                  onLike={likePost} onDelete={deletePost} onPin={pinPost}
                  onDeleteComment={deleteComment} onAddComment={addComment}
                  onEditPost={editPost} onEditComment={editComment}
                  openCommentId={openCommentId} setOpenCommentId={setOpenCommentId}
                  onHashtag={tag => setActiveHashtag(t => t === tag ? null : tag)}
                />
              );
              if (i === 3 && !activeHashtag && isMobile) {
                return [card, <TrendingHashtagsMobile key="trending-mobile" assumptions={assumptions} onHashtag={tag => setActiveHashtag(t => t === tag ? null : tag)} activeHashtag={activeHashtag} />];
              }
              return [card];
            })
          }

          {/* ── AUTH MODAL ── */}
          {modal === "auth" && (
            <div className="overlay" onClick={() => setModal("none")}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <img src={OFFICIAL_LOGO} alt="WA" style={{ width: 38, height: 38, borderRadius: 9, objectFit: "cover", border: "1.5px solid var(--border)" }} />
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
                            : <div className="av" style={{ width: 64, height: 64, background: regColor, fontSize: 24 }}>{regUsername ? initial(regUsername) : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}</div>}
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
                        <input className="f-inp" placeholder={regUsername || "Come vuoi apparire…"} value={regDisplayName} onChange={e => setRegDisplayName(e.target.value)} />
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

          {/* ── PROFILE MODAL ── */}
          {modal === "profile" && profile && (
            <div className="overlay" onClick={() => setModal("none")}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                  <div
                    className="av-upload"
                    onClick={() => !isOfficial(profile.username) && fileRef.current?.click()}
                    style={{ cursor: isOfficial(profile.username) ? "default" : "pointer" }}
                  >
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
                        onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}
                      >Elimina account</button>
                    ) : (
                      <div style={{ background: "var(--red-pale)", border: "1px solid rgba(184,50,50,0.25)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--red)", textAlign: "center" }}>Sei sicuro? Questa azione è irreversibile.</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", lineHeight: 1.5 }}>Verranno eliminati il tuo profilo, tutti i tuoi post, commenti e likes.</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => setDeleteConfirm(false)}
                            style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: "8px 0", color: "var(--muted)", transition: "border-color 0.15s" }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--text)")}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                          >Annulla</button>
                          <button
                            onClick={handleDeleteAccount}
                            disabled={deleteLoading}
                            style={{ flex: 1, background: "var(--red)", border: "none", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: "8px 0", color: "#fff", opacity: deleteLoading ? 0.6 : 1 }}
                          >{deleteLoading ? "Eliminando…" : "Sì, elimina"}</button>
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
          <Podium assumptions={assumptions} sidebar />
          <TrendingHashtags assumptions={assumptions} activeHashtag={activeHashtag} onHashtag={tag => setActiveHashtag(t => t === tag ? null : tag)} />

        </aside>
      </div>{/* /page-layout */}
    </>
  );
}

/* ─── Countdown al reset del lunedì ─── */
function useWeeklyCountdown() {
  const getMs = () => {
    const now = new Date();
    const next = new Date(now);
    const day = now.getDay();
    const daysUntilMon = day === 1 ? 7 : (8 - day) % 7;
    next.setDate(now.getDate() + daysUntilMon);
    next.setHours(0, 0, 0, 0);
    return next.getTime() - now.getTime();
  };

  const [ms, setMs] = useState(0);
  useEffect(() => {
    setMs(getMs());
    const t = setInterval(() => setMs(getMs()), 1000);
    return () => clearInterval(t);
  }, []);

  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const d = Math.floor(h / 24);

  if (d > 0) return `${d}g ${h % 24}h ${m}m ${s}s`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}


/* ─── Placeholder casuali compose ─── */
const WA_PLACEHOLDERS = [
  "So che ci stai pensando… scrivilo.",
  "Non avrai mica paura di scriverlo?",
  "Facci sapere cosa non ti fa dormire la notte.",
  "Be free. Just say it.",
  "La tua teoria più strana. Vai.",
  "Cosa pensi e non dici mai?",
  "Scrivilo prima che ti passi.",
  "Il mondo ha bisogno di sapere.",
  "This is a free space. Write.",
  "Scommettiamo che qualcuno la pensa come te?",
];



/* ─── Trending Hashtags Mobile (card nel feed) ─── */
function TrendingHashtagsMobile({ assumptions, onHashtag, activeHashtag }: {
  assumptions: any[];
  onHashtag: (tag: string) => void;
  activeHashtag: string | null;
}) {
  const counts: Record<string, number> = {};
  assumptions.forEach(a => {
    const tags = Array.from(new Set<string>((a.text.match(/#[\w\u00C0-\u024F]+/g) || []).map((t: string) => t.toLowerCase())));
    tags.forEach((tag: string) => { counts[tag] = (counts[tag] || 0) + 1; });
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (sorted.length === 0) return null;
  return (
    <div className="mobile-only" style={{
      background: "var(--bg2)", borderBottom: "6px solid var(--bg2)",
      padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Trending ora</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {sorted.map(([tag, count]) => (
          <button key={tag} onClick={() => onHashtag(tag)} style={{
            background: activeHashtag === tag ? "var(--red)" : "var(--surface)",
            color: activeHashtag === tag ? "#fff" : "var(--red)",
            border: `1px solid ${activeHashtag === tag ? "var(--red)" : "var(--border2)"}`,
            borderRadius: 999, padding: "5px 12px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            {tag}
            <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 400 }}>{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Trending Hashtags ─── */
function TrendingHashtags({ assumptions, activeHashtag, onHashtag }: {
  assumptions: any[];
  activeHashtag: string | null;
  onHashtag: (tag: string) => void;
}) {
  const counts: Record<string, number> = {};
  assumptions.forEach(a => {
    const tags = Array.from(new Set<string>((a.text.match(/#[\w\u00C0-\u024F]+/g) || []).map((t: string) => t.toLowerCase())));
    tags.forEach((tag: string) => { counts[tag] = (counts[tag] || 0) + 1; });
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (sorted.length === 0) return null;
  return (
    <div style={{ padding: "16px 0" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase", padding: "0 16px 10px" }}>Trending</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {sorted.map(([tag, count]) => (
          <button key={tag} onClick={() => onHashtag(tag)} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "7px 16px", background: activeHashtag === tag ? "var(--bg2)" : "none",
            border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
            transition: "background 0.12s", borderRadius: 0,
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: activeHashtag === tag ? "var(--red)" : "var(--text)" }}>{tag}</span>
            <span style={{ fontSize: 12, color: "var(--muted2)" }}>{count} WA</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Podium ─── */
function Podium({ assumptions, sidebar = false }: { assumptions: any[]; sidebar?: boolean }) {
  const monday = new Date(); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); monday.setHours(0,0,0,0);
  const weekStart = monday.getTime();
  const weekAssumptions = assumptions.filter(a => new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at + "Z").getTime() >= weekStart);
  const top3 = [...weekAssumptions].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 3);
  const countdown  = useWeeklyCountdown();
  const order      = [top3[1], top3[0], top3[2]].filter(Boolean);
  const colors     = ["#a0a0b0", "#c4a436", "#b87040"];
  const ranks      = [2, 1, 3];

  const Heart = ({ color, size = 12 }: { color: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );

  const Crown = () => (
    <svg width="28" height="18" viewBox="0 0 28 18" fill="none">
      {/* Base piena */}
      <rect x="2" y="13" width="24" height="3.5" rx="1.5" fill="#c4a436"/>
      {/* Corpo corona */}
      <path d="M2 13 L5 4 L10 9.5 L14 1 L18 9.5 L23 4 L26 13 Z" fill="#c4a436" opacity="0.25"/>
      <path d="M2 13 L5 4 L10 9.5 L14 1 L18 9.5 L23 4 L26 13" stroke="#c4a436" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" fill="none"/>
      {/* Gemme */}
      <circle cx="5" cy="4" r="1.8" fill="#c4a436"/>
      <circle cx="23" cy="4" r="1.8" fill="#c4a436"/>
      <circle cx="14" cy="1.5" r="2.2" fill="#e8c44a"/>
      <circle cx="10" cy="9.5" r="1.4" fill="#c4a436" opacity="0.7"/>
      <circle cx="18" cy="9.5" r="1.4" fill="#c4a436" opacity="0.7"/>
    </svg>
  );

  if (sidebar) {
    return (
      <div className="right-widget" style={{ padding: "14px 14px 10px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 15, color: "var(--text)" }}>🔥 Top post</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--red)", background: "var(--red-pale)", padding: "2px 8px", borderRadius: 999 }}>⏳ {countdown}</span>
        </div>
        {/* Lista */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {top3.map((a, i) => { const sc = ["#c4a436","#a0a0b0","#b87040"][i]; return (
            <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 8px", borderRadius: 10, transition: "background 0.15s", cursor: "default" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--border2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              {/* Numero */}
              <div style={{ width: 20, height: 20, borderRadius: 6, background: `${sc}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: sc }}>{i + 1}</span>
              </div>
              {/* Avatar + contenuto */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                  <UAv username={a.username} size={18} avatarUrl={a.avatar_url} avatarColor={a.avatar_color} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayFor(a.username, a.display_name)}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{a.text}</div>
              </div>
              {/* Likes */}
              <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0, marginTop: 1 }}>
                <Heart color={sc} size={11} />
                <span style={{ fontSize: 12, fontWeight: 700, color: sc }}>{a.likes || 0}</span>
              </div>
            </div>
          );})}
        </div>
      </div>
    );
  }

  return (
    <div className="podium-wrap">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "0 4px" }}>
        <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 16, color: "var(--text)" }}>🔥 Top post</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--red)", background: "var(--red-pale)", padding: "2px 8px", borderRadius: 999 }}>⏳ {countdown}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, alignItems: "end", padding: "0 4px" }}>
        {order.map((a, i) => {
          const rank    = ranks[i];
          const color   = colors[i];
          const barH    = [80, 110, 55][i];
          const isFirst = rank === 1;
          return (
            <div key={a.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              {/* Card */}
              <div style={{
                width: "100%",
                background: `linear-gradient(to bottom, var(--bg2), ${color}18)`,
                borderTop: `1px solid ${color}50`,
                borderLeft: `1px solid ${color}50`,
                borderRight: `1px solid ${color}50`,
                borderRadius: "14px 14px 0 0",
                padding: isFirst ? "22px 8px 10px" : "10px 6px 10px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                boxShadow: isFirst ? `0 -4px 20px ${color}20` : "none",
                position: "relative",
              }}>
                <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
                  {isFirst && (
                    <div style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)" }}>
                      <Crown />
                    </div>
                  )}
                  <UAv username={a.username} size={isFirst ? 38 : 30} avatarUrl={a.avatar_url} avatarColor={a.avatar_color} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
                  {displayFor(a.username, a.display_name)}
                </span>
                <span style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.3, textAlign: "center", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {a.text}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Heart color={color} size={12} />
                  <span style={{ fontSize: 12, fontWeight: 700, color }}>{a.likes || 0}</span>
                </div>
              </div>
              {/* Gradino */}
              <div style={{
                width: "100%", height: barH,
                background: `linear-gradient(to bottom, ${color}30, ${color}18)`,
                borderTop: `2px solid ${color}60`,
                borderLeft: `1px solid ${color}50`,
                borderRight: `1px solid ${color}50`,
                borderBottom: `1px solid ${color}50`,
                borderRadius: "0 0 8px 8px",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: isFirst ? 20 : 16, fontWeight: 800, color, opacity: 0.75 }}>{rank}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ─── Top Utenti della settimana ─── */
function TopUsers({ assumptions, mobile = false }: { assumptions: any[]; sidebar?: boolean; mobile?: boolean }) {
  const monday = new Date(); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); monday.setHours(0,0,0,0);
  const weekAgo = monday.getTime();
  const top = Object.values(
    assumptions
      .filter(a => a.username !== "anonimo" && new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at + "Z").getTime() > weekAgo)
      .reduce((acc: any, a) => {
        if (!acc[a.username]) acc[a.username] = { username: a.username, display_name: a.display_name, avatar_url: a.avatar_url, avatar_color: a.avatar_color, is_verified: a.is_verified, likes: 0 };
        acc[a.username].likes += a.likes || 0;
        return acc;
      }, {})
  ).filter((u: any) => u.likes > 0).sort((a: any, b: any) => b.likes - a.likes) as any[];

  const u = top[0];
  if (!u) return null;

  const Heart = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="#c4a436" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
  );

  if (mobile) return (
    <div style={{ borderBottom: "6px solid var(--bg2)", padding: "10px 20px", background: "var(--surface)", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", flexShrink: 0, whiteSpace: "nowrap" }}>🏆 Utente top</span>
      <Link href={`/${u.username}`} style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: "none", flex: 1, minWidth: 0 }}>
        <UAv username={u.username} size={26} avatarUrl={u.avatar_url} avatarColor={u.avatar_color} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayFor(u.username, u.display_name)}</span>
        {u.is_verified && <Badge size={11} />}
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
        <Heart /><span style={{ fontSize: 13, fontWeight: 700, color: "#c4a436" }}>{u.likes}</span>
      </div>
    </div>
  );

  return (
    <div className="right-widget">
      <div className="right-widget-title" style={{ marginBottom: 10 }}>🏆 Utente top</div>
      <Link href={`/${u.username}`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <UAv username={u.username} size={38} avatarUrl={u.avatar_url} avatarColor={u.avatar_color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayFor(u.username, u.display_name)}</span>
            {u.is_verified && <Badge size={12} />}
          </div>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>@{handleFor(u.username)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
          <Heart /><span style={{ fontSize: 13, fontWeight: 700, color: "#c4a436" }}>{u.likes}</span>
        </div>
      </Link>
    </div>
  );
}