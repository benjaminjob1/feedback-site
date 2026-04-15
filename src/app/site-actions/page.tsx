"use client";

import { useEffect, useState } from "react";
import { SITES } from "@/lib/supabase";
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
        const hue = (pct / 100) * 120;
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

  const renderStatusBadge = () => (
    <Badge
      variant={fb.status === "approved" ? "default" : fb.status === "rejected" ? "destructive" : "secondary"}
      className={`text-xs ${fb.status === "pending" ? "text-yellow-400 border-yellow-400/50" : ""}`}
    >
      {fb.status === "pending" && <Clock size={10} className="inline mr-1" />}
      {fb.status}
    </Badge>
  );

  return (
    <Card className="bg-card/80 overflow-hidden">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            {/* Left - icon + name + user + date */}
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              <span className="text-xl">{siteEmoji(fb.site)}</span>
              <div className="min-w-0">
                <CardTitle className="text-sm truncate">{SITES.find(s => s.value === fb.site)?.label || fb.site}</CardTitle>
                <p className="text-xs text-muted-foreground truncate">
                  {fb.profiles?.full_name || fb.profiles?.email || "Anonymous"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(fb.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </p>
              </div>
            </div>

            {/* Right - rating + heatmap + expand, right-aligned */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {renderStars(fb.rating)}
              <FeedbackHeatmap fb={fb} />
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>

          {/* AI summary row */}
          <div className="mt-1 flex items-center justify-between gap-2">
            {(fb.cached_ai_summary || (fb.ai_questions && !fb.cached_ai_summary)) && (
              <p className="text-[10px] text-muted-foreground italic" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                💡 {fb.cached_ai_summary ? fb.cached_ai_summary : "Summary unavailable"}
              </p>
            )}
            {renderStatusBadge()}
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
          {(["question_easy", "question_improve", "question_bugs", "question_features", "question_bugs_slider"] as const).map((key) => {
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

          {/* AI Follow-up Questions & Answers */}
          {fb.ai_questions ? (() => {
            let qaArray: {question: string; answer: string}[] = [];
            try {
              const parsed = JSON.parse(fb.ai_questions!);
              if (typeof parsed === 'object' && !Array.isArray(parsed)) {
                Object.entries(parsed).forEach(([q, a]) => {
                  qaArray.push({ question: q, answer: String(a) });
                });
              } else if (Array.isArray(parsed)) {
                qaArray = parsed;
              }
            } catch {}
            if (qaArray.length === 0) return null;
            return (
              <div className="border-t border-border pt-3 space-y-3">
                <p className="text-muted-foreground text-xs uppercase tracking-wide">AI Follow-up Answers</p>
                {qaArray.map((item, i) => (
                  <div key={i} className="bg-muted/30 rounded-md p-3 space-y-1">
                    <p className="text-xs font-medium text-foreground">{item.question}</p>
                    <p className="text-sm text-muted-foreground">{item.answer}</p>
                  </div>
                ))}
              </div>
            );
          })() : null}

          {/* Status badge at bottom */}
          <div className="pt-2">
            {renderStatusBadge()}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function SiteActions() {
  const [user, setUser] = useState<any>(null);
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [siteFeedback, setSiteFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then(res => res.json())
      .then(data => {
        setUser(data.user || null);
        setChecking(false);
      });
  }, []);

  const fetchSiteFeedback = (site: string) => {
    setLoading(true);
    fetch(`/api/feedback?site=${site}`)
      .then(res => res.json())
      .then(data => {
        setSiteFeedback(data.feedback || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleSiteSelect = (site: string) => {
    setSelectedSite(site);
    if (site) {
      fetchSiteFeedback(site);
    } else {
      setSiteFeedback([]);
    }
  };

  const isAdmin = user?.role === "admin";

  if (checking) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Admin access required.</p>
          <a href="/login" className="text-primary hover:underline mt-2 inline-block">Sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Site Actions</h1>
        <p className="text-muted-foreground">View and manage feedback by site</p>
      </div>

      {/* Site Selector - Same style as submit page */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Select a Site</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SITES.map((site) => (
              <button
                key={site.value}
                onClick={() => handleSiteSelect(site.value)}
                className={`p-4 rounded-lg border-2 transition-colors text-left ${
                  selectedSite === site.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span className="text-2xl mb-2 block">{site.emoji}</span>
                <span className="font-medium">{site.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      {selectedSite && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {SITES.find(s => s.value === selectedSite)?.emoji} {SITES.find(s => s.value === selectedSite)?.label} Feedback
            </h2>
            <span className="text-muted-foreground">{siteFeedback.length} item{siteFeedback.length !== 1 ? "s" : ""}</span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : siteFeedback.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No feedback for this site yet.
            </div>
          ) : (
            <div className="space-y-3">
              {siteFeedback.map(fb => (
                <FeedbackCard key={fb.id} fb={fb} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Back link */}
      <div className="mt-6">
        <a href="/" className="text-primary hover:underline">&larr; Back to Feedback</a>
      </div>
    </div>
  );
}
