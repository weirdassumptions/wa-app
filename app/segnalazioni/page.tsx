"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { parseChallengePostText } from "../components/helpers";

type Report = {
  id: string;
  reporter_id: string;
  content_type: "post" | "comment";
  content_id: string;
  reason: string | null;
  status: string;
  created_at: string;
};

type ReportWithContent = Report & {
  content?: { text: string; username: string; display_name?: string; created_at: string };
  reporter_username?: string;
};

function formatDate(s: string) {
  if (!s || typeof s !== "string") return "—";
  const normalized = s.replace(" ", "T").replace(/\.\d{3}$/, "").trim();
  const withTz = /[Z+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : normalized + "Z";
  const d = new Date(withTz);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function SegnalazioniPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reports, setReports] = useState<ReportWithContent[]>([]);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace("/app");
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).maybeSingle();
    if (!profile?.is_admin) {
      router.replace("/app");
      return;
    }
    setIsAdmin(true);

    const { data: reportsData } = await supabase
      .from("reports")
      .select("id, reporter_id, content_type, content_id, reason, status, created_at")
      .order("created_at", { ascending: false });

    if (!reportsData?.length) {
      setReports([]);
      setLoading(false);
      return;
    }

    const postIds = [...new Set((reportsData as Report[]).filter(r => r.content_type === "post").map(r => r.content_id))];
    const commentIds = [...new Set((reportsData as Report[]).filter(r => r.content_type === "comment").map(r => r.content_id))];
    const reporterIds = [...new Set((reportsData as Report[]).map(r => r.reporter_id))];

    const [postsRes, commentsRes, profilesRes] = await Promise.all([
      postIds.length ? supabase.from("assumptions").select("id, text, username, display_name, created_at").in("id", postIds) : { data: [] },
      commentIds.length ? supabase.from("comments").select("id, text, username, display_name, created_at").in("id", commentIds) : { data: [] },
      reporterIds.length ? supabase.from("profiles").select("id, username").in("id", reporterIds) : { data: [] },
    ]);

    const postsMap = new Map((postsRes.data ?? []).map((p: { id: string; text: string; username: string; display_name?: string; created_at: string }) => [p.id, p]));
    const commentsMap = new Map((commentsRes.data ?? []).map((c: { id: string; text: string; username: string; display_name?: string; created_at: string }) => [c.id, c]));
    const profilesMap = new Map((profilesRes.data ?? []).map((p: { id: string; username: string }) => [p.id, p.username]));

    const enriched: ReportWithContent[] = (reportsData as Report[]).map(r => {
      const content = r.content_type === "post"
        ? postsMap.get(r.content_id)
        : commentsMap.get(r.content_id);
      const reporter_username = profilesMap.get(r.reporter_id);
      return {
        ...r,
        content: content as ReportWithContent["content"],
        reporter_username,
      };
    });

    setReports(enriched);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const updateReportStatus = async (reportId: string, status: string) => {
    setActing(reportId);
    await supabase.from("reports").update({ status }).eq("id", reportId);
    setReports(prev => prev.filter(r => r.id !== reportId));
    setActing(null);
  };

  const handleElimina = async (r: ReportWithContent) => {
    if (!confirm("Eliminare definitivamente questo contenuto? L\'operazione non è reversibile.")) return;
    setActing(r.id);
    if (r.content_type === "post") {
      await Promise.all([
        supabase.from("likes").delete().eq("assumption_id", r.content_id),
        supabase.from("comments").delete().eq("assumption_id", r.content_id),
        supabase.from("assumptions").delete().eq("id", r.content_id),
      ]);
    } else {
      await supabase.from("comments").delete().eq("id", r.content_id);
    }
    await supabase.from("reports").update({ status: "resolved" }).eq("id", r.id);
    setReports(prev => prev.filter(x => x.id !== r.id));
    setActing(null);
  };

  const handleIgnora = async (r: ReportWithContent) => {
    await updateReportStatus(r.id, "dismissed");
  };

  const filtered = filter === "pending" ? reports.filter(r => r.status === "pending") : reports;
  const isEmpty = !reports.length;
  const emptyFiltered = filter === "pending" && reports.some(r => r.status !== "pending") && !filtered.length;

  if (!isAdmin && !loading) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: "24px 20px 48px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link href="/app" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 14, marginBottom: 24, textDecoration: "none" }}>
          ← Torna all&apos;app
        </Link>

        <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 24, marginBottom: 8 }}>
          Segnalazioni
        </h1>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20 }}>
          Verifica i contenuti segnalati dagli utenti. Puoi eliminare il contenuto o ignorare la segnalazione.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => setFilter("pending")}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "none",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: filter === "pending" ? "var(--red)" : "var(--bg2)",
              color: filter === "pending" ? "#fff" : "var(--muted)",
            }}
          >
            In attesa
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "none",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: filter === "all" ? "var(--red)" : "var(--bg2)",
              color: filter === "all" ? "#fff" : "var(--muted)",
            }}
          >
            Tutte
          </button>
        </div>

        {loading && <p style={{ color: "var(--muted)", fontSize: 14 }}>Caricamento…</p>}

        {!loading && emptyFiltered && (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Nessuna segnalazione in attesa.</p>
        )}

        {!loading && isEmpty && (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Nessuna segnalazione presente.</p>
        )}

        {!loading && !emptyFiltered && !isEmpty && (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
            {filtered.map(r => {
              const excerpt = r.content
                ? (r.content_type === "post" && parseChallengePostText(r.content.text)
                  ? parseChallengePostText(r.content.text)!.body
                  : r.content.text
                ).slice(0, 200) + (r.content.text.length > 200 ? "…" : "")
                : "(contenuto non più disponibile)";
              const isActing = acting === r.id;
              return (
                <li
                  key={r.id}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border2)",
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: r.content_type === "post" ? "var(--red)" : "var(--muted)",
                          }}
                        >
                          {r.content_type === "post" ? "Post" : "Commento"}
                        </span>
                        {r.reporter_username && (
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>
                            Segnalato da @{r.reporter_username}
                          </span>
                        )}
                        <span style={{ fontSize: 12, color: "var(--muted2)" }}>{formatDate(r.created_at)}</span>
                      </div>
                      {r.content && (
                        <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, marginBottom: 4 }}>
                          <strong style={{ fontSize: 12, color: "var(--muted)" }}>
                            @{r.content.username}
                          </strong>
                          {" · "}
                          {excerpt}
                        </div>
                      )}
                      {!r.content && (
                        <p style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>
                          Contenuto già eliminato
                        </p>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      {r.content && r.status === "pending" && (
                        <>
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => handleElimina(r)}
                            style={{
                              padding: "6px 14px",
                              borderRadius: 999,
                              border: "none",
                              fontFamily: "inherit",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: isActing ? "not-allowed" : "pointer",
                              background: "var(--red)",
                              color: "#fff",
                              opacity: isActing ? 0.7 : 1,
                            }}
                          >
                            {isActing ? "…" : "Elimina contenuto"}
                          </button>
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => handleIgnora(r)}
                            style={{
                              padding: "6px 14px",
                              borderRadius: 999,
                              border: "1px solid var(--border2)",
                              fontFamily: "inherit",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: isActing ? "not-allowed" : "pointer",
                              background: "var(--bg2)",
                              color: "var(--muted)",
                              opacity: isActing ? 0.7 : 1,
                            }}
                          >
                            Ignora
                          </button>
                        </>
                      )}
                      {!r.content && (
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => handleIgnora(r)}
                          style={{
                            padding: "6px 14px",
                            borderRadius: 999,
                            border: "1px solid var(--border2)",
                            fontFamily: "inherit",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            background: "var(--bg2)",
                            color: "var(--muted)",
                          }}
                        >
                          Archivia
                        </button>
                      )}
                      {r.status !== "pending" && r.content && (
                        <span style={{ fontSize: 12, color: "var(--muted2)" }}>
                          {r.status === "resolved" ? "Risolto" : "Ignorato"}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
