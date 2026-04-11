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
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const fetchFeedback = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      setFeedbackList([]);
      setLoading(false);
      return;
    }
    
    const res = await fetch("/api/feedback");
    const data = await res.json();
    setFeedbackList(data.feedback || []);
    
    const profileRes = await fetch("/api/admin/users");
    if (profileRes.ok) {
      const profileData = await profileRes.json();
      const myProfile = profileData.users?.find((u: User) => u.id === authUser.id);
      setUser(myProfile || { id: authUser.id, email: authUser.email || "", full_name: "", role: "user", email_verified: false });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFeedback();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchFeedback();
    });
    return () => subscription.unsubscribe();
  }, [fetchFeedback]);

  const filtered = filter === "all" ? feedbackList : feedbackList.filter(f => f.site === filter);
  const approved = filtered.filter(f => f.status === "approved");
  const pendingOwn = user ? filtered.filter(f => f.status === "pending" && f.submitted_by === user.id) : [];

  const canSeePending = user && (user.role === "admin" || (user.role === "viewer"));

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
          <p className="text-muted-foreground mt-1">See what people are saying about Ben&apos;s projects</p>
        </div>
        <div className="flex gap-2">
          {!user ? (
            <>
              <Link href="/login"><Button variant="outline">Login</Button></Link>
              <Link href="/signup"><Button>Sign Up</Button></Link>
            </>
          ) : (
            <Link href="/submit"><Button>Submit Feedback</Button></Link>
          )}
        </div>
      </div>

      {/* Only show filter pills when logged in */}
      {user && (
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
        >
          All
        </button>
        {SITES.map(site => (
          <button
            key={site.value}
            onClick={() => setFilter(site.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${filter === site.value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
          >
            <span>{site.emoji}</span>
            <span>{site.label}</span>
          </button>
        ))}
      </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : !user ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Please sign in to view feedback.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No feedback yet. Be the first!</p>
          <Link href="/submit" className="mt-4 inline-block"><Button>Submit Feedback</Button></Link>
        </div>
      ) : (
        <div className="space-y-4">
          {approved.map(fb => (
            <Card key={fb.id} className="bg-card/80">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{siteEmoji(fb.site)}</span>
                    <CardTitle className="text-base">{SITES.find(s => s.value === fb.site)?.label || fb.site}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderStars(fb.rating)}
                    <Badge variant="outline" className="text-green-400 border-green-400/50">
                      <Check size={12} className="mr-1" /> Approved
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {fb.question_easy && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Easy to use</p>
                    <p className="text-foreground">{fb.question_easy}</p>
                  </div>
                )}
                {fb.question_improve && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Could be better</p>
                    <p className="text-foreground">{fb.question_improve}</p>
                  </div>
                )}
                {fb.question_bugs && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Bugs & issues</p>
                    <p className="text-foreground">{fb.question_bugs}</p>
                  </div>
                )}
                {fb.question_features && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Requested features</p>
                    <p className="text-foreground">{fb.question_features}</p>
                  </div>
                )}
                {fb.question_other && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Anything else</p>
                    <p className="text-foreground">{fb.question_other}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground pt-2">
                  {fb.profiles?.full_name || fb.profiles?.email || "Anonymous"} • {new Date(fb.created_at).toLocaleDateString("en-GB")}
                </p>
              </CardContent>
            </Card>
          ))}

          {canSeePending && pendingOwn.length > 0 && (
            <>
              <h2 className="text-lg font-semibold mt-8 mb-4 flex items-center gap-2">
                <Clock size={18} className="text-yellow-400" /> Your Pending Feedback
              </h2>
              {pendingOwn.map(fb => (
                <Card key={fb.id} className="bg-card/80 border-yellow-500/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{siteEmoji(fb.site)}</span>
                        <CardTitle className="text-base">{SITES.find(s => s.value === fb.site)?.label || fb.site}</CardTitle>
                      </div>
                      <Badge variant="outline" className="text-yellow-400 border-yellow-400/50">
                        <Clock size={12} className="mr-1" /> Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {fb.question_easy && <div><p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Easy to use</p><p>{fb.question_easy}</p></div>}
                    {fb.question_improve && <div><p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Could be better</p><p>{fb.question_improve}</p></div>}
                    {fb.question_bugs && <div><p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Bugs & issues</p><p>{fb.question_bugs}</p></div>}
                    {fb.question_features && <div><p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Requested features</p><p>{fb.question_features}</p></div>}
                    {fb.question_other && <div><p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Anything else</p><p>{fb.question_other}</p></div>}
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
