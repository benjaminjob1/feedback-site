"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/session")
      .then(res => res.json())
      .then(data => {
        if (!data.user) {
          router.push("/login");
          return;
        }
        setUser(data.user);
        setFullName(data.user.full_name || "");
        setLoading(false);
      });
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const res = await fetch("/api/auth/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName }),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to update profile");
    }
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
    
    setDeleting(true);
    
    const res = await fetch("/api/account/delete-account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delete_feedback: deleteFeedback }),
    });
    
    if (res.ok) {
      // Sign out and redirect
      await fetch("/api/auth/signout", { method: "POST" });
      document.cookie = "fb_session=; path=/; max-age=0";
      router.push("/login");
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete account");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-16 text-center">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Account</CardTitle>
          <CardDescription>Update your profile information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            {error && (
              <div className="bg-destructive/20 border border-destructive/30 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user?.email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Your name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Delete Account Section */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions - proceed with caution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showDeleteConfirm ? (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full"
            >
              Delete My Account
            </Button>
          ) : (
            <div className="space-y-4 p-4 bg-destructive/10 rounded-lg border border-destructive/30">
              <p className="text-sm font-medium text-destructive">
                Are you absolutely sure? This will:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Delete your account permanently</li>
                {deleteFeedback && <li>Delete all your submitted feedback</li>}
              </ul>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteFeedback}
                  onChange={(e) => setDeleteFeedback(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-destructive text-destructive focus:ring-destructive"
                />
                <span className="text-sm">Also delete all my submitted feedback</span>
              </label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteFeedback(false);
                  }}
                  className="flex-1"
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  className="flex-1"
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Confirm Delete"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
