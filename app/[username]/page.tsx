"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import {
  TweetCard, UAv, Badge,
  displayFor, handleFor, avatarGrad, isOfficial,
  OFFICIAL_LOGO, OFFICIAL_USERNAME, AVATAR_COLORS,
  type Profile, type Comment,
} from "../components/tweet-card";

type Assumption = {
  id: string; text: string; username: string; display_name?: string;
  avatar_url?: string; avatar_color?: string; is_verified?: boolean;
  created_at: string; pinned?: boolean; edited?: boolean;
  likes?: number; alreadyLiked?: boolean;
};

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();

  const [pageProfile, setPageProfile] = useState<Profile | null>(null);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [totalLikes, setTotalLikes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("theme") === "dark";
    return false;
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  /* modifica profilo */
  const [editModal, setEditModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editColor, setEditColor] = useState("#b83232");
  const [editSaving, setEditSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  const uploadAvatar = async (file: File, userId: string): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl + "?t=" + Date.now();
  };

  const saveProfile = async () => {
    if (!user || !myProfile) return;
    setEditSaving(true);
    let avatarUrl = myProfile.avatar_url ?? null;
    if (avatarFile) avatarUrl = await uploadAvatar(avatarFile, user.id);
    await supabase.from("profiles").update({
      bio: editBio, avatar_color: editColor, avatar_url: avatarUrl, display_name: editDisplayName,
    }).eq("id", user.id);
    setEditModal(false); setEditSaving(false); setAvatarFile(null); setAvatarPreview(null);
    fetchProfileData();
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle()
          .then(({ data }) => {
            if (data) { setMyProfile(data); setIsAdmin(data.is_admin === true); }
          });
      }
    });
  }, []);

  useEffect(() => { if (username) fetchProfileData(); }, [username]);

  const fetchProfileData = async () => {
    setLoading(true);
    const { data: prof } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
    if (!prof) { setNotFound(true); setLoading(false); return; }
    setPageProfile(prof);

    const uid = user?.id ?? null;
    const [{ data: aData }, { data: cData }, { data: lData }] = await Promise.all([
      supabase.from("assumptions").select("*").eq("username", username).order("created_at", { ascending: false }),
      supabase.from("comments").select("*").order("created_at", { ascending: true }),
      supabase.from("likes").select("assumption_id,user_id"),
    ]);
    const postIds = (aData ?? []).map((a: any) => a.id);
    const relevantLikes = (lData ?? []).filter((l: any) => postIds.includes(l.assumption_id));
    setTotalLikes(relevantLikes.length);
    setAssumptions((aData ?? []).map((a: any) => {
      const pl = relevantLikes.filter((l: any) => l.assumption_id === a.id);
      return { ...a, display_name: prof.display_name || a.username, avatar_url: prof.avatar_url ?? a.avatar_url, avatar_color: prof.avatar_color ?? a.avatar_color, is_verified: prof.is_verified === true, likes: pl.length, alreadyLiked: uid ? pl.some((l: any) => l.user_id === uid) : false };
    }));
    setComments((cData ?? []).filter((c: any) => postIds.includes(c.assumption_id)));
    setLoading(false);
  };

  const likePost = async (id: string, liked: boolean) => {
    if (!user) return;
    if (liked) await supabase.from("likes").delete().eq("assumption_id", id).eq("user_id", user.id);
    else await supabase.from("likes").insert([{ assumption_id: id, user_id: user.id }]);
    fetchProfileData();
  };
  const deletePost = async (id: string) => {
    await Promise.all([supabase.from("likes").delete().eq("assumption_id", id), supabase.from("comments").delete().eq("assumption_id", id), supabase.from("assumptions").delete().eq("id", id)]);
    fetchProfileData();
  };
  const deleteComment = async (id: string) => { await supabase.from("comments").delete().eq("id", id); fetchProfileData(); };
  const editPost = async (id: string, text: string) => { await supabase.from("assumptions").update({ text, edited: true }).eq("id", id); fetchProfileData(); };
  const editComment = async (id: string, text: string) => { await supabase.from("comments").update({ text, edited: true }).eq("id", id); fetchProfileData(); };
  const addComment = async (aid: string, t: string, parentId: string | null = null) => {
    if (!t.trim()) return;
    const poster = myProfile ? (isOfficial(myProfile.username) ? OFFICIAL_USERNAME : myProfile.username) : "anonimo";
    const dname = myProfile ? displayFor(myProfile.username, myProfile.display_name) : "Anonimo";
    const { data } = await supabase.from("comments").insert([{ text: t, username: poster, display_name: dname, assumption_id: aid, parent_id: parentId, avatar_color: myProfile?.avatar_color ?? null, avatar_url: myProfile?.avatar_url ?? null }]).select().single();
    if (data) setComments(prev => [...prev, { ...data, display_name: dname, avatar_url: myProfile?.avatar_url ?? null, avatar_color: myProfile?.avatar_color ?? null, is_verified: myProfile?.is_verified ?? false }]);
  };
  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/"); };

  /* ─── RENDER ─── */
  if (loading) return (
    <>
      <GlobalStyles />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg)" }}>
        <div style={{ color: "var(--muted)", fontFamily: "'DM Sans',sans-serif" }}>Caricamento…</div>
      </div>
    </>
  );

  if (notFound) return (
    <>
      <GlobalStyles />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg)" }}>
        <div style={{ textAlign: "center", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif" }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>👤</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Profilo non trovato</div>
          <div>@{username} non esiste su Weird Assumptions.</div>
        </div>
      </div>
    </>
  );

  const isOwnProfile = myProfile?.username === pageProfile?.username;
  const AvatarInline = ({ size = 36 }: { size?: number }) => {
    if (!myProfile) return null;
    return myProfile.avatar_url
      ? <img src={myProfile.avatar_url} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
      : <div className="av" style={{ width: size, height: size, fontSize: size * 0.38, background: myProfile.avatar_color ?? "#b83232", flexShrink: 0 }}>{myProfile.username[0].toUpperCase()}</div>;
  };

  return (
    <>
      <GlobalStyles />
      <div className="page-layout">

        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          <a href="/" className="sidebar-logo">
            <img src={OFFICIAL_LOGO} alt="WA" width={36} height={36} style={{ borderRadius: 8, border: "1.5px solid var(--border)" }} />
            <span className="sidebar-logo-text">Weird<br />Assumptions</span>
          </a>
          <a href="/" className="nav-item">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
            Home
          </a>
          {myProfile && (
            <a href={`/${myProfile.username}`} className="nav-item" style={{ fontWeight: 700 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              Profilo
            </a>
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
                <a href={`/${myProfile.username}`} className="sidebar-user">
                  <AvatarInline size={36} />
                  <div className="sidebar-user-info">
                    <div className="sidebar-user-name">{myProfile.display_name || myProfile.username}</div>
                    <div className="sidebar-user-handle">@{myProfile.username}</div>
                  </div>
                </a>
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
            <button onClick={() => router.push("/")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "var(--text)", padding: "4px 6px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{displayFor(pageProfile!.username, pageProfile!.display_name)}</div>
            </div>
            {user && myProfile ? (
              <>
                <button onClick={() => setMenuOpen(m => !m)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
                  <AvatarInline size={32} />
                </button>
                {menuOpen && (
                  <div className="mob-menu" onClick={() => setMenuOpen(false)}>
                    <a href={`/${myProfile.username}`} className="mob-menu-item">Profilo</a>
                    <button className="mob-menu-item" onClick={() => setDark(d => !d)}>{dark ? "Modalità chiara" : "Modalità scura"}</button>
                    <button className="mob-menu-item danger" onClick={handleLogout}>Logout</button>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* ── HERO PROFILO ── */}
          <div className="profile-hero">
            <div className="profile-cover" style={{
              background: pageProfile!.avatar_url
                ? `linear-gradient(to bottom, ${pageProfile!.avatar_color ?? "#b83232"}33, var(--bg2))`
                : avatarGrad(pageProfile!.username)
            }} />
            <div className="profile-av-wrap">
              <div style={{ border: "3px solid var(--surface)", borderRadius: "50%", display: "inline-block" }}>
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
                  className="edit-profile-btn">
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
              <TweetCard key={a.id} a={a}
                comments={comments.filter((c: Comment) => c.assumption_id === a.id)}
                isAdmin={isAdmin} profile={myProfile}
                onLike={likePost} onDelete={deletePost} onPin={() => {}}
                onDeleteComment={deleteComment} onAddComment={addComment}
                onEditPost={editPost} onEditComment={editComment} />
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
                  ? <img src={avatarPreview} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />
                  : myProfile?.avatar_url
                    ? <img src={myProfile.avatar_url} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />
                    : <div className="av" style={{ width: 56, height: 56, fontSize: 22, background: editColor }}>{myProfile?.username?.[0]?.toUpperCase()}</div>}
                <div style={{ position: "absolute", bottom: 0, right: 0, background: "var(--red)", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </div>
              </div>
              <input ref={editFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }} />
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
    </>
  );
}

/* ─── CSS ─── */
function GlobalStyles() {
  return (
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
      [data-theme="dark"] .x-header{background:rgba(20,18,16,0.92)!important;}
      [data-theme="dark"] .tweet-row:hover{background:#1a1510!important;}
      [data-theme="dark"] .comment-item:hover{background:rgba(30,25,20,0.7)!important;}
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
      body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;}

      /* ── layout ── */
      .page-layout{display:grid;grid-template-columns:240px minmax(0,600px) 1fr;min-height:100vh;max-width:1200px;margin:0 auto;}
      .sidebar{position:sticky;top:0;height:100vh;overflow-y:auto;padding:20px 16px;display:flex;flex-direction:column;gap:2px;border-right:1px solid var(--border);}
      .sidebar-logo{display:flex;align-items:center;gap:10px;padding:8px 10px;margin-bottom:20px;cursor:pointer;border-radius:12px;transition:background 0.15s;text-decoration:none;}
      .sidebar-logo:hover{background:var(--bg2);}
      .sidebar-logo-text{font-family:'Playfair Display',serif;font-weight:700;font-size:15px;line-height:1.2;color:var(--text);}
      .nav-item{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;cursor:pointer;font-size:15px;font-weight:500;color:var(--text);text-decoration:none;transition:background 0.15s;border:none;background:none;font-family:inherit;width:100%;text-align:left;}
      .nav-item:hover{background:var(--bg2);}
      .nav-item svg{width:22px;height:22px;flex-shrink:0;}
      .sidebar-bottom{margin-top:auto;display:flex;flex-direction:column;gap:4px;padding-top:12px;border-top:1px solid var(--border2);}
      .sidebar-user{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;cursor:pointer;transition:background 0.15s;text-decoration:none;}
      .sidebar-user:hover{background:var(--bg2);}
      .sidebar-user-info{flex:1;min-width:0;}
      .sidebar-user-name{font-size:14px;font-weight:600;color:var(--text);}
      .sidebar-user-handle{font-size:12px;color:var(--muted);}
      .right-col{padding:20px;}
      .right-widget{background:var(--bg2);border-radius:16px;padding:16px;margin-bottom:16px;}
      .right-widget-title{font-family:'Playfair Display',serif;font-weight:700;font-size:15px;margin-bottom:10px;color:var(--text);}
      @media(max-width:900px){
        .page-layout{grid-template-columns:1fr;}
        .sidebar{display:none;}
        .right-col{display:none;}
      }
      @media(min-width:901px){.x-header{display:none!important;}}

      /* ── wrap / header ── */
      .wrap{min-height:100vh;background:var(--surface);border-left:1px solid var(--border);border-right:1px solid var(--border);}
      .x-header{position:sticky;top:0;z-index:50;background:rgba(253,250,245,0.92);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);padding:0 16px;height:52px;display:flex;align-items:center;gap:12px;}

      /* ── profile hero ── */
      .profile-hero{position:relative;background:var(--surface);}
      .profile-cover{height:110px;width:100%;}
      .profile-av-wrap{position:absolute;top:58px;left:20px;}
      .profile-info{padding:56px 20px 20px;}
      .profile-name{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:var(--text);}
      .profile-handle{font-size:14px;color:var(--muted);margin-top:2px;}
      .profile-bio{font-size:14px;color:var(--text);line-height:1.55;margin-top:8px;max-width:440px;}
      .profile-stats{display:flex;gap:20px;margin-top:12px;}
      .profile-stat{display:flex;align-items:baseline;gap:5px;}
      .stat-n{font-weight:700;font-size:16px;color:var(--text);}
      .stat-l{font-size:13px;color:var(--muted);}
      .edit-profile-btn{margin-top:14px;background:none;border:1.5px solid var(--border);border-radius:999px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:var(--text);padding:7px 20px;transition:border-color 0.15s,background 0.15s;}
      .edit-profile-btn:hover{border-color:var(--red);background:var(--red-pale);}

      /* ── common ── */
      .admin-pill{background:var(--red-pale);border:1px solid rgba(184,50,50,0.3);border-radius:999px;color:var(--red);font-size:10px;font-weight:600;letter-spacing:0.1em;padding:3px 10px;text-transform:uppercase;}
      .av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;flex-shrink:0;overflow:hidden;}
      .badge-official{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:var(--red);flex-shrink:0;}
      .badge-official svg{width:60%;height:60%;}

      /* ── tweets ── */
      .tweet-row{display:flex;gap:14px;padding:16px 20px 0;border-bottom:1px solid var(--border2);cursor:pointer;transition:background 0.12s;background:var(--surface);}
      .tweet-row:hover{background:#faf5ee;}
      .tweet-col{flex:1;min-width:0;padding-bottom:14px;}
      .tweet-meta{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:4px;}
      .tw-handle{font-size:13px;color:var(--muted);}
      .tw-dot{color:var(--muted2);}
      .tw-time{font-size:13px;color:var(--muted);}
      .tweet-body{font-size:16px;line-height:1.6;color:var(--text);white-space:pre-wrap;word-break:break-word;margin-bottom:14px;}
      .abar{display:flex;align-items:center;gap:2px;margin:0 -8px;}
      .act{display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;padding:7px 9px;border-radius:999px;font-size:13px;font-family:'DM Sans',sans-serif;font-weight:500;color:var(--muted);transition:color 0.15s,background 0.15s;min-width:42px;user-select:none;}
      .act svg{width:17px;height:17px;flex-shrink:0;}
      .act.cmt:hover{color:#4a7aaa;background:rgba(74,122,170,0.1);}
      .act.lk:hover{color:var(--red);background:var(--red-ring);}
      .act.lk.on{color:var(--red);}
      .act.lk.on svg{fill:var(--red);stroke:var(--red);}
      .act.del:hover{color:var(--red);background:var(--red-ring);}
      .thread-line{width:2px;flex:1;min-height:14px;background:var(--border);margin:6px auto 0;border-radius:1px;}
      .pin-banner{display:flex;align-items:center;gap:6px;padding:6px 20px;font-size:12px;color:#8a6a3a;background:var(--bg2);border-bottom:1px solid var(--border2);}

      /* ── commenti ── */
      .comments-area{border-bottom:1px solid var(--border2);background:var(--bg2);}
      .comment-root{border-bottom:1px solid var(--border2);}
      .comment-root:last-of-type{border-bottom:none;}
      .comment-item{display:flex;gap:10px;padding:10px 16px;transition:background 0.12s;}
      .comment-item:hover{background:rgba(245,240,232,0.7);}
      .comment-children{border-left:2px solid var(--border2);margin-left:52px;}
      .c-time{font-size:12px;color:var(--muted);}
      .c-body{font-size:14px;color:var(--text);line-height:1.55;margin-top:2px;}
      .c-reply-btn{background:none;border:none;cursor:pointer;font-size:12px;font-weight:600;color:var(--muted);font-family:inherit;padding:3px 0;margin-top:4px;transition:color 0.15s;}
      .c-reply-btn:hover{color:var(--red);}
      .reply-send{background:var(--red);border:none;border-radius:999px;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;padding:5px 14px;transition:background 0.15s;}
      .reply-send:hover{background:var(--red-h);}

      /* ── empty ── */
      .empty{padding:72px 20px;text-align:center;color:var(--muted);font-family:'DM Sans',sans-serif;}
      .empty-icon{font-size:40px;margin-bottom:14px;}
      .empty-title{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:var(--text);margin-bottom:6px;}

      /* ── mobile menu ── */
      .mob-menu{position:absolute;top:52px;right:12px;background:var(--surface);border:1px solid var(--border);border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,0.12);z-index:100;min-width:180px;overflow:hidden;}
      .mob-menu-item{display:flex;align-items:center;gap:10px;padding:12px 16px;font-size:14px;font-weight:500;color:var(--text);background:none;border:none;cursor:pointer;font-family:inherit;width:100%;text-decoration:none;transition:background 0.12s;}
      .mob-menu-item:hover{background:var(--bg2);}
      .mob-menu-item.danger{color:var(--red);}

      /* ── modal ── */
      .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;}
      .modal{background:var(--surface);border-radius:20px;padding:28px;width:100%;max-width:440px;box-shadow:0 20px 60px rgba(0,0,0,0.18);}
      .f-label{display:block;font-size:11px;font-weight:600;letter-spacing:0.08em;color:var(--muted);text-transform:uppercase;margin-bottom:6px;}
      .f-inp{display:block;width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:10px 14px;font-size:14px;color:var(--text);font-family:inherit;outline:none;margin-bottom:14px;}
      .f-inp:focus{border-color:var(--red);}
      .btn-post{width:100%;background:var(--red);border:none;border-radius:999px;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;padding:11px;transition:background 0.15s;}
      .btn-post:hover{background:var(--red-h);}
      .modal-link{display:block;text-align:center;margin-top:12px;color:var(--muted);font-size:13px;cursor:pointer;background:none;border:none;font-family:inherit;width:100%;}
      .login-btn{background:var(--red);border:none;border-radius:999px;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;padding:9px 20px;transition:background 0.15s;width:calc(100% - 20px);margin:8px 10px;}
    `}</style>
  );
}