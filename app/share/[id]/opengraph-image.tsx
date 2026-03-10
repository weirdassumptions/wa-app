import { ImageResponse } from "next/og";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "edge";
export const alt = "Weird Assumption";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function parseChallengeBody(text: string): string {
  if (!text.startsWith("[[challenge:")) return text;
  const end = text.indexOf("]]\n");
  if (end < 0) return text;
  const marker = text.slice(0, end + 2) + "\n";
  return text.slice(marker.length);
}

function isAnon(u: string) {
  return !u || u === "anonimo" || u.startsWith("anonimo_");
}

function uuidToShortNumber(id: string): number {
  if (!id) return 0;
  const hex = id.replace(/-/g, "").slice(-6);
  return (parseInt(hex, 16) % 9999) + 1;
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await supabaseServer
    .from("assumptions")
    .select("text, username")
    .eq("id", id)
    .maybeSingle();

  const displayText = data?.text
    ? (() => {
        const body = parseChallengeBody(data.text);
        return body.length > 280 ? body.slice(0, 277) + "…" : body;
      })()
    : "Weird Assumption";
  const displayId = id ? uuidToShortNumber(id) : 0;
  const showAttribution = data?.username && !isAnon(data.username);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf6ef",
          padding: "32px 64px 64px",
          fontFamily: "system-ui, sans-serif",
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
          {/* Header: etichetta */}
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "0.28em",
              color: "#b83232",
              marginBottom: 18,
              textAlign: "center",
            }}
          >
            WEIRD ASSUMPTION{displayId ? ` #${displayId}` : ""}
          </div>

          {/* Quote: enorme */}
          <div
            style={{
              fontSize: 38,
              lineHeight: 1.45,
              color: "#1a1510",
              textAlign: "center",
              fontStyle: "italic",
              whiteSpace: "pre-wrap",
              maxWidth: 720,
            }}
          >
            "{displayText}"
          </div>

          {/* Attribution: piccolo */}
          {showAttribution && (
            <div
              style={{
                fontSize: 14,
                color: "#6b6054",
                marginTop: 18,
                fontWeight: 500,
              }}
            >
              — @{data.username}
            </div>
          )}

          {/* CTA: una riga, dominio in evidenza */}
          <div
            style={{
              fontSize: 16,
              color: "#6b6054",
              marginTop: showAttribution ? 18 : 28,
              textAlign: "center",
            }}
          >
            post yours →{" "}
            <span style={{ fontWeight: 600, color: "#1a1510", letterSpacing: "0.06em" }}>
              weirdassumptions.com
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
