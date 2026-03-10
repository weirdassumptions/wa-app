"use client";

import React from "react";
import { parseChallengePostText, isAnon } from "./helpers";

const SITE_URL = "weirdassumptions.com";

/** Max characters for quote to avoid overflow in social images */
const MAX_QUOTE_CHARS = 280;

/** Converte UUID in numero breve memorizzabile (es. 142) */
export function uuidToShortNumber(id: string): number {
  if (!id) return 0;
  const hex = id.replace(/-/g, "").slice(-6);
  return (parseInt(hex, 16) % 9999) + 1;
}

type ShareCardProps = {
  text: string;
  /** Username dell'autore (nascosto se anonimo) */
  username?: string | null;
  /** Numero breve per header (es. 142). Se non fornito, usa postId string per uuidToShortNumber */
  postId?: number | string | null;
  /** Aspect ratio: "poster" 4/3, "landscape" 1200x630, "square" 1080x1080 */
  aspectRatio?: "poster" | "landscape" | "square";
  className?: string;
};

export function ShareCard({
  text,
  username,
  postId,
  aspectRatio = "poster",
  className,
}: ShareCardProps) {
  const rawBody = parseChallengePostText(text)?.body ?? text;
  const displayText = rawBody.length > MAX_QUOTE_CHARS
    ? rawBody.slice(0, MAX_QUOTE_CHARS - 1) + "…"
    : rawBody;
  const showAttribution = username && !isAnon(username);

  const isSquare = aspectRatio === "square";
  const displayId = typeof postId === "number" ? postId : postId ? uuidToShortNumber(String(postId)) : 0;

  return (
    <div
      className={className}
      style={{
        width: "100%",
        maxWidth: isSquare ? 540 : 560,
        aspectRatio: isSquare ? "1" : aspectRatio === "poster" ? "4/3" : "1200/630",
        background: "#faf6ef",
        border: "2px solid #d8d0c2",
        borderRadius: 28,
        padding: isSquare ? "24px 40px 40px" : "20px 32px 32px",
        boxShadow: "0 24px 64px rgba(26,21,16,0.12), 0 8px 24px rgba(26,21,16,0.06)",
        fontFamily: "'DM Sans', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          width: "100%",
          maxWidth: 900,
        }}
      >
        {/* Header: etichetta, non titolo */}
        <div
          style={{
            fontSize: isSquare ? 12 : 11,
            fontWeight: 800,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "#b83232",
            marginBottom: isSquare ? 16 : 14,
            textAlign: "center",
          }}
        >
          WEIRD ASSUMPTION{displayId ? ` #${displayId}` : ""}
        </div>

        {/* Quote: enorme, focus principale */}
        <blockquote
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: isSquare ? 36 : 30,
            lineHeight: 1.45,
            color: "#1a1510",
            fontWeight: 400,
            margin: "0 auto",
            padding: "0 12px",
            maxWidth: 540,
            whiteSpace: "pre-wrap",
            fontStyle: "italic",
            textAlign: "center",
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          "{displayText}"
        </blockquote>

        {/* Attribution: — @username */}
        {showAttribution && (
          <div
            style={{
              fontSize: isSquare ? 13 : 12,
              color: "#6b6054",
              marginTop: isSquare ? 18 : 16,
              fontWeight: 500,
            }}
          >
            — @{username}
          </div>
        )}

        {/* CTA: una riga, dominio in evidenza */}
        <div
          style={{
            fontSize: isSquare ? 14 : 13,
            color: "#6b6054",
            marginTop: showAttribution ? (isSquare ? 14 : 12) : (isSquare ? 22 : 20),
            textAlign: "center",
          }}
        >
          post yours →{" "}
          <span style={{ fontWeight: 600, color: "#1a1510", letterSpacing: "0.06em" }}>
            {SITE_URL}
          </span>
        </div>
      </div>
    </div>
  );
}
