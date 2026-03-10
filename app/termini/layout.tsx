import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termini del servizio — Weird Assumptions",
  description: "Termini e condizioni di utilizzo del servizio Weird Assumptions.",
};

export default function TerminiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
