"use client";

import { useState, useEffect, useRef } from "react";
import { isOfficial, avatarGrad, initial } from "./helpers";
import type { Profile } from "./helpers";

/* ─── Tooltip badge (hover/click rivela testo) ─── */
function BadgeWithTooltip({ children, label, size = 14 }: { children: React.ReactNode; label: string; size?: number }) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!show) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    document.addEventListener("click", close, true);
    return () => document.removeEventListener("click", close, true);
  }, [show]);
  return (
    <span
      ref={ref}
      style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={e => { e.stopPropagation(); setShow(s => !s); }}
      tabIndex={0}
      role="img"
      aria-label={label}
    >
      {children}
      {show && (
        <span
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginBottom: 6,
            padding: "4px 8px",
            background: "var(--text)",
            color: "var(--surface)",
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 6,
            whiteSpace: "nowrap",
            zIndex: 100,
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}

/* ─── Badge verificato ─── */
export function Badge({ size = 16 }: { size?: number }) {
  return (
    <span className="badge-official" style={{ width: size, height: size }}>
      <svg viewBox="0 0 10 10" fill="none">
        <path d="M2 5.5L4 7.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}

/* ─── Badge vincitore challenge (cerchio con "wa") ─── */
export function ChallengeWinnerBadge({ size = 14 }: { size?: number }) {
  return (
    <BadgeWithTooltip label="Vincitore challenge" size={size}>
      <span style={{ display: "inline-flex", width: size, height: size, cursor: "pointer" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#a67c00" strokeWidth="1.5" style={{ width: size, height: size }}>
          <circle cx="12" cy="12" r="10" fill="#c4a436" stroke="#a67c00"/>
          <text x="12" y="12.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#1a0f00" fontFamily="system-ui, sans-serif" dominantBaseline="middle">wa</text>
        </svg>
      </span>
    </BadgeWithTooltip>
  );
}

/* ─── Badge utente della settimana precedente (stella) ─── */
export function WeekWinnerBadge({ size = 14 }: { size?: number }) {
  return (
    <BadgeWithTooltip label="Utente della settimana" size={size}>
      <span style={{ display: "inline-flex", width: size, height: size, cursor: "pointer" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#c4a436" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size }}>
          <path d="M12 2L15 8.5L22 9.27L17 14.14L18.18 21.02L12 18.77L5.82 21.02L7 14.14L2 9.27L9 8.5L12 2Z"/>
        </svg>
      </span>
    </BadgeWithTooltip>
  );
}

/* ─── Avatar da oggetto Profile ─── */
export function Avatar({ profile, size = 42 }: { profile: Profile | null; size?: number }) {
  if (!profile)
    return (
      <div className="av" style={{ width: size, height: size, background: "#c8bfb0", fontSize: size * 0.38 }}>
        ?
      </div>
    );
  if (profile.avatar_url)
    return (
      <img
        src={profile.avatar_url}
        alt={profile.username}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  return (
    <div className="av" style={{ width: size, height: size, background: profile.avatar_color, fontSize: size * 0.38 }}>
      {initial(profile.display_name || profile.username)}
    </div>
  );
}

/* ─── Avatar da username + dati grezzi (per feed/commenti) ─── */
export function UAv({
  username,
  size = 42,
  avatarUrl,
  avatarColor,
}: {
  username: string;
  size?: number;
  avatarUrl?: string;
  avatarColor?: string;
}) {
  if (avatarUrl)
    return (
      <img
        src={avatarUrl}
        alt={username}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  return (
    <div className="av" style={{ width: size, height: size, background: avatarColor || avatarGrad(username), fontSize: size * 0.35 }}>
      {initial(username)}
    </div>
  );
}