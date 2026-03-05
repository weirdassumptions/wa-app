"use client";

import { isOfficial, avatarGrad, initial } from "./helpers";
import type { Profile } from "./helpers";

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