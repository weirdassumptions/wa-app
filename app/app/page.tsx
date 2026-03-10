"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import {
  TweetCard, Avatar, UAv, Badge, ChallengeWinnerBadge, WeekWinnerBadge,
  displayFor, handleFor, isOfficial, isAnon,
  OFFICIAL_LOGO, OFFICIAL_USERNAME, AVATAR_COLORS, avatarGrad, initial,
  renderWithHashtagsAndMentions,
  type Profile, type Comment,
} from "../components/tweet-card";
import { getChallengeOfDay, getYesterdayDate, formatChallengeDate, encodeChallengePostText, parseChallengePostText } from "../components/helpers";
import { CharRing } from "../components/CharRing";
import { filterBlockedWords } from "../lib/blocked-words";

/* ════════════════════════════════════════════ */
export default function Home() {
  const [assumptions, setAssumptions]           = useState<any[]>([]);
  const [comments, setComments]                 = useState<Comment[]>([]);
  const [user, setUser]                         = useState<any>(null);
  const [profile, setProfile]                   = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin]                   = useState(false);
  const [text, setText]                         = useState("");
  const [challengeMode, setChallengeMode]       = useState(false);
  const [isPosting, setIsPosting]               = useState(false);
  const [modal, setModal]                       = useState<"none"|"auth"|"profile">("none");
  const [authTab, setAuthTab]                   = useState<"login"|"register">("login");
  const [email, setEmail]                       = useState("");
  const [pwd, setPwd]                           = useState("");
  const [regUsername, setRegUsername]           = useState("");
  const [regDisplayName, setRegDisplayName]     = useState("");
  const [regBio, setRegBio]                     = useState("");
  const [regColor, setRegColor]                 = useState(AVATAR_COLORS[0]);
  const [authErr, setAuthErr]                   = useState("");
  const [authLoading, setAuthLoading]           = useState(false);
  const [authNeedsConfirm, setAuthNeedsConfirm] = useState(false);
  const [authForgotPassword, setAuthForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [editBio, setEditBio]                   = useState("");
  const [editColor, setEditColor]               = useState("");
  const [editDisplayName, setEditDisplayName]   = useState("");
  const [editSaving, setEditSaving]             = useState(false);
  const [avatarFile, setAvatarFile]             = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview]       = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar]         = useState(false);
  const [newPassword, setNewPassword]          = useState("");
  const [confirmPassword, setConfirmPassword]  = useState("");
  const [changePwdLoading, setChangePwdLoading] = useState(false);
  const [changePwdErr, setChangePwdErr]         = useState("");
  const [changePwdOk, setChangePwdOk]           = useState(false);
  const [resetPwdModal, setResetPwdModal]       = useState(false);
  const [resetPwdNew, setResetPwdNew]           = useState("");
  const [resetPwdConfirm, setResetPwdConfirm]   = useState("");
  const [resetPwdLoading, setResetPwdLoading]   = useState(false);
  const [resetPwdErr, setResetPwdErr]           = useState("");
  const [regAvatarFile, setRegAvatarFile]       = useState<File | null>(null);
  const [regAvatarPreview, setRegAvatarPreview] = useState<string | null>(null);
  const [regAcceptTerms, setRegAcceptTerms]     = useState(false);
  const fileRef    = useRef<HTMLInputElement>(null);
  const regFileRef = useRef<HTMLInputElement>(null);
  const taRef      = useRef<HTMLTextAreaElement>(null);
  const pendingCursorRef = useRef<number | null>(null);
  const pendingCursorTextRef = useRef<string | null>(null);
  const [composeFocused, setComposeFocused] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<{ open: boolean; query: string; start: number; end: number }>({ open: false, query: "", start: 0, end: 0 });
  const [mentionHover, setMentionHover] = useState<string | null>(null);
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);
  const [activeHashtag, setActiveHashtag] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [watching, setWatching] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"home"|"osservati"|"challenge">("home");
  const [showScrollTop, setShowScrollTop] = useState(false);

  const todayChallengeDate = useMemo(() => getChallengeOfDay().date, []);
  const yesterdayChallengeDate = useMemo(() => getYesterdayDate(), []);
  const [challengeTopicOverride, setChallengeTopicOverride] = useState<string | null>(null);
  const [editingChallenge, setEditingChallenge] = useState(false);
  const [editChallengeTopic, setEditChallengeTopic] = useState("");
  const [challengeSaveError, setChallengeSaveError] = useState<string | null>(null);
  const challengeOfDay = useMemo(() => ({ date: todayChallengeDate, topic: challengeTopicOverride ?? "" }), [todayChallengeDate, challengeTopicOverride]);
  const validUsernamesSet = useMemo(() => new Set(allProfiles.map((p: { username?: string }) => (p.username ?? "").toLowerCase()).filter(Boolean)), [allProfiles]);
  const isWaAdmin = profile?.username === OFFICIAL_USERNAME;

  /* ── countdown a mezzanotte (per urgenza challenge) ── */
  const [countdownToMidnight, setCountdownToMidnight] = useState("");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const ms = midnight.getTime() - now.getTime();
      if (ms <= 0) {
        setCountdownToMidnight("Scade a mezzanotte");
        return;
      }
      const h = Math.floor(ms / (1000 * 60 * 60));
      const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      setCountdownToMidnight(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  const challengeRepliesToday = useMemo(() =>
    assumptions.filter(a => parseChallengePostText(a.text)?.date === todayChallengeDate).length,
    [assumptions, todayChallengeDate]
  );
  const alreadyRespondedChallengeToday = useMemo(() =>
    !!profile && assumptions.some(a =>
      a.username === profile.username && parseChallengePostText(a.text)?.date === todayChallengeDate
    ),
    [assumptions, profile, todayChallengeDate]
  );

  /** Vincitore challenge di ieri: risposta con più like (a parità, la più recente). */
  const yesterdayChallengeWinner = useMemo(() => {
    const yesterdayPosts = assumptions.filter(a => parseChallengePostText(a.text)?.date === yesterdayChallengeDate);
    if (yesterdayPosts.length === 0) return null;
    const best = [...yesterdayPosts].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    return best;
  }, [assumptions, yesterdayChallengeDate]);

  /** Utente con più like nella settimana precedente (lunedì–domenica scorsa). */
  const previousWeekWinnerUsername = useMemo(() => {
    const now = new Date();
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    thisMonday.setHours(0, 0, 0, 0);
    const prevMonday = new Date(thisMonday);
    prevMonday.setDate(prevMonday.getDate() - 7);
    const prevWeekStart = prevMonday.getTime();
    const thisWeekStart = thisMonday.getTime();
    const weekAssumptions = assumptions.filter(a => {
      if (isAnon(a.username)) return false;
      const t = new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at + "Z").getTime();
      return t >= prevWeekStart && t < thisWeekStart;
    });
    const byUser = weekAssumptions.reduce((acc: Record<string, number>, a) => {
      acc[a.username] = (acc[a.username] ?? 0) + (a.likes ?? 0);
      return acc;
    }, {});
    const sorted = Object.entries(byUser).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? null;
  }, [assumptions]);

  /** Su mobile: posizioni e ordine random per Top post + Top user nel feed home (stabile per la sessione). */
  const mobileWidgetConfig = useMemo(() => {
    if (!isMobile) return null;
    return {
      pos1: 2 + Math.floor(Math.random() * 2),
      pos2: 5 + Math.floor(Math.random() * 2),
      order: Math.random() < 0.5 ? ["podium", "topuser"] as const : ["topuser", "podium"] as const,
    };
  }, [isMobile]);

  /* ── anon: non può avere tab Osservati ── */
  useEffect(() => { if (!user && activeTab === "osservati") setActiveTab("home"); }, [user, activeTab]);
  useEffect(() => { if (!profile) setChallengeMode(false); }, [profile]);

  /* ── fetch challenge del giorno (solo da DB/admin) ── */
  useEffect(() => {
    supabase.from("daily_challenges").select("topic").eq("date", todayChallengeDate).maybeSingle()
      .then(({ data }) => { if (data?.topic) setChallengeTopicOverride(data.topic); });
  }, [todayChallengeDate]);

  const navigateToPost = (id: string) => {
    const el = document.getElementById(`post-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setOpenCommentId(id);
      // Applica highlight sul tweet-row dentro il wrapper
      const row = el.querySelector(".tweet-row") as HTMLElement | null;
      const target = row || el;
      target.style.transition = "background 0s";
      target.style.background = "rgba(212,90,74,0.3)";
      setTimeout(() => {
        target.style.transition = "background 2s ease-out";
        target.style.background = "var(--surface)";
      }, 50);
      setTimeout(() => { target.style.background = ""; target.style.transition = ""; }, 2300);
    } else {
      window.location.href = `/?open=${id}`;
    }
  };


  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (taRef.current && pendingCursorRef.current !== null && pendingCursorTextRef.current !== null) {
      const pos = pendingCursorRef.current;
      const expectedText = pendingCursorTextRef.current;
      pendingCursorRef.current = null;
      pendingCursorTextRef.current = null;
      const run = () => {
        if (!taRef.current) return;
        if (taRef.current.value !== expectedText) return;
        const len = taRef.current.value.length;
        const safePos = Math.min(Math.max(0, pos), len);
        taRef.current.focus();
        taRef.current.setSelectionRange(safePos, safePos);
      };
      setTimeout(run, 0);
    }
  }, [text]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tag = params.get("tag");
    if (tag) setActiveHashtag(tag);
    const open = params.get("open");
    if (open) {
      setOpenCommentId(open);
      setTimeout(() => {
        const el = document.getElementById(`post-${open}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          const row = el.querySelector(".tweet-row") as HTMLElement | null;
          const target = row || el;
          target.style.transition = "background 0s";
          target.style.background = "rgba(212,90,74,0.3)";
          setTimeout(() => { target.style.transition = "background 2s ease-out"; target.style.background = "var(--surface)"; }, 50);
          setTimeout(() => { target.style.background = ""; target.style.transition = ""; }, 2300);
        }
      }, 500);
    }
  }, []);
  const [waPlaceholder, setWaPlaceholder] = useState("");
  useEffect(() => { setWaPlaceholder(WA_PLACEHOLDERS[Math.floor(Math.random() * WA_PLACEHOLDERS.length)]); }, []);

  const [menuOpen, setMenuOpen]                 = useState(false);
  const [deleteConfirm, setDeleteConfirm]       = useState(false);
  const [deleteLoading, setDeleteLoading]       = useState(false);

  /* ── dark mode (darkReady evita il flash al primo render) ── */
  const [dark, setDark]           = useState(false);
  const [darkReady, setDarkReady] = useState(false);
  useEffect(() => {
    setDark(localStorage.getItem("theme") === "dark");
    setDarkReady(true);
  }, []);
  useEffect(() => {
    if (!darkReady) return;
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark, darkReady]);

  /* ── refs stabili per evitare stale closures ── */
  const userRef    = useRef<any>(null);
  const profileRef = useRef<Profile | null>(null);

  /* fetchAll: riceve uid come parametro esplicito → nessuna dipendenza da stato → stabile ── */
  const fetchAll = useCallback(async (uid: string | null) => {
    try {
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      const weekStart = monday.toISOString();

      const [aRes, cRes, lRes, clRes, pRes, wRes] = await Promise.all([
        supabase.from("assumptions").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("comments").select("*").order("created_at", { ascending: true }),
        supabase.from("likes").select("assumption_id,user_id"),
        supabase.from("comment_likes").select("comment_id,user_id"),
        supabase.from("profiles").select("username,display_name,avatar_url,avatar_color,is_verified"),
        uid ? supabase.from("watching").select("watched_username").eq("watcher_id", uid) : Promise.resolve({ data: [] }),
      ]);

      const aData = aRes.data;
      const cData = cRes.data;
      const lData = lRes.data;
      const clData = clRes.data;
      const pData = pRes.data;
      const wData = wRes.data;

      if (aRes.error) {
        const e = aRes.error as { message?: string; code?: string; details?: string; hint?: string };
        console.error("Assumptions fetch error:", e.message || e.code || e.details || e.hint || "Unknown", e);
      }
      if (cRes.error) {
        const e = cRes.error as { message?: string; code?: string; details?: string; hint?: string };
        console.error("Comments fetch error:", e.message || e.code || e.details || e.hint || "Unknown", e);
      }

    const profileMap: Record<string, any> = {};
    pData?.forEach(p => { profileMap[p.username.trim()] = p; });
    if (pData) setAllProfiles(pData);
    if (wData) setWatching(wData.map((w: any) => w.watched_username));

    if (aData) {
      setAssumptions(aData.map(a => {
        const pl   = lData?.filter(l => l.assumption_id === a.id) ?? [];
        const prof = profileMap[a.username?.trim()];
        return {
          ...a,
          display_name: prof?.display_name || a.username,
          avatar_url:   prof?.avatar_url   ?? a.avatar_url,
          avatar_color: prof?.avatar_color ?? a.avatar_color,
          is_verified:  prof?.is_verified  === true,
          likes:        pl.length,
          alreadyLiked: uid ? pl.some((l: any) => l.user_id === uid) : false,
        };
      }));
    }
    if (cData) {
      const clByComment: Record<string, number> = {};
      const clByUser: Record<string, Set<string>> = {};
      (clData ?? []).forEach((cl: { comment_id: string; user_id: string }) => {
        clByComment[cl.comment_id] = (clByComment[cl.comment_id] ?? 0) + 1;
        if (!clByUser[cl.comment_id]) clByUser[cl.comment_id] = new Set();
        clByUser[cl.comment_id].add(cl.user_id);
      });
      setComments(cData.map((c: any) => {
        const prof = profileMap[c.username?.trim()];
        const clCount = clByComment[c.id] ?? 0;
        const clLiked = uid ? (clByUser[c.id]?.has(uid) ?? false) : false;
        return {
          ...c,
          display_name: prof?.display_name || c.username,
          avatar_url:   prof?.avatar_url   ?? c.avatar_url,
          avatar_color: prof?.avatar_color ?? c.avatar_color,
          is_verified:  prof?.is_verified  === true,
          likes:        clCount,
          alreadyLiked: clLiked,
        };
      }));
    }
    } catch (err) {
      console.error("fetchAll error:", err);
    }
  }, []); // nessuna dipendenza — stabile per tutta la vita del componente

  /* ensureProfile: stabile ── */
  const ensureProfile = useCallback(async (authUser: any) => {
    for (let i = 0; i < 5; i++) {
      const { data } = await supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
      if (data) { profileRef.current = data; setProfile(data); setIsAdmin(data.is_admin === true); return; }
      await new Promise(r => setTimeout(r, 300));
    }
    console.warn("Profilo non trovato per", authUser.id);
  }, []); // stabile

  /* ── dopo ritorno da link email: recovery (reimposta password) o errore (link scaduto/invalido) ── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash || "";
    if (hash.includes("type=recovery")) {
      setResetPwdModal(true);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      return;
    }
    if (hash.includes("error=access_denied") || hash.includes("error_code=otp_expired") || hash.includes("error_description=")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      setModal("auth");
      setAuthTab("login");
      setAuthErr("Il link è scaduto o non valido. Richiedi un nuovo link da «Password dimenticata?» oppure riprova la registrazione.");
    }
  }, []);

  /* ── auth listener: [] come deps — si iscrive UNA SOLA VOLTA ── */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e: any, session: any) => {
      if (_e === "TOKEN_REFRESHED" && !session) {
        supabase.auth.signOut();
        return;
      }
      if (session?.user) {
        userRef.current = session.user;
        setUser(session.user);
        ensureProfile(session.user);
        fetchAll(session.user.id);
      } else {
        userRef.current = null;
        profileRef.current = null;
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        fetchAll(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── upload avatar ── */
  const uploadAvatar = async (file: File, userId: string): Promise<string | null> => {
    const ext  = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl + "?t=" + Date.now();
  };

  /* ── login ── */
  const handleLogin = async () => {
    setAuthLoading(true); setAuthErr(""); setAuthNeedsConfirm(false);
    if (!pwd) { setAuthErr("Inserisci la password."); setAuthLoading(false); return; }
    try {
      const { data, error } = await supabase.functions.invoke("login-with-username", {
        body: { login: email.trim(), password: pwd },
      });
      if (error || !data?.session) {
        setAuthErr(data?.error ?? "Credenziali errate.");
        if (data?.code === "email_not_confirmed") setAuthNeedsConfirm(true);
        setAuthLoading(false);
        return;
      }
      await supabase.auth.setSession(data.session);
      setModal("none"); setEmail(""); setPwd(""); setAuthNeedsConfirm(false);
    } catch { setAuthErr("Errore di rete."); }
    setAuthLoading(false);
  };

  /* ── register ── */
  const RESERVED_USERNAMES = ["privacy", "termini", "app", "crea-prova", "segnalazioni", "random"];
  const handleRegister = async () => {
    const usernameLower = regUsername.trim().toLowerCase().replace(/\s+/g, "_");
    if (!usernameLower) { setAuthErr("Scegli un username."); return; }
    if (!pwd) { setAuthErr("Scegli una password."); return; }
    if (!regAcceptTerms) { setAuthErr("Devi accettare i termini e condizioni per registrarti."); return; }
    if (RESERVED_USERNAMES.includes(usernameLower)) {
      setAuthErr("Questo username è riservato. Scegline un altro.");
      return;
    }
    setAuthLoading(true); setAuthErr("");

    const { data: existing } = await supabase.from("profiles").select("id").eq("username", usernameLower).maybeSingle();
    if (existing) { setAuthErr("Username già in uso."); setAuthLoading(false); return; }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: pwd,
      options: {
        data: {
          username: usernameLower,
          display_name: regDisplayName.trim() || usernameLower,
          bio: regBio.trim(),
          avatar_color: regColor,
          email: email.trim(),
        },
      },
    });
    if (error) { setAuthErr(error.message); setAuthLoading(false); return; }

    if (data.user) {
      if (data.session) {
        // Confirm email disattivo: crea il profilo subito (hai già la sessione)
        let avatarUrl: string | null = null;
        if (regAvatarFile) avatarUrl = await uploadAvatar(regAvatarFile, data.user.id);
        const { error: profileErr } = await supabase.from("profiles").upsert([{
          id: data.user.id,
          username: usernameLower,
          display_name: regDisplayName.trim() || usernameLower,
          bio: regBio.trim(),
          avatar_color: regColor,
          avatar_url: avatarUrl,
          email: email.trim(),
        }], { onConflict: "id" });
        if (profileErr) {
          setAuthErr("Errore nel salvataggio del profilo.");
          setAuthLoading(false);
          return;
        }
        await supabase.auth.setSession(data.session);
        setModal("none"); setEmail(""); setPwd("");
                    setRegUsername(""); setRegDisplayName(""); setRegBio("");
                    setRegAvatarFile(null); setRegAvatarPreview(null); setRegAcceptTerms(false);
      } else {
        // Confirm email attivo: il profilo viene creato dal trigger quando clicca il link nella mail
        setAuthErr("Ti abbiamo inviato un'email di conferma. Clicca il link per attivare l'account, poi accedi.");
        setAuthNeedsConfirm(true);
      }
    }
    setAuthLoading(false);
  };

  /* ── rinvio email di conferma (per nuovi utenti con verifica email obbligatoria) ── */
  const handleResendConfirmEmail = async () => {
    const emailToUse = email.trim();
    if (!emailToUse) return;
    setAuthLoading(true); setAuthErr("");
    const { error } = await supabase.auth.resend({ type: "signup", email: emailToUse });
    setAuthErr(error ? error.message : "Email rinviata. Controlla la casella (anche spam).");
    setAuthLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  /* ── password dimenticata: invio link per email ── */
  const handleForgotPassword = async () => {
    const emailToUse = forgotPasswordEmail.trim();
    if (!emailToUse) { setAuthErr("Inserisci l'email."); return; }
    setAuthLoading(true); setAuthErr("");
    const { error } = await supabase.auth.resetPasswordForEmail(emailToUse, {
      redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
    });
    setAuthLoading(false);
    if (error) { setAuthErr(error.message); return; }
    setForgotPasswordSent(true);
  };

  /* ── cambia password (solo utenti con email reale) ── */
  const hasRealEmail = user?.email && !String(user.email).endsWith("@wa.local");
  const handleSetPasswordFromReset = async () => {
    if (!resetPwdNew.trim()) { setResetPwdErr("Inserisci la nuova password."); return; }
    if (resetPwdNew !== resetPwdConfirm) { setResetPwdErr("Le password non coincidono."); return; }
    if (resetPwdNew.length < 6) { setResetPwdErr("La password deve avere almeno 6 caratteri."); return; }
    setResetPwdLoading(true); setResetPwdErr("");
    const { error } = await supabase.auth.updateUser({ password: resetPwdNew });
    setResetPwdLoading(false);
    if (error) { setResetPwdErr(error.message); return; }
    setResetPwdModal(false);
    setResetPwdNew(""); setResetPwdConfirm("");
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) { setChangePwdErr("Inserisci la nuova password."); return; }
    if (newPassword !== confirmPassword) { setChangePwdErr("Le password non coincidono."); return; }
    if (newPassword.length < 6) { setChangePwdErr("La password deve avere almeno 6 caratteri."); return; }
    setChangePwdLoading(true); setChangePwdErr("");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangePwdLoading(false);
    if (error) { setChangePwdErr(error.message); return; }
    setChangePwdOk(true);
    setNewPassword(""); setConfirmPassword("");
  };

  /* ── delete account ── */
  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleteLoading(true);
    try {
      await Promise.all([
        supabase.from("likes").delete().eq("user_id", user.id),
        supabase.from("comments").delete().eq("username", profile?.username ?? ""),
        supabase.from("assumptions").delete().eq("username", profile?.username ?? ""),
        supabase.from("profiles").delete().eq("id", user.id),
      ]);
      if (profile?.avatar_url) {
        const ext = profile.avatar_url.split(".").pop()?.split("?")[0] ?? "jpg";
        await supabase.storage.from("avatars").remove([`${user.id}/avatar.${ext}`]);
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
      setModal("none");
    } catch (e) {
      console.error("Errore cancellazione account:", e);
    }
    setDeleteLoading(false);
  };

  /* ── save profile (aggiornamento ottimistico — niente re-fetch) ── */
  const saveProfile = async () => {
    if (!user || !profile) return;
    setEditSaving(true);
    let avatarUrl = profile.avatar_url ?? null;
    if (removeAvatar) {
      avatarUrl = null;
      if (profile.avatar_url) {
        const ext = profile.avatar_url.split(".").pop()?.split("?")[0] ?? "jpg";
        await supabase.storage.from("avatars").remove([`${user.id}/avatar.${ext}`]);
      }
    } else if (avatarFile) {
      avatarUrl = await uploadAvatar(avatarFile, user.id);
    }

    await supabase.from("profiles").update({
      bio: editBio, avatar_color: editColor, avatar_url: avatarUrl, display_name: editDisplayName,
    }).eq("id", user.id);

    // Aggiorna stato locale senza ri-fetchare tutto
    const updated: Profile = { ...profile, bio: editBio, avatar_color: editColor, avatar_url: avatarUrl ?? undefined, display_name: editDisplayName };
    profileRef.current = updated;
    setProfile(updated);
    // Aggiorna anche i post del feed che appartengono a questo utente
    setAssumptions(prev => prev.map(a =>
      a.username === profile.username
        ? { ...a, display_name: editDisplayName, avatar_color: editColor, avatar_url: avatarUrl ?? a.avatar_url }
        : a
    ));

    setModal("none"); setEditSaving(false); setAvatarFile(null); setAvatarPreview(null); setRemoveAvatar(false);
  };

  /* ── feed actions ── */
  const addAssumption = async () => {
    if (!text.trim()) return;
    if (challengeMode && alreadyRespondedChallengeToday) return;
    if (challengeMode && !profile) return; // anonimi non possono rispondere alla challenge
    setIsPosting(true);
    const anonCode = 10000 + Math.floor(Math.random() * 90000);
    const poster = profile ? (isOfficial(profile.username) ? OFFICIAL_USERNAME : profile.username) : `anonimo_${anonCode}`;
    const dname  = profile ? displayFor(profile.username, profile.display_name) : `Anonimo ${anonCode}`;

    let finalText = challengeMode && challengeOfDay.topic
      ? encodeChallengePostText(challengeOfDay.date, challengeOfDay.topic, text.trim())
      : text.trim();
    finalText = filterBlockedWords(finalText);

    const { data, error } = await supabase.from("assumptions").insert([{
      text: finalText, username: poster, display_name: dname,
      avatar_color: profile?.avatar_color ?? null,
      avatar_url:   profile?.avatar_url   ?? null,
    }]).select().single();

    if (!error && data) {
      // Aggiunta ottimistica: inserisce il post in cima senza re-fetch
      setAssumptions(prev => [{
        ...data,
        display_name: dname,
        avatar_url:   profile?.avatar_url   ?? null,
        avatar_color: profile?.avatar_color ?? null,
        is_verified:  profile?.is_verified  ?? false,
        likes:        0,
        alreadyLiked: false,
      }, ...prev]);
    }
    setText("");
    setChallengeMode(false);
    setIsPosting(false);
    if (taRef.current) { taRef.current.style.height = "auto"; }
  };

  const likePost = useCallback(async (id: string, alreadyLiked: boolean) => {
    const u = userRef.current;
    if (!u) return;
    setAssumptions(prev => prev.map(a => a.id !== id ? a : {
      ...a,
      alreadyLiked: !alreadyLiked,
      likes: (a.likes || 0) + (alreadyLiked ? -1 : 1),
    }));
    if (alreadyLiked) await supabase.from("likes").delete().eq("assumption_id", id).eq("user_id", u.id);
    else              await supabase.from("likes").insert([{ assumption_id: id, user_id: u.id }]);
  }, []); // userRef è stabile

  const deletePost = useCallback(async (id: string) => {
    setAssumptions(prev => prev.filter(a => a.id !== id));
    setComments(prev => prev.filter(c => c.assumption_id !== id));
    await Promise.all([
      supabase.from("likes").delete().eq("assumption_id", id),
      supabase.from("comments").delete().eq("assumption_id", id),
      supabase.from("assumptions").delete().eq("id", id),
    ]);
  }, []);

  const pinPost = useCallback(async (id: string, pinned: boolean) => {
    setAssumptions(prev => {
      const updated = prev.map(a => a.id !== id ? { ...a, pinned: false } : { ...a, pinned: !pinned });
      return [...updated].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    });
    await supabase.from("assumptions").update({ pinned: !pinned }).eq("id", id);
  }, []);

  const deleteComment = useCallback(async (id: string) => {
    setComments(prev => prev.filter(c => c.id !== id));
    await supabase.from("comments").delete().eq("id", id);
  }, []);

  const likeComment = useCallback(async (id: string, alreadyLiked: boolean) => {
    const u = userRef.current;
    if (!u) return;
    setComments(prev => prev.map(c => c.id !== id ? c : {
      ...c,
      alreadyLiked: !alreadyLiked,
      likes: (c.likes ?? 0) + (alreadyLiked ? -1 : 1),
    }));
    if (alreadyLiked) await supabase.from("comment_likes").delete().eq("comment_id", id).eq("user_id", u.id);
    else              await supabase.from("comment_likes").insert([{ comment_id: id, user_id: u.id }]);
  }, []);

  const editPost = useCallback(async (id: string, newText: string) => {
    const filtered = filterBlockedWords(newText);
    setAssumptions(prev => prev.map(a => a.id !== id ? a : { ...a, text: filtered, edited: true }));
    await supabase.from("assumptions").update({ text: filtered, edited: true }).eq("id", id);
  }, []);

  const editComment = useCallback(async (id: string, newText: string) => {
    const filtered = filterBlockedWords(newText);
    setComments(prev => prev.map(c => c.id !== id ? c : { ...c, text: filtered, edited: true }));
    await supabase.from("comments").update({ text: filtered, edited: true }).eq("id", id);
  }, []);

  const reportContent = useCallback(async (contentType: "post" | "comment", contentId: string, reason?: string) => {
    const u = userRef.current;
    if (!u?.id) return;
    await supabase.from("reports").insert([{
      reporter_id: u.id,
      content_type: contentType,
      content_id: contentId,
      reason: reason || null,
      status: "pending",
    }]);
  }, []);

  const addComment = useCallback(async (aid: string, t: string, parentId: string | null = null) => {
    if (!t.trim()) return;
    const mp     = profileRef.current;
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
  }, []); // profileRef è stabile

  /* ── match a sottosequenza: le lettere digitate compaiono in ordine nel nome (es. "fe" → "federico", "francesco") ── */
  const isSubsequence = useCallback((query: string, str: string) => {
    const q = query.toLowerCase();
    const s = str.toLowerCase();
    let j = 0;
    for (let i = 0; i < s.length && j < q.length; i++) {
      if (s[i] === q[j]) j++;
    }
    return j === q.length;
  }, []);
  const subsequenceStartIndex = useCallback((query: string, str: string): number => {
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
  }, []);

  /* ── ordinamento intelligente: osservati in testa, poi per rilevanza (exact → startsWith → subsequence/contains), infine alfabetico ── */
  const sortUsersByRelevance = useCallback((
    list: typeof allProfiles,
    q: string,
    opts: { useIncludes?: boolean; useSubsequence?: boolean }
  ) => {
    const useIncludes = opts?.useIncludes ?? false;
    const useSubsequence = opts?.useSubsequence ?? false;
    const scoreWithSub = (u: (typeof allProfiles)[0]): { score: number; subIndex: number } => {
      const un = (u.username ?? "").toLowerCase();
      const dn = (u.display_name ?? "").toLowerCase();
      let s = 0;
      let subIndex = Infinity;
      if (watching.includes(u.username)) s += 1000;
      if (!q) return { score: s, subIndex: 0 };
      if (un === q) return { score: s + 500, subIndex: 0 };
      if (un.startsWith(q)) return { score: s + 100, subIndex: 0 };
      if (dn.startsWith(q)) return { score: s + 80, subIndex: 0 };
      if (useSubsequence) {
        const unSub = isSubsequence(q, u.username ?? "");
        const dnSub = isSubsequence(q, u.display_name ?? "");
        if (unSub) {
          s += 30;
          subIndex = Math.min(subIndex, subsequenceStartIndex(q, u.username ?? ""));
        }
        if (dnSub) {
          s += 15;
          subIndex = Math.min(subIndex, subsequenceStartIndex(q, u.display_name ?? ""));
        }
      }
      if (useIncludes && s === (watching.includes(u.username) ? 1000 : 0)) {
        if (un.includes(q)) s += 40;
        else if (dn.includes(q)) s += 20;
      }
      return { score: s, subIndex: subIndex === Infinity ? 999 : subIndex };
    };
    return [...list].sort((a, b) => {
      const da = scoreWithSub(a);
      const db = scoreWithSub(b);
      if (db.score !== da.score) return db.score - da.score;
      if (da.subIndex !== db.subIndex) return da.subIndex - db.subIndex;
      return (a.username ?? "").localeCompare(b.username ?? "", "it");
    });
  }, [watching, isSubsequence, subsequenceStartIndex]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const filtered = allProfiles.filter(u => {
      if (!u.username || isAnon(u.username)) return false;
      const un = u.username.toLowerCase();
      const dn = (u.display_name ?? "").toLowerCase();
      return un.includes(q) || dn.includes(q) || isSubsequence(q, un) || isSubsequence(q, dn);
    });
    return sortUsersByRelevance(filtered, q, { useIncludes: true, useSubsequence: true }).slice(0, 6);
  }, [searchQuery, allProfiles, sortUsersByRelevance, isSubsequence]);

  const mentionMatches = useMemo(() => {
    if (!mentionSuggestions.open) return [];
    const q = mentionSuggestions.query.toLowerCase();
    const filtered = allProfiles.filter(u => {
      if (!u.username || isAnon(u.username)) return false;
      if (!q) return true;
      const un = u.username.toLowerCase();
      const dn = (u.display_name ?? "").toLowerCase();
      return un.startsWith(q) || dn.startsWith(q) ||
        isSubsequence(q, un) || isSubsequence(q, dn);
    });
    return sortUsersByRelevance(filtered, q, { useSubsequence: true }).slice(0, 5);
  }, [mentionSuggestions.open, mentionSuggestions.query, allProfiles, sortUsersByRelevance, isSubsequence]);

  const commentsByPost = useMemo(() => {
    const map: Record<string, typeof comments> = {};
    for (const c of comments) {
      if (!map[c.assumption_id]) map[c.assumption_id] = [];
      map[c.assumption_id].push(c);
    }
    return map;
  }, [comments]);


  const toggleWatch = async (username: string) => {
    if (!user) return;
    const wasWatching = watching.includes(username);
    // Ottimistico
    setWatching(w => wasWatching ? w.filter(u => u !== username) : (w.includes(username) ? w : [...w, username]));
    if (wasWatching) {
      const { error } = await supabase.from("watching").delete().eq("watcher_id", user.id).eq("watched_username", username);
      if (error) { console.error("unwatch error:", error); setWatching(w => (w.includes(username) ? w : [...w, username])); }
    } else {
      const { error } = await supabase.from("watching").insert({ watcher_id: user.id, watched_username: username });
      if (error) { console.error("watch error:", error); setWatching(w => w.filter(u => u !== username)); }
    }
  };

  const openAuth = (tab: "login" | "register" = "login") => {
    setAuthTab(tab); setAuthErr(""); setPwd(""); setModal("auth");
  };

  /* ─── RENDER ─── */
  return (
    <>
      <div className="page-layout">

        {/* ── SIDEBAR DESKTOP ── */}
        <aside className="sidebar">
          <Link href="/app" className="sidebar-logo">
            <img src={dark ? "/logo-full-dark.png" : "/logo-full.png"} alt="Weird Assumptions" height={44} style={{ objectFit: "contain", flexShrink: 0, maxWidth: 200 }} />
          </Link>

          {/* Ricerca utenti */}
          <div style={{ position: "relative", padding: "8px 0 4px", zIndex: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg2)", borderRadius: 999, padding: "7px 14px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                placeholder="Cerca utenti…"
                style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: "var(--text)", fontFamily: "inherit", width: "100%" }}
              />
              {searchQuery && <button onClick={() => { setSearchQuery(""); setSearchOpen(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>}
            </div>
            {searchOpen && searchResults.length > 0 && (
              <div style={{ position: "absolute", top: "calc(100% - 2px)", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, overflow: "hidden" }}>
                {searchResults.map(u => (
                  <div key={u.username} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", transition: "background 0.12s", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <Link href={`/${u.username}`} onClick={() => { setSearchQuery(""); setSearchOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flex: 1 }}>
                      <UAv username={u.username} size={32} avatarUrl={u.avatar_url} avatarColor={u.avatar_color} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{displayFor(u.username, u.display_name)}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>@{u.username}</div>
                      </div>
                    </Link>
                    {user && u.username !== profile?.username && (
                      <button onClick={e => { e.stopPropagation(); toggleWatch(u.username); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "2px 6px", borderRadius: 6, color: watching.includes(u.username) ? "var(--red)" : "var(--muted)" }}
                        title={watching.includes(u.username) ? "Smetti di osservare" : "Osserva"}
                      >{watching.includes(u.username) ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.4}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link href="/app" className="nav-item active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Home
          </Link>
          <Link href="/random" className="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/></svg>
            Random
          </Link>
          {profile && (
            <Link href={`/${profile.username}`} className="nav-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              Profilo
            </Link>
          )}

          <div className="sidebar-bottom">
            {isAdmin && (
              <>
                <span className="admin-pill" style={{ textAlign: "center", marginBottom: 4 }}>Admin</span>
                <Link href="/segnalazioni" className="nav-item" style={{ marginBottom: 4 }}>
                  Segnalazioni
                </Link>
                <Link href="/crea-prova" className="nav-item" style={{ marginBottom: 4 }}>
                  Crea account di prova
                </Link>
              </>
            )}
            <button className="nav-item" onClick={() => setDark(d => !d)} style={{ color: "var(--muted)", fontSize: 14 }}>
              {dark
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
              {dark ? "Modalità chiara" : "Modalità scura"}
            </button>
            {user && profile ? (
              <>
                <Link href={`/${profile.username}`} className="sidebar-user">
                  <Avatar profile={profile} size={36} />
                  <div className="sidebar-user-info">
                    <div className="sidebar-user-name">{displayFor(profile.username, profile.display_name)}</div>
                    <div className="sidebar-user-handle">@{handleFor(profile.username)}</div>
                  </div>
                </Link>
                <button className="nav-item" onClick={handleLogout} style={{ color: "var(--muted)", fontSize: 14 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Logout
                </button>
              </>
            ) : (
              <button className="login-btn" style={{ margin: "8px 10px" }} onClick={() => openAuth("login")}>Accedi</button>
            )}
          </div>
        </aside>

        {/* ── FEED ── */}
        <div className="wrap">

          {/* HEADER MOBILE */}
          <div className="x-header">
            {mobileSearchOpen ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--bg2)", borderRadius: 999, padding: "6px 14px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cerca utenti…"
                  style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: "var(--text)", fontFamily: "inherit" }}
                />
                <button onClick={() => { setMobileSearchOpen(false); setSearchQuery(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 18, padding: 0 }}>×</button>
              </div>
            ) : (
              <Link href="/app" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flex: 1 }}>
                <img src={dark ? "/logo-full-dark.png" : "/logo-full.png"} alt="Weird Assumptions" height={32} style={{ objectFit: "contain", maxWidth: 160 }} />
              </Link>
            )}
            {/* Lente ricerca */}
            {!mobileSearchOpen && (
              <button onClick={() => setMobileSearchOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "var(--muted)", display: "flex", alignItems: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
            )}
            {/* Risultati ricerca mobile - overlay */}
            {mobileSearchOpen && searchResults.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--surface)", borderBottom: "1px solid var(--border2)", zIndex: 300, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
                {searchResults.map(u => (
                  <Link key={u.username} href={`/${u.username}`} onClick={() => { setMobileSearchOpen(false); setSearchQuery(""); }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", textDecoration: "none", borderBottom: "1px solid var(--border2)" }}
                  >
                    <UAv username={u.username} size={36} avatarUrl={u.avatar_url} avatarColor={u.avatar_color} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{displayFor(u.username, u.display_name)}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>@{u.username}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {/* Dark mode — icona senza bordo */}
            <button onClick={() => setDark(d => !d)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex", alignItems: "center", color: "var(--muted)", borderRadius: 8, transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
              {dark
                ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
            </button>
            <Link href="/random" style={{ display: "flex", alignItems: "center", padding: 6, color: "var(--muted)", borderRadius: 8, transition: "background 0.15s" }} title="Random">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/></svg>
            </Link>
            {user && profile ? (
              <>
                <button onClick={() => setMenuOpen(m => !m)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: "50%", display: "flex" }}>
                  <Avatar profile={profile} size={32} />
                </button>
                {menuOpen && (
                  <div className="mob-menu" onClick={() => setMenuOpen(false)}>
                    <Link href="/random" className="mob-menu-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/></svg>
                      Random
                    </Link>
                    <Link href={`/${profile.username}`} className="mob-menu-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Profilo
                    </Link>
                    {isAdmin && (
                      <>
                        <Link href="/segnalazioni" className="mob-menu-item">Segnalazioni</Link>
                        <Link href="/crea-prova" className="mob-menu-item">Crea account di prova</Link>
                      </>
                    )}
                    <button className="mob-menu-item danger" onClick={handleLogout}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Logout
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button className="login-btn" onClick={() => openAuth("login")}>Accedi</button>
            )}
          </div>

          {/* COMPOSE */}
          <div className="compose" style={{ outline: composeFocused ? "2px solid var(--red-ring)" : "2px solid transparent", outlineOffset: -2, transition: "outline-color 0.2s" }}>
            <Avatar profile={profile} size={42} />
            <div className="compose-col">
              {profile ? (
                <div className="compose-who">
                  {displayFor(profile.username, profile.display_name)}
                  <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 13 }}>@{handleFor(profile.username)}</span>
                  {profile.is_verified && <Badge />}
                </div>
              ) : (
                challengeOfDay.topic ? (
                  <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>
                    Stai postando da <strong style={{ color: "var(--text)" }}>anonimo</strong>.<br />Per la challenge:{" "}
                    <button type="button" onClick={() => openAuth("login")} style={{ background: "none", border: "none", padding: 0, fontFamily: "inherit", cursor: "pointer", color: "var(--red)", fontWeight: 600, fontSize: "inherit" }}>Accedi</button>
                    {" · "}
                    <button type="button" onClick={() => openAuth("register")} style={{ background: "none", border: "none", padding: 0, fontFamily: "inherit", cursor: "pointer", color: "var(--red)", fontWeight: 600, fontSize: "inherit" }}>Registrati</button>
                  </div>
                ) : (
                  <div className="compose-anon">
                    <span style={{ display: "block", marginBottom: 2 }}>Stai pubblicando come <strong style={{ color: "var(--text)" }}>Anonimo</strong>.</span>
                    <span style={{ display: "block", fontSize: 12, color: "var(--muted2)" }}>Crea un account per apparire nel podio e partecipare alla challenge.</span>
                    <button type="button" className="compose-anon-cta" onClick={() => openAuth("register")}>
                      Crea un account
                    </button>
                  </div>
                )
              )}
              {/* Challenge (solo admin: nessun fallback da lista) */}
              <div style={{ marginBottom: 10 }}>
                {!editingChallenge ? (
                  <>
                    {challengeOfDay.topic ? (
                      <div style={{
                        background: "var(--bg2)",
                        border: "1px solid var(--border2)",
                        borderLeft: "3px solid var(--red)",
                        borderRadius: 10,
                        padding: "12px 14px",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "var(--red)", textTransform: "uppercase" }}>Challenge</span>
                          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", lineHeight: 1.4 }}>{challengeOfDay.topic}</span>
                          {profile && (
                          <button
                            type="button"
                            onClick={() => !alreadyRespondedChallengeToday && setChallengeMode(v => !v)}
                            style={{
                              marginLeft: "auto",
                              fontFamily: "inherit", cursor: !alreadyRespondedChallengeToday ? "pointer" : "default",
                              fontSize: 11, fontWeight: 600,
                              color: challengeMode ? "#fff" : "var(--red)",
                              background: challengeMode ? "var(--red)" : "transparent",
                              border: challengeMode ? "none" : "1px solid var(--red)",
                              padding: "4px 10px", borderRadius: 999,
                              transition: "background 0.15s, color 0.15s",
                            }}
                            onMouseEnter={e => {
                              if (!alreadyRespondedChallengeToday) e.currentTarget.style.background = challengeMode ? "var(--red-h)" : "rgba(184,50,50,0.08)";
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = challengeMode ? "var(--red)" : "transparent";
                            }}
                          >
                            {alreadyRespondedChallengeToday ? "Già risposto" : challengeMode ? "In risposta" : "Rispondi"}
                          </button>
                          )}
                          {isWaAdmin && (
                            <button
                              type="button"
                              onClick={() => { setEditingChallenge(true); setEditChallengeTopic(challengeOfDay.topic); }}
                              style={{ background: "none", border: "none", padding: "4px 8px", fontFamily: "inherit", cursor: "pointer", color: "var(--muted)", fontSize: 11, borderRadius: 6 }}
                              onMouseEnter={e => { e.currentTarget.style.background = "var(--bg2)"; e.currentTarget.style.color = "var(--text)"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--muted)"; }}
                            >
                              modifica
                            </button>
                          )}
                        </div>
                        <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ color: "var(--red)", fontWeight: 500 }}>
                            {countdownToMidnight && countdownToMidnight !== "Scade a mezzanotte" ? `${countdownToMidnight} rimaste` : "Scade a mezzanotte"}
                          </span>
                          {challengeRepliesToday > 0 && (
                            <span>· {challengeRepliesToday} {challengeRepliesToday === 1 ? "risposta" : "risposte"} oggi</span>
                          )}
                          {yesterdayChallengeWinner && !isAnon(yesterdayChallengeWinner.username) && (
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span>·</span>
                              <span style={{ color: "var(--muted)" }}>Vincitore ieri:</span>
                              <button
                                type="button"
                                onClick={() => navigateToPost(yesterdayChallengeWinner!.id)}
                                style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", padding: 0, fontFamily: "inherit", cursor: "pointer", color: "var(--red)", fontWeight: 600, fontSize: "inherit" }}
                              >
                                <ChallengeWinnerBadge size={11} />
                                @{handleFor(yesterdayChallengeWinner.username)}
                              </button>
                            </span>
                          )}
                        </div>
                        {alreadyRespondedChallengeToday && (
                          <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(184,50,50,0.06)", border: "1px solid rgba(184,50,50,0.12)", borderRadius: 8, fontSize: 11, color: "var(--red)", fontWeight: 500 }}>
                            Hai già risposto alla challenge di oggi. Una sola risposta per giorno.
                          </div>
                        )}
                        {challengeMode && !alreadyRespondedChallengeToday && profile && (
                          <>
                            <div style={{ marginTop: 6, fontSize: 11, color: "var(--muted2)" }}>Una sola risposta per la challenge del giorno.</div>
                            <div style={{ marginTop: 10 }}>
                              <div style={{ position: "relative" }}>
                                <div
                                  aria-hidden
                                  style={{
                                    position: "absolute", top: 0, left: 0, right: 0, minHeight: 72, paddingBottom: 12,
                                    fontFamily: "'DM Sans', sans-serif", fontSize: 19, fontWeight: 300, lineHeight: 1.5,
                                    color: "var(--text)", whiteSpace: "pre-wrap", wordBreak: "break-word", overflow: "hidden",
                                    pointerEvents: "none", zIndex: 0,
                                  }}
                                >
                                  {text ? renderWithHashtagsAndMentions(text, () => {}, true, validUsernamesSet) : "\u00A0"}
                                </div>
                                <textarea
                                  ref={taRef}
                                  className="compose-ta"
                                  placeholder={isOfficial(profile?.username ?? "") ? "Scrivi un post ufficiale…" : "Rispondi alla challenge di oggi…"}
                                  value={text}
                                  onChange={e => {
                                    const v = e.target.value.slice(0, 280);
                                    setText(v);
                                    if (taRef.current) { taRef.current.style.height = "auto"; taRef.current.style.height = taRef.current.scrollHeight + "px"; }
                                    const start = e.target.selectionStart;
                                    const before = v.slice(0, start);
                                    const lastAt = before.lastIndexOf("@");
                                    if (lastAt >= 0) {
                                      const afterAt = before.slice(lastAt + 1);
                                      const match = afterAt.match(/^[\w]*/);
                                      const query = match ? match[0] : "";
                                      const end = lastAt + 1 + query.length;
                                      const charAfter = v.slice(end, end + 1);
                                      const mentionComplete = query.length > 0 && charAfter !== "" && (charAfter === " " || /[.,;:!?\n]/.test(charAfter));
                                      if (mentionComplete) {
                                        setMentionSuggestions(prev => ({ ...prev, open: false }));
                                        setMentionHover(null);
                                      } else {
                                        setMentionHover(null);
                                        setMentionSuggestions({ open: true, query, start: lastAt, end });
                                      }
                                    } else {
                                      setMentionSuggestions(prev => ({ ...prev, open: false }));
                                      setMentionHover(null);
                                    }
                                  }}
                                  onFocus={() => setComposeFocused(true)}
                                  onBlur={() => setTimeout(() => { setMentionSuggestions(prev => ({ ...prev, open: false })); setMentionHover(null); }, 100)}
                                  rows={3}
                                  style={{ minHeight: 72, position: "relative", zIndex: 1, color: "transparent", caretColor: "var(--text)" }}
                                />
                                {mentionSuggestions.open && mentionMatches.length > 0 && (
                                  <div
                                    style={{
                                      position: "absolute", left: 0, right: 0, top: "100%", zIndex: 100,
                                      background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 10,
                                      boxShadow: "0 6px 16px rgba(0,0,0,0.1)", marginTop: 4,
                                      maxHeight: 200, overflowY: "auto",
                                    }}
                                    onMouseDown={e => e.preventDefault()}
                                  >
                                    {mentionMatches.map(u => {
                                      const isHover = mentionHover === u.username;
                                      return (
                                        <button
                                          key={u.username}
                                          type="button"
                                          onMouseDown={() => {
                                            setMentionSuggestions({ open: false, query: "", start: 0, end: 0 });
                                            setMentionHover(null);
                                            const newText = (text.slice(0, mentionSuggestions.start) + "@" + u.username + text.slice(mentionSuggestions.end)).slice(0, 280);
                                            pendingCursorTextRef.current = newText;
                                            pendingCursorRef.current = mentionSuggestions.start + 1 + u.username.length;
                                            setText(newText);
                                          }}
                                          onMouseEnter={() => setMentionHover(u.username)}
                                          onMouseLeave={() => setMentionHover(null)}
                                          style={{
                                            width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                                            cursor: "pointer", border: "none", fontFamily: "inherit", textAlign: "left",
                                            background: isHover ? "rgba(212,90,74,0.15)" : "transparent",
                                            transition: "background 0.1s",
                                          }}
                                        >
                                          <UAv username={u.username} size={22} avatarUrl={u.avatar_url} avatarColor={u.avatar_color} />
                                          <div style={{ minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayFor(u.username, u.display_name)}</div>
                                            <div style={{ fontSize: 11, color: "var(--muted)" }}>@{u.username}</div>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="compose-footer">
                                <span style={{ fontSize: 12, color: text.length > 240 ? (text.length > 260 ? "var(--red)" : "#b87040") : "var(--muted2)", fontWeight: text.length > 240 ? 600 : 400 }}>
                                  {text.length}/280
                                </span>
                                <button
                                  className="btn-post"
                                  onClick={addAssumption}
                                  disabled={!text.trim() || isPosting || (challengeMode && alreadyRespondedChallengeToday)}
                                  style={challengeMode ? { fontSize: 13, padding: "7px 16px" } : undefined}
                                >
                                  {isPosting ? "Pubblicando…" : challengeMode && alreadyRespondedChallengeToday ? "Già risposto oggi" : challengeMode ? "Pubblica risposta" : "Pubblica WA"}
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        Challenge: <span style={{ color: "var(--text)" }}>nessuna impostata per oggi</span>
                        {isWaAdmin && (
                          <>
                            {" · "}
                            <button type="button" onClick={() => { setEditingChallenge(true); setEditChallengeTopic(""); }} style={{ background: "none", border: "none", padding: 0, fontFamily: "inherit", cursor: "pointer", color: "var(--red)", fontSize: 12, fontWeight: 600 }}>imposta</button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                    <input
                      value={editChallengeTopic}
                      onChange={e => setEditChallengeTopic(e.target.value)}
                      placeholder="Topic challenge del giorno"
                      style={{
                        flex: 1, minWidth: 180, maxWidth: 400,
                        background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 8,
                        padding: "6px 10px", fontSize: 12, color: "var(--text)", fontFamily: "inherit",
                      }}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const topic = editChallengeTopic.trim();
                        if (!topic) return;
                        setChallengeSaveError(null);
                        const { error } = await supabase.from("daily_challenges").upsert({ date: challengeOfDay.date, topic }, { onConflict: "date" });
                        if (error) {
                          setChallengeSaveError(error.message || "Errore salvataggio");
                          return;
                        }
                        setChallengeTopicOverride(topic);
                        setEditingChallenge(false);
                      }}
                      style={{ background: "var(--red)", border: "none", borderRadius: 999, color: "#fff", fontSize: 12, fontWeight: 600, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Salva
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingChallenge(false); setEditChallengeTopic(""); setChallengeSaveError(null); }}
                      style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Annulla
                    </button>
                    {challengeSaveError && (
                      <span style={{ fontSize: 12, color: "var(--red)" }}>{challengeSaveError}</span>
                    )}
                  </div>
                )}
              </div>
              {(!challengeMode || !challengeOfDay.topic || alreadyRespondedChallengeToday || !profile) && (
              <div>
              <div style={{ position: "relative" }}>
                <div
                  aria-hidden
                  style={{
                    position: "absolute", top: 0, left: 0, right: 0, minHeight: 72, paddingBottom: 12,
                    fontFamily: "'DM Sans', sans-serif", fontSize: 19, fontWeight: 300, lineHeight: 1.5,
                    color: "var(--text)", whiteSpace: "pre-wrap", wordBreak: "break-word", overflow: "hidden",
                    pointerEvents: "none", zIndex: 0,
                  }}
                >
                  {text ? renderWithHashtagsAndMentions(text, () => {}, true, validUsernamesSet) : "\u00A0"}
                </div>
                <textarea
                  ref={taRef}
                  className="compose-ta"
                  placeholder={
                    isOfficial(profile?.username ?? "")
                      ? "Scrivi un post ufficiale…"
                      : (challengeMode ? "Rispondi alla challenge di oggi…" : waPlaceholder)
                  }
                  value={text}
                  onChange={e => {
                    const v = e.target.value.slice(0, 280);
                    setText(v);
                    if (taRef.current) { taRef.current.style.height = "auto"; taRef.current.style.height = taRef.current.scrollHeight + "px"; }
                    const start = e.target.selectionStart;
                    const before = v.slice(0, start);
                    const lastAt = before.lastIndexOf("@");
                    if (lastAt >= 0) {
                      const afterAt = before.slice(lastAt + 1);
                      const match = afterAt.match(/^[\w]*/);
                      const query = match ? match[0] : "";
                      const end = lastAt + 1 + query.length;
                      const charAfter = v.slice(end, end + 1);
                      const mentionComplete = query.length > 0 && charAfter !== "" && (charAfter === " " || /[.,;:!?\n]/.test(charAfter));
                      if (mentionComplete) {
                        setMentionSuggestions(prev => ({ ...prev, open: false }));
                        setMentionHover(null);
                      } else {
                        setMentionHover(null);
                        setMentionSuggestions({ open: true, query, start: lastAt, end });
                      }
                    } else {
                      setMentionSuggestions(prev => ({ ...prev, open: false }));
                      setMentionHover(null);
                    }
                  }}
                  onFocus={() => setComposeFocused(true)}
                  onBlur={() => setTimeout(() => { setMentionSuggestions(prev => ({ ...prev, open: false })); setMentionHover(null); }, 100)}
                  rows={3}
                  style={{ minHeight: 72, position: "relative", zIndex: 1, color: "transparent", caretColor: "var(--text)" }}
                />
                {mentionSuggestions.open && mentionMatches.length > 0 && (
                  <div
                    style={{
                      position: "absolute", left: 0, right: 0, top: "100%", zIndex: 100,
                      background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 10,
                      boxShadow: "0 6px 16px rgba(0,0,0,0.1)", marginTop: 4,
                      maxHeight: 200, overflowY: "auto",
                    }}
                    onMouseDown={e => e.preventDefault()}
                  >
                    {mentionMatches.map(u => {
                      const isHover = mentionHover === u.username;
                      return (
                        <button
                          key={u.username}
                          type="button"
                          onMouseDown={() => {
                            setMentionSuggestions({ open: false, query: "", start: 0, end: 0 });
                            setMentionHover(null);
                            const newText = (text.slice(0, mentionSuggestions.start) + "@" + u.username + text.slice(mentionSuggestions.end)).slice(0, 280);
                            pendingCursorTextRef.current = newText;
                            pendingCursorRef.current = mentionSuggestions.start + 1 + u.username.length;
                            setText(newText);
                          }}
                          onMouseEnter={() => setMentionHover(u.username)}
                          onMouseLeave={() => setMentionHover(null)}
                          style={{
                            width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                            cursor: "pointer", border: "none", fontFamily: "inherit", textAlign: "left",
                            background: isHover ? "rgba(212,90,74,0.15)" : "transparent",
                            transition: "background 0.1s",
                          }}
                        >
                          <UAv username={u.username} size={22} avatarUrl={u.avatar_url} avatarColor={u.avatar_color} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayFor(u.username, u.display_name)}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>@{u.username}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="compose-footer">
                <span style={{ fontSize: 12, color: text.length > 240 ? (text.length > 260 ? "var(--red)" : "#b87040") : "var(--muted2)", fontWeight: text.length > 240 ? 600 : 400 }}>
                  {text.length}/280
                </span>
                <button
                  className="btn-post"
                  onClick={addAssumption}
                  disabled={!text.trim() || isPosting || (challengeMode && alreadyRespondedChallengeToday)}
                  style={challengeMode ? { fontSize: 13, padding: "7px 16px" } : undefined}
                >
                  {isPosting ? "Pubblicando…" : challengeMode && alreadyRespondedChallengeToday ? "Già risposto oggi" : challengeMode ? "Pubblica risposta" : "Pubblica WA"}
                </button>
              </div>
              </div>
              )}
            </div>
          </div>

          {/* VINCITORE CHALLENGE DI IERI (tra input e tab/scroll, visibile in Home / Osservati / Challenge) */}
          {yesterdayChallengeWinner && (() => {
            const meta = parseChallengePostText(yesterdayChallengeWinner.text);
            const topic = meta?.topic?.trim() ?? "";
            const excerpt = meta?.body?.trim().slice(0, 100) ?? yesterdayChallengeWinner.text.slice(0, 100);
            const excerptDisplay = (excerpt.length >= 100 ? excerpt + "…" : excerpt).replace(/\n/g, " ");
            const likesCount = yesterdayChallengeWinner.likes ?? 0;
            const HeartIcon = () => (
              <svg width={12} height={12} viewBox="0 0 24 24" fill="var(--red)" stroke="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            );
            return (
              <div
                role="button"
                tabIndex={0}
                onClick={() => navigateToPost(yesterdayChallengeWinner!.id)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigateToPost(yesterdayChallengeWinner!.id); } }}
                style={{
                  padding: "12px 16px",
                  background: "var(--bg2)",
                  borderBottom: "1px solid var(--border2)",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--surface)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--bg2)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Vincitore challenge di ieri</span>
                  <Link href={`/${yesterdayChallengeWinner.username}`} onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "inherit" }}>
                    <UAv username={yesterdayChallengeWinner.username} size={28} avatarUrl={yesterdayChallengeWinner.avatar_url} avatarColor={yesterdayChallengeWinner.avatar_color} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{displayFor(yesterdayChallengeWinner.username, yesterdayChallengeWinner.display_name)}</span>
                    <ChallengeWinnerBadge size={14} />
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>@{handleFor(yesterdayChallengeWinner.username)}</span>
                  </Link>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, color: "var(--red)", marginLeft: "auto" }}>
                    <HeartIcon />
                    {likesCount}
                  </span>
                </div>
                {topic && (
                  <p style={{ fontSize: 12, color: "var(--red)", fontWeight: 600, margin: "0 0 4px 0", lineHeight: 1.35 }}>
                    {topic}
                  </p>
                )}
                {excerptDisplay && (
                  <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.4, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {excerptDisplay}
                  </p>
                )}
              </div>
            );
          })()}

          {/* Tab Home / Osservati (solo se loggato) / Challenge (visibile a tutti) */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border2)", background: "var(--surface)" }}>
            {(user ? (["home", "osservati", "challenge"] as const) : (["home", "challenge"] as const)).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                flex: 1, background: "none", border: "none", cursor: "pointer",
                padding: "12px 0", fontSize: 14, fontWeight: activeTab === tab ? 700 : 400,
                color: activeTab === tab ? "var(--text)" : "var(--muted)",
                borderBottom: activeTab === tab ? "2px solid var(--red)" : "2px solid transparent",
                fontFamily: "inherit", transition: "color 0.15s",
              }}>
                {tab === "home" ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:5,verticalAlign:"middle"}}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>Home</> : tab === "osservati" ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:5,verticalAlign:"middle"}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Osservati</> : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:5,verticalAlign:"middle"}}><path d="M8 2h8v6l-4 4 4 4v6H8v-6l4-4-4-4V2z"/></svg>Challenge</>}
              </button>
            ))}
          </div>

          {/* HASHTAG FILTER BANNER */}
          {activeHashtag && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 16px", background: "var(--surface)",
              borderBottom: "1px solid var(--border2)", fontSize: 13,
            }}>
              <span style={{ color: "var(--text)", fontWeight: 600 }}>
                <span style={{ color: "var(--red)" }}>{activeHashtag}</span>
                <span style={{ color: "var(--muted)", fontWeight: 400, marginLeft: 8 }}>· filtrando il feed</span>
              </span>
              <button onClick={() => setActiveHashtag(null)} style={{
                background: "none", border: "1px solid var(--border2)", borderRadius: 999,
                cursor: "pointer", color: "var(--muted)", fontSize: 12, padding: "2px 10px",
                fontFamily: "inherit",
              }}>✕ rimuovi</button>
            </div>
          )}

          {/* FEED */}
          {(() => {
            const filtered = assumptions
              .filter(a => activeTab === "osservati" ? watching.includes(a.username) : activeTab === "challenge" ? parseChallengePostText(a.text) !== null : true)
              .filter(a => !activeHashtag || a.text.toLowerCase().includes(activeHashtag));
            if (filtered.length === 0 && activeTab !== "challenge") {
              return (
                <div className="empty">
                  <div className="empty-icon">{activeTab === "osservati" ? "○" : "👀"}</div>
                  <div className="empty-title">
                    {activeTab === "osservati" ? "Nessun osservato ancora" : "Nessuna WA ancora"}
                  </div>
                  <div>
                    {activeTab === "osservati" ? "Vai sul profilo di un utente e inizia a osservarlo." : "Sii il primo a rompere il ghiaccio."}
                  </div>
                </div>
              );
            }
            if (activeTab === "challenge") {
              const byDate = new Map<string, typeof filtered>();
              for (const a of filtered) {
                const date = parseChallengePostText(a.text)!.date;
                if (!byDate.has(date)) byDate.set(date, []);
                byDate.get(date)!.push(a);
              }
              const dateSet = new Set(byDate.keys());
              if (!dateSet.has(todayChallengeDate)) dateSet.add(todayChallengeDate);
              const dates = [...dateSet].sort((a, b) => b.localeCompare(a));
              return dates.flatMap((date) => {
                const posts = byDate.get(date) ?? [];
                const topic = posts[0] ? (parseChallengePostText(posts[0].text)?.topic ?? "") : (date === todayChallengeDate ? challengeOfDay.topic : "");
                const winner = [...posts].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                const hasWinner = winner && (winner.likes ?? 0) > 0 && !isAnon(winner.username);
                const isToday = date === todayChallengeDate;
                return [
                  <div key={date} style={{ borderBottom: "1px solid var(--border2)" }}>
                    <div style={{ padding: "10px 16px", background: "var(--surface)", fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "capitalize" }}>
                      {formatChallengeDate(date)}
                      {topic && <span style={{ color: "var(--text)", fontWeight: 500, marginLeft: 6 }}>— {topic}</span>}
                    </div>
                    {isToday ? (
                      <div style={{
                        padding: "10px 16px",
                        background: "var(--bg2)",
                        borderBottom: "1px solid var(--border2)",
                        fontSize: 12,
                        color: "var(--muted)",
                        fontWeight: 500,
                      }}>
                        In corso{countdownToMidnight ? ` · ${countdownToMidnight === "Scade a mezzanotte" ? countdownToMidnight : `${countdownToMidnight} rimaste`}` : ""}
                      </div>
                    ) : hasWinner ? (
                      <button
                        type="button"
                        onClick={() => navigateToPost(winner!.id)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 16px",
                          background: "var(--bg2)",
                          border: "none",
                          borderBottom: "1px solid var(--border2)",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          textAlign: "left",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "var(--surface)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "var(--bg2)"; }}
                      >
                        <ChallengeWinnerBadge size={16} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Vincitore</span>
                          <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>@{handleFor(winner!.username)}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--red)" }}>♥ {winner!.likes ?? 0}</span>
                      </button>
                    ) : null}
                    {posts.length === 0 && date === todayChallengeDate ? (
                      <div style={{ padding: "16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
                        Nessuna risposta ancora
                      </div>
                    ) : null}
                    {posts.map((a) => (
                      <div key={a.id} id={`post-${a.id}`}>
                        <TweetCard
                          key={`tc-${a.id}`} a={a}
                          comments={commentsByPost[a.id] ?? []}
                          isAdmin={isAdmin} profile={profile}
                          onLike={likePost} onDelete={deletePost} onPin={pinPost}
                          onDeleteComment={deleteComment} onAddComment={addComment} onLikeComment={likeComment}
                          onEditPost={editPost} onEditComment={editComment}
                          openCommentId={openCommentId} setOpenCommentId={setOpenCommentId}
                          onHashtag={tag => setActiveHashtag(t => t === tag ? null : tag)}
                          currentUsername={profile?.username || ""}
                          watching={watching}
                          onToggleWatch={user ? toggleWatch : undefined}
                          onReportPost={user ? (id) => reportContent("post", id) : undefined}
                          onReportComment={user ? (id) => reportContent("comment", id) : undefined}
                          validUsernames={validUsernamesSet}
                          allProfiles={allProfiles}
                          challengeWinnerUsername={yesterdayChallengeWinner?.username}
                          previousWeekWinnerUsername={previousWeekWinnerUsername}
                        />
                      </div>
                    ))}
                  </div>,
                ];
              });
            }
            return filtered.flatMap((a, i) => {
              const card = (
                <div key={a.id} id={`post-${a.id}`}>

                <TweetCard
                  key={`tc-${a.id}`} a={a}
                  comments={commentsByPost[a.id] ?? []}
                  isAdmin={isAdmin} profile={profile}
                  onLike={likePost} onDelete={deletePost} onPin={pinPost}
                  onDeleteComment={deleteComment} onAddComment={addComment} onLikeComment={likeComment}
                  onEditPost={editPost} onEditComment={editComment}
                  openCommentId={openCommentId} setOpenCommentId={setOpenCommentId}
                  onHashtag={tag => setActiveHashtag(t => t === tag ? null : tag)}
                  currentUsername={profile?.username || ""}
                  watching={watching}
                  onToggleWatch={user ? toggleWatch : undefined}
                  onReportPost={user ? (id) => reportContent("post", id) : undefined}
                  onReportComment={user ? (id) => reportContent("comment", id) : undefined}
                  validUsernames={validUsernamesSet}
                  allProfiles={allProfiles}
                  challengeWinnerUsername={yesterdayChallengeWinner?.username}
                  previousWeekWinnerUsername={previousWeekWinnerUsername}
                />
                </div>
              );
              if (i === 3 && !activeHashtag && isMobile && activeTab === "home") {
                return [card, <TrendingHashtagsMobile key="trending-mobile" assumptions={assumptions} onHashtag={tag => setActiveHashtag(t => t === tag ? null : tag)} activeHashtag={activeHashtag} />];
              }
              if (mobileWidgetConfig && activeTab === "home" && !activeHashtag && i === mobileWidgetConfig.pos1) {
                const W = mobileWidgetConfig.order[0] === "podium"
                  ? <Podium key="podium-mob" assumptions={assumptions} feed onPostClick={navigateToPost} />
                  : <TopUsers key="topuser-mob" assumptions={assumptions} feed previousWeekWinnerUsername={previousWeekWinnerUsername} />;
                return [card, W];
              }
              if (mobileWidgetConfig && activeTab === "home" && !activeHashtag && i === mobileWidgetConfig.pos2) {
                const W = mobileWidgetConfig.order[1] === "podium"
                  ? <Podium key="podium-mob" assumptions={assumptions} feed onPostClick={navigateToPost} />
                  : <TopUsers key="topuser-mob" assumptions={assumptions} feed previousWeekWinnerUsername={previousWeekWinnerUsername} />;
                return [card, W];
              }
              return [card];
            });
          })()}

          {/* Scroll to top */}
          {showScrollTop && (
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              style={{
                position: "fixed", bottom: 28, right: 28, zIndex: 500,
                width: 44, height: 44, borderRadius: "50%",
                background: "var(--red)", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </button>
          )}

          {/* ── AUTH MODAL ── */}
          {modal === "auth" && (
            <div className="overlay" onClick={() => { setModal("none"); setAuthNeedsConfirm(false); }}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <img src={dark ? "/logo-icon-dark.png" : "/logo-icon.png"} alt="WA" style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 12 }} />
                  <div>
                    <div className="modal-title">Weird Assumptions</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>Entra nella community</div>
                  </div>
                </div>
                <div className="tabs">
                  <button className={`tab${authTab === "login" ? " on" : ""}`} onClick={() => {
                    setAuthTab("login");
                    setAuthErr(""); setAuthNeedsConfirm(false); setAuthForgotPassword(false); setForgotPasswordSent(false);
                    setEmail(""); setPwd("");
                    setRegUsername(""); setRegDisplayName(""); setRegBio(""); setRegColor(AVATAR_COLORS[0]);
                    setRegAvatarFile(null); setRegAvatarPreview(null); setRegAcceptTerms(false);
                  }}>Accedi</button>
                  <button className={`tab${authTab === "register" ? " on" : ""}`} onClick={() => {
                    setAuthTab("register");
                    setAuthErr(""); setAuthNeedsConfirm(false); setAuthForgotPassword(false); setForgotPasswordSent(false);
                    setEmail(""); setPwd("");
                    setRegUsername(""); setRegDisplayName(""); setRegBio(""); setRegColor(AVATAR_COLORS[0]);
                    setRegAvatarFile(null); setRegAvatarPreview(null); setRegAcceptTerms(false);
                  }}>Registrati</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {authForgotPassword ? (
                    <>
                      {forgotPasswordSent ? (
                        <div style={{ padding: "12px 0", fontSize: 14, color: "var(--text)" }}>
                          Controlla la tua email: ti abbiamo inviato un link per reimpostare la password (controlla anche spam).
                        </div>
                      ) : (
                        <>
                          <div className="f-label">Email</div>
                          <input className="f-inp" type="email" placeholder="email@esempio.com" value={forgotPasswordEmail} onChange={e => { setForgotPasswordEmail(e.target.value); setAuthErr(""); }} />
                          {authErr && <div className="auth-err">{authErr}</div>}
                          <button className="btn-post" onClick={handleForgotPassword} disabled={authLoading || !forgotPasswordEmail.trim()}>
                            {authLoading ? "Invio…" : "Invia link per reimpostare la password"}
                          </button>
                        </>
                      )}
                      <button type="button" className="modal-link" onClick={() => { setAuthForgotPassword(false); setForgotPasswordSent(false); setForgotPasswordEmail(""); setAuthErr(""); }}>
                        Torna al login
                      </button>
                    </>
                  ) : authTab === "register" ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
                        <div className="av-upload" onClick={() => regFileRef.current?.click()}>
                          {regAvatarPreview
                            ? <img src={regAvatarPreview} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }} />
                            : <div className="av" style={{ width: 64, height: 64, background: regColor, fontSize: 24 }}>{regUsername ? initial(regUsername) : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}</div>}
                          <div className="av-upload-overlay">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                          </div>
                        </div>
                        <input ref={regFileRef} type="file" accept="image/*" style={{ display: "none" }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) { setRegAvatarFile(f); setRegAvatarPreview(URL.createObjectURL(f)); }}} />
                      </div>
                      <div>
                        <div className="f-label">Username</div>
                        <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border2)", borderRadius: 8, background: "var(--bg2)", overflow: "hidden" }}>
                          <span style={{ paddingLeft: 12, fontSize: 15, color: "var(--muted)", flexShrink: 0 }}>@</span>
                          <input
                            className="f-inp"
                            placeholder="handle (minuscole, senza spazi)"
                            value={regUsername}
                            onChange={e => setRegUsername(e.target.value.replace(/^@+/, "").toLowerCase().replace(/\s+/g, "_"))}
                            style={{ border: "none", background: "transparent", paddingLeft: 4, flex: 1, minWidth: 0 }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="f-label">Nome visualizzato <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(opzionale)</span></div>
                        <input className="f-inp" placeholder={regUsername || "Come vuoi apparire…"} value={regDisplayName} onChange={e => setRegDisplayName(e.target.value)} />
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Se vuoto, verrà usato l'username</div>
                      </div>
                      <div>
                        <div className="f-label">Bio <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(opzionale)</span></div>
                        <input className="f-inp" placeholder="Descriviti in una riga…" value={regBio} onChange={e => setRegBio(e.target.value)} />
                      </div>
                      {!regAvatarPreview && (
                        <div>
                          <div className="f-label" style={{ marginBottom: 8 }}>Colore avatar</div>
                          <div className="color-row">
                            {AVATAR_COLORS.map((c: string) => (
                              <div key={c} className={`color-dot${regColor === c ? " sel" : ""}`} style={{ background: c }} onClick={() => setRegColor(c)} />
                            ))}
                          </div>
                        </div>
                      )}
                      <div style={{ borderTop: "1px solid var(--border2)" }} />
                    </>
                  ) : null}
                  {!authForgotPassword && (
                    <>
                      <div>
                        <div className="f-label">{authTab === "login" ? "Username o email" : "Email"}</div>
                        <input className="f-inp"
                          placeholder={authTab === "login" ? "username oppure email@esempio.com" : "email@esempio.com"}
                          value={email} onChange={e => { setEmail(e.target.value); setAuthErr(""); }}
                          onKeyDown={e => e.key === "Enter" && (authTab === "login" ? handleLogin() : handleRegister())} />
                      </div>
                      <div>
                        <div className="f-label">Password</div>
                        <input className="f-inp" placeholder="••••••••" type="password"
                          value={pwd} onChange={e => setPwd(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && (authTab === "login" ? handleLogin() : handleRegister())} />
                      </div>
                      {authTab === "login" && (
                        <button type="button" className="modal-link" style={{ marginTop: -6, marginBottom: 2 }}
                          onClick={() => { setAuthForgotPassword(true); setAuthErr(""); }}>
                          Password dimenticata?
                        </button>
                      )}
                      {authTab === "register" && (
                        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 13, color: "var(--text)", marginTop: 4 }}>
                          <input type="checkbox" checked={regAcceptTerms} onChange={e => { setRegAcceptTerms(e.target.checked); setAuthErr(""); }} style={{ marginTop: 2, flexShrink: 0 }} />
                          <span>
                            Dichiaro di aver letto e accettato i{" "}
                            <Link href="/termini" target="_blank" rel="noopener noreferrer" style={{ color: "var(--red)", textDecoration: "underline", fontWeight: 500 }} onClick={e => e.stopPropagation()}>
                              Termini e condizioni
                            </Link>
                            .
                          </span>
                        </label>
                      )}
                      {authErr && <div className="auth-err">{authErr}</div>}
                      {authNeedsConfirm && (
                        <button type="button" className="modal-link" style={{ marginTop: -4, marginBottom: 4 }}
                          onClick={handleResendConfirmEmail} disabled={!email.trim() || authLoading}>
                          Rinvia email di conferma
                        </button>
                      )}
                      <button className="btn-post" style={{ marginTop: 4 }}
                        onClick={authTab === "login" ? handleLogin : handleRegister}
                        disabled={!email || !pwd || authLoading || (authTab === "register" && (!regUsername || !regAcceptTerms))}>
                        {authLoading ? "Caricamento…" : authTab === "login" ? "Accedi" : "Crea account"}
                      </button>
                      <button className="modal-link" onClick={() => setModal("none")}>Annulla</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── MODAL IMPOSTA PASSWORD (dopo click link in email reset) ── */}
          {resetPwdModal && (
            <div className="overlay" onClick={() => { setResetPwdModal(false); setResetPwdErr(""); }}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div style={{ marginBottom: 16 }}>
                  <div className="modal-title">Nuova password</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Imposta la nuova password per il tuo account.</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <div className="f-label">Nuova password</div>
                    <input className="f-inp" type="password" placeholder="••••••••" value={resetPwdNew} onChange={e => { setResetPwdNew(e.target.value); setResetPwdErr(""); }} />
                  </div>
                  <div>
                    <div className="f-label">Conferma password</div>
                    <input className="f-inp" type="password" placeholder="••••••••" value={resetPwdConfirm} onChange={e => { setResetPwdConfirm(e.target.value); setResetPwdErr(""); }} />
                  </div>
                  {resetPwdErr && <div className="auth-err">{resetPwdErr}</div>}
                  <button className="btn-post" onClick={handleSetPasswordFromReset} disabled={resetPwdLoading || !resetPwdNew || !resetPwdConfirm}>
                    {resetPwdLoading ? "Salvataggio…" : "Imposta password"}
                  </button>
                  <button type="button" className="modal-link" onClick={() => { setResetPwdModal(false); setResetPwdErr(""); }}>Annulla</button>
                </div>
              </div>
            </div>
          )}

          {/* ── PROFILE MODAL ── */}
          {modal === "profile" && profile && (
            <div className="overlay" onClick={() => { setModal("none"); setRemoveAvatar(false); setChangePwdErr(""); setChangePwdOk(false); setNewPassword(""); setConfirmPassword(""); }}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div
                      className="av-upload"
                      onClick={() => !isOfficial(profile.username) && fileRef.current?.click()}
                      style={{ cursor: isOfficial(profile.username) ? "default" : "pointer" }}
                    >
                      {avatarPreview
                        ? <img src={avatarPreview} style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover" }} />
                        : !removeAvatar && profile.avatar_url
                          ? <img src={profile.avatar_url} style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover" }} alt="" />
                          : <Avatar profile={{ ...profile, avatar_color: editColor, avatar_url: removeAvatar ? undefined : profile.avatar_url }} size={52} />}
                      {!isOfficial(profile.username) && (
                        <div className="av-upload-overlay">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        </div>
                      )}
                    </div>
                    {!isOfficial(profile.username) && (avatarPreview || (!removeAvatar && profile.avatar_url)) && (
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
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); setRemoveAvatar(false); }}} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                      {editDisplayName || profile.username}
                      {profile.is_verified && <Badge size={14} />}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>@{handleFor(profile.username)}</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <div className="f-label">Nome visualizzato</div>
                    <input className="f-inp" placeholder="Come vuoi apparire…" value={editDisplayName} onChange={e => setEditDisplayName(e.target.value)} />
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>@{profile.username} — username non modificabile</div>
                  </div>
                  <div>
                    <div className="f-label">Bio</div>
                    <input className="f-inp" placeholder="Descriviti in una riga…" value={editBio} onChange={e => setEditBio(e.target.value)} />
                  </div>
                  {!isOfficial(profile.username) && !avatarPreview && (removeAvatar || !profile.avatar_url) && (
                    <div>
                      <div className="f-label" style={{ marginBottom: 8 }}>Colore avatar <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(se non carichi foto)</span></div>
                      <div className="color-row">
                        {AVATAR_COLORS.map((c: string) => (
                          <div key={c} className={`color-dot${editColor === c ? " sel" : ""}`} style={{ background: c }} onClick={() => setEditColor(c)} />
                        ))}
                      </div>
                    </div>
                  )}
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

                  <button className="modal-link" onClick={() => { setModal("none"); setRemoveAvatar(false); setChangePwdErr(""); setChangePwdOk(false); setNewPassword(""); setConfirmPassword(""); }}>Annulla</button>
                </div>
              </div>
            </div>
          )}
        </div>{/* /wrap */}

        {/* ── COLONNA DESTRA DESKTOP ── */}
        <aside className="right-col">
          <Podium assumptions={assumptions} sidebar onPostClick={navigateToPost} />
          <TopUsers assumptions={assumptions} previousWeekWinnerUsername={previousWeekWinnerUsername} />
          <TrendingHashtags assumptions={assumptions} activeHashtag={activeHashtag} onHashtag={tag => setActiveHashtag(t => t === tag ? null : tag)} />

        </aside>
      </div>{/* /page-layout */}
    </>
  );
}

/* ─── Countdown al reset del lunedì ─── */
function useWeeklyCountdown() {
  const getMs = () => {
    const now = new Date();
    const next = new Date(now);
    const day = now.getDay();
    const daysUntilMon = day === 1 ? 7 : (8 - day) % 7;
    next.setDate(now.getDate() + daysUntilMon);
    next.setHours(0, 0, 0, 0);
    return next.getTime() - now.getTime();
  };

  const [ms, setMs] = useState(0);
  useEffect(() => {
    setMs(getMs());
    const t = setInterval(() => setMs(getMs()), 1000);
    return () => clearInterval(t);
  }, []);

  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const d = Math.floor(h / 24);

  if (d > 0) return `${d}g ${h % 24}h ${m}m ${s}s`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}


/* ─── Placeholder casuali compose ─── */
const WA_PLACEHOLDERS = [
  "So che ci stai pensando… scrivilo.",
  "Non avrai mica paura di scriverlo?",
  "Facci sapere cosa non ti fa dormire la notte.",
  "Be free. Just say it.",
  "La tua teoria più strana. Vai.",
  "Cosa pensi e non dici mai?",
  "Scrivilo prima che ti passi.",
  "Il mondo ha bisogno di sapere.",
  "This is a free space. Write.",
  "Scommettiamo che qualcuno la pensa come te?",
];



/* ─── Trending # Mobile (card nel feed, stesso stile di Top post / Top user) ─── */
function TrendingHashtagsMobile({ assumptions, onHashtag, activeHashtag }: {
  assumptions: any[];
  onHashtag: (tag: string) => void;
  activeHashtag: string | null;
}) {
  const counts: Record<string, number> = {};
  assumptions.forEach(a => {
    const tags = Array.from(new Set<string>((a.text.match(/#[\w\u00C0-\u024F]+/g) || []).map((t: string) => t.toLowerCase())));
    tags.forEach((tag: string) => { counts[tag] = (counts[tag] || 0) + 1; });
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (sorted.length === 0) return null;
  return (
    <div className="mobile-only" style={{
      padding: "14px 16px", background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 12, marginBottom: 8,
    }}>
      <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 20 }}>Trending #</div>
      <div style={{ display: "flex", flexDirection: "row", gap: 20, flexWrap: "wrap" }}>
        {sorted.map(([tag]) => (
          <button key={tag} onClick={() => onHashtag(tag)} style={{
            padding: 0, background: "none", border: "none",
            color: "var(--red)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            textDecoration: activeHashtag === tag ? "underline" : "none",
            transition: "opacity 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.7"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Trending # (desktop: card come Top post / Top user, 3 hashtag) ─── */
function TrendingHashtags({ assumptions, activeHashtag, onHashtag }: {
  assumptions: any[];
  activeHashtag: string | null;
  onHashtag: (tag: string) => void;
}) {
  const counts: Record<string, number> = {};
  assumptions.forEach(a => {
    const tags = Array.from(new Set<string>((a.text.match(/#[\w\u00C0-\u024F]+/g) || []).map((t: string) => t.toLowerCase())));
    tags.forEach((tag: string) => { counts[tag] = (counts[tag] || 0) + 1; });
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (sorted.length === 0) return null;
  return (
    <div className="right-widget" style={{ padding: "14px 14px 10px" }}>
      <div className="right-widget-title" style={{ marginBottom: 10 }}>Trending #</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {sorted.map(([tag, count]) => (
          <button key={tag} onClick={() => onHashtag(tag)} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "9px 10px", background: activeHashtag === tag ? "var(--bg2)" : "transparent",
            border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
            transition: "background 0.12s", borderRadius: 10,
          }}
            onMouseEnter={e => { if (activeHashtag !== tag) e.currentTarget.style.background = "var(--border2)"; }}
            onMouseLeave={e => { if (activeHashtag !== tag) e.currentTarget.style.background = "transparent"; }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: activeHashtag === tag ? "var(--red)" : "var(--text)" }}>{tag}</span>
            <span style={{ fontSize: 12, color: "var(--muted2)" }}>{count} WA</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Podium ─── */
function Podium({ assumptions, sidebar = false, feed = false, onPostClick }: { assumptions: any[]; sidebar?: boolean; feed?: boolean; onPostClick?: (id: string) => void; }) {
  const monday = new Date(); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); monday.setHours(0,0,0,0);
  const weekStart = monday.getTime();
  const weekAssumptions = assumptions.filter(a => !isAnon(a.username) && new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at + "Z").getTime() >= weekStart);
  const top3 = [...weekAssumptions].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 3);
  const countdown  = useWeeklyCountdown();
  const order      = [top3[1], top3[0], top3[2]].filter(Boolean);
  const colors     = ["#a0a0b0", "#c4a436", "#b87040"];
  const ranks      = [2, 1, 3];

  if (feed && top3.length === 0) return null;

  const Heart = ({ color, size = 12 }: { color: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );

  const Crown = () => (
    <svg width="28" height="18" viewBox="0 0 28 18" fill="none">
      {/* Base piena */}
      <rect x="2" y="13" width="24" height="3.5" rx="1.5" fill="#c4a436"/>
      {/* Corpo corona */}
      <path d="M2 13 L5 4 L10 9.5 L14 1 L18 9.5 L23 4 L26 13 Z" fill="#c4a436" opacity="0.25"/>
      <path d="M2 13 L5 4 L10 9.5 L14 1 L18 9.5 L23 4 L26 13" stroke="#c4a436" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" fill="none"/>
      {/* Gemme */}
      <circle cx="5" cy="4" r="1.8" fill="#c4a436"/>
      <circle cx="23" cy="4" r="1.8" fill="#c4a436"/>
      <circle cx="14" cy="1.5" r="2.2" fill="#e8c44a"/>
      <circle cx="10" cy="9.5" r="1.4" fill="#c4a436" opacity="0.7"/>
      <circle cx="18" cy="9.5" r="1.4" fill="#c4a436" opacity="0.7"/>
    </svg>
  );

  const listContent = (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: feed ? 14 : 15, color: "var(--text)" }}>🔥 Top post della settimana</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--red)", background: "var(--red-pale)", padding: "2px 8px", borderRadius: 999 }}>⏳ {countdown}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {top3.map((a, i) => { const sc = ["#c4a436","#a0a0b0","#b87040"][i]; return (
          <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 8px", borderRadius: 10, transition: "background 0.15s", cursor: "pointer" }}
            onClick={() => onPostClick?.(a.id)}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--border2)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: `${sc}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: sc }}>{i + 1}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <UAv username={a.username} size={18} avatarUrl={a.avatar_url} avatarColor={a.avatar_color} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayFor(a.username, a.display_name)}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{(() => { const c = parseChallengePostText(a.text); return c ? `${c.topic} — ${c.body}` : a.text; })()}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0, marginTop: 1 }}>
              <Heart color={sc} size={11} />
              <span style={{ fontSize: 12, fontWeight: 700, color: sc }}>{a.likes || 0}</span>
            </div>
          </div>
        );})}
      </div>
    </>
  );

  if (feed) {
    return (
      <div style={{ padding: "14px 16px", background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 12, marginBottom: 8 }}>
        {listContent}
      </div>
    );
  }

  if (sidebar) {
    return (
      <div className="right-widget" style={{ padding: "14px 14px 10px" }}>
        {listContent}
      </div>
    );
  }

  return (
    <div className="podium-wrap">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "0 4px" }}>
        <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 16, color: "var(--text)" }}>🔥 Top post della settimana</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--red)", background: "var(--red-pale)", padding: "2px 8px", borderRadius: 999 }}>⏳ {countdown}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, alignItems: "end", padding: "0 4px" }}>
        {order.map((a, i) => {
          const rank    = ranks[i];
          const color   = colors[i];
          const barH    = [80, 110, 55][i];
          const isFirst = rank === 1;
          return (
            <div key={a.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}
              onClick={() => onPostClick?.(a.id)}>
              {/* Card */}
              <div style={{
                width: "100%",
                background: `linear-gradient(to bottom, var(--bg2), ${color}18)`,
                borderTop: `1px solid ${color}50`,
                borderLeft: `1px solid ${color}50`,
                borderRight: `1px solid ${color}50`,
                borderRadius: "14px 14px 0 0",
                padding: isFirst ? "22px 8px 10px" : "10px 6px 10px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                boxShadow: isFirst ? `0 -4px 20px ${color}20` : "none",
                position: "relative",
              }}>
                <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
                  {isFirst && (
                    <div style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)" }}>
                      <Crown />
                    </div>
                  )}
                  <UAv username={a.username} size={isFirst ? 38 : 30} avatarUrl={a.avatar_url} avatarColor={a.avatar_color} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
                  {displayFor(a.username, a.display_name)}
                </span>
                <span style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.3, textAlign: "center", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {(() => { const c = parseChallengePostText(a.text); return c ? `${c.topic} — ${c.body}` : a.text; })()}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Heart color={color} size={12} />
                  <span style={{ fontSize: 12, fontWeight: 700, color }}>{a.likes || 0}</span>
                </div>
              </div>
              {/* Gradino */}
              <div style={{
                width: "100%", height: barH,
                background: `linear-gradient(to bottom, ${color}30, ${color}18)`,
                borderTop: `2px solid ${color}60`,
                borderLeft: `1px solid ${color}50`,
                borderRight: `1px solid ${color}50`,
                borderBottom: `1px solid ${color}50`,
                borderRadius: "0 0 8px 8px",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: isFirst ? 20 : 16, fontWeight: 800, color, opacity: 0.75 }}>{rank}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ─── Top user della settimana (like totali nella settimana, reset ogni lunedì) ─── */
function TopUsers({ assumptions, mobile = false, feed = false, previousWeekWinnerUsername }: { assumptions: any[]; sidebar?: boolean; mobile?: boolean; feed?: boolean; previousWeekWinnerUsername?: string | null }) {
  const monday = new Date(); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); monday.setHours(0,0,0,0);
  const weekStart = monday.getTime();
  const top = Object.values(
    assumptions
      .filter(a => !isAnon(a.username) && new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at + "Z").getTime() >= weekStart)
      .reduce((acc: any, a) => {
        if (!acc[a.username]) acc[a.username] = { username: a.username, display_name: a.display_name, avatar_url: a.avatar_url, avatar_color: a.avatar_color, is_verified: a.is_verified, likes: 0 };
        acc[a.username].likes += a.likes || 0;
        return acc;
      }, {})
  ).filter((u: any) => u.likes > 0).sort((a: any, b: any) => b.likes - a.likes) as any[];

  const u = top[0];
  if (!u) return null;

  const Heart = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="#c4a436" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
  );

  const inner = (
    <>
      <div className="right-widget-title" style={{ marginBottom: 10 }}>🏆 Top user della settimana</div>
      <Link href={`/${u.username}`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <UAv username={u.username} size={feed ? 32 : 38} avatarUrl={u.avatar_url} avatarColor={u.avatar_color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: feed ? 13 : 14, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayFor(u.username, u.display_name)}</span>
            {u.is_verified && <Badge size={12} />}
            {previousWeekWinnerUsername === u.username && <WeekWinnerBadge size={12} />}
          </div>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>@{handleFor(u.username)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
          <Heart /><span style={{ fontSize: 13, fontWeight: 700, color: "#c4a436" }}>{u.likes}</span>
        </div>
      </Link>
    </>
  );

  if (feed) {
    return (
      <div style={{ padding: "14px 16px", background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 12, marginBottom: 8 }}>
        {inner}
      </div>
    );
  }

  if (mobile) return (
    <div style={{ borderBottom: "6px solid var(--bg2)", padding: "10px 20px", background: "var(--surface)", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", flexShrink: 0, whiteSpace: "nowrap" }}>🏆 Top user della settimana</span>
      <Link href={`/${u.username}`} style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: "none", flex: 1, minWidth: 0 }}>
        <UAv username={u.username} size={26} avatarUrl={u.avatar_url} avatarColor={u.avatar_color} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayFor(u.username, u.display_name)}</span>
        {u.is_verified && <Badge size={11} />}
        {previousWeekWinnerUsername === u.username && <WeekWinnerBadge size={11} />}
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
        <Heart /><span style={{ fontSize: 13, fontWeight: 700, color: "#c4a436" }}>{u.likes}</span>
      </div>
    </div>
  );

  return (
    <div className="right-widget">
      {inner}
    </div>
  );
}