"use client";

import { useEffect, useState } from "react";
import { SITES } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Clock, Zap, Trash2, AlertTriangle, CheckCircle, List, Square, CheckSquare } from "lucide-react";

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

type ActionPlan = {
  id: string;
  site: string;
  summary: string;
  issues: string;
  action_items: string;
  feedback_ids?: string;
  priority: string;
  status: string;
  created_at: string;
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

function FeedbackCard({ fb, selected, onToggle }: { fb: Feedback; selected: boolean; onToggle: () => void }) {
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
    <Card className={`bg-card/80 overflow-hidden transition-colors ${selected ? "border-primary border-2" : ""}`}>
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            {/* Checkbox + Left side */}
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                className={`flex-shrink-0 p-1 rounded ${selected ? "text-primary" : "text-muted-foreground"}`}
              >
                {selected ? <CheckSquare size={18} /> : <Square size={18} />}
              </button>
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
            <div className="flex items-center gap-2 flex-shrink-0">
              {renderStars(fb.rating)}
              <FeedbackHeatmap fb={fb} />
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
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

      {expanded && (
        <CardContent className="space-y-3 text-sm border-t border-border pt-3">
          {fb.cached_ai_summary && (
            <div className="bg-muted/30 rounded-md p-2 mb-2">
              <p className="text-xs text-muted-foreground italic">💡 {fb.cached_ai_summary}</p>
            </div>
          )}
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
          <div className="pt-2">
            {renderStatusBadge()}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function ActionPlanCard({ plan, onDelete, onUpdate }: { plan: ActionPlan; onDelete: (id: string) => void; onUpdate: (id: string, status: string, priority: string, comments?: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editStatus, setEditStatus] = useState(plan.status);
  const [editPriority, setEditPriority] = useState(plan.priority);
  const [editComments, setEditComments] = useState(plan.comments || "");
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackItems, setFeedbackItems] = useState<any[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  
  let issues: string[] = [];
  let actionItems: string[] = [];
  let feedbackIds: string[] = [];
  try { issues = JSON.parse(plan.issues); } catch {}
  try { actionItems = JSON.parse(plan.action_items); } catch {}
  try { feedbackIds = JSON.parse(plan.feedback_ids || "[]"); } catch {}

  const priorityColors: Record<string, string> = {
    high: "bg-red-500/10 border-red-500 text-red-500",
    medium: "bg-yellow-500/10 border-yellow-500 text-yellow-500",
    low: "bg-green-500/10 border-green-500 text-green-500",
  };

  const statusIcons: Record<string, JSX.Element> = {
    pending: <Clock size={12} className="mr-1" />,
    in_progress: <Zap size={12} className="mr-1" />,
    completed: <CheckCircle size={12} className="mr-1" />,
    dismissed: <AlertTriangle size={12} className="mr-1" />,
  };

  const handleSave = () => {
    onUpdate(plan.id, editStatus, editPriority, editComments);
    setEditing(false);
  };

  const handleShowFeedback = () => {
    if (feedbackItems.length > 0) {
      setShowFeedback(true);
      return;
    }
    setLoadingFeedback(true);
    fetch(`/api/site-actions/plans/feedback?ids=${feedbackIds.join(",")}`)
      .then(res => res.json())
      .then(data => {
        setFeedbackItems(data.feedback || []);
        setShowFeedback(true);
        setLoadingFeedback(false);
      })
      .catch(() => setLoadingFeedback(false));
  };

  return (
    <Card className="bg-card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{siteEmoji(plan.site)}</span>
              <div>
                <CardTitle className="text-sm">{SITES.find(s => s.value === plan.site)?.label}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {new Date(plan.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={priorityColors[plan.priority] || priorityColors.medium}>
                {plan.priority}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {statusIcons[plan.status]}
                {plan.status.replace("_", " ")}
              </Badge>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
          <p className="text-sm mt-2">{plan.summary}</p>
        </CardHeader>
      </button>

      {expanded && (
        <CardContent className="space-y-4 border-t border-border pt-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center">
              <AlertTriangle size={12} className="mr-1" /> Issues Identified ({issues.length})
            </p>
            <ul className="space-y-1">
              {issues.map((issue, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  {issue}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center">
              <CheckCircle size={12} className="mr-1" /> Action Items ({actionItems.length})
            </p>
            <ul className="space-y-1">
              {actionItems.map((item, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">{i + 1}.</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Edit Form */}
          {editing ? (
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex gap-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="bg-background border rounded px-2 py-1 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="bg-background border rounded px-2 py-1 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Comments</label>
                <textarea
                  value={editComments}
                  onChange={(e) => setEditComments(e.target.value)}
                  placeholder="Add comments about this action plan..."
                  className="w-full bg-background border rounded px-2 py-1 text-sm h-20"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleSave(); }}>Save</Button>
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditing(false); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-border">
              {plan.comments && (
                <div className="text-sm text-muted-foreground italic bg-muted/20 rounded p-2 mb-2">
                  💬 {plan.comments}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                >
                  Edit Status/Priority
                </Button>
              {feedbackIds.length > 0 && (
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleShowFeedback(); }}>
                  View Feedback ({feedbackIds.length})
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Delete this action plan?")) {
                    onDelete(plan.id);
                  }
                }}
                className="flex items-center gap-1"
              >
                <Trash2 size={12} /> Delete
              </Button>
            </div>
          )}
        </CardContent>
      )}

      {/* Feedback Popup Modal */}
      {showFeedback && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowFeedback(false)}>
          <Card className="max-w-lg w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Feedback Used ({feedbackItems.length})</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setShowFeedback(false)}>✕</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingFeedback ? (
                <p className="text-center text-muted-foreground py-4">Loading...</p>
              ) : feedbackItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No feedback found</p>
              ) : (
                feedbackItems.map(fb => (
                  <div key={fb.id} className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{siteEmoji(fb.site)}</span>
                        <span className="font-medium text-sm">{fb.profiles?.full_name || fb.profiles?.email || "Anonymous"}</span>
                      </div>
                      <span className="text-yellow-400">{"★".repeat(fb.rating)}{"☆".repeat(5 - fb.rating)}</span>
                    </div>
                    {fb.cached_ai_summary && (
                      <p className="text-xs text-muted-foreground italic mb-1">💡 {fb.cached_ai_summary}</p>
                    )}
                    {fb.question_other && (
                      <p className="text-sm text-muted-foreground line-clamp-2">&ldquo;{fb.question_other}&rdquo;</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(fb.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}

export default function SiteActions() {
  const [user, setUser] = useState<any>(null);
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [siteFeedback, setSiteFeedback] = useState<Feedback[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<Set<string>>(new Set());
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then(res => res.json())
      .then(data => {
        setUser(data.user || null);
        setChecking(false);
      });
  }, []);

  // Auto-select site from URL query param on load
  useEffect(() => {
    if (checking) return;
    const params = new URLSearchParams(window.location.search);
    const siteParam = params.get("site");
    if (siteParam && SITES.find(s => s.value === siteParam)) {
      handleSiteSelect(siteParam);
    }
  }, [checking]);

  const fetchSiteFeedback = (site: string) => {
    setLoading(true);
    fetch(`/api/feedback?site=${site}`)
      .then(res => res.json())
      .then(data => {
        const feedback = data.feedback || [];
        setSiteFeedback(feedback);
        // Select all by default
        setSelectedFeedback(new Set(feedback.map((fb: Feedback) => fb.id)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const fetchActionPlans = (site: string) => {
    fetch(`/api/site-actions/plans?site=${site}`)
      .then(res => res.json())
      .then(data => {
        setActionPlans(data.plans || []);
      })
      .catch(() => {});
  };

  const handleSiteSelect = (site: string) => {
    setSelectedSite(site);
    if (site) {
      fetchSiteFeedback(site);
      fetchActionPlans(site);
    } else {
      setSiteFeedback([]);
      setSelectedFeedback(new Set());
      setActionPlans([]);
    }
  };

  const toggleFeedback = (id: string) => {
    setSelectedFeedback(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedFeedback(new Set(siteFeedback.map(fb => fb.id)));
  };

  const deselectAll = () => {
    setSelectedFeedback(new Set());
  };

  const handleAnalyze = () => {
    if (!selectedSite) return;
    
    const feedbackCount = selectedFeedback.size;
    
    if (feedbackCount === 0) {
      alert("No feedback selected");
      return;
    }

    const siteName = SITES.find(s => s.value === selectedSite)?.label;
    if (!confirm(`Analyze ${feedbackCount} feedback item${feedbackCount !== 1 ? "s" : ""} for ${siteName} and generate an action plan?`)) return;

    setAnalyzing(true);
    fetch("/api/site-actions/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site: selectedSite, feedbackIds: Array.from(selectedFeedback) }),
    })
      .then(res => res.json())
      .then(data => {
        setAnalyzing(false);
        if (data.error) {
          alert(`Analysis failed: ${data.error}`);
        } else {
          fetchActionPlans(selectedSite);
        }
      })
      .catch(() => {
        setAnalyzing(false);
        alert("Analysis failed");
      });
  };

  const handleDeletePlan = (id: string) => {
    fetch(`/api/site-actions/plans?id=${id}`, { method: "DELETE" })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setActionPlans(prev => prev.filter(p => p.id !== id));
        }
      })
      .catch(() => {});
  };

  const handleUpdatePlan = (id: string, status: string, priority: string, comments?: string) => {
    fetch("/api/site-actions/plans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, priority, comments }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.plan) {
          setActionPlans(prev => prev.map(p => p.id === id ? { ...p, status, priority, comments } : p));
        }
      })
      .catch(() => {});
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
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Site Actions</h1>
          <p className="text-muted-foreground">View feedback and create AI action plans by site</p>
        </div>
        <a href="/all-plans">
          <Button variant="outline" className="flex items-center gap-2">
            <List size={14} /> All Action Plans
          </Button>
        </a>
      </div>

      {/* Site Selector */}
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

      {selectedSite && (
        <>
          {/* Action Plans Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Action Plans</h2>
                <span className="text-muted-foreground">({actionPlans.length})</span>
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={analyzing || selectedFeedback.size === 0}
                className="flex items-center gap-2"
              >
                {analyzing ? (
                  <>Analyzing...</>
                ) : (
                  <>
                    <Zap size={14} /> Analyze Selected ({selectedFeedback.size})
                  </>
                )}
              </Button>
            </div>

            {actionPlans.length === 0 ? (
              <Card className="bg-muted/20">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No action plans yet. Select feedback and click &ldquo;Analyze Selected&rdquo; to generate one.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {actionPlans.map(plan => (
                  <ActionPlanCard key={plan.id} plan={plan} onDelete={handleDeletePlan} onUpdate={handleUpdatePlan} />
                ))}
              </div>
            )}
          </div>

          {/* Feedback Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">
                  {SITES.find(s => s.value === selectedSite)?.emoji} {SITES.find(s => s.value === selectedSite)?.label} Feedback
                </h2>
                <span className="text-muted-foreground">
                  {selectedFeedback.size}/{siteFeedback.length} selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAll}>
                  Select All
                </Button>
                <Button size="sm" variant="outline" onClick={deselectAll}>
                  Deselect All
                </Button>
              </div>
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
                  <FeedbackCard 
                    key={fb.id} 
                    fb={fb} 
                    selected={selectedFeedback.has(fb.id)}
                    onToggle={() => toggleFeedback(fb.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="mt-6">
        <a href="/" className="text-primary hover:underline">&larr; Back to Feedback</a>
      </div>
    </div>
  );
}
