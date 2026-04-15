"use client";

import { useEffect, useState } from "react";
import { SITES } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Clock, Zap, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";

type ActionPlan = {
  id: string;
  site: string;
  summary: string;
  issues: string;
  action_items: string;
  priority: string;
  status: string;
  created_at: string;
};

function siteEmoji(site: string) {
  return SITES.find(s => s.value === site)?.emoji || "📝";
}

function ActionPlanCard({ plan, onDelete, onUpdate }: { plan: ActionPlan; onDelete: (id: string) => void; onUpdate: (id: string, status: string, priority: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editStatus, setEditStatus] = useState(plan.status);
  const [editPriority, setEditPriority] = useState(plan.priority);
  
  let issues: string[] = [];
  let actionItems: string[] = [];
  try { issues = JSON.parse(plan.issues); } catch {}
  try { actionItems = JSON.parse(plan.action_items); } catch {}

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

  return (
    <Card className="bg-card overflow-hidden">
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
            <div className="pt-2 border-t border-border flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              >
                Edit Status/Priority
              </Button>
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
    </Card>
  );
}

export default function AllPlans() {
  const [user, setUser] = useState<any>(null);
  const [allPlans, setAllPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [filterSite, setFilterSite] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

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
    let url = "/api/site-actions/plans";
    if (filterSite) url += `?site=${filterSite}`;
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        let plans = data.plans || [];
        if (filterStatus) {
          plans = plans.filter((p: ActionPlan) => p.status === filterStatus);
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
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Site:</label>
              <select
                value={filterSite}
                onChange={(e) => {
                  setFilterSite(e.target.value);
                }}
                className="bg-background border rounded px-2 py-1 text-sm"
              >
                <option value="">All Sites</option>
                {SITES.map(site => (
                  <option key={site.value} value={site.value}>{site.emoji} {site.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                }}
                className="bg-background border rounded px-2 py-1 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
            <Button size="sm" onClick={fetchPlans}>Apply Filters</Button>
          </div>
        </CardContent>
      </Card>

      {/* Plans List */}
      <div className="mb-4">
        <span className="text-muted-foreground">{allPlans.length} plan{allPlans.length !== 1 ? "s" : ""}</span>
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
            />
          ))}
        </div>
      )}

      <div className="mt-6">
        <Link href="/" className="text-primary hover:underline">&larr; Back to Feedback</Link>
      </div>
    </div>
  );
}
