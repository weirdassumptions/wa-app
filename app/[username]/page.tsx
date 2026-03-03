"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { Avatar, UAv, Badge } from "../components/Avatar";
import { ReplyBox } from "../components/ReplyBox";
import { CharRing } from "../components/CharRing";
import {
  OFFICIAL_LOGO, OFFICIAL_NAME, OFFICIAL_HANDLE, OFFICIAL_USERNAME,
  AVATAR_COLORS,
  type Profile, type Comment, type Assumption,
  displayFor, handleFor, fmt, isOfficial, avatarGrad, initial,
} from "../components/helpers";

/* ════════════════════════════════════════════ */
export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();

  /* ── dati pagina ── */
  const [pageProfile, setPageProfile] = useState<Profile | null>(null);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [totalLikes, setTotalLikes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  /* ── sessione corrente ── */
  const [user, setUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  /* ── fetch sessione ── */
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

  /* ── fetch profilo + post ── */
  useEffect(() => {
    if (!username) return;
    fetchProfileData();
  }, [username]);

  const fetchProfileData = async () => {
    setLoading(true);

    /* 1. profilo */
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (!prof) { setNotFound(true); setLoading(false); return; }
    setPageProfile(prof);

    /* 2. post + likes + commenti */
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
      return {
        ...a,
        display_name: prof.display_name || a.username,
        avatar_url: prof.avatar_url ?? a.avatar_url,
        avatar_color: prof.avatar_color ?? a.avatar_color,
        is_verified: prof.is_verified === true,
        likes: pl.length,
        alreadyLiked: uid ? pl.some((l: any) => l.user_id === uid) : false,
      };
    }));

    /* filtra i commenti relativi ai post di questo utente */
    setComments((cData ?? []).filter((c: any) => postIds.includes(c.assumption_id)));

    setLoading(false);
  };

  /* ── azioni ── */
  const likePost = async (id: string, alreadyLiked: boolean) => {
    if (!user) return;
    if (alreadyLiked) await supabase.from("likes").delete().eq("assumption_id", id).eq("user_id", user.id);
    else await supabase.from("likes").insert([{ assumption_id: id, user_id: user.id }]);
    fetchProfileData();
  };

  const deletePost = async (id: string) => {
    await Promise.all([
      supabase.from("likes").delete().eq("assumption_id", id),
      supabase.from("comments").delete().eq("assumption_id", id),
      supabase.from("assumptions").delete().eq("id", id),
    ]);
    fetchProfileData();
  };

  const deleteComment = async (id: string) => {
    await supabase.from("comments").delete().eq("id", id);
    fetchProfileData();
  };

  const addComment = async (aid: string, t: string, parentId: string | null = null) => {
    if (!t.trim()) return;
    const poster = myProfile ? (isOfficial(myProfile.username) ? OFFICIAL_USERNAME : myProfile.username) : "anonimo";
    const dname  = myProfile ? displayFor(myProfile.username, myProfile.display_name) : "Anonimo";
    await supabase.from("comments").insert([{
      text: t, username: poster, display_name: dname, assumption_id: aid, parent_id: parentId,
      avatar_color: myProfile?.avatar_color ?? null,
      avatar_url: myProfile?.avatar_url ?? null,
    }]);
    fetchProfileData();
  };

  /* ── render ── */
  if (loading) return (
    <>
      <GlobalStyles />
      <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ color: "var(--muted)", fontFamily: "'DM Sans',sans-serif" }}>Caricamento…</div>
      </div>
    </>
  );

  if (notFound) return (
    <>
      <GlobalStyles />
      <div className="wrap">
        <BackBar onBack={() => router.push("/")} />
        <div className="empty">
          <div className="empty-icon">👤</div>
          <div className="empty-title">Profilo non trovato</div>
          <div style={{ color: "var(--muted)", fontFamily: "'DM Sans',sans-serif" }}>
            @{username} non esiste su Weird Assumptions.
          </div>
        </div>
      </div>
    </>
  );

  const isOwnProfile = myProfile?.username === pageProfile?.username;

  return (
    <>
      <GlobalStyles />
      <div className="wrap">

        {/* ── top bar ── */}
        <BackBar onBack={() => router.push("/")} label={displayFor(pageProfile!.username, pageProfile!.display_name)} />

        {/* ── hero profilo ── */}
        <div className="profile-hero">
          {/* copertina decorativa */}
          <div
            className="profile-cover"
            style={{
              background: pageProfile!.avatar_url
                ? `linear-gradient(to bottom, ${pageProfile!.avatar_color ?? "#b83232"}22, var(--bg2))`
                : avatarGrad(pageProfile!.username),
            }}
          />

          {/* avatar grande */}
          <div className="profile-av-wrap">
            <div style={{ border: "3px solid var(--surface)", borderRadius: "50%", display: "inline-block" }}>
              <UAv
                username={pageProfile!.username}
                size={72}
                avatarUrl={pageProfile!.avatar_url}
                avatarColor={pageProfile!.avatar_color}
              />
            </div>
          </div>

          <div className="profile-info">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="profile-name">
                {displayFor(pageProfile!.username, pageProfile!.display_name)}
              </span>
              {pageProfile!.is_verified && <Badge size={18} />}
              {pageProfile!.is_admin && <span className="admin-pill">Admin</span>}
            </div>
            <div className="profile-handle">@{handleFor(pageProfile!.username)}</div>
            {pageProfile!.bio && (
              <div className="profile-bio">{pageProfile!.bio}</div>
            )}

            {/* stats */}
            <div className="profile-stats">
              <div className="profile-stat">
                <span className="stat-n">{assumptions.length}</span>
                <span className="stat-l">post</span>
              </div>
              <div className="profile-stat">
                <span className="stat-n">{totalLikes}</span>
                <span className="stat-l">likes ricevuti</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── feed post ── */}
        <div style={{ borderTop: "1px solid var(--border)" }}>
          {assumptions.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">✍️</div>
              <div className="empty-title">Ancora silenzio</div>
              <div>Nessun post da @{handleFor(pageProfile!.username)} per ora.</div>
            </div>
          ) : assumptions.map(a => (
            <TweetCard
              key={a.id}
              a={a}
              comments={comments.filter(c => c.assumption_id === a.id)}
              isAdmin={isAdmin}
              profile={myProfile}
              onLike={likePost}
              onDelete={deletePost}
              onDeleteComment={deleteComment}
              onAddComment={addComment}
            />
          ))}
        </div>
      </div>
    </>
  );
}

/* ─── Back bar ─── */
function BackBar({ onBack, label }: { onBack: () => void; label?: string }) {
  return (
    <div className="x-header">
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "var(--text)", fontFamily: "'DM Sans',sans-serif", padding: "6px 8px", borderRadius: 8, transition: "background 0.15s" }}
        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg2)")}
        onMouseLeave={e => (e.currentTarget.style.background = "none")}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      {label && (
        <div>
          <div className="header-title" style={{ fontSize: 16 }}>{label}</div>
          <div className="header-sub">Profilo</div>
        </div>
      )}
      <img
        src={OFFICIAL_LOGO}
        alt="WA"
        className="header-logo"
        width={32}
        height={32}
        style={{ marginLeft: "auto", cursor: "pointer" }}
        onClick={() => window.location.href = "/"}
      />
    </div>
  );
}

/* ─── Tweet card (identico alla home) ─── */
function TweetCard({ a, comments, isAdmin, profile, onLike, onDelete, onDeleteComment, onAddComment }: any) {
  const [open, setOpen] = useState(false);
  const roots = comments.filter((c: Comment) => !c.parent_id);
  return (
    <div>
      <div className="tweet-row" onClick={() => setOpen(o => !o)}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <UAv username={a.username} size={42} avatarUrl={a.avatar_url} avatarColor={a.avatar_color} />
          {open && comments.length > 0 && <div className="thread-line" />}
        </div>
        <div className="tweet-col" onClick={e => e.stopPropagation()}>
          <div className="tweet-meta">
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>
              {displayFor(a.username, a.display_name)}
            </span>
            {a.is_verified && <Badge size={15} />}
            <span className="tw-handle">@{handleFor(a.username)}</span>
            <span className="tw-dot">·</span>
            <span className="tw-time">{fmt(a.created_at)}</span>
          </div>
          <div className="tweet-body">{a.text}</div>
          <div className="abar">
            <button className="act cmt" onClick={() => setOpen(o => !o)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {comments.length > 0 && <span>{comments.length}</span>}
            </button>
            <button className={`act lk${a.alreadyLiked ? " on" : ""}`} onClick={() => onLike(a.id, a.alreadyLiked)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {a.likes > 0 && <span>{a.likes}</span>}
            </button>
            {isAdmin && (
              <button className="act del" onClick={() => onDelete(a.id)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
      {open && (
        <div className="comments-area">
          {roots.map((c: Comment) => (
            <CommentNode
              key={c.id} comment={c} allComments={comments}
              isAdmin={isAdmin} profile={profile} assumptionId={a.id}
              onDelete={onDeleteComment} onAdd={onAddComment} depth={0}
            />
          ))}
          <ReplyBox
            assumptionId={a.id} addComment={onAddComment}
            targetUsername={displayFor(a.username, a.display_name)}
            profile={profile} parentId={null}
          />
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
        <a href={`/${c.username}`}>
          <UAv username={c.username} size={32} avatarUrl={c.avatar_url} avatarColor={c.avatar_color} />
        </a>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <a href={`/${c.username}`} style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
              {displayFor(c.username, c.display_name)}
            </a>
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
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

/* ─── CSS globale (stesso della home) ─── */
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
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
      body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;}
      .wrap{min-height:100vh;max-width:600px;margin:0 auto;background:var(--surface);border-left:1px solid var(--border);border-right:1px solid var(--border);}
      .x-header{position:sticky;top:0;z-index:50;background:rgba(253,250,245,0.92);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);padding:0 20px;height:56px;display:flex;align-items:center;gap:14px;}
      .header-logo{cursor:pointer;border-radius:8px;object-fit:cover;user-select:none;border:1.5px solid var(--border);flex-shrink:0;transition:opacity 0.15s,border-color 0.15s;}
      .header-logo:hover{opacity:0.75;border-color:var(--red);}
      .header-title{font-family:'Playfair Display',serif;font-weight:700;font-size:18px;line-height:1.1;letter-spacing:-0.01em;}
      .header-sub{font-size:12px;color:var(--muted);margin-top:1px;}
      .admin-pill{background:var(--red-pale);border:1px solid rgba(184,50,50,0.3);border-radius:999px;color:var(--red);font-size:10px;font-weight:600;letter-spacing:0.1em;padding:3px 10px;text-transform:uppercase;}
      .av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;flex-shrink:0;}

      /* ── hero profilo ── */
      .profile-hero{position:relative;background:var(--surface);}
      .profile-cover{height:100px;width:100%;}
      .profile-av-wrap{position:absolute;top:54px;left:20px;}
      .profile-info{padding:52px 20px 20px;}
      .profile-name{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:var(--text);}
      .profile-handle{font-size:14px;color:var(--muted);margin-top:2px;}
      .profile-bio{font-size:14px;color:var(--text);line-height:1.55;margin-top:8px;max-width:440px;}
      .profile-stats{display:flex;gap:20px;margin-top:14px;}
      .profile-stat{display:flex;align-items:baseline;gap:5px;}
      .stat-n{font-weight:700;font-size:16px;color:var(--text);}
      .stat-l{font-size:13px;color:var(--muted);}
      .badge-official{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:var(--red);flex-shrink:0;}
      .badge-official svg{width:60%;height:60%;}

      /* ── tweet ── */
      .tweet-row{display:flex;gap:14px;padding:16px 20px 0;border-bottom:1px solid var(--border2);cursor:pointer;transition:background 0.12s;background:var(--surface);}
      .tweet-row:hover{background:#faf5ee;}
      .tweet-col{flex:1;min-width:0;padding-bottom:14px;}
      .tweet-meta{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:4px;}
      .tw-name{font-weight:600;font-size:14px;color:var(--text);}
      .tw-handle{font-size:13px;color:var(--muted);}
      .tw-dot{color:var(--muted2);}
      .tw-time{font-size:13px;color:var(--muted);}
      .tweet-body{font-size:16px;line-height:1.6;color:var(--text);white-space:pre-wrap;word-break:break-word;margin-bottom:14px;}
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
      .thread-line{width:2px;flex:1;min-height:14px;background:var(--border);margin:6px auto 0;border-radius:1px;}

      /* ── commenti ── */
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

      .empty{padding:72px 20px;text-align:center;color:var(--muted);font-family:'DM Sans',sans-serif;}
      .empty-icon{font-size:40px;margin-bottom:14px;}
      .empty-title{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:var(--text);margin-bottom:6px;}
    `}</style>
  );
}
