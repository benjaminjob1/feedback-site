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
          {!canSeeFeedback && (
            <Link href="/submit"><Button>Submit Feedback</Button></Link>
          )}
          {canSeeFeedback ? (
            <>
              <Link href="/submit"><Button>Submit Feedback</Button></Link>
              {user.role === "admin" && <Link href="/admin"><Button variant="outline">Admin</Button></Link>}
            </>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : !canSeeFeedback ? (
        <div className="text-center py-12 space-y-3">
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
                {fb.question_easy && <div><p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Easy to use</p><p>{fb.question_easy}</p></div>}
                {fb.question_improve && <div><p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Could be better</p><p>{fb.question_improve}</p></div>}
                {fb.question_bugs && <div><p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Bugs & issues</p><p>{fb.question_bugs}</p></div>}
                {fb.question_features && <div><p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Requested features</p><p>{fb.question_features}</p></div>}
                {fb.question_other && <div><p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Anything else</p><p>{fb.question_other}</p></div>}
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
