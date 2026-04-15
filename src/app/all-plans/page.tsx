"use client";

import { useEffect, useState } from "react";
import { SITES } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Clock, Zap, Trash2, AlertTriangle, CheckCircle, Square, CheckSquare } from "lucide-react";
import Link from "next/link";

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

function ActionPlanCard({ plan, onDelete, onUpdate, selected, onToggle }: { plan: ActionPlan; onDelete: (id: string) => void; onUpdate: (id: string, status: string, priority: string) => void; selected?: boolean; onToggle?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editStatus, setEditStatus] = useState(plan.status);
  const [editPriority, setEditPriority] = useState(plan.priority);
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
    critical: "bg-purple-500/10 border-purple-500 text-purple-500",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-gray-500/10 border-gray-500 text-gray-500",
    in_progress: "bg-blue-500/10 border-blue-500 text-blue-500",
    completed: "bg-green-500/10 border-green-500 text-green-500",
    dismissed: "bg-gray-400/10 border-gray-400 text-gray-400",
  };

  const statusIcons: Record<string, JSX.Element> = {
    pending: <Clock size={12} className="mr-1" />,
    in_progress: <Zap size={12} className="mr-1" />,
    completed: <CheckCircle size={12} className="mr-1" />,
    dismissed: <AlertTriangle size={12} className="mr-1" />,
  };

  const handleSave = () => {
    onUpdate(plan.id, editStatus, editPriority);
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
    <Card className={`bg-card overflow-hidden ${selected ? "border-primary border-2" : ""}`}>
      <div className="flex items-start">
        {onToggle && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={`p-2 flex-shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`}
          >
            {selected ? <CheckSquare size={20} /> : <Square size={20} />}
          </button>
        )}
        <div className="flex-1">
          <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{siteEmoji(plan.site)}</span>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm">{SITES.find(s => s.value === plan.site)?.label}</CardTitle>
                  <Link 
                    href={`/site-actions?site=${plan.site}`}
                    className="text-xs text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View Site
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(plan.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={priorityColors[plan.priority] || priorityColors.medium}>
                {plan.priority}
              </Badge>
              <Badge className={statusColors[plan.status] || statusColors.pending}>
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
              <div className="flex gap-2">
                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleSave(); }}>Save</Button>
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditing(false); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-border flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
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
        </div>
      </div>
    </Card>
  );
}

export default function AllPlans() {
  const [user, setUser] = useState<any>(null);
  const [allPlans, setAllPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [filterSite, setFilterSite] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmails, setShareEmails] = useState("");
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then(res => res.json())
      .then(data => {
        setUser(data.user || null);
        setChecking(false);
      });
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchPlans();
    }
  }, [user]);

  const fetchPlans = () => {
    setLoading(true);
    fetch("/api/site-actions/plans")
      .then(res => res.json())
      .then(data => {
        let plans = data.plans || [];
        // Filter by multiple statuses
        if (filterStatus.length > 0) {
          plans = plans.filter((p: ActionPlan) => filterStatus.includes(p.status));
        }
        // Filter by multiple sites
        if (filterSite.length > 0) {
          plans = plans.filter((p: ActionPlan) => filterSite.includes(p.site));
        }
        setAllPlans(plans);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleDeletePlan = (id: string) => {
    fetch(`/api/site-actions/plans?id=${id}`, { method: "DELETE" })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAllPlans(prev => prev.filter(p => p.id !== id));
        }
      })
      .catch(() => {});
  };

  const handleUpdatePlan = (id: string, status: string, priority: string) => {
    fetch("/api/site-actions/plans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, priority }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.plan) {
          setAllPlans(prev => prev.map(p => p.id === id ? { ...p, status, priority } : p));
        }
      })
      .catch(() => {});
  };

  const togglePlanSelection = (id: string) => {
    setSelectedPlans(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllPlans = () => {
    setSelectedPlans(new Set(allPlans.map(p => p.id)));
  };

  const deselectAllPlans = () => {
    setSelectedPlans(new Set());
  };

  const handleShare = () => {
    if (selectedPlans.size === 0) {
      alert("Please select at least one plan to share");
      return;
    }
    setShowShareModal(true);
  };

  const submitShare = () => {
    const emails = shareEmails.split(",").map(e => e.trim()).filter(e => e.includes("@"));
    if (emails.length === 0) {
      alert("Please enter valid email addresses separated by commas");
      return;
    }
    
    const plansToShare = allPlans.filter(p => selectedPlans.has(p.id));
    
    setSharing(true);
    fetch("/api/site-actions/plans/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plans: plansToShare, emails }),
    })
      .then(res => res.json())
      .then(data => {
        setSharing(false);
        if (data.success) {
          alert(`Shared ${plansToShare.length} plan(s) to ${emails.length} recipient(s)`);
          setShowShareModal(false);
          setShareEmails("");
          setSelectedPlans(new Set());
        } else {
          alert(`Error: ${data.error}`);
        }
      })
      .catch(() => {
        setSharing(false);
        alert("Failed to share plans");
      });
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
          <h1 className="text-3xl font-bold mb-2">All Action Plans</h1>
          <p className="text-muted-foreground">View and manage all AI-generated action plans</p>
        </div>
        <Link href="/site-actions">
          <Button variant="outline">Site Actions</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-6 items-start">
            <div>
              <label className="text-sm text-muted-foreground block mb-2">Site:</label>
              <div className="flex flex-wrap gap-3">
                {SITES.map(site => (
                  <label key={site.value} className="flex items-center gap-1 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterSite.includes(site.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilterSite([...filterSite, site.value]);
                        } else {
                          setFilterSite(filterSite.filter(s => s !== site.value));
                        }
                      }}
                      className="rounded"
                    />
                    {site.emoji} {site.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-2">Status:</label>
              <div className="flex flex-wrap gap-3">
                {["pending", "in_progress", "completed", "dismissed"].map(status => (
                  <label key={status} className="flex items-center gap-1 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterStatus.includes(status)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilterStatus([...filterStatus, status]);
                        } else {
                          setFilterStatus(filterStatus.filter(s => s !== status));
                        }
                      }}
                      className="rounded"
                    />
                    {status.replace("_", " ")}
                  </label>
                ))}
              </div>
            </div>
            <Button size="sm" onClick={fetchPlans}>Apply Filters</Button>
          </div>
        </CardContent>
      </Card>

      {/* Plans List */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-muted-foreground">{allPlans.length} plan{allPlans.length !== 1 ? "s" : ""} ({selectedPlans.size} selected)</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={selectAllPlans}>Select All</Button>
          <Button size="sm" variant="outline" onClick={deselectAllPlans}>Deselect All</Button>
          <Button size="sm" onClick={handleShare} disabled={selectedPlans.size === 0}>Share Selected ({selectedPlans.size})</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : allPlans.length === 0 ? (
        <Card className="bg-muted/20">
          <CardContent className="py-12 text-center text-muted-foreground">
            No action plans found. Go to Site Actions to analyze feedback and create plans.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {allPlans.map(plan => (
            <ActionPlanCard 
              key={plan.id} 
              plan={plan} 
              onDelete={handleDeletePlan} 
              onUpdate={handleUpdatePlan}
              selected={selectedPlans.has(plan.id)}
              onToggle={() => togglePlanSelection(plan.id)}
            />
          ))}
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !sharing && setShowShareModal(false)}>
          <Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Share Action Plans</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Share {selectedPlans.size} selected plan{selectedPlans.size !== 1 ? "s" : ""} via email.
              </p>
              <div>
                <label className="text-sm block mb-2">Recipient emails (comma-separated):</label>
                <textarea
                  value={shareEmails}
                  onChange={(e) => setShareEmails(e.target.value)}
                  placeholder="email@example.com, another@example.com"
                  className="w-full border rounded p-2 text-sm h-24 bg-background text-foreground"
                  disabled={sharing}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowShareModal(false)} disabled={sharing}>Cancel</Button>
                <Button onClick={submitShare} disabled={sharing}>
                  {sharing ? "Sending..." : "Send"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <Link href="/" className="text-primary hover:underline">&larr; Back to Feedback</Link>
      </div>
    </div>
  );
}
