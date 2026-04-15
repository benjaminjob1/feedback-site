"use client";

import { useEffect, useState, useCallback } from "react";
import { SITES, SiteValue } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";

type Feedback = {
  id: string;
  site: string;
  rating: number;
  question_easy: string;
  question_improve: string;
  question_bugs: string;
  question_features: string;
  question_bugs_slider?: string;
  question_other: string;
  ai_questions?: string;
  slider_comments?: string;
  feedback_length?: string;
  status: string;
  created_at: string;
  submitted_by: string;
  cached_ai_summary?: string;
  profiles: { full_name: string; email: string } | null;
};

function siteEmoji(site: string) {
  return SITES.find(s => s.value === site)?.emoji || "📝";
}

function FeedbackHeatmap({ fb }: { fb: Feedback }) {
  const sliders = [
    { key: "question_easy", label: "Easy", icon: "👆" },
    { key: "question_improve", label: "Design", icon: "🎨" },
    { key: "question_bugs", label: "Speed", icon: "⚡" },
    { key: "question_features", label: "Features", icon: "✨" },
    { key: "question_bugs_slider", label: "No bugs", icon: "🐛" },
  ];

  return (
    <div className="flex gap-1 items-end">
      {sliders.map(({ key, label, icon }) => {
        const val = (fb as any)[key];
        if (val === undefined || val === null) return null;
        const pct = (Number(val) / 10) * 100;
        // Heatmap colors: red (low) -> yellow -> green (high)
        const hue = (pct / 100) * 120; // 0 = red, 120 = green
        return (
          <div key={key} className="flex flex-col items-center gap-0.5" title={`${label}: ${val}/10`}>
            <span className="text-xs" title={label}>{icon}</span>
            <div 
              className="w-4 rounded-t"
              style={{ 
                height: `${Math.max(4, pct * 0.4)}px`,
                backgroundColor: `hsl(${hue}, 70%, 50%)`
              }}
            />
            <span className="text-[8px] text-muted-foreground">{val}</span>
          </div>
        );
      })}
    </div>
  );
}

function FeedbackCard({ fb }: { fb: Feedback }) {
  const [expanded, setExpanded] = useState(false);
  const [sliderComments, setSliderComments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (fb.slider_comments) {
      try { setSliderComments(JSON.parse(fb.slider_comments)); } catch {}
    }
  }, [fb.slider_comments]);

  const renderStars = (r: number) => (
    <span className="text-yellow-400">
      {"★".repeat(r)}{"☆".repeat(5 - r)}
    </span>
  );

  return (
    <Card className="bg-card/80 overflow-hidden">
      {/* Collapsed Header - Always Visible */}
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl flex-shrink-0">{siteEmoji(fb.site)}</span>
              <div className="min-w-0">
                <CardTitle className="text-sm truncate">{SITES.find(s => s.value === fb.site)?.label || fb.site}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {fb.profiles?.full_name || fb.profiles?.email || "Anonymous"} • {new Date(fb.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </p>
                {fb.cached_ai_summary && (
                  <p className="text-xs text-muted-foreground italic mt-1 line-clamp-1">💡 {fb.cached_ai_summary}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {renderStars(fb.rating)}
              <FeedbackHeatmap fb={fb} />
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
        </CardHeader>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <CardContent className="space-y-3 text-sm border-t border-border pt-3">
          {/* AI Summary */}
          {fb.cached_ai_summary && (
            <div className="bg-muted/30 rounded-md p-2 mb-2">
              <p className="text-xs text-muted-foreground italic">💡 {fb.cached_ai_summary}</p>
            </div>
          )}

          {/* Slider bars */}
          {["question_easy", "question_improve", "question_bugs", "question_features", "question_bugs_slider"].map((key) => {
            const val = (fb as any)[key];
            if (val === undefined || val === null) return null;
            const labels: Record<string, string> = {
              question_easy: "EASY TO USE",
              question_improve: "DESIGN & LAYOUT",
              question_bugs: "SPEED & PERFORMANCE",
              question_features: "FEATURES & FUNCTIONALITY",
              question_bugs_slider: "BUGS NOT PRESENT",
            };
            const comment = sliderComments[key];
            return (
              <div key={key}>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">{labels[key]}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{width: (Number(val)/10*100)+"%"}} />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">{val}</span>
                </div>
                {comment && <p className="text-xs text-muted-foreground mt-1">&ldquo;{comment}&rdquo;</p>}
              </div>
            );
          })}

          {/* Comments */}
          {(() => {
            const hasAI = fb.question_other?.includes("[AI Follow-ups]");
            if (hasAI) {
              const aiIdx = fb.question_other!.indexOf("[AI Follow-ups]");
              const commentText = fb.question_other!.substring(0, aiIdx).trim();
              return commentText ? (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">COMMENTS</p>
                  <p className="text-sm">{commentText}</p>
                </div>
              ) : null;
            }
            return fb.question_other ? (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">COMMENTS</p>
                <p className="text-sm">{fb.question_other}</p>
              </div>
            ) : null;
          })()}

          {/* Status badge */}
          <Badge
            variant={fb.status === "approved" ? "default" : fb.status === "rejected" ? "destructive" : "secondary"}
            className={fb.status === "pending" ? "text-yellow-400 border-yellow-400/50" : ""}
          >
            {fb.status === "pending" && <Clock size={10} className="inline mr-1" />}
            {fb.status}
          </Badge>

          {/* AI Follow-up Questions & Answers */}
          {(fb.ai_questions || (fb.question_other && fb.question_other.includes("[AI Follow-ups]"))) ? (() => {
            let qa: any[] = [];
            if (fb.ai_questions) {
              try { qa = JSON.parse(fb.ai_questions); } catch {}
            }
            if ((!qa || qa.length === 0) && fb.question_other && fb.question_other.includes("[AI Follow-ups]")) {
              const aiIdx = fb.question_other.indexOf("[AI Follow-ups]");
              const aiText = fb.question_other.substring(aiIdx + "[AI Follow-ups]".length).trim();
              try { qa = JSON.parse(aiText); } catch {}
            }
            if (!Array.isArray(qa) || qa.length === 0) return <p className="text-xs text-muted-foreground border-t border-border pt-2">No AI follow-ups</p>;
            return (
              <div className="border-t border-border pt-3 space-y-3">
                <p className="text-muted-foreground text-xs uppercase tracking-wide">AI Follow-up Answers</p>
                {qa.map((item, i) => {
                  const question = item.question || Object.keys(item)[0];
                  const answer = item.answer || item[question] || "";
                  return (
                    <div key={i} className="bg-muted/30 rounded-md p-3 space-y-1">
                      <p className="text-xs font-medium text-foreground">{question || String(i)}</p>
                      <p className="text-sm text-muted-foreground">{answer}</p>
                    </div>
                  );
                })}
              </div>
            );
          })() : <p className="text-xs text-muted-foreground border-t border-border pt-2">No AI follow-ups</p>}
        </CardContent>
      )}
    </Card>
  );
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [allFeedback, setAllFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then(res => res.json())
      .then(data => {
        setUser(data.user || null);
        if (data.user) {
          fetchFeedback(data.user);
        } else {
          setLoading(false);
        }
      });
  }, []);

  const fetchFeedback = (profile: any) => {
    fetch("/api/feedback")
      .then(res => res.json())
      .then(async (data) => {
        setAllFeedback(data.feedback || []);
        setLoading(false);
        
        // Trigger background generation for feedback without summaries
        if (data.feedback?.length > 0) {
          fetch("/api/feedback/generate-summaries", { method: "POST" });
        }
      });
  };

  const canSeeFeedback = user?.role === "admin" || user?.role === "viewer";
  const isAdmin = user?.role === "admin";
  const isViewer = user?.role === "viewer";

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Feedback</h1>
          <p className="text-muted-foreground mt-1">
            {canSeeFeedback ? "See what people are saying" : "Submit and track your feedback"}
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/submit"><Button>Submit / Edit Feedback</Button></a>
          {isAdmin && <a href="/admin"><Button variant="outline">Admin</Button></a>}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : !user ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Please log in to view feedback.</p>
          <a href="/login" className="text-primary hover:underline mt-2 inline-block">Sign in</a>
        </div>
      ) : allFeedback.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {isViewer ? "No approved feedback yet." : isAdmin ? "No feedback yet." : "No feedback yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {allFeedback.map(fb => (
            <FeedbackCard key={fb.id} fb={fb} />
          ))}
        </div>
      )}
    </div>
  );
}
