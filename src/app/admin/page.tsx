"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Clock, Users, Shield } from "lucide-react";
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
  ai_questions?: string;
  slider_comments?: string;
  feedback_length?: string;
  question_bugs_slider?: string;
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
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"viewer" | "admin">("viewer");
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [editingUserEmail, setEditingUserEmail] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const sessionRes = await fetch("/api/auth/session");
      const { user: sessionUser } = await sessionRes.json();
      if (!sessionUser || sessionUser.role !== "admin") {
        router.push("/");
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

  const updateStatus = async (id: string, status: "approved" | "rejected" | "pending") => {
    const res = await fetch("/api/feedback/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setFeedbackList(prev => prev.map(f => f.id === id ? { ...f, status } : f));
    }
  };

  const deleteFeedback = async (id: string) => {
    if (!confirm("Delete this feedback permanently?")) return;
    const res = await fetch("/api/feedback/" + id, { method: "DELETE" });
    if (res.ok) {
      setFeedbackList(prev => prev.filter(f => f.id !== id));
    }
  };

  const deleteUser = async (userEmail: string) => {
    if (!confirm("Remove this user? They can re-register anytime.")) return;
    const res = await fetch("/api/admin/users/" + encodeURIComponent(userEmail), {
      method: "DELETE",
    });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.email !== userEmail));
    }
  };

  const updateUserRole = async (userEmail: string, role: string) => {
    const res = await fetch("/api/admin/users/" + encodeURIComponent(userEmail), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.email === userEmail ? { ...u, role } : u));
    }
  };

  const saveUserName = async () => {
    if (!editingUserEmail) return;
    setSavingName(true);
    await fetch("/api/auth/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: editingUserEmail, full_name: editingUserName }),
    });
    setUsers(prev => prev.map(u =>
      u.email === editingUserEmail ? { ...u, full_name: editingUserName } : u
    ));
    setEditingUserEmail(null);
    setSavingName(false);
  };

  const addUser = async () => {
    setAddError("");
    setAddSuccess("");
    if (!newUserEmail) return;
    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newUserEmail, role: newUserRole }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAddError(data.error || "Failed to add user");
      return;
    }
    if (data.user) {
      setUsers(prev => [...prev.filter(u => u.id !== data.user.id), data.user]);
      setNewUserEmail("");
      setAddSuccess(data.user.email + " added as " + data.user.role + "!");
      setTimeout(() => setAddSuccess(""), 3000);
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

      <div className="flex gap-4 border-b border-border mb-6">
        <button
          onClick={() => setTab("feedback")}
          className={"pb-3 px-1 text-sm font-medium transition-colors " + (tab === "feedback" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}
        >
          <Clock size={14} className="inline mr-1.5" />
          Feedback ({feedbackList.filter(f => f.status === "pending").length} pending)
        </button>
        <button
          onClick={() => setTab("users")}
          className={"pb-3 px-1 text-sm font-medium transition-colors " + (tab === "users" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}
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
              <Card key={fb.id} className={"bg-card/80 " + (fb.status === "pending" ? "border-yellow-500/30" : "")}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{SITES.find(s => s.value === fb.site)?.emoji}</span>
                        <CardTitle className="text-base">{SITES.find(s => s.value === fb.site)?.label || fb.site}</CardTitle>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(fb.profiles?.full_name || fb.profiles?.email || "Unknown") + " \u00b7 " + new Date(fb.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={fb.rating >= 4 ? "default" : fb.rating >= 3 ? "secondary" : "destructive"}>
                        {fb.rating}/5 &#9733;
                      </Badge>
                      <Badge
                        variant={fb.status === "approved" ? "default" : fb.status === "rejected" ? "destructive" : "secondary"}
                        className={fb.status === "pending" ? "text-yellow-400 border-yellow-400/50" : ""}
                      >
                        {fb.status === "pending" ? <Clock size={10} className="inline mr-1" /> : null}
                        {fb.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {(() => {
                    const sliderComments: Record<string, string> = {};
                    if (fb.slider_comments) { try { Object.assign(sliderComments, JSON.parse(fb.slider_comments)); } catch {} }
                    const renderBar = (key: string, label: string, val: string) => {
                      const comment = sliderComments[key];
                      return (
                        <div key={key}>
                          <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">{label}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{width: (Number(val)/10*100) + "%"}} />
                            </div>
                            <span className="text-xs font-medium w-8 text-right">{val}</span>
                          </div>
                          {comment ? <p className="text-xs text-muted-foreground mt-1">&ldquo;{comment}&rdquo;</p> : null}
                        </div>
                      );
                    };
                    return (
                      <>
                        {fb.question_easy ? renderBar("question_easy", "EASY TO USE", fb.question_easy) : null}
                        {fb.question_improve ? renderBar("question_improve", "DESIGN & LAYOUT", fb.question_improve) : null}
                        {fb.question_bugs ? renderBar("question_bugs", "SPEED & PERFORMANCE", fb.question_bugs) : null}
                        {fb.question_features ? renderBar("question_features", "FEATURES & FUNCTIONALITY", fb.question_features) : null}
                        {fb.question_bugs_slider ? renderBar("question_bugs_slider", "BUGS & ISSUES NOT PRESENT", fb.question_bugs_slider) : null}
                      </>
                    );
                  })()}
                  {/* Slider comments */}
                  {fb.slider_comments ? (() => {
                    try {
                      const sc: Record<string, string> = JSON.parse(fb.slider_comments);
                      const entries = Object.entries(sc).filter(([, v]) => v.trim());
                      if (entries.length === 0) return null;
                      return (
                        <div className="space-y-1">
                          <p className="text-muted-foreground text-xs uppercase tracking-wide">SLIDER COMMENTS</p>
                          {entries.map(([k, v]) => (
                            <p key={k} className="text-xs text-muted-foreground italic">&ldquo;{v}&rdquo;</p>
                          ))}
                        </div>
                      );
                    } catch { return null; }
                  })() : null}
                  {/* Overall comments (no AI data - that's in ai_questions) */}
                  {fb.question_other ? (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">OVERALL COMMENTS</p>
                      <p className="text-sm">{fb.question_other}</p>
                    </div>
                  ) : null}

                  {fb.ai_questions ? (() => {
                    let qa: any[] = [];
                    try { qa = JSON.parse(fb.ai_questions); } catch {}
                    return qa.length > 0 ? (
                      <div className="border-t border-border pt-3 space-y-3">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">AI FOLLOW-UP ANSWERS</p>
                        {qa.map((item, i) => {
                          const question = Object.keys(item)[0];
                          const answer = item[question];
                          return (
                            <div key={i} className="bg-muted/30 rounded-md p-3 space-y-1">
                              <p className="text-xs font-medium text-foreground">{question}</p>
                              <p className="text-sm text-muted-foreground">{answer}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : null;
                  })() : null}

                  {fb.status === "pending" ? (
                    <div className="flex gap-2 pt-3 border-t border-border">
                      <Button size="sm" onClick={() => updateStatus(fb.id, "approved")}>
                        <Check size={14} className="mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => updateStatus(fb.id, "rejected")}>
                        <X size={14} className="mr-1" /> Reject
                      </Button>
                    </div>
                  ) : fb.status === "approved" ? (
                    <div className="flex gap-2 pt-3 border-t border-border">
                      <Button size="sm" variant="outline" onClick={() => updateStatus(fb.id, "pending")}>
                        Unapprove
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteFeedback(fb.id)}>
                        <X size={14} className="mr-1" /> Remove
                      </Button>
                    </div>
                  ) : fb.status === "rejected" ? (
                    <div className="flex gap-2 pt-3 border-t border-border">
                      <Button size="sm" onClick={() => updateStatus(fb.id, "approved")}>
                        <Check size={14} className="mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteFeedback(fb.id)}>
                        <X size={14} className="mr-1" /> Remove
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users size={16} /> Add User
              </CardTitle>
              <CardDescription>Add a viewer or admin by email address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                />
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as "viewer" | "admin")}
                  className="border border-border rounded-md bg-background px-3 text-sm"
                >
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
                <Button onClick={() => addUser()}>Add</Button>
              </div>
              {addError ? <p className="text-sm text-destructive">{addError}</p> : null}
              {addSuccess ? <p className="text-sm text-green-500">{addSuccess}</p> : null}
            </CardContent>
          </Card>

          <div className="space-y-3">
            {users.map(u => {
              const isBen = u.email.toLowerCase() === BEN_EMAIL.toLowerCase();
              const isAdmin = user && user.role === "admin";
              return (
                <Card key={u.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {editingUserEmail === u.email ? (
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={editingUserName}
                              onChange={e => setEditingUserName(e.target.value)}
                              className="border border-border rounded px-2 py-1 text-sm bg-background w-36"
                              autoFocus
                            />
                            <button onClick={() => saveUserName()} disabled={savingName} className="text-xs text-primary hover:underline disabled:opacity-50">
                              {savingName ? "Saving..." : "Save"}
                            </button>
                            <button onClick={() => setEditingUserEmail(null)} className="text-xs text-muted-foreground hover:underline">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium">{u.full_name || "No name"}</p>
                            <p className="text-sm text-muted-foreground">{u.email}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Joined {new Date(u.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                          {u.role}
                        </Badge>
                        {isBen ? (
                          <span className="text-xs text-muted-foreground">Ben (you)</span>
                        ) : isAdmin ? (
                          <button
                            onClick={() => { setEditingUserEmail(u.email); setEditingUserName(u.full_name || ""); }}
                            className="text-xs text-muted-foreground hover:text-primary hover:underline mr-2"
                          >
                            Edit name
                          </button>
                        ) : null}
                        {isAdmin && !isBen ? (
                          <div className="flex gap-2">
                            {u.role === "user" ? (
                              <>
                                <Button size="sm" variant="outline" onClick={() => updateUserRole(u.email, "viewer")}>
                                  Make Viewer
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => updateUserRole(u.email, "admin")}>
                                  Make Admin
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => deleteUser(u.email)}>
                                  Remove
                                </Button>
                              </>
                            ) : null}
                            {u.role === "viewer" ? (
                              <>
                                <Button size="sm" variant="outline" onClick={() => updateUserRole(u.email, "user")}>
                                  Make User
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => updateUserRole(u.email, "admin")}>
                                  Make Admin
                                </Button>
                              </>
                            ) : null}
                            {u.role === "admin" ? (
                              <>
                                <Button size="sm" variant="outline" onClick={() => updateUserRole(u.email, "viewer")}>
                                  Make Viewer
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => updateUserRole(u.email, "user")}>
                                  Make User
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => deleteUser(u.email)}>
                                  Remove
                                </Button>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
