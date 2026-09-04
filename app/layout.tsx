import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ShopFloorSpicks — Curated Equipment Picks & Professional Reviews",
  description: "Hand-picked reviews, buyer guides, and technical specs for commercial-grade equipment across 11 industry verticals.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
