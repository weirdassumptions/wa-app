"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import html2canvas from "html2canvas";
import { supabase } from "@/lib/supabase";
import { ShareCard } from "@/app/components/ShareCard";

export default function SharePage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<{ text: string; username?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareStatus, setShareStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("assumptions")
      .select("text, username")
      .eq("id", id)
      .maybeSingle()
      .then(({ data: res, error }) => {
        setLoading(false);
        if (error || !res) {
          setData(null);
          return;
        }
        setData({ text: res.text, username: res.username });
      });
  }, [id]);

  const handleShare = async () => {
    if (!cardRef.current) return;
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
      const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/share/${id}` : "";

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Weird Assumption",
          text: data?.text ?? "",
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
        <div style={{ color: "#8a7f72", fontSize: 15 }}>Post non trovato</div>
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
      <div ref={cardRef} style={{ display: "inline-block" }}>
        <ShareCard
          text={data.text}
          username={data.username}
          postId={id}
        />
      </div>

      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          onClick={handleShare}
          disabled={shareStatus === "loading"}
          style={{
            background: shareStatus === "loading" ? "#b0a898" : "#b83232",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "12px 28px",
            fontSize: 14,
            fontWeight: 600,
            cursor: shareStatus === "loading" ? "wait" : "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {shareStatus === "loading" ? "Generazione…" : "Share"}
        </button>
        {shareStatus === "loading" && (
          <span style={{ fontSize: 13, color: "#8a7f72" }}>Generazione immagine…</span>
        )}
        {shareStatus === "error" && (
          <span style={{ fontSize: 13, color: "#b83232" }}>Errore. Riprova.</span>
        )}
        <Link
          href="/app"
          style={{
            fontSize: 13,
            color: "#8a7f72",
            textDecoration: "none",
          }}
        >
          ← Torna al feed
        </Link>
      </div>
    </div>
  );
}
