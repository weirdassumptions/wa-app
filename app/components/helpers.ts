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

/* ─── Challenge of the Day (stored as marker inside text) ─── */
export type ChallengeMeta = {
  date: string; // YYYY-MM-DD
  topic: string;
  body: string;
  marker: string; // full marker prefix (including trailing newline)
};

const ymdLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Solo la data di oggi per la challenge (topic viene da DB/admin). */
export const getChallengeOfDay = (d: Date = new Date()) => ({ date: ymdLocal(d) });

export const encodeChallengePostText = (date: string, topic: string, body: string) => {
  const safeTopic = encodeURIComponent(topic);
  const marker = `[[challenge:${date}|${safeTopic}]]\n`;
  return marker + body;
};

export const parseChallengePostText = (text: string): ChallengeMeta | null => {
  if (!text.startsWith("[[challenge:")) return null;
  const end = text.indexOf("]]\n");
  if (end < 0) return null;
  const header = text.slice(0, end + 2); // include final ]]
  // header looks like [[challenge:YYYY-MM-DD|topic]]
  const inner = header.slice("[[challenge:".length, -2);
  const [date, encTopic = ""] = inner.split("|");
  if (!date) return null;
  let topic = "";
  try { topic = decodeURIComponent(encTopic); } catch { topic = encTopic; }
  const marker = header + "\n";
  const body = text.slice(marker.length);
  return { date, topic, body, marker };
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

/* ─── Mention @: sottosequenza e ordinamento ─── */
export function isSubsequence(query: string, str: string): boolean {
  const q = query.toLowerCase();
  const s = str.toLowerCase();
  let j = 0;
  for (let i = 0; i < s.length && j < q.length; i++) {
    if (s[i] === q[j]) j++;
  }
  return j === q.length;
}

export function subsequenceStartIndex(query: string, str: string): number {
  const q = query.toLowerCase();
  const s = str.toLowerCase();
  if (q.length === 0) return 0;
  let j = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === q[j]) {
      j++;
      if (j === q.length) return i - q.length + 1;
    }
  }
  return Infinity;
}

export type MentionableUser = { username?: string; display_name?: string; avatar_url?: string; avatar_color?: string };
export function sortUsersForMentions(users: MentionableUser[], q: string, watching: string[]): MentionableUser[] {
  const ql = q.toLowerCase();
  const scoreWithSub = (u: MentionableUser): { score: number; subIndex: number } => {
    const un = (u.username ?? "").toLowerCase();
    const dn = (u.display_name ?? "").toLowerCase();
    let s = 0;
    let subIndex = Infinity;
    if (u.username && watching.includes(u.username)) s += 1000;
    if (!ql) return { score: s, subIndex: 0 };
    if (un === ql) return { score: s + 500, subIndex: 0 };
    if (un.startsWith(ql)) return { score: s + 100, subIndex: 0 };
    if (dn.startsWith(ql)) return { score: s + 80, subIndex: 0 };
    if (isSubsequence(ql, un)) {
      s += 30;
      subIndex = Math.min(subIndex, subsequenceStartIndex(ql, un));
    }
    if (isSubsequence(ql, dn)) {
      s += 15;
      subIndex = Math.min(subIndex, subsequenceStartIndex(ql, dn));
    }
    return { score: s, subIndex: subIndex === Infinity ? 999 : subIndex };
  };
  return [...users].sort((a, b) => {
    const da = scoreWithSub(a);
    const db = scoreWithSub(b);
    if (db.score !== da.score) return db.score - da.score;
    if (da.subIndex !== db.subIndex) return da.subIndex - db.subIndex;
    return (a.username ?? "").localeCompare(b.username ?? "", "it");
  });
}