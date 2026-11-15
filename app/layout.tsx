import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CITYPULSE — Ithaca Operations Dashboard",
  description:
    "An operational dashboard and interactive 3D reconstruction of Ithaca in the age of Odysseus.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
