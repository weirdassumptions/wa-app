import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy — Weird Assumptions",
  description: "Informativa privacy e protezione dei dati personali (GDPR).",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
