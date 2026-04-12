"use client";

import { useState, useEffect } from "react";
import { SITES } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, ChevronLeft, ChevronRight, Check, Pencil } from "lucide-react";

type Step = 1 | 2 | 3 | 4;

type ExistingFeedback = {
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
};

export default function SubmitPage() {
  const [step, setStep] = useState<Step>(1);
  const [site, setSite] = useState("");
  const [rating, setRating] = useState(0);
  const [questionEasy, setQuestionEasy] = useState("");
  const [questionImprove, setQuestionImprove] = useState("");
  const [questionBugs, setQuestionBugs] = useState("");
  const [questionFeatures, setQuestionFeatures] = useState("");
  const [questionOther, setQuestionOther] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [verified, setVerified] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState<ExistingFeedback[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const res = await fetch("/api/auth/session");
      const { user: sessionUser } = await res.json();
      if (!sessionUser) {
        router.push("/login");
        return;
      }
      setUser(sessionUser);
      setVerified(true);

      // Load existing feedback to know which sites are already submitted
      const fbRes = await fetch("/api/feedback");
      const fbData = await fbRes.json();
      const feedbackList: ExistingFeedback[] = fbData.feedback || [];
      setExistingFeedback(feedbackList);
      setExistingIds(new Set(feedbackList.map((f: ExistingFeedback) => f.site)));
    };
    checkUser();
  }, [router]);

  const canProceed = () => {
    if (step === 1) return !!site;
    if (step === 2) return rating > 0;
    return true;
  };

  const handleEditExisting = (fb: ExistingFeedback) => {
    setEditingId(fb.id);
    setSite(fb.site);
    setRating(fb.rating);
    setQuestionEasy(fb.question_easy || "");
    setQuestionImprove(fb.question_improve || "");
    setQuestionBugs(fb.question_bugs || "");
    setQuestionFeatures(fb.question_features || "");
    setQuestionOther(fb.question_other || "");
    setStep(2);
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    const body: any = {
      site,
      rating,
      question_easy: questionEasy,
      question_improve: questionImprove,
      question_bugs: questionBugs,
      question_features: questionFeatures,
      question_other: questionOther,
    };
    if (editingId) body.edit_id = editingId;

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      if (res.status === 409 && data.existing_id) {
        // Already exists — load it for editing
        const fb = existingFeedback.find((f: ExistingFeedback) => f.id === data.existing_id);
        if (fb) handleEditExisting(fb);
      } else {
        setError(data.error || "Something went wrong");
      }
      setLoading(false);
      return;
    }

    if (editingId) {
      // Updated in place
      setExistingFeedback(prev =>
        prev.map(f => f.id === editingId ? { ...f, rating, question_easy: questionEasy, question_improve: questionImprove, question_bugs: questionBugs, question_features: questionFeatures, question_other: questionOther } : f)
      );
    } else {
      // New entry
      const newFb = data.feedback;
      setExistingFeedback(prev => [...prev, newFb]);
      setExistingIds(prev => new Set([...prev, site]));
    }

    setStep(4);
    setLoading(false);
    setTimeout(() => router.push("/"), 1500);
  };

  // Sites already submitted
  const submittedSites = existingFeedback.map(f => f.site);
  const availableSites = SITES.filter(s => !submittedSites.includes(s.value));
  const submittedSitesList = SITES.filter(s => submittedSites.includes(s.value));

  return (
    <div className="container mx-auto px-4 py-8 max-w-xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Submit Feedback</h1>
        <p className="text-muted-foreground mt-1">Help improve Ben&apos;s projects</p>
      </div>

      {/* Step indicator */}
      {step < 4 && (
        <div className="flex items-center gap-2 mb-8 text-sm text-muted-foreground">
          {[1, 2, 3].map(n => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= n ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                {step > n ? <Check size={12} /> : n}
              </div>
              {n < 3 && <div className={`w-8 h-px ${step > n ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {error && (
            <div className="bg-destructive/20 border border-destructive/30 text-destructive text-sm p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {/* Step 1: site selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-3">
                {availableSites.length > 0 && (
                  <>
                    <Label>Which project?</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {availableSites.map(site => (
                        <button
                          key={site.value}
                          onClick={() => { setSite(site.value); setStep(2); }}
                          className="p-4 border border-border rounded-lg text-left hover:border-primary transition-colors"
                        >
                          <span className="text-xl">{site.emoji}</span>
                          <span className="block mt-1 font-medium">{site.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {submittedSitesList.length > 0 && (
                <div className="pt-4 border-t border-border space-y-3">
                  <Label className="text-muted-foreground">Already submitted — edit below:</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {submittedSitesList.map(site => {
                      const fb = existingFeedback.find((f: ExistingFeedback) => f.site === site.value);
                      return (
                        <button
                          key={site.value}
                          onClick={() => fb && handleEditExisting(fb)}
                          className="p-4 border border-border rounded-lg text-left hover:border-primary transition-colors relative"
                        >
                          <span className="text-xl">{site.emoji}</span>
                          <span className="block mt-1 font-medium">{site.label}</span>
                          <Pencil size={12} className="absolute top-3 right-3 text-muted-foreground" />
                          {fb && (
                            <span className="block text-xs text-muted-foreground mt-1 capitalize">★ {fb.rating}/5 — {fb.status}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {availableSites.length === 0 && submittedSitesList.length > 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>You&apos;ve submitted feedback for all projects!</p>
                  <p className="text-sm mt-1">Edit any of your submissions above.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: rating */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button onClick={() => setStep(1)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <ChevronLeft size={14} /> Back
                </button>
                <span className="text-sm font-medium">{SITES.find(s => s.value === site)?.emoji} {SITES.find(s => s.value === site)?.label}</span>
              </div>
              <Label>How easy was it to use?</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    className="w-12 h-12 rounded-lg border border-border hover:border-primary transition-colors flex items-center justify-center"
                  >
                    <Star size={20} className={n <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"} />
                  </button>
                ))}
              </div>
              <Button onClick={() => rating > 0 && setStep(3)} className="w-full" disabled={rating === 0}>
                Continue
              </Button>
            </div>
          )}

          {/* Step 3: questions */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button onClick={() => setStep(2)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <ChevronLeft size={14} /> Back
                </button>
                <span className="text-sm">{rating}/5 ★</span>
              </div>

              <div className="space-y-2">
                <Label>What did you like?</Label>
                <Textarea placeholder="Easy to use, good design..." value={questionEasy} onChange={e => setQuestionEasy(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>What could be better?</Label>
                <Textarea placeholder="Needs better navigation..." value={questionImprove} onChange={e => setQuestionImprove(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Any bugs or issues?</Label>
                <Textarea placeholder="Login doesn't work on mobile..." value={questionBugs} onChange={e => setQuestionBugs(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Features you&apos;d like?</Label>
                <Textarea placeholder="Dark mode, export feature..." value={questionFeatures} onChange={e => setQuestionFeatures(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Anything else?</Label>
                <Textarea placeholder="General feedback..." value={questionOther} onChange={e => setQuestionOther(e.target.value)} rows={2} />
              </div>

              <Button onClick={handleSubmit} className="w-full" disabled={loading}>
                {loading ? "Saving..." : editingId ? "Update Feedback" : "Submit Feedback"}
              </Button>
            </div>
          )}

          {/* Step 4: success */}
          {step === 4 && (
            <div className="text-center py-8 space-y-4">
              <div className="text-4xl">✅</div>
              <CardTitle>Feedback submitted!</CardTitle>
              <CardDescription>Thanks for helping improve Ben&apos;s projects.</CardDescription>
              <Button onClick={() => router.push("/")} className="w-full mt-4">
                Back to Feedback
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
