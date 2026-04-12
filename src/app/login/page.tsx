"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "token">("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [magicUrl, setMagicUrl] = useState("");

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send link");
      } else {
        setSent(true);
        setStep("token");
        // Extract the token from the magic URL for manual entry
        const url = `https://feedback.benjob.me/api/auth/verify-otp?token=${data.token}`;
        setMagicUrl(data.token || "");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid link");
      } else {
        window.location.href = "/";
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">🔐 Sign in</CardTitle>
          <CardDescription>
            {step === "email"
              ? "Enter your email to receive a login link"
              : "Check your email and either click the link or paste the token below"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <form onSubmit={handleSendEmail} className="space-y-4">
              {error && (
                <div className="bg-destructive/20 border border-destructive/30 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send login link"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyToken} className="space-y-4">
              {error && (
                <div className="bg-destructive/20 border border-destructive/30 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="token">Login token</Label>
                <Input
                  id="token"
                  type="text"
                  placeholder="Paste the token from your email"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !token}>
                {loading ? "Verifying..." : "Sign in"}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-primary"
                  onClick={() => { setStep("email"); setSent(false); setToken(""); setError(""); }}
                >
                  Use a different email
                </button>
              </div>
            </form>
          )}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary">← Back to home</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
