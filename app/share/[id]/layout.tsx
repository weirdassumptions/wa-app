import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase-server";

function parseChallengeBody(text: string): string {
  if (!text.startsWith("[[challenge:")) return text;
  const end = text.indexOf("]]\n");
  if (end < 0) return text;
  const marker = text.slice(0, end + 2) + "\n";
  return text.slice(marker.length);
}

type Props = { params: Promise<{ id: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { data } = await supabaseServer.from("assumptions").select("text").eq("id", id).maybeSingle();
  const excerpt = data?.text ? parseChallengeBody(data.text).slice(0, 100) : "";
  return {
    title: excerpt ? `Weird Assumption — "${excerpt}${excerpt.length >= 100 ? "…" : ""}"` : "Weird Assumption",
    description: "Condividi questa Weird Assumption su weirdassumptions.com",
    openGraph: {
      title: "Weird Assumption",
      description: excerpt || "Il social delle teorie strane",
      url: `https://weirdassumptions.com/share/${id}`,
    },
  };
}

export default function ShareLayout({ children }: Props) {
  return children;
}
