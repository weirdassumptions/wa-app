"use client";

import React, { useState, useEffect, memo, useCallback, useMemo, useRef } from "react";
import Link from "next/link";

/* ─── Render testo con #hashtag e @username (mention) ─── */
const RE_HASHTAG = /#[\w\u00C0-\u024F]+/;
const RE_MENTION = /@[\w]+/;
const RE_HASHTAG_OR_MENTION = /(#[\w\u00C0-\u024F]+|@[\w]+)/g;

const MENTION_HASHTAG_STYLE = {
  color: "var(--red)" as const,
  fontWeight: 600 as const,
  transition: "opacity 0.15s" as const,
};

export function renderWithHashtagsAndMentions(
  text: string,
  onHashtag?: (tag: string) => void,
  composeMode?: boolean,
  validUsernames?: Set<string>
) {
  const parts = text.split(RE_HASHTAG_OR_MENTION);
  return parts.map((part, i) => {
    if (RE_MENTION.test(part)) {
      const username = part.slice(1);
      const isValidMention = !validUsernames || validUsernames.has(username.toLowerCase());
      if (composeMode) {
        if (!isValidMention) return part;
        return (
          <span key={i} style={{ color: "var(--red)", fontWeight: 300, transition: "opacity 0.15s", userSelect: "none" }}>{part}</span>
        );
      }
      if (!isValidMention) return part;
      return (
        <Link
          key={i}
          href={`/${encodeURIComponent(username)}`}
          onClick={e => e.stopPropagation()}
          style={{
            ...MENTION_HASHTAG_STYLE,
            cursor: "pointer", textDecoration: "none",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; (e.currentTarget as HTMLElement).style.textDecoration = "none"; }}
        >{part}</Link>
      );
    }
    if (RE_HASHTAG.test(part)) {
      const cursorVal = onHashtag ? "pointer" : "inherit";
      const style = composeMode
        ? { color: "var(--red)" as const, fontWeight: 300 as const, transition: "opacity 0.15s" as const, cursor: "inherit" as const, userSelect: "none" as const }
        : { ...MENTION_HASHTAG_STYLE, cursor: cursorVal, userSelect: "none" as const };
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
          style={style as React.CSSProperties}
        >{part}</span>
      );
    }
    return part;
  });
}

import { Avatar, UAv, Badge, ChallengeWinnerBadge, WeekWinnerBadge } from "./Avatar";
import {
  displayFor, handleFor, fmt,
  OFFICIAL_USERNAME,
  type Profile, type Comment, type Assumption,
  parseChallengePostText,
  encodeChallengePostText,
  isSubsequence,
  sortUsersForMentions,
  isAnon,
} from "./helpers";

export type { Profile, Comment, Assumption };
export { displayFor, handleFor, fmt, OFFICIAL_USERNAME };
export { Avatar, UAv, Badge };
export { OFFICIAL_LOGO, OFFICIAL_NAME, OFFICIAL_HANDLE, AVATAR_COLORS, avatarGrad, initial, isOfficial, isAnon, getChallengeOfDay, parseChallengePostText, encodeChallengePostText } from "./helpers";
export { ChallengeWinnerBadge, WeekWinnerBadge } from "./Avatar";

/* ─── useTick: forza re-render ogni N ms per aggiornare timestamp relativi ─── */
export function useTick(ms = 10_000) {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT(t => t + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

/* ─── Add comment box con @ mention ─── */
type ProfileForMention = { username?: string; display_name?: string; avatar_url?: string; avatar_color?: string };
export function AddCommentBox({
  profile, onOpen, onSubmit, activeReply, setActiveReply,
  allProfiles = [], validUsernames, watching = [],
}: {
  assumptionId: string;
  addComment: (aid: string, t: string, pid: string | null) => void;
  targetUsername: string;
  profile: Profile | null;
  onOpen?: () => void;
  onSubmit?: (text: string) => void;
  activeReply?: string | null;
  setActiveReply?: (v: string | null) => void;
  allProfiles?: ProfileForMention[];
  validUsernames?: Set<string>;
  watching?: string[];
}) {
  const [val, setVal] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState<{ open: boolean; query: string; start: number; end: number }>({ open: false, query: "", start: 0, end: 0 });
  const [mentionHover, setMentionHover] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const pendingCursorRef = useRef<number | null>(null);
  const pendingCursorTextRef = useRef<string | null>(null);
  const validSet = useMemo(() => validUsernames ?? new Set(allProfiles.map(p => (p.username ?? "").toLowerCase()).filter(Boolean)), [validUsernames, allProfiles]);

  useEffect(() => { if (activeReply !== "main") setVal(""); }, [activeReply]);

  const mentionMatches = useMemo(() => {
    if (!mentionSuggestions.open) return [];
    const q = mentionSuggestions.query.toLowerCase();
    const filtered = allProfiles.filter(u => {
      if (!u.username || isAnon(u.username)) return false;
      if (!q) return true;
      const un = u.username.toLowerCase();
      const dn = (u.display_name ?? "").toLowerCase();
      return un.startsWith(q) || dn.startsWith(q) || isSubsequence(q, un) || isSubsequence(q, dn);
    });
    return sortUsersForMentions(filtered, q, watching).slice(0, 5);
  }, [mentionSuggestions.open, mentionSuggestions.query, allProfiles, watching]);

  useEffect(() => {
    if (taRef.current && pendingCursorRef.current !== null && pendingCursorTextRef.current !== null) {
      const pos = pendingCursorRef.current;
      const expectedText = pendingCursorTextRef.current;
      pendingCursorRef.current = null;
      pendingCursorTextRef.current = null;
      const run = () => {
        if (!taRef.current || taRef.current.value !== expectedText) return;
        const len = taRef.current.value.length;
        taRef.current.focus();
        taRef.current.setSelectionRange(Math.min(pos, len), Math.min(pos, len));
      };
      setTimeout(run, 0);
    }
  }, [val]);

  const handleChange = (v: string) => {
    const text = v.slice(0, 280);
    setVal(text);
    const start = taRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, start);
    const lastAt = before.lastIndexOf("@");
    if (lastAt >= 0) {
      const afterAt = before.slice(lastAt + 1);
      const match = afterAt.match(/^[\w]*/);
      const query = match ? match[0] : "";
      const end = lastAt + 1 + query.length;
      const charAfter = text.slice(end, end + 1);
      const mentionComplete = query.length > 0 && charAfter !== "" && (charAfter === " " || /[.,;:!?\n]/.test(charAfter));
      if (!mentionComplete) {
        setMentionSuggestions({ open: true, query, start: lastAt, end });
      } else {
        setMentionSuggestions(prev => ({ ...prev, open: false }));
        setMentionHover(null);
      }
    } else {
      setMentionSuggestions(prev => ({ ...prev, open: false }));
      setMentionHover(null);
    }
  };

  const submit = () => {
    if (!val.trim()) return;
    onSubmit?.(val);
    setVal("");
  };

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8,
      padding: "8px 16px 10px", borderTop: "1px solid var(--border2)",
    }}>
      <Avatar profile={profile} size={24} />
      <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
        <div
          aria-hidden
          style={{
            position: "absolute", top: 0, left: 0, right: 0, minHeight: 40, padding: "6px 0",
            fontFamily: "inherit", fontSize: 13, lineHeight: 1.4, color: "var(--text)", whiteSpace: "pre-wrap", wordBreak: "break-word", overflow: "hidden", pointerEvents: "none", zIndex: 0,
          }}
        >
          {val ? renderWithHashtagsAndMentions(val, () => {}, true, validSet) : "\u00A0"}
        </div>
        <textarea
          ref={taRef}
          placeholder="Commenta questa WA…"
          value={val}
          onFocus={() => { onOpen?.(); setActiveReply?.("main"); }}
          onChange={e => handleChange(e.target.value)}
          onBlur={() => setTimeout(() => { setMentionSuggestions(prev => ({ ...prev, open: false })); setMentionHover(null); }, 100)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
            if (e.key === "Escape") setVal("");
          }}
          rows={2}
          style={{
            position: "relative", zIndex: 1, width: "100%", minHeight: 40, resize: "none",
            background: "none", border: "none", outline: "none", fontSize: 13, lineHeight: 1.4, padding: "6px 0",
            color: "transparent", caretColor: "var(--text)", fontFamily: "inherit", boxSizing: "border-box",
          }}
        />
        {mentionSuggestions.open && mentionMatches.length > 0 && (
          <div
            style={{
              position: "absolute", left: 0, right: 0, top: "100%", zIndex: 100,
              background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 8,
              boxShadow: "0 6px 16px rgba(0,0,0,0.1)", marginTop: 2, maxHeight: 180, overflowY: "auto",
            }}
            onMouseDown={e => e.preventDefault()}
          >
            {mentionMatches.map(u => (
              <button
                key={u.username}
                type="button"
                onMouseDown={() => {
                  setMentionSuggestions({ open: false, query: "", start: 0, end: 0 });
                  setMentionHover(null);
                  const newText = (val.slice(0, mentionSuggestions.start) + "@" + (u.username ?? "") + val.slice(mentionSuggestions.end)).slice(0, 280);
                  pendingCursorTextRef.current = newText;
                  pendingCursorRef.current = mentionSuggestions.start + 1 + (u.username ?? "").length;
                  setVal(newText);
                }}
                onMouseEnter={() => setMentionHover(u.username ?? null)}
                onMouseLeave={() => setMentionHover(null)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "4px 8px",
                  cursor: "pointer", border: "none", fontFamily: "inherit", textAlign: "left",
                  background: mentionHover === u.username ? "rgba(212,90,74,0.15)" : "transparent",
                }}
              >
                <UAv username={u.username ?? ""} size={20} avatarUrl={u.avatar_url} avatarColor={u.avatar_color} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayFor(u.username ?? "", u.display_name)}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>@{u.username}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {val.trim() && (
          <button
            type="button"
            onClick={submit}
            style={{
              position: "absolute", right: 0, bottom: 0, zIndex: 110,
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
    </div>
  );
}

/* ─── Reply box con @ mention ─── */
export function ReplyBox({
  assumptionId, addComment, targetUsername, profile, parentId, onClose,
  allProfiles = [], validUsernames, watching = [],
}: {
  assumptionId: string;
  addComment: (aid: string, t: string, pid: string | null) => void;
  targetUsername: string;
  profile: Profile | null;
  parentId: string | null;
  onClose?: () => void;
  allProfiles?: ProfileForMention[];
  validUsernames?: Set<string>;
  watching?: string[];
}) {
  const [t, setT] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState<{ open: boolean; query: string; start: number; end: number }>({ open: false, query: "", start: 0, end: 0 });
  const [mentionHover, setMentionHover] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const pendingCursorRef = useRef<number | null>(null);
  const pendingCursorTextRef = useRef<string | null>(null);
  const validSet = useMemo(() => validUsernames ?? new Set(allProfiles.map(p => (p.username ?? "").toLowerCase()).filter(Boolean)), [validUsernames, allProfiles]);

  const mentionMatches = useMemo(() => {
    if (!mentionSuggestions.open) return [];
    const q = mentionSuggestions.query.toLowerCase();
    const filtered = allProfiles.filter(u => {
      if (!u.username || isAnon(u.username)) return false;
      if (!q) return true;
      const un = u.username.toLowerCase();
      const dn = (u.display_name ?? "").toLowerCase();
      return un.startsWith(q) || dn.startsWith(q) || isSubsequence(q, un) || isSubsequence(q, dn);
    });
    return sortUsersForMentions(filtered, q, watching).slice(0, 5);
  }, [mentionSuggestions.open, mentionSuggestions.query, allProfiles, watching]);

  useEffect(() => {
    if (taRef.current && pendingCursorRef.current !== null && pendingCursorTextRef.current !== null) {
      const pos = pendingCursorRef.current;
      const expectedText = pendingCursorTextRef.current;
      pendingCursorRef.current = null;
      pendingCursorTextRef.current = null;
      const run = () => {
        if (!taRef.current || taRef.current.value !== expectedText) return;
        const len = taRef.current.value.length;
        taRef.current.focus();
        taRef.current.setSelectionRange(Math.min(pos, len), Math.min(pos, len));
      };
      setTimeout(run, 0);
    }
  }, [t]);

  const handleChange = (v: string) => {
    const text = v.slice(0, 280);
    setT(text);
    const start = taRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, start);
    const lastAt = before.lastIndexOf("@");
    if (lastAt >= 0) {
      const afterAt = before.slice(lastAt + 1);
      const match = afterAt.match(/^[\w]*/);
      const query = match ? match[0] : "";
      const end = lastAt + 1 + query.length;
      const charAfter = text.slice(end, end + 1);
      const mentionComplete = query.length > 0 && charAfter !== "" && (charAfter === " " || /[.,;:!?\n]/.test(charAfter));
      if (!mentionComplete) {
        setMentionSuggestions({ open: true, query, start: lastAt, end });
      } else {
        setMentionSuggestions(prev => ({ ...prev, open: false }));
        setMentionHover(null);
      }
    } else {
      setMentionSuggestions(prev => ({ ...prev, open: false }));
      setMentionHover(null);
    }
  };

  const submit = () => {
    if (!t.trim()) return;
    addComment(assumptionId, t, parentId);
    setT("");
    onClose?.();
  };

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8,
      padding: "8px 16px 10px", borderTop: "1px solid var(--border2)",
    }}>
      <Avatar profile={profile} size={24} />
      <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
        <div
          aria-hidden
          style={{
            position: "absolute", top: 0, left: 0, right: 0, minHeight: 40, padding: "6px 0",
            fontFamily: "inherit", fontSize: 13, lineHeight: 1.4, color: "var(--text)", whiteSpace: "pre-wrap", wordBreak: "break-word", overflow: "hidden", pointerEvents: "none", zIndex: 0,
          }}
        >
          {t ? renderWithHashtagsAndMentions(t, () => {}, true, validSet) : "\u00A0"}
        </div>
        <textarea
          ref={taRef}
          placeholder={`Rispondi a ${targetUsername}…`}
          value={t}
          onChange={e => handleChange(e.target.value)}
          onBlur={() => setTimeout(() => { setMentionSuggestions(prev => ({ ...prev, open: false })); setMentionHover(null); }, 100)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
            if (e.key === "Escape") onClose?.();
          }}
          rows={2}
          autoFocus
          style={{
            position: "relative", zIndex: 1, width: "100%", minHeight: 40, resize: "none",
            background: "none", border: "none", outline: "none", fontSize: 13, lineHeight: 1.4, padding: "6px 0",
            color: "transparent", caretColor: "var(--text)", fontFamily: "inherit", boxSizing: "border-box",
          }}
        />
        {mentionSuggestions.open && mentionMatches.length > 0 && (
          <div
            style={{
              position: "absolute", left: 0, right: 0, top: "100%", zIndex: 100,
              background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 8,
              boxShadow: "0 6px 16px rgba(0,0,0,0.1)", marginTop: 2, maxHeight: 180, overflowY: "auto",
            }}
            onMouseDown={e => e.preventDefault()}
          >
            {mentionMatches.map(u => (
              <button
                key={u.username}
                type="button"
                onMouseDown={() => {
                  setMentionSuggestions({ open: false, query: "", start: 0, end: 0 });
                  setMentionHover(null);
                  const newText = (t.slice(0, mentionSuggestions.start) + "@" + (u.username ?? "") + t.slice(mentionSuggestions.end)).slice(0, 280);
                  pendingCursorTextRef.current = newText;
                  pendingCursorRef.current = mentionSuggestions.start + 1 + (u.username ?? "").length;
                  setT(newText);
                }}
                onMouseEnter={() => setMentionHover(u.username ?? null)}
                onMouseLeave={() => setMentionHover(null)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "4px 8px",
                  cursor: "pointer", border: "none", fontFamily: "inherit", textAlign: "left",
                  background: mentionHover === u.username ? "rgba(212,90,74,0.15)" : "transparent",
                }}
              >
                <UAv username={u.username ?? ""} size={20} avatarUrl={u.avatar_url} avatarColor={u.avatar_color} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayFor(u.username ?? "", u.display_name)}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>@{u.username}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {t.trim() && (
          <button type="button" onClick={submit} style={{
            position: "absolute", right: 0, bottom: 0, zIndex: 110,
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
    </div>
  );
}

/* ─── Comment node (ricorsivo) ─── */
export function CommentNode({
  comment: c, allComments, isAdmin, profile, assumptionId,
  onDelete, onAdd, onLikeComment, onEdit, onReport, depth, activeReply, setActiveReply,
  validUsernames, allProfiles = [], watching = [],
}: {
  comment: Comment; allComments: Comment[]; isAdmin: boolean; profile: Profile | null;
  assumptionId: string;
  onDelete: (id: string) => void;
  onAdd: (aid: string, t: string, parentId: string | null) => void;
  onLikeComment?: (id: string, alreadyLiked: boolean) => void;
  onEdit: (id: string, text: string) => void;
  onReport?: (id: string) => void;
  depth: number;
  activeReply?: string | null;
  setActiveReply?: (v: string | null) => void;
  validUsernames?: Set<string>;
  allProfiles?: ProfileForMention[];
  watching?: string[];
}) {
  useTick();
  const replying = activeReply === c.id;
  const setReplying = (v: boolean) => setActiveReply?.(v ? c.id : null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(c.text);
  const [reportSent, setReportSent] = useState(false);
  const children = allComments.filter(x => x.parent_id === c.id);

  return (
    <div className="comment-root" style={depth === 0 ? { marginTop: depth === 0 ? 4 : 0 } : {}}>
      <div className="comment-item">
        {!isAnon(c.username) ? (
          <Link href={`/${c.username}`}>
            <UAv username={c.username} size={32} avatarUrl={c.avatar_url} avatarColor={c.avatar_color} />
          </Link>
        ) : (
          <UAv username={c.username} size={32} avatarUrl={c.avatar_url} avatarColor={c.avatar_color} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {!isAnon(c.username) ? (
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
              {renderWithHashtagsAndMentions(c.text, tag => { window.location.assign(`/?tag=${encodeURIComponent(tag)}`); }, false, validUsernames)}
              {c.edited && <span style={{ fontSize: 10, color: "var(--muted2)", marginLeft: 5, fontStyle: "italic" }}>· modificato</span>}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 2 }}>
            <button className="c-reply-btn" onClick={() => setReplying(!replying)}>
              {replying ? "Annulla" : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{marginRight:3,verticalAlign:"middle"}}><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>Rispondi</>}
            </button>
            {onLikeComment && profile && (
              <button
                className={`act lk${c.alreadyLiked ? " on" : ""}`}
                style={{ padding: "2px 6px", minWidth: "unset", fontSize: 11 }}
                onClick={e => { e.stopPropagation(); onLikeComment(c.id, !!c.alreadyLiked); }}
                title="Mi piace"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" style={{ width: 14, height: 14 }}>
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                {(c.likes ?? 0) > 0 && <span>{c.likes}</span>}
              </button>
            )}
          </div>
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

        {/* Segnala commento (loggato e non autore) */}
        {onReport && profile && profile.username !== c.username && (
          <button
            className="act"
            style={{ alignSelf: "flex-start", padding: "2px 6px", minWidth: "unset", color: "var(--muted)", fontSize: 11 }}
            onClick={() => {
              if (reportSent) return;
              if (window.confirm("Segnala questo commento? La segnalazione sarà esaminata dai moderatori.")) {
                onReport(c.id);
                setReportSent(true);
              }
            }}
            title="Segnala contenuto"
          >
            {reportSent ? "Inviata" : "Segnala"}
          </button>
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
            allProfiles={allProfiles}
            validUsernames={validUsernames}
            watching={watching}
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
              onLikeComment={onLikeComment}
              onEdit={onEdit}
              onReport={onReport}
              depth={depth + 1}
              activeReply={activeReply}
              setActiveReply={setActiveReply}
              validUsernames={validUsernames}
              allProfiles={allProfiles}
              watching={watching}
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
  onDeleteComment, onAddComment, onLikeComment, onEditPost, onEditComment,
  onReportPost, onReportComment,
  currentUsername = "", openCommentId, setOpenCommentId, onHashtag,
  watching = [], onToggleWatch, validUsernames, allProfiles = [],
  challengeWinnerUsername, previousWeekWinnerUsername,
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
  onLikeComment?: (id: string, alreadyLiked: boolean) => void;
  onEditPost: (id: string, text: string) => void;
  onEditComment: (id: string, text: string) => void;
  onReportPost?: (id: string) => void;
  onReportComment?: (id: string) => void;
  currentUsername?: string;
  openCommentId?: string | null;
  setOpenCommentId?: (id: string | null) => void;
  onHashtag?: (tag: string) => void;
  watching?: string[];
  onToggleWatch?: (username: string) => void;
  validUsernames?: Set<string>;
  allProfiles?: ProfileForMention[];
  /** Username del vincitore della challenge di ieri (badge visibile per un giorno) */
  challengeWinnerUsername?: string | null;
  /** Username dell'utente con più like nella settimana precedente */
  previousWeekWinnerUsername?: string | null;
}) {
  useTick();
  const challenge = useMemo(() => parseChallengePostText(a.text), [a.text]);
  const displayText = challenge?.body ?? a.text;
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(() => displayText);
  const [activeReply, setActiveReply] = useState<string | null>(null);
  const [reportSent, setReportSent] = useState<"post" | "comment" | null>(null);
  const open = openCommentId === a.id;
  const setOpen = (v: boolean) => { setOpenCommentId?.(v ? a.id : null); if (!v) setActiveReply(null); };

  useEffect(() => {
    if (openCommentId !== a.id) setActiveReply(null);
  }, [openCommentId, a.id]);

  // Chiudi reply box quando la sezione commenti si chiude
  useEffect(() => {
    if (!open) setActiveReply(null);
  }, [open]);

  useEffect(() => {
    if (!editing) setEditText(displayText);
  }, [displayText, editing]);
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
          {!isAnon(a.username) && a.username !== currentUsername ? (
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
                {!isAnon(a.username) && a.username !== currentUsername ? (
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
                {challengeWinnerUsername && a.username === challengeWinnerUsername && <ChallengeWinnerBadge size={15} />}
                {previousWeekWinnerUsername && a.username === previousWeekWinnerUsername && <WeekWinnerBadge size={15} />}
                {onToggleWatch && !isAnon(a.username) && a.username !== currentUsername && (
                  <button
                    onClick={e => { e.stopPropagation(); onToggleWatch(a.username); }}
                    title={watching.includes(a.username) ? "Smetti di osservare" : "Osserva"}
                    style={{
                      background: watching.includes(a.username) ? "var(--red-pale, rgba(212,90,74,0.1))" : "var(--bg2)",
                      border: "none", cursor: "pointer",
                      padding: "2px 8px", borderRadius: 999,
                      fontSize: 11, fontWeight: 600, lineHeight: 1.4,
                      color: watching.includes(a.username) ? "var(--red)" : "var(--muted)",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = "0.75"; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                  >
                    {watching.includes(a.username) ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> osservato</> : "+ osserva"}
                  </button>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span className="tw-handle">@{handleFor(a.username)}</span>
                <span className="tw-dot">·</span>
                <span className="tw-time">{fmt(a.created_at)}</span>
              </div>
            </div>
          </div>

          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }} onClick={e => e.stopPropagation()}>
              <textarea
                value={editText}
                autoFocus
                onChange={e => setEditText(e.target.value.slice(0, 280))}
                rows={3}
                style={{
                  background: "none", border: "none", borderBottom: "1px solid var(--border2)",
                  padding: "4px 0", fontSize: 15, color: "var(--text)", lineHeight: 1.55,
                  fontFamily: "inherit", outline: "none", resize: "none", width: "100%",
                }}
              />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={() => {
                    const newText = challenge ? encodeChallengePostText(challenge.date, challenge.topic, editText) : editText;
                    onEditPost(a.id, newText);
                    setEditing(false);
                  }}
                  style={{ background: "var(--red)", border: "none", borderRadius: 999, color: "#fff", fontSize: 12, fontWeight: 600, padding: "4px 14px", cursor: "pointer", fontFamily: "inherit" }}
                >Salva</button>
                <button
                  onClick={() => { setEditing(false); setEditText(displayText); }}
                  style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                >Annulla</button>
              </div>
            </div>
          ) : (
            <div className="tweet-body">
              {challenge ? (
                <div style={{
                  background: "var(--bg2)",
                  border: "1px solid var(--border2)",
                  borderLeft: "3px solid var(--red)",
                  borderRadius: 10,
                  padding: "12px 14px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "var(--red)", textTransform: "uppercase" }}>Challenge</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", lineHeight: 1.4 }}>{challenge.topic}</span>
                  </div>
                  <div style={{ fontSize: "inherit", lineHeight: "inherit" }}>
                    {renderWithHashtagsAndMentions(displayText, onHashtag)}
                  </div>
                </div>
              ) : (
                <>
                  {renderWithHashtagsAndMentions(displayText, onHashtag)}
                </>
              )}
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

            <Link
              href={`/share/${a.id}`}
              className="act"
              style={{ color: "var(--muted)" }}
              onClick={e => e.stopPropagation()}
              title="Condividi"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </Link>

            {/* Modifica + Elimina autore */}
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
                <button className="act del" onClick={e => { e.stopPropagation(); onDelete(a.id); }} title="Elimina">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                  </svg>
                </button>
              </>
            )}

            {/* Segnala (solo se loggato e non autore) */}
            {onReportPost && profile && profile.username !== a.username && (
              <button
                className="act"
                style={{ color: "var(--muted)" }}
                onClick={e => {
                  e.stopPropagation();
                  if (reportSent === "post") return;
                  if (window.confirm("Segnala questo post? La segnalazione sarà esaminata dai moderatori.")) {
                    onReportPost(a.id);
                    setReportSent("post");
                  }
                }}
                title="Segnala contenuto"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                {reportSent === "post" && <span style={{ fontSize: 11 }}>Inviata</span>}
              </button>
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
              onLikeComment={onLikeComment}
              profile={profile}
              assumptionId={a.id}
              onDelete={onDeleteComment}
              onAdd={onAddComment}
              onEdit={onEditComment}
              onReport={onReportComment}
              depth={0}
              activeReply={activeReply}
              setActiveReply={setActiveReply}
              validUsernames={validUsernames}
              allProfiles={allProfiles}
              watching={watching}
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
              allProfiles={allProfiles}
              validUsernames={validUsernames}
              watching={watching}
            />
          )}


        </div>
      )}
    </div>
  );
});