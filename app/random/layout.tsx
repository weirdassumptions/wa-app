import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Random Weird Assumption | Weird Assumptions",
  description: "Discover random weird thoughts from the internet. Get a new random Weird Assumption with one click.",
  openGraph: {
    title: "Random Weird Assumption",
    description: "Discover random weird thoughts from the internet.",
  },
};

export default function RandomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
