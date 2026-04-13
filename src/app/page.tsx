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

    if (!authUser || !authUser.role || (authUser.role !== "admin" && authUser.role !== "viewer")) {
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

  const canSeeFeedback = user && (user.role === "admin" || user.role === "viewer");

  // Filter: admins see all, viewers see approved only
  const approved = feedbackList.filter(f => f.status === "approved");
  const allFeedback = user?.role === "admin" ? feedbackList : approved;

  const pendingOwn = user ? feedbackList.filter(f => f.status === "pending" && f.submitted_by === user.id) : [];

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
            <Link href="/submit"><Button>Submit Feedback</Button></Link>
          )}
          {canSeeFeedback && user.role === "admin" && (
            <Link href="/admin"><Button variant="outline">Admin</Button></Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : !canSeeFeedback ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Only admins and viewers can see feedback.</p>
        </div>
      ) : allFeedback.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {user.role === "viewer" ? "No approved feedback yet." : "No feedback yet. Be the first to submit!"}
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
                      {fb.question_easy ? renderBar("question_easy", "EASY TO USE", fb.question_easy) : null}
                      {fb.question_improve ? renderBar("question_improve", "DESIGN & LAYOUT", fb.question_improve) : null}
                      {fb.question_bugs ? renderBar("question_bugs", "SPEED & PERFORMANCE", fb.question_bugs) : null}
                      {fb.question_features ? renderBar("question_features", "FEATURES & FUNCTIONALITY", fb.question_features) : null}
                      {(fb as any).question_bugs_slider ? renderBar("question_bugs_slider", "BUGS & ISSUES NOT PRESENT", (fb as any).question_bugs_slider) : null}
                    </>
                  );
                })()}
                {fb.question_other ? (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">COMMENTS</p>
                    <p className="text-sm">{fb.question_other}</p>
                  </div>
                ) : null}
                {(fb as any).ai_questions ? (() => {
                  let qa: any[] = [];
                  try { qa = JSON.parse((fb as any).ai_questions); } catch {}
                  if (!Array.isArray(qa)) qa = [];
                  if (qa.length === 0) return null;
                  return (
                    <div className="border-t border-border pt-2 space-y-2">
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">AI FOLLOW-UP ANSWERS</p>
                      {qa.map((item: any, i: number) => (
                        <div key={i} className="bg-muted/30 rounded-md p-2 space-y-0.5">
                          <p className="text-xs font-medium">{item.question || String(i)}</p>
                          <p className="text-xs text-muted-foreground">{item.answer || item.placeholder || ""}</p>
                        </div>
                      ))}
                    </div>
                  );
                })() : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
