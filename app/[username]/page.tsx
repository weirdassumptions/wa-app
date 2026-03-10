"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import {
  TweetCard, UAv, Badge, Avatar, ChallengeWinnerBadge, WeekWinnerBadge,
  displayFor, handleFor, avatarGrad, isOfficial, isAnon,
  OFFICIAL_LOGO, OFFICIAL_USERNAME, AVATAR_COLORS,
  parseChallengePostText,
  type Profile, type Comment, type Assumption,
} from "../components/tweet-card";
import { getYesterdayDate } from "../components/helpers";
import { filterBlockedWords } from "../lib/blocked-words";


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
  const raw = useParams<{ username: string }>().username;
  const username = typeof raw === "string" ? decodeURIComponent(raw) : "";
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
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);
  const [activeHashtag, setActiveHashtag] = useState<string | null>(null);
  const [allProfiles, setAllProfiles] = useState<{ username?: string; display_name?: string; avatar_url?: string; avatar_color?: string }[]>([]);
  const [isWatching, setIsWatching] = useState(false);
  const [watchHover, setWatchHover] = useState(false);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const [zoomAvatar, setZoomAvatar] = useState(false);
  const [challengeWinnerUsername, setChallengeWinnerUsername] = useState<string | null>(null);
  const [previousWeekWinnerUsername, setPreviousWeekWinnerUsername] = useState<string | null>(null);
  const [weeksWonCount, setWeeksWonCount] = useState<number>(0);
  const [challengesWonCount, setChallengesWonCount] = useState<number>(0);

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
  const [removeAvatar, setRemoveAvatar]     = useState(false);
  const [bannerFile, setBannerFile]         = useState<File | null>(null);
  const [bannerPreview, setBannerPreview]   = useState<string | null>(null);
  const [removeBanner, setRemoveBanner]     = useState(false);
  const [deleteConfirm, setDeleteConfirm]   = useState(false);
  const [deleteLoading, setDeleteLoading]   = useState(false);
  const [newPassword, setNewPassword]       = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePwdLoading, setChangePwdLoading] = useState(false);
  const [changePwdErr, setChangePwdErr]     = useState("");
  const [changePwdOk, setChangePwdOk]       = useState(false);
  const [editErr, setEditErr]               = useState("");
  const editFileRef = useRef<HTMLInputElement>(null);
  const editBannerFileRef = useRef<HTMLInputElement>(null);

  const uploadAvatar = async (file: File, userId: string): Promise<string | null> => {
    const ext  = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl + "?t=" + Date.now();
  };

  const uploadBanner = async (file: File, userId: string): Promise<string | null> => {
    const ext  = file.name.split(".").pop();
    const path = `${userId}/banner.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl + "?t=" + Date.now();
  };

  /* saveProfile: aggiornamento ottimistico — niente re-fetch ── */
  const saveProfile = async () => {
    if (!user || !myProfile) return;
    setEditSaving(true);
    setEditErr("");
    let avatarUrl = myProfile.avatar_url ?? null;
    if (removeAvatar) {
      avatarUrl = null;
      if (myProfile.avatar_url) {
        const ext = myProfile.avatar_url.split(".").pop()?.split("?")[0] ?? "jpg";
        await supabase.storage.from("avatars").remove([`${user.id}/avatar.${ext}`]);
      }
    } else if (avatarFile) {
      avatarUrl = await uploadAvatar(avatarFile, user.id);
      if (!avatarUrl) { setEditErr("Errore upload avatar."); setEditSaving(false); return; }
    }

    let bannerUrl = myProfile.banner_url ?? null;
    if (removeBanner) {
      bannerUrl = null;
      if (myProfile.banner_url) {
        const ext = myProfile.banner_url.split(".").pop()?.split("?")[0] ?? "jpg";
        await supabase.storage.from("avatars").remove([`${user.id}/banner.${ext}`]);
      }
    } else if (bannerFile) {
      bannerUrl = await uploadBanner(bannerFile, user.id);
      if (!bannerUrl) { setEditErr("Errore upload copertina."); setEditSaving(false); return; }
    }

    const { error } = await supabase.from("profiles").update({
      bio: editBio, avatar_color: editColor, avatar_url: avatarUrl, display_name: editDisplayName, banner_url: bannerUrl,
    }).eq("id", user.id);

    if (error) {
      setEditErr(error.message || "Errore salvataggio profilo.");
      setEditSaving(false);
      return;
    }

    const updated: Profile = { ...myProfile, bio: editBio, avatar_color: editColor, avatar_url: avatarUrl ?? undefined, display_name: editDisplayName, banner_url: bannerUrl ?? undefined };
    setMyProfile(updated);
    myProfileRef.current = updated;
    setPageProfile(prev => prev ? { ...prev, bio: editBio, avatar_color: editColor, avatar_url: avatarUrl ?? undefined, display_name: editDisplayName, banner_url: bannerUrl ?? undefined } : prev);
    // Aggiorna avatar/nome sui post già caricati
    setAssumptions(prev => prev.map(a => ({
      ...a,
      display_name: editDisplayName || a.username,
      avatar_color: editColor,
      avatar_url:   avatarUrl ?? a.avatar_url,
    })));

    setEditModal(false); setEditSaving(false); setEditErr(""); setAvatarFile(null); setAvatarPreview(null); setRemoveAvatar(false); setBannerFile(null); setBannerPreview(null); setRemoveBanner(false);
  };

  const hasRealEmail = user?.email && !String(user.email).endsWith("@wa.local");
  const handleChangePassword = useCallback(async () => {
    if (!newPassword.trim()) { setChangePwdErr("Inserisci la nuova password."); return; }
    if (newPassword !== confirmPassword) { setChangePwdErr("Le password non coincidono."); return; }
    if (newPassword.length < 6) { setChangePwdErr("La password deve avere almeno 6 caratteri."); return; }
    setChangePwdLoading(true); setChangePwdErr("");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangePwdLoading(false);
    if (error) { setChangePwdErr(error.message); return; }
    setChangePwdOk(true);
    setNewPassword(""); setConfirmPassword("");
  }, [newPassword, confirmPassword]);

  /* ── elimina account ── */
  const handleDeleteAccount = useCallback(async () => {
    if (!user) return;
    setDeleteLoading(true);
    try {
      await Promise.all([
        supabase.from("likes").delete().eq("user_id", user.id),
        supabase.from("comments").delete().eq("username", myProfileRef.current?.username ?? ""),
        supabase.from("assumptions").delete().eq("username", myProfileRef.current?.username ?? ""),
        supabase.from("profiles").delete().eq("id", user.id),
      ]);
      const mp = myProfileRef.current;
      if (mp?.avatar_url) {
        const ext = mp.avatar_url.split(".").pop()?.split("?")[0] ?? "jpg";
        await supabase.storage.from("avatars").remove([`${user.id}/avatar.${ext}`]);
      }
      if (mp?.banner_url) {
        const ext = mp.banner_url.split(".").pop()?.split("?")[0] ?? "jpg";
        await supabase.storage.from("avatars").remove([`${user.id}/banner.${ext}`]);
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const res = await fetch(`${url}/functions/v1/delete-user`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ user_id: user.id }),
        });
        const data = await res.json().catch(() => ({}));
        const errMsg = (data as { ok?: boolean; error?: string }).error;
        if (!res.ok) {
          console.error("Errore cancellazione auth:", errMsg ?? res.status);
        } else if ((data as { ok?: boolean }).ok === false && errMsg) {
          console.error("Errore cancellazione auth:", errMsg);
        }
      }
      await supabase.auth.signOut();
      setEditModal(false);
      setDeleteConfirm(false);
      router.push("/app");
    } catch (e) {
      console.error("Errore cancellazione account:", e);
    }
    setDeleteLoading(false);
  }, [user, router]);

  /* ── sessione utente ── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        // Fetch watching status
        supabase.from("watching").select("id").eq("watcher_id", session.user.id).eq("watched_username", username).maybeSingle()
          .then(({ data }) => setIsWatching(!!data));
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

  /* ── lista profili (per @ nei commenti) ── */
  useEffect(() => {
    supabase.from("profiles").select("username, display_name, avatar_url, avatar_color").then(({ data }) => {
      setAllProfiles((data ?? []).filter((r: { username?: string }) => r.username && !isAnon(r.username)));
    });
  }, []);

  const validUsernamesSet = useMemo(() => new Set(allProfiles.map(p => (p.username ?? "").toLowerCase()).filter(Boolean)), [allProfiles]);

  /* ── fetch dati pagina profilo ── */
  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    let prof = (await supabase.from("profiles").select("*").eq("username", username).maybeSingle()).data;
    if (!prof && username && /[\s]/.test(username)) {
      const normalized = username.replace(/\s+/g, "").toLowerCase();
      const { data: all } = await supabase.from("profiles").select("username").limit(500);
      const match = (all ?? []).find((p: { username?: string }) => (p.username ?? "").replace(/\s+/g, "").toLowerCase() === normalized);
      if (match?.username) {
        router.replace(`/${encodeURIComponent(match.username)}`);
        setLoading(false);
        return;
      }
      const { data: prof2 } = await supabase.from("profiles").select("*").eq("username", normalized).maybeSingle();
      if (prof2?.username) {
        router.replace(`/${encodeURIComponent(prof2.username)}`);
        setLoading(false);
        return;
      }
    }
    if (!prof) { setNotFound(true); setLoading(false); return; }
    setPageProfile(prof);

    const uid = myProfileRef.current?.id ?? null;
    const [{ data: aData }, { data: cData }, { data: lData }, { data: clData }] = await Promise.all([
      supabase.from("assumptions").select("*").eq("username", username).order("created_at", { ascending: false }),
      supabase.from("comments").select("*").order("created_at", { ascending: true }),
      supabase.from("likes").select("assumption_id,user_id"),
      supabase.from("comment_likes").select("comment_id,user_id"),
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

    const filteredComments = (cData ?? []).filter((c: any) => postIds.includes(c.assumption_id));
    const clByComment: Record<string, number> = {};
    const clByUser: Record<string, Set<string>> = {};
    (clData ?? []).forEach((cl: { comment_id: string; user_id: string }) => {
      clByComment[cl.comment_id] = (clByComment[cl.comment_id] ?? 0) + 1;
      if (!clByUser[cl.comment_id]) clByUser[cl.comment_id] = new Set();
      clByUser[cl.comment_id].add(cl.user_id);
    });
    setComments(filteredComments.map((c: any) => ({
      ...c,
      likes: clByComment[c.id] ?? 0,
      alreadyLiked: uid ? (clByUser[c.id]?.has(uid) ?? false) : false,
    })));
    setLoading(false);
  }, [username]);

  useEffect(() => { if (username) fetchProfileData(); }, [username, fetchProfileData]);

  /* ── vincitore challenge di ieri (per badge in profilo) ── */
  useEffect(() => {
    let cancelled = false;
    const yesterday = getYesterdayDate();
    supabase.from("assumptions").select("id, text, username, created_at").like("text", "[[challenge:%").limit(400)
      .then(({ data: posts }) => {
        if (cancelled || !posts?.length) return;
        const yesterdayPosts = (posts as any[]).filter(p => parseChallengePostText(p.text)?.date === yesterday);
        if (yesterdayPosts.length === 0) { setChallengeWinnerUsername(null); return; }
        const ids = yesterdayPosts.map(p => p.id);
        return supabase.from("likes").select("assumption_id").in("assumption_id", ids).then(({ data: likes }) => {
          if (cancelled) return;
          const countByPost: Record<string, number> = {};
          (likes ?? []).forEach((l: any) => { countByPost[l.assumption_id] = (countByPost[l.assumption_id] ?? 0) + 1; });
          const withLikes = yesterdayPosts.map(p => ({ ...p, likes: countByPost[p.id] ?? 0 }));
          const best = withLikes.sort((a, b) => b.likes - a.likes)[0];
          setChallengeWinnerUsername(best?.username ?? null);
        });
      });
    return () => { cancelled = true; };
  }, []);

  /* ── utente della settimana precedente (per badge stella) ── */
  useEffect(() => {
    let cancelled = false;
    const now = new Date();
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    thisMonday.setHours(0, 0, 0, 0);
    const prevMonday = new Date(thisMonday);
    prevMonday.setDate(prevMonday.getDate() - 7);
    const prevWeekStart = prevMonday.toISOString();
    const thisWeekStart = thisMonday.toISOString();
    supabase.from("assumptions").select("id, username, created_at")
      .gte("created_at", prevWeekStart).lt("created_at", thisWeekStart)
      .then(({ data: posts }) => {
        if (cancelled || !posts?.length) { setPreviousWeekWinnerUsername(null); return; }
        const filtered = (posts as any[]).filter(p => !isAnon(p.username));
        if (filtered.length === 0) { setPreviousWeekWinnerUsername(null); return; }
        const ids = filtered.map(p => p.id);
        return supabase.from("likes").select("assumption_id").in("assumption_id", ids).then(({ data: likes }) => {
          if (cancelled) return;
          const countByPost: Record<string, number> = {};
          (likes ?? []).forEach((l: any) => { countByPost[l.assumption_id] = (countByPost[l.assumption_id] ?? 0) + 1; });
          const byUser: Record<string, number> = {};
          filtered.forEach(p => {
            const u = p.username;
            if (!byUser[u]) byUser[u] = 0;
            byUser[u] += countByPost[p.id] ?? 0;
          });
          const sorted = Object.entries(byUser).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
          setPreviousWeekWinnerUsername(sorted[0]?.[0] ?? null);
        });
      });
    return () => { cancelled = true; };
  }, []);

  /* ── statistiche achievement (x volte utente settimana, x challenge vinte) ── */
  useEffect(() => {
    if (!pageProfile?.username || isAnon(pageProfile.username)) return;
    let cancelled = false;
    const targetUser = pageProfile.username;

    const weekStart = (d: Date) => {
      const m = new Date(d);
      m.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      m.setHours(0, 0, 0, 0);
      return m.getTime();
    };

    Promise.all([
      supabase.from("assumptions").select("id, username, text, created_at").like("text", "[[challenge:%").limit(500),
      supabase.from("assumptions").select("id, username, created_at").gte("created_at", new Date(Date.now() - 84 * 24 * 60 * 60 * 1000).toISOString()).limit(2000),
    ]).then(([chRes, weekRes]) => {
      if (cancelled) return;
      const challengePosts = (chRes.data ?? []) as { id: string; username: string; text: string; created_at: string }[];
      const weekPosts = (weekRes.data ?? []) as { id: string; username: string; created_at: string }[];

      return supabase.from("likes").select("assumption_id")
        .in("assumption_id", [...new Set([...challengePosts.map(p => p.id), ...weekPosts.map(p => p.id)])])
        .then(({ data: likes }) => {
          if (cancelled) return;
          const likeCount: Record<string, number> = {};
          (likes ?? []).forEach((l: { assumption_id: string }) => { likeCount[l.assumption_id] = (likeCount[l.assumption_id] ?? 0) + 1; });

          let challengesWon = 0;
          const byDate: Record<string, Record<string, number>> = {};
          challengePosts.forEach(p => {
            const meta = parseChallengePostText(p.text);
            if (!meta || isAnon(p.username)) return;
            const date = meta.date;
            if (!byDate[date]) byDate[date] = {};
            byDate[date][p.username] = (byDate[date][p.username] ?? 0) + (likeCount[p.id] ?? 0);
          });
          Object.values(byDate).forEach(users => {
            const entries = Object.entries(users).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
            if (entries[0]?.[0] === targetUser) challengesWon++;
          });

          let weeksWon = 0;
          const byWeek: Record<number, Record<string, number>> = {};
          weekPosts.forEach(p => {
            if (isAnon(p.username)) return;
            const t = new Date(p.created_at.endsWith("Z") ? p.created_at : p.created_at + "Z").getTime();
            const ws = weekStart(new Date(t));
            if (!byWeek[ws]) byWeek[ws] = {};
            byWeek[ws][p.username] = (byWeek[ws][p.username] ?? 0) + (likeCount[p.id] ?? 0);
          });
          Object.values(byWeek).forEach(users => {
            const entries = Object.entries(users).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
            if (entries[0]?.[0] === targetUser) weeksWon++;
          });

          setChallengesWonCount(challengesWon);
          setWeeksWonCount(weeksWon);
        });
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [pageProfile?.username]);

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

  const likeComment = useCallback(async (id: string, alreadyLiked: boolean) => {
    if (!user) return;
    setComments(prev => prev.map(c => c.id !== id ? c : {
      ...c,
      alreadyLiked: !alreadyLiked,
      likes: (c.likes ?? 0) + (alreadyLiked ? -1 : 1),
    }));
    if (alreadyLiked) await supabase.from("comment_likes").delete().eq("comment_id", id).eq("user_id", user.id);
    else              await supabase.from("comment_likes").insert([{ comment_id: id, user_id: user.id }]);
  }, [user]);

  const editPost = useCallback(async (id: string, newText: string) => {
    setAssumptions(prev => prev.map(a => a.id !== id ? a : { ...a, text: newText, edited: true }));
    await supabase.from("assumptions").update({ text: newText, edited: true }).eq("id", id);
  }, []);

  const editComment = useCallback(async (id: string, newText: string) => {
    const filtered = filterBlockedWords(newText);
    setComments(prev => prev.map(c => c.id !== id ? c : { ...c, text: filtered, edited: true }));
    await supabase.from("comments").update({ text: filtered, edited: true }).eq("id", id);
  }, []);

  /* addComment usa ref per evitare stale closure senza dipendere da myProfile ── */
  const addComment = useCallback(async (aid: string, t: string, parentId: string | null = null) => {
    if (!t.trim()) return;
    const mp     = myProfileRef.current;
    const anonCode = 10000 + Math.floor(Math.random() * 90000);
    const poster = mp ? (isOfficial(mp.username) ? OFFICIAL_USERNAME : mp.username) : `anonimo_${anonCode}`;
    const dname  = mp ? displayFor(mp.username, mp.display_name) : `Anonimo ${anonCode}`;
    const filteredText = filterBlockedWords(t.trim());
    const { data } = await supabase.from("comments").insert([{
      text: filteredText, username: poster, display_name: dname, assumption_id: aid, parent_id: parentId,
      avatar_color: mp?.avatar_color ?? null,
      avatar_url:   mp?.avatar_url   ?? null,
    }]).select().single();
    if (data) setComments(prev => [...prev, {
      ...data, text: filteredText, display_name: dname,
      avatar_url:   mp?.avatar_url   ?? null,
      avatar_color: mp?.avatar_color ?? null,
      is_verified:  mp?.is_verified  ?? false,
      likes: 0, alreadyLiked: false,
    }]);
  }, []);

  const navigateToPost = (id: string) => {
    const el = document.getElementById(`post-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const row = el.querySelector(".tweet-row") as HTMLElement | null;
      const target = row || el;
      target.style.transition = "background 0s";
      target.style.background = "rgba(212,90,74,0.3)";
      setTimeout(() => {
        target.style.transition = "background 2s ease-out";
        target.style.background = "var(--surface)";
      }, 50);
      setTimeout(() => { target.style.background = ""; target.style.transition = ""; }, 2300);
    }
  };

  const toggleWatch = async () => {
    if (!user || isOwnProfile) return;
    const wasWatching = isWatching;
    // Ottimistico
    setIsWatching(!wasWatching);
    if (wasWatching) {
      const { error } = await supabase.from("watching").delete().eq("watcher_id", user.id).eq("watched_username", username);
      if (error) { console.error("unwatch error:", error); setIsWatching(true); }
    } else {
      const { error } = await supabase.from("watching").insert({ watcher_id: user.id, watched_username: username });
      if (error) { console.error("watch error:", error); setIsWatching(false); }
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/app"); };

  const reportContent = useCallback(async (contentType: "post" | "comment", contentId: string) => {
    if (!user?.id) return;
    await supabase.from("reports").insert([{
      reporter_id: user.id,
      content_type: contentType,
      content_id: contentId,
      status: "pending",
    }]);
  }, [user?.id]);

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
          <Link href="/app" className="sidebar-logo">
            <img src={dark ? "/logo-full-dark.png" : "/logo-full.png"} alt="Weird Assumptions" height={44} style={{ objectFit: "contain", flexShrink: 0, maxWidth: 200 }} />
          </Link>
          <Link href="/app" className="nav-item">
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
            {isAdmin && (
              <>
                <span className="admin-pill" style={{ textAlign: "center", marginBottom: 4 }}>Admin</span>
                <Link href="/crea-prova" className="nav-item" style={{ marginBottom: 4 }}>
                  Crea account di prova
                </Link>
              </>
            )}
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
              <button onClick={() => router.push("/app")} className="login-btn">Accedi</button>
            )}
          </div>
        </aside>

        {/* ── FEED ── */}
        <div className="wrap">

          {/* MOBILE HEADER */}
          <div className="x-header">
            {/* Freccia indietro */}
            <button onClick={() => router.push("/app")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", display: "flex", alignItems: "center", color: "var(--text)", flexShrink: 0, borderRadius: 8, transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            {/* Logo + titolo */}
            <Link href="/app" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flex: 1 }}>
              <img src={dark ? "/logo-full-dark.png" : "/logo-full.png"} alt="Weird Assumptions" height={32} style={{ objectFit: "contain", maxWidth: 160 }} />
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
              <button onClick={() => router.push("/app")} className="login-btn">Accedi</button>
            )}
          </div>

          {/* ── HERO PROFILO ── */}
          <div className="profile-hero">
            <div className="profile-cover" style={
              pageProfile!.banner_url
                ? { backgroundImage: `url(${pageProfile!.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                : {
                    background: pageProfile!.avatar_url
                      ? `linear-gradient(to bottom, ${bannerColor1} 0%, ${bannerColor2} 100%)`
                      : avatarGrad(pageProfile!.username),
                  }
            } />
            <div className="profile-av-wrap">
              <div
                style={{ border: "3px solid var(--surface)", borderRadius: "50%", display: "inline-block", cursor: pageProfile!.avatar_url ? "zoom-in" : "default" }}
                onClick={() => pageProfile!.avatar_url && setZoomAvatar(true)}
              >
                <UAv username={pageProfile!.username} size={72} avatarUrl={pageProfile!.avatar_url} avatarColor={pageProfile!.avatar_color} />
              </div>
            </div>
            {/* Statistiche achievement in alto a destra sotto al banner */}
            {(weeksWonCount > 0 || challengesWonCount > 0) && (
              <div style={{
                position: "absolute", top: 116, right: 20, zIndex: 2,
                display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6,
              }}>
                {weeksWonCount > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", borderRadius: 999, padding: "6px 12px", border: "1px solid var(--border2)" }}>
                    <WeekWinnerBadge size={14} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                      {weeksWonCount} {weeksWonCount === 1 ? "volta" : "volte"} utente della settimana
                    </span>
                  </div>
                )}
                {challengesWonCount > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", borderRadius: 999, padding: "6px 12px", border: "1px solid var(--border2)" }}>
                    <ChallengeWinnerBadge size={14} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                      {challengesWonCount} challenge {challengesWonCount === 1 ? "vinta" : "vinte"}
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className="profile-info">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="profile-name">{displayFor(pageProfile!.username, pageProfile!.display_name)}</span>
                {pageProfile!.is_verified && <Badge size={18} />}
                {challengeWinnerUsername === pageProfile!.username && <ChallengeWinnerBadge size={18} />}
                {previousWeekWinnerUsername === pageProfile!.username && <WeekWinnerBadge size={18} />}
                {pageProfile!.is_admin && <span className="admin-pill">Admin</span>}
              </div>
              <div className="profile-handle">@{handleFor(pageProfile!.username)}</div>
              {pageProfile!.bio && <div className="profile-bio">{pageProfile!.bio}</div>}
              <div className="profile-stats">
                <div className="profile-stat"><span className="stat-n">{assumptions.length}</span><span className="stat-l">WA</span></div>
                <div className="profile-stat"><span className="stat-n">{totalLikes}</span><span className="stat-l">likes</span></div>
              </div>
              {/* Top WA mobile — nascosto su desktop */}
              {assumptions.length > 0 && (() => {
                const topPost = [...assumptions].sort((a, b) => (b.likes || 0) - (a.likes || 0))[0];
                const challenge = parseChallengePostText(topPost.text);
                const topPostPreview = challenge ? `${challenge.topic} — ${challenge.body}` : topPost.text;
                return (
                  <div
                    className="mobile-only"
                    onClick={() => navigateToPost(topPost.id)}
                    style={{
                      flexDirection: "column", gap: 4, marginTop: 12,
                      background: "var(--bg2)", borderRadius: 12,
                      padding: "10px 14px", cursor: "pointer",
                      border: "1px solid var(--border2)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>🏆 Top WA</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--red)" }}>♥ {topPost.likes || 0}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {topPostPreview}
                    </div>
                  </div>
                );
              })()}
              {isOwnProfile ? (
                <button
                  onClick={() => {
                    setEditDisplayName(myProfile?.display_name || myProfile?.username || "");
                    setEditBio(myProfile?.bio || "");
                    setEditColor(myProfile?.avatar_color || "#b83232");
                    setAvatarFile(null);
                    setAvatarPreview(null);
                    setRemoveAvatar(false);
                    setBannerFile(null);
                    setBannerPreview(null);
                    setRemoveBanner(false);
                    setEditErr("");
                    setEditModal(true);
                  }}
                  className="edit-profile-btn"
                >
                  Modifica profilo
                </button>
              ) : user && !isOwnProfile && (
                <button
                  onClick={toggleWatch}
                  className="edit-profile-btn"
                  style={{
                    background: isWatching ? "transparent" : "var(--red)",
                    color: isWatching ? "var(--muted)" : "#fff",
                    border: isWatching ? "1px solid var(--border2)" : "1px solid transparent",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={() => { if (isWatching) setWatchHover(true); }}
                  onMouseLeave={() => { if (isWatching) setWatchHover(false); }}
                >
                  {isWatching
                    ? (watchHover
                      ? "✕ Smetti"
                      : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Osservato</>)
                    : "Osserva"}
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
              <div key={a.id} id={`post-${a.id}`}>
              <TweetCard
                key={`tc-${a.id}`} a={a}
                openCommentId={openCommentId} setOpenCommentId={setOpenCommentId}
                comments={commentsByPost[a.id] ?? []}
                isAdmin={isAdmin} profile={myProfile}
                onLike={likePost} onDelete={deletePost} onPin={noOp}
                onDeleteComment={deleteComment} onAddComment={addComment} onLikeComment={likeComment}
                onEditPost={editPost} onEditComment={editComment}
                challengeWinnerUsername={challengeWinnerUsername}
                previousWeekWinnerUsername={previousWeekWinnerUsername}
                onReportPost={user ? (id) => reportContent("post", id) : undefined}
                onReportComment={user ? (id) => reportContent("comment", id) : undefined}
                currentUsername={myProfile?.username || ""}
                onHashtag={(tag: string) => { window.location.assign(`/?tag=${encodeURIComponent(tag)}`); }}
                validUsernames={validUsernamesSet}
                allProfiles={allProfiles}
              />
              </div>
            ))}
          </div>
        </div>

        {/* ── COLONNA DESTRA ── */}
        <aside className="right-col">
          {assumptions.length > 0 && (() => {
            const topPost = [...assumptions].sort((a, b) => (b.likes || 0) - (a.likes || 0))[0];
            const challenge = parseChallengePostText(topPost.text);
            const topPostPreview = challenge ? `${challenge.topic} — ${challenge.body}` : topPost.text;
            return (
              <div
                className="right-widget"
                onClick={() => navigateToPost(topPost.id)}
                style={{ cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 14, color: "var(--text)" }}>🏆 Top WA</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--red)", display: "flex", alignItems: "center", gap: 4 }}>
                    ♥ {topPost.likes || 0}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.55, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                  {topPostPreview}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>clicca per vedere il post →</div>
              </div>
            );
          })()}
        </aside>
      </div>

      {/* ── MODAL MODIFICA PROFILO (stile login/signup) ── */}
      {editModal && myProfile && (
        <div className="overlay" onClick={() => { setEditModal(false); setDeleteConfirm(false); setRemoveAvatar(false); setRemoveBanner(false); setEditErr(""); setChangePwdErr(""); setChangePwdOk(false); setNewPassword(""); setConfirmPassword(""); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div
                  className="av-upload"
                  onClick={() => !isOfficial(myProfile.username) && editFileRef.current?.click()}
                  style={{ cursor: isOfficial(myProfile.username) ? "default" : "pointer" }}
                >
                  {avatarPreview
                    ? <img src={avatarPreview} style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover" }} alt="preview" />
                    : !removeAvatar && myProfile.avatar_url
                      ? <img src={myProfile.avatar_url} style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover" }} alt="" />
                      : <Avatar profile={{ ...myProfile, avatar_color: editColor, avatar_url: removeAvatar ? undefined : myProfile.avatar_url }} size={52} />}
                  {!isOfficial(myProfile.username) && (
                    <div className="av-upload-overlay">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </div>
                  )}
                </div>
                {!isOfficial(myProfile.username) && (avatarPreview || (!removeAvatar && myProfile.avatar_url)) && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setRemoveAvatar(true); setAvatarFile(null); setAvatarPreview(null); }}
                    title="Rimuovi foto"
                    style={{ position: "absolute", top: -4, right: -4, width: 22, height: 22, borderRadius: "50%", border: "none", background: "var(--red)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, fontSize: 14, lineHeight: 1 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
              <input ref={editFileRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); setRemoveAvatar(false); }}} />
              <input ref={editBannerFileRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) { setBannerFile(f); setBannerPreview(URL.createObjectURL(f)); setRemoveBanner(false); }}} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                  {editDisplayName || myProfile.username}
                  {myProfile.is_verified && <Badge size={14} />}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>@{handleFor(myProfile.username)}</div>
              </div>
            </div>
            {/* Copertina profilo (banner) */}
            {!isOfficial(myProfile.username) && (
              <div>
                <div className="f-label" style={{ marginBottom: 8 }}>Copertina profilo</div>
                <div
                  onClick={() => editBannerFileRef.current?.click()}
                  style={{
                    height: 72, borderRadius: 12, overflow: "hidden", cursor: "pointer", border: "2px dashed var(--border2)",
                    backgroundColor: bannerPreview || (!removeBanner && myProfile.banner_url) ? "var(--bg2)" : "var(--surface)",
                    backgroundImage: bannerPreview ? `url(${bannerPreview})` : (!removeBanner && myProfile.banner_url) ? `url(${myProfile.banner_url})` : undefined,
                    backgroundSize: "cover", backgroundPosition: "center",
                    display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
                  }}
                >
                  {(!bannerPreview && !myProfile.banner_url) || removeBanner ? (
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>Clicca per scegliere un’immagine</span>
                  ) : null}
                  {(bannerPreview || (!removeBanner && myProfile.banner_url)) && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setRemoveBanner(true); setBannerFile(null); setBannerPreview(null); }}
                      title="Rimuovi copertina"
                      style={{ position: "absolute", top: 6, right: 6, width: 28, height: 28, borderRadius: "50%", border: "none", background: "var(--red)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, fontSize: 14, lineHeight: 1 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Se non imposti una copertina, viene usato il gradiente dai colori del profilo.</div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div className="f-label">Nome visualizzato</div>
                <input className="f-inp" placeholder="Come vuoi apparire…" value={editDisplayName} onChange={e => setEditDisplayName(e.target.value)} />
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>@{myProfile.username} — username non modificabile</div>
              </div>
              <div>
                <div className="f-label">Bio</div>
                <input className="f-inp" placeholder="Descriviti in una riga…" value={editBio} onChange={e => setEditBio(e.target.value)} />
              </div>
              {!isOfficial(myProfile.username) && !avatarPreview && (removeAvatar || !myProfile.avatar_url) && (
                <div>
                  <div className="f-label" style={{ marginBottom: 8 }}>Colore avatar <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(se non carichi foto)</span></div>
                  <div className="color-row">
                    {AVATAR_COLORS.map((c: string) => (
                      <div key={c} className={`color-dot${editColor === c ? " sel" : ""}`} style={{ background: c }} onClick={() => setEditColor(c)} />
                    ))}
                  </div>
                </div>
              )}
              {editErr && <div className="auth-err" style={{ marginTop: 8 }}>{editErr}</div>}
              <button className="btn-post" style={{ marginTop: 4 }} onClick={saveProfile} disabled={editSaving}>
                {editSaving ? "Salvataggio…" : "Salva profilo"}
              </button>

              {/* ── cambia password (solo utenti con email reale) ── */}
              {hasRealEmail && (
                <div style={{ borderTop: "1px solid var(--border2)", marginTop: 12, paddingTop: 16 }}>
                  <div className="f-label" style={{ marginBottom: 6 }}>Cambia password</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input className="f-inp" type="password" placeholder="Nuova password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setChangePwdErr(""); }} />
                    <input className="f-inp" type="password" placeholder="Conferma nuova password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setChangePwdErr(""); }} />
                    {changePwdErr && <div className="auth-err">{changePwdErr}</div>}
                    {changePwdOk && <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>Password aggiornata.</div>}
                    <button type="button" className="btn-post" style={{ alignSelf: "flex-start" }} onClick={handleChangePassword} disabled={changePwdLoading || !newPassword || !confirmPassword}>
                      {changePwdLoading ? "Salvataggio…" : "Cambia password"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── elimina account ── */}
              <div style={{ borderTop: "1px solid var(--border2)", marginTop: 8, paddingTop: 16 }}>
                {!deleteConfirm ? (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 13, fontFamily: "inherit", width: "100%", textAlign: "center", padding: "4px 0", transition: "color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--red)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}
                  >Elimina account</button>
                ) : (
                  <div style={{ background: "var(--red-pale)", border: "1px solid rgba(184,50,50,0.25)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--red)", textAlign: "center" }}>Sei sicuro? Questa azione è irreversibile.</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", lineHeight: 1.5 }}>Verranno eliminati il tuo profilo, tutti i tuoi post, commenti e likes.</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setDeleteConfirm(false)}
                        style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: "8px 0", color: "var(--muted)", transition: "border-color 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--text)")}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                      >Annulla</button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteLoading}
                        style={{ flex: 1, background: "var(--red)", border: "none", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: "8px 0", color: "#fff", opacity: deleteLoading ? 0.6 : 1 }}
                      >{deleteLoading ? "Eliminando…" : "Sì, elimina"}</button>
                    </div>
                  </div>
                )}
              </div>

              <button className="modal-link" onClick={() => { setEditModal(false); setDeleteConfirm(false); setRemoveAvatar(false); setRemoveBanner(false); setEditErr(""); setChangePwdErr(""); setChangePwdOk(false); setNewPassword(""); setConfirmPassword(""); }}>Annulla</button>
            </div>
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