"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import html2canvas from "html2canvas";
import { supabase } from "@/lib/supabase";
import { ShareCard } from "@/app/components/ShareCard";

type AssumptionData = { id: string; text: string; username?: string } | null;

async function fetchRandomAssumption(): Promise<AssumptionData> {
  const { data, error } = await supabase.rpc("get_random_assumption");
  if (error || !data?.length) return null;
  const row = data[0];
  return { id: row.id, text: row.text, username: row.username };
}

export default function RandomPage() {
  const [data, setData] = useState<AssumptionData>(null);
  const [loading, setLoading] = useState(true);
  const [shareStatus, setShareStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [fade, setFade] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const loadAnother = useCallback(async () => {
    setFade(true);
    const next = await fetchRandomAssumption();
    setTimeout(() => {
      setData(next);
      setFade(false);
    }, 150);
  }, []);

  useEffect(() => {
    fetchRandomAssumption().then(res => {
      setData(res);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        if (!e.metaKey && !e.ctrlKey && !e.altKey && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          e.preventDefault();
          if (!loading && data) loadAnother();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loading, data, loadAnother]);

  const handleShare = async () => {
    if (!cardRef.current || !data) return;
    setShareStatus("loading");
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#faf6ef",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
      if (!blob) {
        setShareStatus("error");
        return;
      }
      const file = new File([blob], "weird-assumption.png", { type: "image/png" });
      const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/share/${data.id}` : "";
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Weird Assumption",
          text: data.text ?? "",
          url: shareUrl,
          files: [file],
        });
        setShareStatus("done");
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "weird-assumption.png";
        a.click();
        URL.revokeObjectURL(a.href);
        setShareStatus("done");
      }
    } catch {
      setShareStatus("error");
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f0e8" }}>
        <div style={{ color: "#8a7f72", fontSize: 15 }}>Caricamento…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "#f5f0e8", padding: 20 }}>
        <div style={{ color: "#8a7f72", fontSize: 15 }}>Nessuna Weird Assumption disponibile.</div>
        <Link href="/app" style={{ color: "#b83232", fontWeight: 600, textDecoration: "none" }}>Torna al feed</Link>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f0e8",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(22px, 5vw, 28px)",
          fontWeight: 700,
          color: "#1a1510",
          marginBottom: 24,
          textAlign: "center",
        }}
      >
        Random Weird Assumption
      </h1>

      <div
        ref={cardRef}
        style={{
          display: "inline-block",
          opacity: fade ? 0.4 : 1,
          transition: "opacity 0.15s ease-out",
        }}
      >
        <ShareCard text={data.text} username={data.username} postId={data.id} />
      </div>

      <div
        style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: "1px solid #ddd5c8",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Link
          href="/app"
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#b83232",
            textDecoration: "none",
          }}
        >
          Submit yours →
        </Link>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", alignItems: "center" }}>
        <button
          type="button"
          onClick={loadAnother}
          style={{
            background: "#b83232",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Another one
        </button>
        <button
          type="button"
          onClick={handleShare}
          disabled={shareStatus === "loading"}
          style={{
            background: "transparent",
            color: "#1a1510",
            border: "2px solid #d8d0c2",
            borderRadius: 999,
            padding: "10px 22px",
            fontSize: 14,
            fontWeight: 600,
            cursor: shareStatus === "loading" ? "wait" : "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {shareStatus === "loading" ? "…" : "Share"}
        </button>
        </div>
      </div>

      <Link
        href="/app"
        style={{
          marginTop: 28,
          fontSize: 13,
          color: "#8a7f72",
          textDecoration: "none",
        }}
      >
        ← Torna al feed
      </Link>
    </div>
  );
}
