"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "verify">("email");
  const [email, setEmail] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setToken("");
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
    if (data.token) setToken(data.token);
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

    // Page will reload with session cookie set
    window.location.href = "/";
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>
            {step === "email"
              ? "Enter your email to receive a login code"
              : `Enter the code sent to ${sentEmail}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* ── Email form ── */}
          {step === "email" && !sent && (
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
                {loading ? "Sending..." : "Send Code"}
              </Button>
            </form>
          )}

          {/* ── After email sent: token shown + manual verify form ── */}
          {step === "email" && sent && (
            <div className="space-y-4">
              {/* Token display */}
              {token && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Your code:</p>
                  <code className="block text-xs break-all bg-muted-foreground/10 p-2 rounded">{token}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(token)}
                    className="text-xs text-primary hover:underline"
                  >
                    📋 Copy code
                  </button>
                </div>
              )}

              {/* Manual verify form */}
              <form onSubmit={handleManualVerify} className="space-y-4">
                {verifyError && (
                  <div className="bg-destructive/20 border border-destructive/30 text-destructive text-sm p-3 rounded-md">
                    {verifyError}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="manual-token">Paste your code here</Label>
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
                  onClick={() => { setSent(false); setSentEmail(""); setToken(""); setManualToken(""); }}
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
