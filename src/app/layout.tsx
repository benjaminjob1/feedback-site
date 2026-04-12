"use client";

import type { Metadata } from "next";
import "./globals.css";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";

function AuthHandler({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("t");
    if (token) {
      const maxAge = 60 * 60 * 24 * 7;
      document.cookie = `fb_session=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
      window.history.replaceState(null, "", window.location.pathname);
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

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    document.cookie = "fb_session=; path=/; max-age=0";
    setUser(null);
    setMenuOpen(false);
    window.location.href = "/";
  };

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
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {user.full_name || user.email?.split("@")[0]}
                    <span className="text-xs">▾</span>
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-md shadow-lg py-1 z-50">
                      <Link
                        href="/account"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 hover:bg-accent text-sm"
                      >
                        Account
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 hover:bg-accent text-sm text-destructive"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className="hover:text-primary transition-colors">
                  Sign In / Sign Up
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
