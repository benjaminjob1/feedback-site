"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [error, setError] = useState("");
  const [verifyError, setVerifyError] = useState("");

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }

    setSent(true);
    setSentEmail(email);
  };

  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError("");
    setVerifying(true);

    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: sentEmail, token: manualToken }),
    });

    const data = await res.json();
    setVerifying(false);

    if (!res.ok) {
      setVerifyError(data.error || "Invalid or expired token");
      return;
    }

    window.location.href = "/";
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign In / Sign Up</CardTitle>
          <CardDescription>
            {sent
              ? `We sent a link to ${sentEmail}`
              : "Enter your email to receive a login link"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* ── Step 1: enter email ── */}
          {!sent && (
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
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Link"}
              </Button>
            </form>
          )}

          {/* ── Step 2: email sent — link via email OR paste token ── */}
          {sent && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Click the link in your email — or paste the token from your email below.
              </p>

              <form onSubmit={handleManualVerify} className="space-y-4">
                {verifyError && (
                  <div className="bg-destructive/20 border border-destructive/30 text-destructive text-sm p-3 rounded-md">
                    {verifyError}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="manual-token">Paste token from email</Label>
                  <Input
                    id="manual-token"
                    type="text"
                    placeholder="eyJhbGciOiJIUzI1NiJ9..."
                    value={manualToken}
                    onChange={e => setManualToken(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={verifying}>
                  {verifying ? "Verifying..." : "Verify & Sign In"}
                </Button>
              </form>

              <div className="text-center">
                <button
                  onClick={() => { setSent(false); setSentEmail(""); setEmail(""); setManualToken(""); }}
                  className="text-sm text-muted-foreground hover:text-primary hover:underline"
                >
                  Use a different email
                </button>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
