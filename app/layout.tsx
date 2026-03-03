import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "weirdassumptions",
  description: "Post your weirdest assumptions anonymously.",
  metadataBase: new URL("https://weirdassumptions.com"),

  openGraph: {
    title: "weirdassumptions",
    description: "Post your weirdest assumptions anonymously.",
    url: "https://weirdassumptions.com",
    siteName: "weirdassumptions",
    images: [
      {
        url: "/logo.jpeg", // deve essere dentro /public
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "weirdassumptions",
    description: "Post your weirdest assumptions anonymously.",
    images: ["/logo.jpeg"],
  },

  icons: {
    icon: "/logo.jpeg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        {children}
      </body>
    </html>
  );
}