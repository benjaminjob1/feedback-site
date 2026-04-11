"use client";

import { useState, useEffect } from "react";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Clock, Users, Eye, Shield } from "lucide-react";
import { SITES, BEN_EMAIL } from "@/lib/supabase";

type Feedback = {
  id: string;
  site: string;
  rating: number;
  question_easy: string;
  question_improve: string;
  question_bugs: string;
  question_features: string;
  question_other: string;
  status: string;
  created_at: string;
  submitted_by: string;
  profiles: { full_name: string; email: string } | null;
};

type User = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  email_verified: boolean;
  created_at: string;
};

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tab, setTab] = useState<"feedback" | "users">("feedback");
  const [loading, setLoading] = useState(true);
  const [viewerEmail, setViewerEmail] = useState("");
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const sessionRes = await fetch("/api/auth/session");
      const { user: sessionUser } = await sessionRes.json();
      if (!sessionUser || sessionUser.role !== "admin") {
        router.push("/login");
        return;
      }
      
      setUser(sessionUser as any);
      
      const profileRes = await fetch("/api/admin/users");
      if (!profileRes.ok) {
        router.push("/");
        return;
      }
      const profileData = await profileRes.json();
      setUsers(profileData.users || []);
      
      const fbRes = await fetch("/api/feedback");
      const fbData = await fbRes.json();
      setFeedbackList(fbData.feedback || []);
      
      setLoading(false);
    };
    checkAdmin();
  }, [router]);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    const res = await fetch(`/api/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setFeedbackList(prev => prev.map(f => f.id === id ? { ...f, status } : f));
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    }
  };

  const addViewer = async () => {
    if (!viewerEmail) return;
    const res = await fetch("/api/admin/viewers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: viewerEmail }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        setUsers(prev => [...prev, data.user]);
        setViewerEmail("");
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <Shield size={28} className="text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage feedback and users</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border mb-6">
        <button
          onClick={() => setTab("feedback")}
          className={`pb-3 px-1 text-sm font-medium transition-colors ${tab === "feedback" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Clock size={14} className="inline mr-1.5" />
          Feedback ({feedbackList.filter(f => f.status === "pending").length} pending)
        </button>
        <button
          onClick={() => setTab("users")}
          className={`pb-3 px-1 text-sm font-medium transition-colors ${tab === "users" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Users size={14} className="inline mr-1.5" />
          Users ({users.length})
        </button>
      </div>

      {tab === "feedback" ? (
        <div className="space-y-4">
          {feedbackList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No feedback yet</div>
          ) : (
            feedbackList.map(fb => (
              <Card key={fb.id} className={`bg-card/80 ${fb.status === "pending" ? "border-yellow-500/30" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{SITES.find(s => s.value === fb.site)?.emoji}</span>
                        <CardTitle className="text-base">{SITES.find(s => s.value === fb.site)?.label || fb.site}</CardTitle>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {fb.profiles?.full_name || fb.profiles?.email || "Unknown"} • {new Date(fb.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={fb.rating >= 4 ? "default" : fb.rating >= 3 ? "secondary" : "destructive"}>
                        {fb.rating}/5 ⭐
                      </Badge>
                      <Badge
                        variant={fb.status === "approved" ? "default" : fb.status === "rejected" ? "destructive" : "secondary"}
                        className={fb.status === "pending" ? "text-yellow-400 border-yellow-400/50" : ""}
                      >
                        {fb.status === "pending" && <Clock size={10} className="inline mr-1" />}
                        {fb.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {fb.question_easy && <div><p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Easy to use</p><p>{fb.question_easy}</p></div>}
                  {fb.question_improve && <div><p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Could be better</p><p>{fb.question_improve}</p></div>}
                  {fb.question_bugs && <div><p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Bugs & issues</p><p>{fb.question_bugs}</p></div>}
                  {fb.question_features && <div><p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Requested features</p><p>{fb.question_features}</p></div>}
                  {fb.question_other && <div><p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Anything else</p><p>{fb.question_other}</p></div>}
                  
                  {fb.status === "pending" && (
                    <div className="flex gap-2 pt-3 border-t border-border">
                      <Button size="sm" onClick={() => updateStatus(fb.id, "approved")}>
                        <Check size={14} className="mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => updateStatus(fb.id, "rejected")}>
                        <X size={14} className="mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Add viewer */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye size={16} /> Add Viewer
              </CardTitle>
              <CardDescription>Add a user who can see pending feedback (but not submit)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={viewerEmail}
                  onChange={e => setViewerEmail(e.target.value)}
                />
                <Button onClick={addViewer}>Add</Button>
              </div>
            </CardContent>
          </Card>

          {/* User list */}
          <div className="space-y-3">
            {users.map(u => (
              <Card key={u.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{u.full_name || "No name"}</p>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Joined {new Date(u.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {u.email_verified ? " • ✓ verified" : " • pending verification"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={u.role === "admin" ? "default" : u.role === "viewer" ? "secondary" : "outline"}>
                        {u.role}
                      </Badge>
                      {u.email.toLowerCase() === BEN_EMAIL.toLowerCase() ? (
                        <span className="text-xs text-muted-foreground">Ben</span>
                      ) : u.role !== "admin" ? (
                        <div className="flex gap-2">
                          {u.role === "user" ? (
                            <Button size="sm" variant="outline" onClick={() => updateUserRole(u.id, "viewer")}>
                              Make Viewer
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => updateUserRole(u.id, "user")}>
                              Make User
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
