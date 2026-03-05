"use client";

import { useState, useEffect, memo, useCallback } from "react";
import Link from "next/link";

/* ─── Render testo con hashtag evidenziati ─── */
function renderWithHashtags(text: string, onHashtag?: (tag: string) => void) {
  const parts = text.split(/(#[\w\u00C0-\u024F]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("#")) {
      return (
        <span
          key={i}
          onClick={e => { e.stopPropagation(); e.preventDefault(); onHashtag?.(part.toLowerCase()); }}
          onMouseEnter={e => {
            if (onHashtag) {
              (e.currentTarget as HTMLElement).style.opacity = "0.7";
              (e.currentTarget as HTMLElement).style.textDecoration = "underline";
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.opacity = "1";
            (e.currentTarget as HTMLElement).style.textDecoration = "none";
          }}
          style={{
            color: "var(--red)", fontWeight: 600,
            cursor: onHashtag ? "pointer" : "inherit",
            transition: "opacity 0.15s",
            userSelect: "none",
          }}
        >{part}</span>
      );
    }
    return part;
  });
}

import { Avatar, UAv, Badge } from "./Avatar";
import {
  displayFor, handleFor, fmt,
  OFFICIAL_USERNAME,
  type Profile, type Comment, type Assumption,
} from "./helpers";

export type { Profile, Comment, Assumption };
export { displayFor, handleFor, fmt, OFFICIAL_USERNAME };
export { Avatar, UAv, Badge };
export { OFFICIAL_LOGO, OFFICIAL_NAME, OFFICIAL_HANDLE, AVATAR_COLORS, avatarGrad, initial, isOfficial } from "./helpers";

/* ─── useTick: forza re-render ogni N ms per aggiornare timestamp relativi ─── */
export function useTick(ms = 10_000) {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT(t => t + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

/* ─── Add comment box (trigger visivo) ─── */
export function AddCommentBox({ profile, onOpen, onSubmit, activeReply, setActiveReply }: {
  assumptionId: string;
  addComment: (aid: string, t: string, pid: string | null) => void;
  targetUsername: string;
  profile: Profile | null;
  onOpen?: () => void;
  onSubmit?: (text: string) => void;
  activeReply?: string | null;
  setActiveReply?: (v: string | null) => void;
}) {
  const [val, setVal] = useState("");
  useEffect(() => { if (activeReply !== "main") setVal(""); }, [activeReply]);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 16px 10px", borderTop: "1px solid var(--border2)",
    }}>
      <Avatar profile={profile} size={24} />
      <input
        style={{
          flex: 1, background: "none", border: "none", outline: "none",
          fontSize: 13, color: "var(--muted2)", fontFamily: "inherit",
          fontStyle: val ? "normal" : "italic",
        }}
        placeholder="Commenta questa WA…"
        value={val}
        onFocus={() => { onOpen?.(); setActiveReply?.("main"); }}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && val.trim()) { onSubmit?.(val); setVal(""); }
          if (e.key === "Escape") { setVal(""); }
        }}
      />
      {val.trim() && (
        <button
          onClick={() => { onSubmit?.(val); setVal(""); }}
          style={{
            width: 28, height: 28, borderRadius: "50%", border: "none",
            background: "var(--red)", color: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
          </svg>
        </button>
      )}
    </div>
  );
}

/* ─── Reply box (input reale con autoFocus) ─── */
export function ReplyBox({ assumptionId, addComment, targetUsername, profile, parentId, onClose }: {
  assumptionId: string;
  addComment: (aid: string, t: string, pid: string | null) => void;
  targetUsername: string;
  profile: Profile | null;
  parentId: string | null;
  onClose?: () => void;
}) {
  const [t, setT] = useState("");
  const submit = () => {
    if (!t.trim()) return;
    addComment(assumptionId, t, parentId);
    setT("");
    onClose?.();
  };
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 16px 10px", borderTop: "1px solid var(--border2)",
    }}>
      <Avatar profile={profile} size={24} />
      <input
        style={{
          flex: 1, background: "none", border: "none", outline: "none",
          fontSize: 13, color: "var(--muted2)", fontFamily: "inherit", fontStyle: t ? "normal" : "italic",
        }}
        placeholder={`Rispondi a ${targetUsername}…`}
        value={t}
        onChange={e => setT(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onClose?.();
        }}
        autoFocus
      />
      {t.trim() && (
        <button onClick={submit} style={{
          width: 28, height: 28, borderRadius: "50%", border: "none",
          background: "var(--red)", color: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
          </svg>
        </button>
      )}
    </div>
  );
}

/* ─── Comment node (ricorsivo) ─── */
export function CommentNode({
  comment: c, allComments, isAdmin, profile, assumptionId,
  onDelete, onAdd, onEdit, depth, activeReply, setActiveReply,
}: {
  comment: Comment; allComments: Comment[]; isAdmin: boolean; profile: Profile | null;
  assumptionId: string;
  onDelete: (id: string) => void;
  onAdd: (aid: string, t: string, parentId: string | null) => void;
  onEdit: (id: string, text: string) => void;
  depth: number;
  activeReply?: string | null;
  setActiveReply?: (v: string | null) => void;
}) {
  useTick();
  const replying = activeReply === c.id;
  const setReplying = (v: boolean) => setActiveReply?.(v ? c.id : null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(c.text);
  const children = allComments.filter(x => x.parent_id === c.id);

  return (
    <div className="comment-root" style={depth === 0 ? { marginTop: depth === 0 ? 4 : 0 } : {}}>
      <div className="comment-item">
        {c.username !== "anonimo" ? (
          <Link href={`/${c.username}`}>
            <UAv username={c.username} size={32} avatarUrl={c.avatar_url} avatarColor={c.avatar_color} />
          </Link>
        ) : (
          <UAv username={c.username} size={32} avatarUrl={c.avatar_url} avatarColor={c.avatar_color} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {c.username !== "anonimo" ? (
              <Link
                href={`/${c.username}`}
                style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
              >
                {displayFor(c.username, c.display_name)}
              </Link>
            ) : (
              <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>
                {displayFor(c.username, c.display_name)}
              </span>
            )}
            {c.is_verified && <Badge size={13} />}
            <span className="c-time">· {fmt(c.created_at)}</span>
          </div>

          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value.slice(0, 280))}
                rows={2}
                style={{
                  background: "var(--bg)", border: "1px solid var(--red)", borderRadius: 8,
                  padding: "6px 10px", fontSize: 13, color: "var(--text)",
                  fontFamily: "inherit", outline: "none", resize: "none", width: "100%",
                }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => { onEdit(c.id, editText); setEditing(false); }}
                  style={{ background: "var(--red)", border: "none", borderRadius: 999, color: "#fff", fontSize: 11, fontWeight: 600, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}
                >Salva</button>
                <button
                  onClick={() => { setEditing(false); setEditText(c.text); }}
                  style={{ background: "none", border: "1px solid var(--border)", borderRadius: 999, color: "var(--muted)", fontSize: 11, fontWeight: 600, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}
                >Annulla</button>
              </div>
            </div>
          ) : (
            <div className="c-body">
              {renderWithHashtags(c.text, tag => { window.location.href = `/?tag=${encodeURIComponent(tag)}`; })}
              {c.edited && <span style={{ fontSize: 10, color: "var(--muted2)", marginLeft: 5, fontStyle: "italic" }}>· modificato</span>}
            </div>
          )}

          <button className="c-reply-btn" onClick={() => setReplying(!replying)}>
            {replying ? "Annulla" : "↩ Rispondi"}
          </button>
        </div>

        {/* Azioni autore commento */}
        {profile && profile.username === c.username && (
          <div style={{ display: "flex", gap: 4, alignSelf: "flex-start" }}>
            <button
              className="act"
              style={{ color: "var(--muted)", padding: "2px 6px", minWidth: "unset" }}
              onClick={() => setEditing(true)}
              title="Modifica"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button
              className="act del"
              style={{ padding: "2px 6px", minWidth: "unset" }}
              onClick={() => onDelete(c.id)}
              title="Elimina"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}

        {/* Azioni admin (su commenti altrui) */}
        {isAdmin && !(profile && profile.username === c.username) && (
          <button
            className="act del"
            style={{ alignSelf: "flex-start", padding: "2px 6px", minWidth: "unset" }}
            onClick={() => onDelete(c.id)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {replying && (
        <div style={{
          paddingLeft: depth < 3 ? 52 : 20,
          background: "var(--surface)",
          borderTop: "1px solid var(--border2)",
        }}>
          <ReplyBox
            assumptionId={assumptionId}
            addComment={(aid, t, pid) => { onAdd(aid, t, pid); setReplying(false); }}
            targetUsername={displayFor(c.username, c.display_name)}
            profile={profile}
            parentId={c.id}
            onClose={() => setReplying(false)}
          />
        </div>
      )}

      {children.length > 0 && (
        <div className="comment-children">
          {children.map(child => (
            <CommentNode
              key={child.id}
              comment={child}
              allComments={allComments}
              isAdmin={isAdmin}
              profile={profile}
              assumptionId={assumptionId}
              onDelete={onDelete}
              onAdd={onAdd}
              onEdit={onEdit}
              depth={depth + 1}
              activeReply={activeReply}
              setActiveReply={setActiveReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Tweet card ─── */
export const TweetCard = memo(function TweetCard({
  a, comments, isAdmin, profile, onLike, onDelete, onPin,
  onDeleteComment, onAddComment, onEditPost, onEditComment,
  currentUsername = "", openCommentId, setOpenCommentId, onHashtag,
}: {
  a: Assumption;
  comments: Comment[];
  isAdmin: boolean;
  profile: Profile | null;
  onLike: (id: string, alreadyLiked: boolean) => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onDeleteComment: (id: string) => void;
  onAddComment: (aid: string, t: string, pid: string | null) => void;
  onEditPost: (id: string, text: string) => void;
  onEditComment: (id: string, text: string) => void;
  currentUsername?: string;
  openCommentId?: string | null;
  setOpenCommentId?: (id: string | null) => void;
  onHashtag?: (tag: string) => void;
}) {
  useTick();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(a.text);
  const [activeReply, setActiveReply] = useState<string | null>(null);
  const open = openCommentId === a.id;
  const setOpen = (v: boolean) => { setOpenCommentId?.(v ? a.id : null); if (!v) setActiveReply(null); };

  useEffect(() => {
    if (openCommentId !== a.id) setActiveReply(null);
  }, [openCommentId, a.id]);

  // Chiudi reply box quando la sezione commenti si chiude
  useEffect(() => {
    if (!open) setActiveReply(null);
  }, [open]);
  const roots = comments.filter((c: Comment) => !c.parent_id);

  /* Chiude la reply box e aggiunge il commento */
  const handleAddComment = useCallback((aid: string, t: string, pid: string | null) => {
    onAddComment(aid, t, pid);
    setActiveReply(null);
  }, [onAddComment]);

  return (
    <div>
      {a.pinned && (
        <div className="pin-banner">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="#8a6a3a" stroke="none">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
          </svg>
          Post in evidenza
        </div>
      )}

      <div className="tweet-row" onClick={() => { setOpen(!open); if (open) setActiveReply(null); }}>
        {/* Avatar + thread line */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {a.username !== "anonimo" && a.username !== currentUsername ? (
            <Link href={`/${a.username}`} onClick={e => e.stopPropagation()}>
              <UAv username={a.username} size={42} avatarUrl={a.avatar_url} avatarColor={a.avatar_color} />
            </Link>
          ) : (
            <UAv username={a.username} size={42} avatarUrl={a.avatar_url} avatarColor={a.avatar_color} />
          )}
          {open && comments.length > 0 && <div className="thread-line" />}
        </div>

        {/* Contenuto post */}
        <div className="tweet-col" onClick={e => e.stopPropagation()}>
          <div className="tweet-meta">
            <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {a.username !== "anonimo" && a.username !== currentUsername ? (
                  <Link
                    href={`/${a.username}`}
                    style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", textDecoration: "none" }}
                    onClick={e => e.stopPropagation()}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
                  >
                    {displayFor(a.username, a.display_name)}
                  </Link>
                ) : (
                  <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>
                    {displayFor(a.username, a.display_name)}
                  </span>
                )}
                {a.is_verified && <Badge size={15} />}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span className="tw-handle">@{handleFor(a.username)}</span>
                <span className="tw-dot">·</span>
                <span className="tw-time">{fmt(a.created_at)}</span>
              </div>
            </div>
          </div>

          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }} onClick={e => e.stopPropagation()}>
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value.slice(0, 280))}
                rows={3}
                style={{
                  background: "var(--bg)", border: "1px solid var(--red)", borderRadius: 10,
                  padding: "8px 12px", fontSize: 14, color: "var(--text)",
                  fontFamily: "inherit", outline: "none", resize: "none", width: "100%",
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { onEditPost(a.id, editText); setEditing(false); }}
                  style={{ background: "var(--red)", border: "none", borderRadius: 999, color: "#fff", fontSize: 12, fontWeight: 600, padding: "5px 14px", cursor: "pointer", fontFamily: "inherit" }}
                >Salva</button>
                <button
                  onClick={() => { setEditing(false); setEditText(a.text); }}
                  style={{ background: "none", border: "1px solid var(--border)", borderRadius: 999, color: "var(--muted)", fontSize: 12, fontWeight: 600, padding: "5px 14px", cursor: "pointer", fontFamily: "inherit" }}
                >Annulla</button>
              </div>
            </div>
          ) : (
            <div className="tweet-body">
              {renderWithHashtags(a.text, onHashtag)}
              {a.edited && <span style={{ fontSize: 11, color: "var(--muted2)", marginLeft: 6, fontStyle: "italic" }}>· modificato</span>}
            </div>
          )}

          {/* Action bar */}
          <div className="abar">
            <button className="act cmt" onClick={e => { e.stopPropagation(); setOpen(!open); if (open) setActiveReply(null); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {comments.length > 0 && <span>{comments.length}</span>}
            </button>

            <button
              className={`act lk${a.alreadyLiked ? " on" : ""}`}
              onClick={e => { e.stopPropagation(); onLike(a.id, a.alreadyLiked); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {a.likes > 0 && <span>{a.likes}</span>}
            </button>

            {/* Modifica/elimina autore (non admin) */}
            {profile && profile.username === a.username && !isAdmin && (
              <>
                <button
                  className="act"
                  style={{ color: "var(--muted)" }}
                  onClick={e => { e.stopPropagation(); setEditing(true); }}
                  title="Modifica"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  className="act del"
                  onClick={e => { e.stopPropagation(); onDelete(a.id); }}
                  title="Elimina"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                  </svg>
                </button>
              </>
            )}

            {/* Azioni admin */}
            {isAdmin && (
              <>
                <button
                  className={`act pin${a.pinned ? " on" : ""}`}
                  onClick={() => onPin(a.id, !!a.pinned)}
                  title={a.pinned ? "Rimuovi pin" : "Pinna"}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                  </svg>
                </button>
                <button className="act del" onClick={() => onDelete(a.id)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sezione commenti */}
      {open && (
        <div className="comments-area">
          {roots.map((c: Comment) => (
            <CommentNode
              key={c.id}
              comment={c}
              allComments={comments}
              isAdmin={isAdmin}
              profile={profile}
              assumptionId={a.id}
              onDelete={onDeleteComment}
              onAdd={onAddComment}
              onEdit={onEditComment}
              depth={0}
              activeReply={activeReply}
              setActiveReply={setActiveReply}
            />
          ))}

          {(!activeReply || activeReply === "main") && (
            <AddCommentBox
              assumptionId={a.id}
              addComment={handleAddComment}
              targetUsername={displayFor(a.username, a.display_name)}
              profile={profile}
              onOpen={() => setOpenCommentId?.(a.id)}
              onSubmit={t => handleAddComment(a.id, t, null)}
              activeReply={activeReply}
              setActiveReply={setActiveReply}
            />
          )}


        </div>
      )}
    </div>
  );
});