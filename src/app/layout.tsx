"use client";

import type { Metadata } from "next";
import "./globals.css";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";

function AuthHandler({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("t");
    if (token) {
      // Set cookie from magic link token in URL
      const maxAge = 60 * 60 * 24 * 7; // 7 days
      document.cookie = `fb_session=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
      // Clean up URL without triggering re-render
      window.history.replaceState(null, "", window.location.pathname);
      // Refresh user state
      setTimeout(() => {
        fetch("/api/auth/session")
          .then(res => res.json())
          .then(data => setUser(data.user))
          .finally(() => setLoading(false));
      }, 100);
      return;
    }

    fetch("/api/auth/session")
      .then(res => res.json())
      .then(data => { setUser(data.user); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <nav className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold text-lg">
            💬 Feedback Portal
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="hover:text-primary transition-colors">
              Browse
            </Link>
            {!loading && (
              user ? (
                <Link href="/submit" className="hover:text-primary transition-colors">
                  Submit
                </Link>
              ) : (
                <Link href="/login" className="hover:text-primary transition-colors">
                  Sign In
                </Link>
              )
            )}
          </div>
        </div>
      </nav>
      {children}
      <Analytics />
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        <AuthHandler>{children}</AuthHandler>
      </body>
    </html>
  );
}
