import type { Metadata } from "next";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "Rory — Marketing Ops",
  description: "Brief writing, copywriting, and context management for your brands",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <nav className="border-b border-border bg-surface sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight text-foreground">
              <Image src="/logo.webp" alt="Rory" width={32} height={32} className="rounded object-contain" />
              Rory
            </Link>
            <div className="flex gap-6 text-sm">
              <Link href="/context-hub" className="text-muted hover:text-foreground transition-colors">
                Context Hub
              </Link>
              <Link href="/briefs" className="text-muted hover:text-foreground transition-colors">
                Briefs
              </Link>
              <Link href="/copywriter" className="text-muted hover:text-foreground transition-colors">
                Copywriter
              </Link>
              <Link href="/chat" className="text-muted hover:text-foreground transition-colors">
                Chat
              </Link>
              <Link href="/ad-builder" className="text-muted hover:text-foreground transition-colors">
                Ad Builder
              </Link>
              <Link href="/instagram-research" className="text-muted hover:text-foreground transition-colors">
                IG Research
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
