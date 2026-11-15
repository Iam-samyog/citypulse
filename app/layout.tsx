import type { Metadata } from "next";
import { Alegreya, Metamorphous } from "next/font/google";
import { DemoSignOut } from "@/components/admin/DemoSignOut";
import "./globals.css";

const heading = Metamorphous({ subsets: ["latin"], weight: "400", variable: "--font-heading", display: "swap" });
const alegreya = Alegreya({ subsets: ["latin"], variable: "--font-alegreya", display: "swap" });

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
    <html lang="en" className={`${alegreya.variable} ${heading.variable}`}>
      <body suppressHydrationWarning className="font-sans antialiased">
        <DemoSignOut />
        {children}
      </body>
    </html>
  );
}
