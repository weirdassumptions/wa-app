"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import {
  TweetCard, UAv, Badge,
  displayFor, handleFor, avatarGrad, isOfficial,
  OFFICIAL_LOGO, OFFICIAL_USERNAME, AVATAR_COLORS,
  type Profile, type Comment, type Assumption,
} from "../components/tweet-card";


/* ── Estrae i due colori dominanti da un'immagine via Canvas ── */
function useDominantColors(imageUrl?: string): [string, string] {
  const [colors, setColors] = useState<[string, string]>(["#b83232", "#8a4a2a"]);

  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 80;
        canvas.height = 80;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 80, 80);
        const data = ctx.getImageData(0, 0, 80, 80).data;

        const buckets: Record<string, { r: number; g: number; b: number; count: number }> = {};
        for (let i = 0; i < data.length; i += 4) {
          const r = Math.round(data[i]     / 32) * 32;
          const g = Math.round(data[i + 1] / 32) * 32;
          const b = Math.round(data[i + 2] / 32) * 32;
          if (data[i + 3] < 128) continue;
          const key = `${r},${g},${b}`;
          if (!buckets[key]) buckets[key] = { r, g, b, count: 0 };
          buckets[key].count++;
        }

        // Score = frequenza × saturazione² — premia vivacità sulla frequenza pura
        const sorted = Object.values(buckets)
          .map(c => {
            const max = Math.max(c.r, c.g, c.b);
            const min = Math.min(c.r, c.g, c.b);
            const sat = max === 0 ? 0 : (max - min) / max;
            const lit = (max + min) / 510;
            if (sat < 0.15 || max < 40 || lit > 0.92) return null;
            return { ...c, score: c.count * sat * sat };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => b.score - a.score) as any[];

        if (sorted.length === 0) return;

        const toHex = (c: { r: number; g: number; b: number }) =>
          `#${c.r.toString(16).padStart(2,"0")}${c.g.toString(16).padStart(2,"0")}${c.b.toString(16).padStart(2,"0")}`;

        const c1 = sorted[0];
        // Secondo colore: il più diverso dal primo tra i top-10
        const c2 = (sorted.slice(1, 10).sort((a: any, b: any) => {
          const da = Math.abs(a.r-c1.r) + Math.abs(a.g-c1.g) + Math.abs(a.b-c1.b);
          const db = Math.abs(b.r-c1.r) + Math.abs(b.g-c1.g) + Math.abs(b.b-c1.b);
          return db - da;
        })[0]) ?? c1;

        setColors([toHex(c1), toHex(c2)]);
      } catch { /* CORS — rimane default */ }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  return colors;
}


export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();

  const [pageProfile, setPageProfile] = useState<Profile | null>(null);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [comments, setComments]       = useState<Comment[]>([]);
  const [totalLikes, setTotalLikes]   = useState(0);
  const [loading, setLoading]         = useState(true);
  const [notFound, setNotFound]       = useState(false);

  /* ── Colori estratti dalla foto profilo per il banner ── */
  const [bannerColor1, bannerColor2] = useDominantColors(pageProfile?.avatar_url);

  const [user, setUser]           = useState<any>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const myProfileRef              = useRef<Profile | null>(null);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [zoomAvatar, setZoomAvatar] = useState(false);

  /* ── dark mode ── */
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("theme") === "dark";
    return false;
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  /* ── modifica profilo ── */
  const [editModal, setEditModal]           = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio]               = useState("");
  const [editColor, setEditColor]           = useState("#b83232");
  const [editSaving, setEditSaving]         = useState(false);
  const [avatarFile, setAvatarFile]         = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview]   = useState<string | null>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  const uploadAvatar = async (file: File, userId: string): Promise<string | null> => {
    const ext  = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl + "?t=" + Date.now();
  };

  /* saveProfile: aggiornamento ottimistico — niente re-fetch ── */
  const saveProfile = async () => {
    if (!user || !myProfile) return;
    setEditSaving(true);
    let avatarUrl = myProfile.avatar_url ?? null;
    if (avatarFile) avatarUrl = await uploadAvatar(avatarFile, user.id);

    await supabase.from("profiles").update({
      bio: editBio, avatar_color: editColor, avatar_url: avatarUrl, display_name: editDisplayName,
    }).eq("id", user.id);

    const updated: Profile = { ...myProfile, bio: editBio, avatar_color: editColor, avatar_url: avatarUrl ?? undefined, display_name: editDisplayName };
    setMyProfile(updated);
    myProfileRef.current = updated;
    setPageProfile(prev => prev ? { ...prev, bio: editBio, avatar_color: editColor, avatar_url: avatarUrl ?? undefined, display_name: editDisplayName } : prev);
    // Aggiorna avatar/nome sui post già caricati
    setAssumptions(prev => prev.map(a => ({
      ...a,
      display_name: editDisplayName || a.username,
      avatar_color: editColor,
      avatar_url:   avatarUrl ?? a.avatar_url,
    })));

    setEditModal(false); setEditSaving(false); setAvatarFile(null); setAvatarPreview(null);
  };

  /* ── sessione utente ── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle()
          .then(({ data }) => {
            if (data) {
              setMyProfile(data);
              myProfileRef.current = data;
              setIsAdmin(data.is_admin === true);
            }
          });
      }
    });
  }, []);

  /* ── fetch dati pagina profilo ── */
  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    const { data: prof } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
    if (!prof) { setNotFound(true); setLoading(false); return; }
    setPageProfile(prof);

    const uid = myProfileRef.current?.id ?? null;
    const [{ data: aData }, { data: cData }, { data: lData }] = await Promise.all([
      supabase.from("assumptions").select("*").eq("username", username).order("created_at", { ascending: false }),
      supabase.from("comments").select("*").order("created_at", { ascending: true }),
      supabase.from("likes").select("assumption_id,user_id"),
    ]);

    const postIds      = (aData ?? []).map((a: any) => a.id);
    const relevantLikes = (lData ?? []).filter((l: any) => postIds.includes(l.assumption_id));
    setTotalLikes(relevantLikes.length);

    setAssumptions((aData ?? []).map((a: any) => {
      const pl = relevantLikes.filter((l: any) => l.assumption_id === a.id);
      return {
        ...a,
        display_name: prof.display_name || a.username,
        avatar_url:   prof.avatar_url   ?? a.avatar_url,
        avatar_color: prof.avatar_color ?? a.avatar_color,
        is_verified:  prof.is_verified  === true,
        likes:        pl.length,
        alreadyLiked: uid ? pl.some((l: any) => l.user_id === uid) : false,
      };
    }));

    setComments((cData ?? []).filter((c: any) => postIds.includes(c.assumption_id)));
    setLoading(false);
  }, [username]);

  useEffect(() => { if (username) fetchProfileData(); }, [username, fetchProfileData]);

  /* ── azioni feed ── */
  const likePost = useCallback(async (id: string, alreadyLiked: boolean) => {
    if (!user) return;
    setAssumptions(prev => prev.map(a => a.id !== id ? a : {
      ...a,
      alreadyLiked: !alreadyLiked,
      likes: (a.likes || 0) + (alreadyLiked ? -1 : 1),
    }));
    setTotalLikes(t => t + (alreadyLiked ? -1 : 1));
    if (alreadyLiked) await supabase.from("likes").delete().eq("assumption_id", id).eq("user_id", user.id);
    else              await supabase.from("likes").insert([{ assumption_id: id, user_id: user.id }]);
  }, [user]);

  const deletePost = useCallback(async (id: string) => {
    setAssumptions(prev => prev.filter(a => a.id !== id));
    setComments(prev => prev.filter(c => c.assumption_id !== id));
    await Promise.all([
      supabase.from("likes").delete().eq("assumption_id", id),
      supabase.from("comments").delete().eq("assumption_id", id),
      supabase.from("assumptions").delete().eq("id", id),
    ]);
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

  /* addComment usa ref per evitare stale closure senza dipendere da myProfile ── */
  const addComment = useCallback(async (aid: string, t: string, parentId: string | null = null) => {
    if (!t.trim()) return;
    const mp     = myProfileRef.current;
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
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/"); };

  const noOp = useCallback(() => {}, []);

  const commentsByPost = useMemo(() => {
    const map: Record<string, typeof comments> = {};
    for (const c of comments) {
      if (!map[c.assumption_id]) map[c.assumption_id] = [];
      map[c.assumption_id].push(c);
    }
    return map;
  }, [comments]);

  /* ── Avatar inline (stabile, fuori dal render) ── */
  const AvatarInline = useCallback(({ size = 36 }: { size?: number }) => {
    if (!myProfile) return null;
    return myProfile.avatar_url
      ? <img src={myProfile.avatar_url} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} alt={myProfile.username} />
      : <div className="av" style={{ width: size, height: size, fontSize: size * 0.38, background: myProfile.avatar_color ?? "#b83232", flexShrink: 0 }}>{myProfile.username[0].toUpperCase()}</div>;
  }, [myProfile]);

  /* ─── RENDER ─── */
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ color: "var(--muted)", fontFamily: "'DM Sans',sans-serif" }}>Caricamento…</div>
    </div>
  );

  if (notFound) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ textAlign: "center", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>👤</div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Profilo non trovato</div>
        <div>@{username} non esiste su Weird Assumptions.</div>
      </div>
    </div>
  );

  const isOwnProfile = myProfile?.username === pageProfile?.username;

  return (
    <>
      <div className="page-layout">

        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          <Link href="/" className="sidebar-logo">
            <img src={OFFICIAL_LOGO} alt="WA" width={36} height={36} style={{ borderRadius: 8, border: "1.5px solid var(--border)" }} />
            <span className="sidebar-logo-text">Weird<br />Assumptions</span>
          </Link>
          <Link href="/" className="nav-item">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
            Home
          </Link>
          {myProfile && (
            <Link href={`/${myProfile.username}`} className="nav-item" style={{ fontWeight: 700 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              Profilo
            </Link>
          )}
          <div className="sidebar-bottom">
            <button className="nav-item" onClick={() => setDark(d => !d)} style={{ color: "var(--muted)", fontSize: 14 }}>
              {dark
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 22, height: 22 }}><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 22, height: 22 }}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>}
              {dark ? "Modalità chiara" : "Modalità scura"}
            </button>
            {user && myProfile ? (
              <>
                <Link href={`/${myProfile.username}`} className="sidebar-user">
                  <AvatarInline size={36} />
                  <div className="sidebar-user-info">
                    <div className="sidebar-user-name">{myProfile.display_name || myProfile.username}</div>
                    <div className="sidebar-user-handle">@{myProfile.username}</div>
                  </div>
                </Link>
                <button className="nav-item" onClick={handleLogout} style={{ color: "var(--muted)", fontSize: 14 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 22, height: 22 }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                  Logout
                </button>
              </>
            ) : (
              <button onClick={() => router.push("/")} className="login-btn">Accedi</button>
            )}
          </div>
        </aside>

        {/* ── FEED ── */}
        <div className="wrap">

          {/* MOBILE HEADER */}
          <div className="x-header" style={{ position: "relative" }}>
            {/* Freccia indietro */}
            <button onClick={() => router.push("/")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", display: "flex", alignItems: "center", color: "var(--text)", flexShrink: 0, borderRadius: 8, transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            {/* Logo + titolo */}
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flex: 1 }}>
              <img src="/logo.jpeg" alt="WA" width={30} height={30} style={{ borderRadius: 8, border: "1.5px solid var(--border)", flexShrink: 0 }} />
              <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 17, color: "var(--text)", letterSpacing: "-0.01em", lineHeight: 1 }}>Weird Assumptions</span>
            </Link>
            {/* Bottone dark mode — identico alla home */}
            <button onClick={() => setDark(d => !d)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex", alignItems: "center", color: "var(--muted)", borderRadius: 8, transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
              {dark
                ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
            </button>
            {user && myProfile ? (
              <>
                <button onClick={() => setMenuOpen(m => !m)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: "50%", display: "flex" }}>
                  <AvatarInline size={32} />
                </button>
                {menuOpen && (
                  <div className="mob-menu" onClick={() => setMenuOpen(false)}>
                    {/* Profilo solo se si sta guardando il profilo di qualcun altro */}
                    {!isOwnProfile && (
                      <Link href={`/${myProfile.username}`} className="mob-menu-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        Il mio profilo
                      </Link>
                    )}
                    <button className="mob-menu-item danger" onClick={handleLogout}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Logout
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button onClick={() => router.push("/")} className="login-btn">Accedi</button>
            )}
          </div>

          {/* ── HERO PROFILO ── */}
          <div className="profile-hero">
            <div className="profile-cover" style={{
              background: pageProfile!.avatar_url
                ? `linear-gradient(to bottom, ${bannerColor1} 0%, ${bannerColor2} 100%)`
                : avatarGrad(pageProfile!.username),
            }} />
            <div className="profile-av-wrap">
              <div
                style={{ border: "3px solid var(--surface)", borderRadius: "50%", display: "inline-block", cursor: pageProfile!.avatar_url ? "zoom-in" : "default" }}
                onClick={() => pageProfile!.avatar_url && setZoomAvatar(true)}
              >
                <UAv username={pageProfile!.username} size={72} avatarUrl={pageProfile!.avatar_url} avatarColor={pageProfile!.avatar_color} />
              </div>
            </div>
            <div className="profile-info">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="profile-name">{displayFor(pageProfile!.username, pageProfile!.display_name)}</span>
                {pageProfile!.is_verified && <Badge size={18} />}
                {pageProfile!.is_admin && <span className="admin-pill">Admin</span>}
              </div>
              <div className="profile-handle">@{handleFor(pageProfile!.username)}</div>
              {pageProfile!.bio && <div className="profile-bio">{pageProfile!.bio}</div>}
              <div className="profile-stats">
                <div className="profile-stat"><span className="stat-n">{assumptions.length}</span><span className="stat-l">post</span></div>
                <div className="profile-stat"><span className="stat-n">{totalLikes}</span><span className="stat-l">likes ricevuti</span></div>
              </div>
              {isOwnProfile && (
                <button
                  onClick={() => {
                    setEditDisplayName(myProfile?.display_name || myProfile?.username || "");
                    setEditBio(myProfile?.bio || "");
                    setEditColor(myProfile?.avatar_color || "#b83232");
                    setAvatarPreview(null);
                    setEditModal(true);
                  }}
                  className="edit-profile-btn"
                >
                  Modifica profilo
                </button>
              )}
            </div>
          </div>

          {/* ── POST ── */}
          <div style={{ borderTop: "1px solid var(--border)" }}>
            {assumptions.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">✍️</div>
                <div className="empty-title">Ancora silenzio</div>
                <div>Nessun post da @{handleFor(pageProfile!.username)} per ora.</div>
              </div>
            ) : assumptions.map(a => (
              <TweetCard
                key={a.id} a={a}
                comments={commentsByPost[a.id] ?? []}
                isAdmin={isAdmin} profile={myProfile}
                onLike={likePost} onDelete={deletePost} onPin={noOp}
                currentUsername={pageProfile!.username}
                onDeleteComment={deleteComment} onAddComment={addComment}
                onEditPost={editPost} onEditComment={editComment}
              />
            ))}
          </div>
        </div>

        {/* ── COLONNA DESTRA ── */}
        <aside className="right-col">
          {assumptions.length > 0 && (
            <div className="right-widget">
              <div className="right-widget-title">Post più apprezzati</div>
              {[...assumptions].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 3).map(a => (
                <div key={a.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border2)", fontSize: 13 }}>
                  <div style={{ color: "var(--muted)", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{a.text}</div>
                  <div style={{ color: "var(--muted2)", fontSize: 11, marginTop: 4 }}>♡ {a.likes || 0}</div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* ── MODAL MODIFICA PROFILO ── */}
      {editModal && (
        <div className="overlay" onClick={() => setEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ position: "relative", cursor: "pointer" }} onClick={() => editFileRef.current?.click()}>
                {avatarPreview
                  ? <img src={avatarPreview} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} alt="preview" />
                  : myProfile?.avatar_url
                    ? <img src={myProfile.avatar_url} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} alt={myProfile.username} />
                    : <div className="av" style={{ width: 56, height: 56, fontSize: 22, background: editColor }}>{myProfile?.username?.[0]?.toUpperCase()}</div>}
                <div style={{ position: "absolute", bottom: 0, right: 0, background: "var(--red)", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </div>
              </div>
              <input ref={editFileRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (!f) return; setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{myProfile?.display_name || myProfile?.username}</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>@{myProfile?.username}</div>
              </div>
            </div>
            <label className="f-label">NOME VISUALIZZATO</label>
            <input className="f-inp" value={editDisplayName} onChange={e => setEditDisplayName(e.target.value)} placeholder={myProfile?.username} />
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14 }}>Username @{myProfile?.username} non modificabile</div>
            <label className="f-label">BIO</label>
            <input className="f-inp" value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Raccontati in breve…" style={{ marginBottom: 16 }} />
            {!avatarPreview && !myProfile?.avatar_url && (
              <>
                <label className="f-label">COLORE AVATAR</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                  {AVATAR_COLORS.map((c: string) => (
                    <div key={c} onClick={() => setEditColor(c)} style={{ width: 32, height: 32, borderRadius: "50%", background: c, cursor: "pointer", border: editColor === c ? "3px solid var(--text)" : "3px solid transparent" }} />
                  ))}
                </div>
              </>
            )}
            <button className="btn-post" onClick={saveProfile} disabled={editSaving}>{editSaving ? "Salvataggio…" : "Salva profilo"}</button>
            <button className="modal-link" onClick={() => setEditModal(false)}>Annulla</button>
          </div>
        </div>
      )}
      {/* ── LIGHTBOX AVATAR ── */}
      {zoomAvatar && pageProfile?.avatar_url && (
        <div
          onClick={() => setZoomAvatar(false)}
          style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          {/* X in alto a destra */}
          <button
            onClick={() => setZoomAvatar(false)}
            style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <img
            src={pageProfile.avatar_url}
            alt="avatar"
            onClick={e => e.stopPropagation()}
            style={{ width: "min(80vw, 400px)", height: "min(80vw, 400px)", borderRadius: "50%", objectFit: "cover", border: "4px solid rgba(255,255,255,0.15)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}
          />
        </div>
      )}
    </>
  );
}