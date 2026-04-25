import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "mattcha",
  description: "A minimalist dating club. Fifteen messages to invite her.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
