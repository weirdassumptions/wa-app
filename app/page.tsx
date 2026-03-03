"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type Comment = {
  id: string;
  text: string;
  username: string;
  assumption_id: string;
  created_at: string;
};

/* ─── Official account identity ─── */
const OFFICIAL_NAME   = "Weird Assumptions";
const OFFICIAL_HANDLE = "weirdassumptions";
const OFFICIAL_LOGO   = "/logo.jpeg";

/* ─── Avatar gradients ─── */
const GRADS = [
  ["#b83232","#d4603a"],
  ["#7a6a5a","#a08870"],
  ["#4a7a6a","#6a9e8a"],
  ["#7a5a8a","#a07ab0"],
  ["#8a6a3a","#b08a50"],
  ["#4a6a8a","#6a8aaa"],
];
const avatarGrad = (n: string) => {
  const [a, b] = GRADS[n.charCodeAt(0) % GRADS.length];
  return `linear-gradient(135deg,${a},${b})`;
};
const initial = (n: string) => n.charAt(0).toUpperCase();

/* ─── Time ─── */
const fmt = (d: string) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s fa`;
  if (s < 3600) return `${Math.floor(s / 60)}m fa`;
  if (s < 86400) return `${Math.floor(s / 3600)}h fa`;
  return new Date(d).toLocaleDateString("it-IT");
};

const isOfficial = (u: string) => u === OFFICIAL_NAME;

/* ═══════════════════════════════════════ */
export default function Home() {
  const [assumptions, setAssumptions]     = useState<any[]>([]);
  const [comments, setComments]           = useState<Comment[]>([]);
  const [text, setText]                   = useState("");
  const [username, setUsername]           = useState("");
  const [isAdmin, setIsAdmin]             = useState(false);
  const [postAsOfficial, setPostAsOfficial] = useState(false);
  const [isPosting, setIsPosting]         = useState(false);
  const [clicks, setClicks]               = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const deviceId = () => {
    let id = localStorage.getItem("device_id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("device_id", id); }
    return id;
  };

  const fetchAll = async () => {
    const [{ data: aData }, { data: cData }, { data: lData }] = await Promise.all([
      supabase.from("assumptions").select("*").order("created_at", { ascending: false }),
      supabase.from("comments").select("*").order("created_at", { ascending: true }),
      supabase.from("likes").select("assumption_id,device_id"),
    ]);
    if (aData) {
      const did = deviceId();
      setAssumptions(aData.map(a => {
        const pl = lData?.filter(l => l.assumption_id === a.id) ?? [];
        return { ...a, likes: pl.length, alreadyLiked: pl.some(l => l.device_id === did) };
      }));
    }
    if (cData) setComments(cData);
  };

  useEffect(() => { fetchAll(); }, []);

  const addAssumption = async () => {
    if (!text.trim()) return;
    setIsPosting(true);
    const poster = postAsOfficial ? OFFICIAL_NAME : (username || "Anonimo");
    await supabase.from("assumptions").insert([{ text, username: poster }]);
    setText("");
    if (!postAsOfficial) setUsername("");
    await fetchAll();
    setIsPosting(false);
  };

  const likePost = async (id: string) => {
    const { error } = await supabase.from("likes").insert([{ assumption_id: id, device_id: deviceId() }]);
    if (!error) fetchAll();
  };

  const deletePost = async (id: string) => {
    await Promise.all([
      supabase.from("likes").delete().eq("assumption_id", id),
      supabase.from("comments").delete().eq("assumption_id", id),
      supabase.from("assumptions").delete().eq("id", id),
    ]);
    fetchAll();
  };

  const deleteComment = async (id: string) => {
    await supabase.from("comments").delete().eq("id", id);
    fetchAll();
  };

  const addComment = async (aid: string, t: string, u: string) => {
    if (!t.trim()) return;
    await supabase.from("comments").insert([{ text: t, username: u || "Anonimo", assumption_id: aid }]);
    fetchAll();
  };

  const handleLogoClick = () => {
    const n = clicks + 1;
    setClicks(n);
    if (timer.current) clearTimeout(timer.current);
    if (n >= 3) {
      setClicks(0);
      if (isAdmin) {
        setIsAdmin(false);
        setPostAsOfficial(false);
        alert("Admin disattivato");
        return;
      }
      const pwd = prompt("Password admin:");
      if (pwd === "weirdassumptions") { setIsAdmin(true); alert("Admin attivato!"); }
      else if (pwd !== null) alert("Password errata.");
      return;
    }
    timer.current = setTimeout(() => setClicks(0), 800);
  };

  /* compose avatar shown */
  const composeAvatar = postAsOfficial
    ? <img src={OFFICIAL_LOGO} alt="WA" style={{ width:42, height:42, borderRadius:"50%", objectFit:"cover", border:"2px solid var(--red)", flexShrink:0 }} />
    : <div className="av" style={{ width:42, height:42, background: username ? avatarGrad(username) : "#c8bfb0", fontSize:16, marginTop:2 }}>{username ? initial(username) : "?"}</div>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        :root {
          --bg:       #f5f0e8;
          --bg2:      #ede8df;
          --surface:  #fdfaf5;
          --border:   #d8d0c2;
          --border2:  #e8e0d4;
          --text:     #1a1510;
          --muted:    #8a7f72;
          --muted2:   #b0a898;
          --red:      #b83232;
          --red-h:    #9c2020;
          --red-pale: #f5ebe8;
          --red-ring: rgba(184,50,50,0.12);
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .wrap {
          min-height: 100vh;
          max-width: 600px;
          margin: 0 auto;
          background: var(--surface);
          border-left: 1px solid var(--border);
          border-right: 1px solid var(--border);
        }

        /* ── Header ── */
        .x-header {
          position: sticky; top: 0; z-index: 50;
          background: rgba(253,250,245,0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
          padding: 0 20px;
          height: 56px;
          display: flex; align-items: center; gap: 14px;
        }
        .header-logo {
          cursor: pointer; border-radius: 8px; object-fit: cover;
          user-select: none; border: 1.5px solid var(--border); flex-shrink: 0;
          transition: opacity 0.15s, border-color 0.15s;
        }
        .header-logo:hover { opacity: 0.75; border-color: var(--red); }
        .header-title {
          font-family: 'Playfair Display', serif;
          font-weight: 700; font-size: 18px; line-height: 1.1;
          color: var(--text); letter-spacing: -0.01em;
        }
        .header-sub { font-size: 12px; color: var(--muted); margin-top: 1px; }

        .admin-pill {
          background: var(--red-pale);
          border: 1px solid rgba(184,50,50,0.3);
          border-radius: 999px; color: var(--red);
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.1em; padding: 3px 10px;
          text-transform: uppercase; margin-left: auto;
        }

        /* ── Avatar ── */
        .av {
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; color: #fff; flex-shrink: 0;
          font-family: 'DM Sans', sans-serif;
        }

        /* ── Compose ── */
        .compose {
          display: flex; gap: 14px;
          padding: 16px 20px 0;
          border-bottom: 6px solid var(--bg2);
          background: var(--surface);
        }
        .compose-col { flex: 1; min-width: 0; }

        /* admin toggle strip */
        .official-toggle {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 0 12px;
          border-bottom: 1px solid var(--border2);
          margin-bottom: 10px;
          cursor: pointer;
          user-select: none;
        }
        .official-toggle-label {
          font-size: 13px; font-weight: 500; color: var(--muted);
          transition: color 0.15s;
          flex: 1;
        }
        .official-toggle-label.on { color: var(--red); font-weight: 600; }

        /* toggle switch */
        .tog-track {
          width: 36px; height: 20px; border-radius: 999px;
          background: var(--border); position: relative;
          transition: background 0.2s; flex-shrink: 0;
        }
        .tog-track.on { background: var(--red); }
        .tog-thumb {
          position: absolute; top: 3px; left: 3px;
          width: 14px; height: 14px; border-radius: 50%;
          background: #fff;
          transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .tog-track.on .tog-thumb { transform: translateX(16px); }

        .compose-name-row {
          display: flex; align-items: center; gap: 6px;
          padding: 2px 0 10px;
          border-bottom: 1px solid var(--border2);
          margin-bottom: 10px;
        }
        .compose-name-at { color: var(--muted2); font-size: 14px; font-weight: 500; }
        .compose-name-inp {
          background: transparent; border: none; outline: none;
          color: var(--text); font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 600; width: 100%;
        }
        .compose-name-inp::placeholder { color: var(--muted2); font-weight: 400; }

        /* official name display in compose */
        .compose-official-name {
          font-size: 14px; font-weight: 700; color: var(--text);
          display: flex; align-items: center; gap: 6px;
          padding: 2px 0 10px;
          border-bottom: 1px solid var(--border2);
          margin-bottom: 10px;
        }

        .compose-ta {
          width: 100%; background: transparent; border: none; outline: none;
          color: var(--text); font-size: 19px; font-family: 'DM Sans', sans-serif;
          font-weight: 300; line-height: 1.5; resize: none; min-height: 72px;
          padding-bottom: 12px;
        }
        .compose-ta::placeholder { color: var(--muted2); font-style: italic; }

        .compose-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 0 14px;
          border-top: 1px solid var(--border2);
        }

        /* char ring */
        .cring { position: relative; display: flex; align-items: center; justify-content: center; }
        .cring-n { position: absolute; font-size: 11px; font-weight: 600; pointer-events: none; }

        .btn-post {
          background: var(--red); border: none; border-radius: 999px;
          color: #fff; cursor: pointer; font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 600; padding: 9px 22px;
          transition: background 0.15s, transform 0.1s;
        }
        .btn-post:hover:not(:disabled) { background: var(--red-h); }
        .btn-post:active:not(:disabled) { transform: scale(0.97); }
        .btn-post:disabled { opacity: 0.35; cursor: not-allowed; }

        /* ── Tweet row ── */
        .tweet-row {
          display: flex; gap: 14px;
          padding: 16px 20px 0;
          border-bottom: 1px solid var(--border2);
          cursor: pointer;
          transition: background 0.12s;
          background: var(--surface);
        }
        .tweet-row:hover { background: #faf5ee; }

        .tweet-col { flex: 1; min-width: 0; padding-bottom: 14px; }

        .tweet-meta {
          display: flex; align-items: center; gap: 5px;
          flex-wrap: wrap; margin-bottom: 4px;
        }
        .tw-name   { font-weight: 600; font-size: 14px; color: var(--text); }
        .tw-handle { font-size: 13px; color: var(--muted); }
        .tw-dot    { color: var(--muted2); font-size: 12px; }
        .tw-time   { font-size: 13px; color: var(--muted); }

        /* verified badge */
        .badge-official {
          display: inline-flex; align-items: center; justify-content: center;
          width: 16px; height: 16px; border-radius: 50%;
          background: var(--red); flex-shrink: 0;
        }
        .badge-official svg { width: 10px; height: 10px; }

        .tweet-body {
          font-size: 16px; font-weight: 400;
          line-height: 1.6; color: var(--text);
          white-space: pre-wrap; word-break: break-word;
          margin-bottom: 14px; letter-spacing: 0.005em;
        }

        /* ── Action bar ── */
        .abar { display: flex; align-items: center; gap: 2px; margin: 0 -8px; }
        .act {
          display: flex; align-items: center; gap: 6px;
          background: none; border: none; cursor: pointer;
          padding: 7px 9px; border-radius: 999px;
          font-size: 13px; font-family: 'DM Sans', sans-serif; font-weight: 500;
          color: var(--muted);
          transition: color 0.15s, background 0.15s;
          min-width: 42px; user-select: none;
        }
        .act svg { width: 17px; height: 17px; flex-shrink: 0; transition: transform 0.15s; }
        .act.cmt:hover      { color: #4a7aaa; background: rgba(74,122,170,0.1); }
        .act.cmt:hover svg  { transform: scale(1.1); }
        .act.lk:hover       { color: var(--red); background: var(--red-ring); }
        .act.lk:hover svg   { transform: scale(1.15); }
        .act.lk.on          { color: var(--red); }
        .act.lk.on svg      { fill: var(--red); stroke: var(--red); }
        .act.lk.on:hover    { background: var(--red-ring); }
        .act.del:hover      { color: var(--red); background: var(--red-ring); }

        .thread-line {
          width: 2px; flex: 1; min-height: 14px;
          background: var(--border); margin: 6px auto 0; border-radius: 1px;
        }

        /* ── Comments ── */
        .comments-area { border-bottom: 1px solid var(--border2); background: var(--bg2); }
        .comment-item {
          display: flex; gap: 10px; padding: 12px 20px;
          border-bottom: 1px solid var(--border2);
          transition: background 0.12s;
        }
        .comment-item:hover { background: rgba(245,240,232,0.7); }
        .comment-item:last-of-type { border-bottom: none; }
        .c-name { font-weight: 600; font-size: 13px; color: var(--text); }
        .c-time { font-size: 12px; color: var(--muted); }
        .c-body { font-size: 14px; color: var(--text); line-height: 1.55; margin-top: 2px; }

        /* ── Reply box ── */
        .reply-box {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 20px 14px;
          border-top: 1px solid var(--border2);
          background: var(--surface);
        }
        .reply-col { flex: 1; display: flex; flex-direction: column; gap: 5px; min-width: 0; }
        .reply-name {
          background: transparent; border: none;
          border-bottom: 1px solid transparent;
          outline: none; color: var(--muted);
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
          padding: 1px 0; width: 130px; transition: border-color 0.2s, color 0.2s;
        }
        .reply-name:focus { border-color: var(--red); color: var(--text); }
        .reply-name::placeholder { color: var(--muted2); font-weight: 400; }
        .reply-inp {
          background: transparent; border: none; outline: none;
          color: var(--text); font-family: 'DM Sans', sans-serif;
          font-size: 15px; width: 100%;
        }
        .reply-inp::placeholder { color: var(--muted2); font-style: italic; }
        .reply-send {
          background: var(--red); border: none; border-radius: 999px;
          color: #fff; cursor: pointer; font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 600; padding: 7px 18px;
          white-space: nowrap; flex-shrink: 0;
          transition: background 0.15s, transform 0.1s;
        }
        .reply-send:hover { background: var(--red-h); }
        .reply-send:active { transform: scale(0.97); }

        /* ── Empty ── */
        .empty { padding: 72px 20px; text-align: center; color: var(--muted); }
        .empty-icon { font-size: 40px; margin-bottom: 14px; }
        .empty-title {
          font-family: 'Playfair Display', serif;
          font-size: 22px; font-weight: 700;
          color: var(--text); margin-bottom: 6px; letter-spacing: -0.01em;
        }
        .empty-sub { font-size: 15px; font-weight: 300; }
      `}</style>

      <div className="wrap">

        {/* ── HEADER ── */}
        <div className="x-header">
          <img src="/logo.jpeg" alt="logo" className="header-logo"
            width={36} height={36} onClick={handleLogoClick} />
          <div>
            <div className="header-title">Weird Assumptions</div>
            <div className="header-sub">{assumptions.length} post pubblicati</div>
          </div>
          {isAdmin && <span className="admin-pill">Admin</span>}
        </div>

        {/* ── COMPOSE ── */}
        <div className="compose">
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
            {composeAvatar}
          </div>

          <div className="compose-col">
            {/* admin: toggle to post as official */}
            {isAdmin && (
              <div className="official-toggle" onClick={() => setPostAsOfficial(v => !v)}>
                <img src={OFFICIAL_LOGO} alt="WA" style={{ width:20, height:20, borderRadius:"50%", objectFit:"cover", border:"1.5px solid var(--red)", flexShrink:0 }} />
                <span className={`official-toggle-label${postAsOfficial ? " on" : ""}`}>
                  {postAsOfficial ? `Stai postando come ${OFFICIAL_NAME}` : "Posta come account ufficiale"}
                </span>
                <div className={`tog-track${postAsOfficial ? " on" : ""}`}>
                  <div className="tog-thumb" />
                </div>
              </div>
            )}

            {/* name row: locked if official, editable if not */}
            {postAsOfficial ? (
              <div className="compose-official-name">
                {OFFICIAL_NAME}
                <span style={{ color:"var(--muted)", fontWeight:400, fontSize:13 }}>@{OFFICIAL_HANDLE}</span>
                {/* verified badge */}
                <span className="badge-official">
                  <svg viewBox="0 0 10 10" fill="none">
                    <path d="M2 5.5L4 7.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </div>
            ) : (
              <div className="compose-name-row">
                <span className="compose-name-at">@</span>
                <input
                  className="compose-name-inp"
                  placeholder="username (opzionale)"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
            )}

            <textarea
              className="compose-ta"
              placeholder={postAsOfficial ? "Scrivi un post ufficiale…" : "Scrivi la tua weird assumption…"}
              value={text}
              onChange={e => setText(e.target.value.slice(0, 280))}
              rows={3}
            />

            <div className="compose-footer">
              <CharRing count={text.length} max={280} />
              <button className="btn-post" onClick={addAssumption} disabled={!text.trim() || isPosting}>
                {isPosting ? "Posting…" : "Posta"}
              </button>
            </div>
          </div>
        </div>

        {/* ── FEED ── */}
        {assumptions.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">👀</div>
            <div className="empty-title">Nessuna assumption ancora</div>
            <div className="empty-sub">Sii il primo a rompere il ghiaccio.</div>
          </div>
        ) : (
          assumptions.map(a => (
            <TweetCard
              key={a.id}
              a={a}
              comments={comments.filter(c => c.assumption_id === a.id)}
              isAdmin={isAdmin}
              onLike={likePost}
              onDelete={deletePost}
              onDeleteComment={deleteComment}
              onAddComment={addComment}
            />
          ))
        )}

      </div>
    </>
  );
}

/* ─── Char ring ─── */
function CharRing({ count, max }: { count: number; max: number }) {
  const r = 11, circ = 2 * Math.PI * r;
  const left = max - count;
  const color = left < 20 ? "#b83232" : left < 60 ? "#c4823a" : "#b0a898";
  return (
    <div className="cring">
      <svg width="30" height="30" viewBox="0 0 30 30">
        <circle cx="15" cy="15" r={r} fill="none" stroke="#d8d0c2" strokeWidth="2.5" />
        <circle cx="15" cy="15" r={r} fill="none" stroke={color} strokeWidth="2.5"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - count / max)}
          strokeLinecap="round" transform="rotate(-90 15 15)"
          style={{ transition:"stroke-dashoffset 0.2s,stroke 0.2s" }} />
      </svg>
      {left <= 20 && <span className="cring-n" style={{ color }}>{left}</span>}
    </div>
  );
}

/* ─── Tweet card ─── */
function TweetCard({ a, comments, isAdmin, onLike, onDelete, onDeleteComment, onAddComment }: any) {
  const [open, setOpen] = useState(false);
  const official = isOfficial(a.username);

  const avatar = official
    ? <img src={OFFICIAL_LOGO} alt="WA" style={{ width:42, height:42, borderRadius:"50%", objectFit:"cover", border:"2px solid var(--red)", flexShrink:0 }} />
    : <div className="av" style={{ width:42, height:42, background: avatarGrad(a.username), fontSize:15 }}>{initial(a.username)}</div>;

  return (
    <div>
      <div className="tweet-row" onClick={() => setOpen(o => !o)}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
          {avatar}
          {open && comments.length > 0 && <div className="thread-line" />}
        </div>

        <div className="tweet-col" onClick={e => e.stopPropagation()}>
          <div className="tweet-meta">
            <span className="tw-name">{a.username}</span>
            {official && (
              <span className="badge-official" title="Account ufficiale">
                <svg viewBox="0 0 10 10" fill="none">
                  <path d="M2 5.5L4 7.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            )}
            <span className="tw-handle">@{a.username.toLowerCase().replace(/\s+/g,"_")}</span>
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

            <button className={`act lk${a.alreadyLiked ? " on" : ""}`} onClick={() => !a.alreadyLiked && onLike(a.id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {a.likes > 0 && <span>{a.likes}</span>}
            </button>

            {isAdmin && (
              <button className="act del" onClick={() => onDelete(a.id)} title="Elimina post">
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
          {comments.map((c: any) => (
            <div key={c.id} className="comment-item">
              {isOfficial(c.username)
                ? <img src={OFFICIAL_LOGO} alt="WA" style={{ width:32, height:32, borderRadius:"50%", objectFit:"cover", border:"1.5px solid var(--red)", flexShrink:0 }} />
                : <div className="av" style={{ width:32, height:32, background: avatarGrad(c.username), fontSize:12 }}>{initial(c.username)}</div>
              }
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span className="c-name">{c.username}</span>
                  {isOfficial(c.username) && (
                    <span className="badge-official" style={{ width:14, height:14 }}>
                      <svg viewBox="0 0 10 10" fill="none">
                        <path d="M2 5.5L4 7.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  )}
                  <span className="c-time">· {fmt(c.created_at)}</span>
                </div>
                <div className="c-body">{c.text}</div>
              </div>
              {isAdmin && (
                <button className="act del" style={{ alignSelf:"flex-start", padding:"2px 6px", minWidth:"unset" }} onClick={() => onDeleteComment(c.id)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width:14, height:14 }}>
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
          <ReplyBox assumptionId={a.id} addComment={onAddComment} targetUsername={a.username} />
        </div>
      )}
    </div>
  );
}

/* ─── Reply box ─── */
function ReplyBox({ assumptionId, addComment, targetUsername }: { assumptionId: string; addComment: (id: string, t: string, u: string) => void; targetUsername: string }) {
  const [t, setT] = useState("");
  const [u, setU] = useState("");
  const submit = () => { if (!t.trim()) return; addComment(assumptionId, t, u); setT(""); setU(""); };

  return (
    <div className="reply-box">
      <div className="av" style={{ width:34, height:34, background: u ? avatarGrad(u) : "#c8bfb0", fontSize:13 }}>
        {u ? initial(u) : "?"}
      </div>
      <div className="reply-col">
        <input className="reply-name" placeholder="username" value={u} onChange={e => setU(e.target.value)} />
        <input
          className="reply-inp"
          placeholder={`Rispondi a ${targetUsername}…`}
          value={t}
          onChange={e => setT(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
        />
      </div>
      <button className="reply-send" onClick={submit}>Rispondi</button>
    </div>
  );
}