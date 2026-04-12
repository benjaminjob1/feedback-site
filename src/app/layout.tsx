"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function AuthHandler({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
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
          .then(data => {
            setUser(data.user);
            setLoading(false);
            if (data.user && !data.user.full_name) {
              setShowNamePrompt(true);
              setNameValue("");
            }
          });
      }, 100);
      return;
    }

    fetch("/api/auth/session")
      .then(res => res.json())
      .then(data => {
        setUser(data.user);
        setLoading(false);
        if (data.user && !data.user.full_name) {
          setShowNamePrompt(true);
          setNameValue("");
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSaveName = async () => {
    setSavingName(true);
    await fetch("/api/auth/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: nameValue }),
    });
    setUser((prev: any) => ({ ...prev, full_name: nameValue }));
    setShowNamePrompt(false);
    setSavingName(false);
  };

  const handleSkipName = () => {
    setShowNamePrompt(false);
  };

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    document.cookie = "fb_session=; path=/; max-age=0";
    setUser(null);
    setMenuOpen(false);
    window.location.reload();
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

      {/* Name prompt modal for first-time users */}
      {showNamePrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-sm mx-4">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">Welcome! 👋</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Enter your name to personalize your experience, or skip for now.
              </p>
              <div className="space-y-2">
                <Label htmlFor="first-name">Your name</Label>
                <Input
                  id="first-name"
                  type="text"
                  placeholder="e.g. Alex Smith"
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  autoFocus
                />
              </div>
              <Button onClick={handleSaveName} className="w-full" disabled={savingName}>
                {savingName ? "Saving..." : "Save"}
              </Button>
              <button
                onClick={handleSkipName}
                className="w-full text-sm text-muted-foreground hover:text-primary hover:underline"
              >
                Skip for now
              </button>
            </CardContent>
          </Card>
        </div>
      )}

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
