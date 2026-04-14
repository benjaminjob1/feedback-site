"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, SITES } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Star, Check, X, Clock, Eye } from "lucide-react";

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
};

export default function HomePage() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = useCallback(async () => {
    const sessionRes = await fetch("/api/auth/session");
    const sessionData = await sessionRes.json();
    const authUser = sessionData.user;

    if (!authUser) {
      setLoading(false);
      return;
    }

    setUser(authUser as any);

    const profileRes = await fetch("/api/admin/users");
    if (profileRes.ok) {
      const profileData = await profileRes.json();
      const myProfile = profileData.users?.find((u: User) => u.id === authUser.id);
      setUser(myProfile || { id: authUser.id, email: authUser.email || "", full_name: "", role: authUser.role, email_verified: false });
    }

    const res = await fetch("/api/feedback");
    const data = await res.json();
    setFeedbackList(data.feedback || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFeedback();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetch("/api/auth/session").then(res => res.json()).then(data => {
        setUser(data.user || null);
        fetchFeedback();
      });
    });
    return () => subscription.unsubscribe();
  }, [fetchFeedback]);

  const isAdmin = user?.role === "admin";
  const isViewer = user?.role === "viewer";
  const canSeeFeedback = user && (isAdmin || isViewer);

  // Admin: all feedback. Viewer: approved + own. Regular user: own only.
  const ownFeedback = user ? feedbackList.filter(f => f.submitted_by === user.id) : [];
  const approved = feedbackList.filter(f => f.status === "approved");
  const merged = [...approved, ...ownFeedback];
  const allFeedback = isAdmin ? feedbackList : isViewer ? Object.values(Object.fromEntries(merged.map(f => [f.id, f]))) : ownFeedback;

  const siteEmoji = (site: string) => SITES.find(s => s.value === site)?.emoji || "📝";

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={14} className={i <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"} />
      ))}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Feedback</h1>
          <p className="text-muted-foreground mt-1">
            {canSeeFeedback ? "See what people are saying about Ben's projects" : "Submit and track your feedback"}
          </p>
        </div>
        <div className="flex gap-2">
          {(canSeeFeedback || !canSeeFeedback) && (
            <Link href="/submit"><Button>Submit / Edit Feedback</Button></Link>
          )}
          {canSeeFeedback && user.role === "admin" && (
            <Link href="/admin"><Button variant="outline">Admin</Button></Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : !user ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Please log in to view your feedback.</p>
        </div>
      ) : allFeedback.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {isViewer ? "No approved feedback yet." : isAdmin ? "No feedback yet." : "You haven't submitted any feedback yet. Be the first to submit!"}
        </div>
      ) : (
        <div className="space-y-4">
          {allFeedback.map(fb => (
            <Card key={fb.id} className="bg-card/80">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{siteEmoji(fb.site)}</span>
                    <CardTitle className="text-base">{SITES.find(s => s.value === fb.site)?.label || fb.site}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderStars(fb.rating)}
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
                {(() => {
                  const sliderComments: Record<string, string> = {};
                  if ((fb as any).slider_comments) {
                    try { Object.assign(sliderComments, JSON.parse((fb as any).slider_comments)); } catch {}
                  }
                  const renderBar = (key: string, label: string, val: string) => {
                    const comment = sliderComments[key];
                    return (
                      <div key={key}>
                        <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">{label}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{width: (Number(val)/10*100)+"%"}} />
                          </div>
                          <span className="text-xs font-medium w-8 text-right">{val}</span>
                        </div>
                        {comment ? <p className="text-xs text-muted-foreground mt-1">&ldquo;{comment}&rdquo;</p> : null}
                      </div>
                    );
                  };
                  return (
                    <>
                      {fb.question_easy !== undefined && fb.question_easy !== null ? renderBar("question_easy", "EASY TO USE", fb.question_easy) : null}
                      {fb.question_improve !== undefined && fb.question_improve !== null ? renderBar("question_improve", "DESIGN & LAYOUT", fb.question_improve) : null}
                      {fb.question_bugs !== undefined && fb.question_bugs !== null ? renderBar("question_bugs", "SPEED & PERFORMANCE", fb.question_bugs) : null}
                      {fb.question_features !== undefined && fb.question_features !== null ? renderBar("question_features", "FEATURES & FUNCTIONALITY", fb.question_features) : null}
                      {(fb as any).question_bugs_slider !== undefined && (fb as any).question_bugs_slider !== null ? renderBar("question_bugs_slider", "BUGS & ISSUES NOT PRESENT", (fb as any).question_bugs_slider) : null}
                    </>
                  );
                })()}
                {(() => {
                  const hasAI = fb.question_other && fb.question_other.includes("[AI Follow-ups]");
                  if (hasAI) {
                    // Split actual comment from AI Q&A
                    const aiIdx = fb.question_other.indexOf("[AI Follow-ups]");
                    const commentText = fb.question_other.substring(0, aiIdx).trim();
                    const aiText = fb.question_other.substring(aiIdx + "[AI Follow-ups]".length).trim();
                    let qa: any[] = [];
                    try { qa = JSON.parse(aiText); } catch {}
                    const entries = Object.entries(qa);
                    return (
                      <div className="space-y-3">
                        {commentText ? (
                          <div>
                            <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">OVERALL COMMENTS</p>
                            <p className="text-sm">{commentText}</p>
                          </div>
                        ) : null}
                        {entries.length > 0 ? (
                          <div className="border-t border-border pt-2 space-y-2">
                            <p className="text-muted-foreground text-xs uppercase tracking-wide">AI FOLLOW-UP ANSWERS</p>
                            {entries.map(([question, answer], i) => (
                              <div key={i} className="bg-muted/30 rounded-md p-2 space-y-0.5">
                                <p className="text-xs font-medium">{question}</p>
                                <p className="text-xs text-muted-foreground">{answer}</p>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  }
                  return fb.question_other ? (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">OVERALL COMMENTS</p>
                      <p className="text-sm">{fb.question_other}</p>
                    </div>
                  ) : null;
                })()}
                {fb.ai_questions ? (() => {
                  let qaObj: Record<string, string> = {};
                  try { qaObj = JSON.parse(fb.ai_questions); } catch {}
                  const entries = Object.entries(qaObj);
                  return entries.length > 0 ? (
                    <div className="border-t border-border pt-2 space-y-2">
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">AI FOLLOW-UP ANSWERS</p>
                      {entries.map(([question, answer], i) => (
                        <div key={i} className="bg-muted/30 rounded-md p-2 space-y-0.5">
                          <p className="text-xs font-medium">{question}</p>
                          <p className="text-xs text-muted-foreground">{answer}</p>
                        </div>
                      ))}
                    </div>
                  ) : null;
                })() : null}
                <p className="text-xs text-muted-foreground">
                  {fb.profiles?.full_name || fb.profiles?.email || "Anonymous"} • {new Date(fb.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
