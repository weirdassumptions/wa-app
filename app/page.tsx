"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

const SECRET_KEYS = "wa"; // sequenza da digitare (Weird Assumptions)

export default function LandingPage() {
  const [logoClicks, setLogoClicks] = useState(0);
  const [showEntra, setShowEntra] = useState(false);
  const keyIndex = useRef(0);
  const resetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      const expected = SECRET_KEYS[keyIndex.current];
      if (key === expected) {
        keyIndex.current += 1;
        if (resetTimeout.current) {
          clearTimeout(resetTimeout.current);
          resetTimeout.current = null;
        }
        if (keyIndex.current === SECRET_KEYS.length) {
          setShowEntra(true);
          keyIndex.current = 0;
        } else {
          resetTimeout.current = setTimeout(() => { keyIndex.current = 0; resetTimeout.current = null; }, 1500);
        }
      } else {
        keyIndex.current = 0;
        if (resetTimeout.current) {
          clearTimeout(resetTimeout.current);
          resetTimeout.current = null;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (resetTimeout.current) clearTimeout(resetTimeout.current);
    };
  }, []);

  const handleLogoClick = () => {
    setLogoClicks((c) => c + 1);
    if (logoClicks >= 2) {
      window.location.href = "/app";
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      <button
        type="button"
        onClick={handleLogoClick}
        onMouseLeave={() => setTimeout(() => setLogoClicks(0), 800)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          marginBottom: 16,
        }}
        aria-label="Logo"
      >
        <img
          src="/logo-full.png"
          alt="Weird Assumptions"
          height={56}
          style={{ objectFit: "contain", maxWidth: 280 }}
        />
      </button>
      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontWeight: 700,
          fontSize: "clamp(1.5rem, 4vw, 2rem)",
          marginBottom: 8,
          letterSpacing: "-0.02em",
        }}
      >
        Weird Assumptions
      </h1>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 15,
          color: "var(--muted)",
          maxWidth: 320,
          lineHeight: 1.5,
          marginBottom: 48,
        }}
      >
        Il social delle teorie strane.
      </p>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          color: "var(--muted2)",
          maxWidth: 280,
          lineHeight: 1.6,
          marginBottom: 24,
        }}
      >
        Condividi le tue assunzioni bizzarre, osserva quelle degli altri, partecipa alla challenge del giorno.
      </p>

      <Link
        href="/app"
        style={{
          display: "inline-block",
          background: "var(--red)",
          color: "#fff",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
          fontWeight: 600,
          padding: "10px 24px",
          borderRadius: 999,
          textDecoration: "none",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--red-h)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--red)"; }}
      >
        Entra
      </Link>

      {/* Accesso nascosto: appare solo dopo aver digitato "wa" (Weird Assumptions) */}
      {showEntra && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Link
            href="/app"
            style={{
              fontSize: 11,
              color: "var(--muted2)",
              textDecoration: "none",
              opacity: 0.6,
              letterSpacing: "0.06em",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.color = "var(--red)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.6";
              e.currentTarget.style.color = "var(--muted2)";
            }}
          >
            entra
          </Link>
        </div>
      )}
    </div>
  );
}
