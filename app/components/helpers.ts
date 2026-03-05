/* ─── Constants ─── */
export const OFFICIAL_USERNAME = "wa";
export const OFFICIAL_NAME     = "Weird Assumptions";
export const OFFICIAL_HANDLE   = "wa";
export const OFFICIAL_LOGO     = "/logo-icon.png";
export const AVATAR_COLORS     = ["#b83232","#d4603a","#7a6a5a","#4a7a6a","#7a5a8a","#8a6a3a","#4a6a8a","#6a4a7a"];

/* ─── Types ─── */
export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_color: string;
  avatar_url?: string;
  is_admin?: boolean;
  is_verified?: boolean;
};

export type Comment = {
  id: string;
  text: string;
  username: string;
  display_name?: string;
  is_verified?: boolean;
  assumption_id: string;
  created_at: string;
  parent_id: string | null;
  avatar_url?: string;
  avatar_color?: string;
  edited?: boolean;
};

export type Assumption = {
  id: string;
  text: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  avatar_color?: string;
  is_verified?: boolean;
  likes: number;
  alreadyLiked: boolean;
  created_at: string;
  pinned?: boolean;
  edited?: boolean;
};

/* ─── Gradient helpers ─── */
const GRADS = [
  ["#b83232","#d4603a"],["#7a6a5a","#a08870"],["#4a7a6a","#6a9e8a"],
  ["#7a5a8a","#a07ab0"],["#8a6a3a","#b08a50"],["#4a6a8a","#6a8aaa"],
];

export const avatarGrad = (n: string) => {
  const [a, b] = GRADS[n.charCodeAt(0) % GRADS.length];
  return `linear-gradient(135deg,${a},${b})`;
};

export const initial = (n: string) => n.charAt(0).toUpperCase();

export const isOfficial = (u: string) => u === OFFICIAL_USERNAME;

export const displayFor = (username: string, display_name?: string) =>
  isOfficial(username) ? OFFICIAL_NAME : (display_name || username);

export const handleFor = (username: string) =>
  isOfficial(username) ? OFFICIAL_HANDLE : username.toLowerCase().replace(/\s+/g, "_");

/* fmt: gestisce date con e senza Z finale (Supabase a volte omette il suffisso UTC) */
export const fmt = (d: string) => {
  const date = d.endsWith("Z") ? d : d + "Z";
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "adesso";
  if (s < 3600) return `${Math.floor(s / 60)}m fa`;
  if (s < 86400) return `${Math.floor(s / 3600)}h fa`;
  if (s < 604800) return `${Math.floor(s / 86400)}g fa`;
  return new Date(date).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
};