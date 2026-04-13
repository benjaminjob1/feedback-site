"use client";

import { useState, useEffect } from "react";
import { SITES } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, ChevronLeft, Check, Pencil, Loader2, Trash2 } from "lucide-react";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

type FeedbackLength = "quick" | "standard" | "detailed";

type ExistingFeedback = {
  id: string;
  site: string;
  rating: number;
  question_easy: string;
  question_improve: string;
  question_bugs: string;
  question_features: string;
  question_other: string;
  feedback_length?: FeedbackLength;
  ai_questions?: string;
  slider_comments?: string;
  question_bugs_slider?: string;
  status: string;
  created_at: string;
  submitted_by: string;
};

type AIQuestion = { question: string; placeholder: string };

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Below Average",
  3: "Average",
  4: "Good",
  5: "Excellent",
};

const LENGTH_OPTIONS: { value: FeedbackLength; emoji: string; label: string; desc: string }[] = [
  { value: "quick", emoji: "⚡", label: "Quick", desc: "1 min — rating + optional note" },
  { value: "standard", emoji: "📝", label: "Standard", desc: "3 min — rating + 4 scaled questions" },
  { value: "detailed", emoji: "🔬", label: "Detailed", desc: "5 min — rating + scales + AI follow-ups" },
];

const SCALE_QUESTIONS = [
  { key: "question_easy", label: "Ease of use" },
  { key: "question_improve", label: "Design & layout" },
  { key: "question_bugs", label: "Speed & performance" },
  { key: "question_features", label: "Features & functionality" },
  { key: "question_bugs_slider", label: "Bugs & issues not present" },
] as const;

const TOTAL_STEPS = (length: FeedbackLength) => (length === "quick" ? 3 : length === "standard" ? 4 : 6);

export default function SubmitPage() {
  const router = useRouter();

  // Auth / session
  const [user, setUser] = useState<any>(null);
  const [verified, setVerified] = useState(false);

  // Existing feedback
  const [existingFeedback, setExistingFeedback] = useState<ExistingFeedback[]>([]);

  // Wizard state
  const [step, setStep] = useState<Step>(1);
  const [feedbackLength, setFeedbackLength] = useState<FeedbackLength>("standard");
  const [originalFeedbackLength, setOriginalFeedbackLength] = useState<FeedbackLength | null>(null);
  const [showLengthWarning, setShowLengthWarning] = useState(false);
  const [site, setSite] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [displayRating, setDisplayRating] = useState(0);

  // Standard slider values (1-10), stored by question key
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const [sliderComments, setSliderComments] = useState<Record<string, string>>({});

  // Quick textarea
  const [quickNote, setQuickNote] = useState("");

  // Standard/Detailed overall comments
  const [overallComments, setOverallComments] = useState("");

  // Detailed AI questions
  const [aiQuestions, setAiQuestions] = useState<AIQuestion[]>([]);
  const [aiAnswers, setAiAnswers] = useState<Record<number, string>>({});
  // Note: question_other_comments field exists in DB but not yet used
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(true);

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);

  // UI state
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

      const fbRes = await fetch("/api/feedback");
      const fbData = await fbRes.json();
      setExistingFeedback(fbData.feedback || []);

      // Check AI availability
      const aiRes = await fetch("/api/ai/status");
      const aiData = await aiRes.json();
      setAiAvailable(aiData.aiAvailable !== false);
    };
    checkUser();
  }, [router]);

  // Load AI questions when reaching step 3 in detailed mode
  // Track if user changed any field since loading AI questions
  const [initialSliderValues, setInitialSliderValues] = useState<Record<string, number>>({});
  const [initialRating, setInitialRating] = useState(rating);
  const [initialQuickNote, setInitialQuickNote] = useState("");
  const [aiLoaded, setAiLoaded] = useState(false);
  const [hasAnswersChanged, setHasAnswersChanged] = useState(false);
  const [aiPreloaded, setAiPreloaded] = useState(false); // true if loaded from existing feedback
  const [aiAddMoreMsg, setAiAddMoreMsg] = useState<string | null>(null); // feedback after add more

  // Mark data as changed when user moves a slider, rating, or quick note after AI questions loaded
  useEffect(() => {
    if (aiLoaded) {
      const slidersMatch = Object.keys(sliderValues).every(k => sliderValues[k] === initialSliderValues[k]) &&
                         Object.keys(initialSliderValues).every(k => sliderValues[k] === initialSliderValues[k]);
      const ratingMatch = rating === initialRating;
      const quickNoteMatch = quickNote === initialQuickNote;

      setHasAnswersChanged(!slidersMatch || !ratingMatch || !quickNoteMatch);
    }
  }, [sliderValues, rating, quickNote, aiLoaded, initialSliderValues, initialRating, initialQuickNote]);

  // On first visit to step 4, capture baselines and load AI questions
  useEffect(() => {
    if (step === 4 && feedbackLength === "detailed") {
      if (aiQuestions.length === 0 && !aiError && aiAvailable) {
        fetchAIQuestions();
      }
      if (!aiLoaded && aiQuestions.length === 0) {
        setInitialSliderValues({ ...sliderValues });
        setInitialRating(rating);
        setInitialQuickNote(quickNote || "");
      }
    }
  }, [step, feedbackLength]);

  const fetchAIQuestions = async () => {
    setAiLoading(true);
    setAiError(false);
    try {
      const res = await fetch("/api/ai/feedback-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site, rating, sliderValues }),
      });
      const data = await res.json();
      const newQuestions = data.questions || [];
      setAiQuestions(newQuestions);
      setAiAnswers({});
      setAiPreloaded(false); // mark as freshly generated, not preloaded
      if (newQuestions.length > 0) {
        setInitialSliderValues({ ...sliderValues });
        setInitialRating(rating);
        setInitialQuickNote(quickNote || "");
        setAiLoaded(true);
        setHasAnswersChanged(false);
      }
    } catch {
      setAiError(true);
    } finally {
      setAiLoading(false);
    }
  };

  const handleDeleteExisting = async (fb: ExistingFeedback) => {
    if (!confirm(`Delete your ${fb.site} feedback? This cannot be undone.`)) return;
    try {
      const res = await fetch("/api/feedback/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: fb.id }),
      });
      if (res.ok) {
        setExistingFeedback(prev => prev.filter(f => f.id !== fb.id));
        if (editingId === fb.id) {
          setEditingId(null);
          setStep(1);
        }
      }
    } catch {}
  };

  const handleEditExisting = (fb: ExistingFeedback) => {
    const len = (fb.feedback_length as FeedbackLength) || "standard";
    setOriginalFeedbackLength(len);
    setShowLengthWarning(false);
    setFeedbackLength(len);
    setRating(fb.rating);
    setDisplayRating(fb.rating);
    setHoverRating(0);
    setSite(fb.site);
    setEditingId(fb.id);

    // Restore slider values from stored text fields
    const sliders: Record<string, number> = {};
    SCALE_QUESTIONS.forEach(({ key }) => {
      const val = (fb as any)[key];
      // Stored values may be "7" or "7/10" or just plain text — try to extract a number
      const match = String(val ?? "").match(/^(\d+)/);
      sliders[key] = match ? parseInt(match[1]) : 5;
    });
    setSliderValues(sliders);

    // Reset all comment fields first
    setQuickNote("");
    setOverallComments("");
    setSliderComments({});

    // Restore slider comments
    if (fb.slider_comments) {
      try {
        const sc = JSON.parse(fb.slider_comments);
        setSliderComments(sc);
      } catch {}
    }

    // Try to parse AI questions from stored field
    if (fb.ai_questions) {
      try {
        const parsed = JSON.parse(fb.ai_questions);
        if (Array.isArray(parsed)) {
          setAiQuestions(parsed);
          if (parsed.length > 0) {
            setInitialSliderValues({ ...sliderValues });
            setInitialRating(rating);
            setInitialQuickNote(quickNote || "");
            setAiLoaded(true);
            setAiPreloaded(true);
            setHasAnswersChanged(false);
          }
        } else if (typeof parsed === "object" && parsed !== null) {
          const qa = Object.entries(parsed).map(([question, answer]) => ({ question, placeholder: "", answer }));
          setAiQuestions(qa);
          setAiAnswers(qa.map((_, i) => String(Object.values(parsed)[i] ?? "")));
          setInitialSliderValues({ ...sliderValues });
          setInitialRating(rating);
          setInitialQuickNote(quickNote || "");
          setAiLoaded(true);
          setAiPreloaded(true);
          setHasAnswersChanged(false);
        }
      } catch {}
      setStep(2);
    } else if (fb.question_other && fb.question_other.includes("[AI Follow-ups]")) {
      // Extract from question_other text
      const aiIdx = fb.question_other.indexOf("[AI Follow-ups]");
      const after = aiIdx >= 0 ? fb.question_other.substring(aiIdx + "[AI Follow-ups]".length).trim() : "";
      let parsed = null;
      if (after) {
        try { parsed = JSON.parse(after); } catch {}
      }
      if (parsed) {
        const qa = Object.entries(parsed).map(([question, answer]) => ({ question, placeholder: "", answer }));
        setAiQuestions(qa);
        setAiAnswers(qa.map((_, i) => String(Object.values(parsed)[i] ?? "")));
        setInitialSliderValues({ ...sliderValues });
        setInitialRating(rating);
        setInitialQuickNote(quickNote || "");
        setAiLoaded(true);
        setAiPreloaded(true);
        setHasAnswersChanged(false);
      }

      setQuickNote("");
      setOverallComments(fb.question_other ? fb.question_other.replace(/\[AI Follow-ups\][\s\S]*/, "").trim() : "");

      setStep(2);
    } else {
      // Standard feedback with just comments — no AI questions
      setQuickNote("");
      setOverallComments(fb.question_other || "");
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    // Build question_easy/improve/bugs/features from slider values
    const questionEasy = String(sliderValues["question_easy"] ?? "");
    const questionImprove = String(sliderValues["question_improve"] ?? "");
    const questionBugs = String(sliderValues["question_bugs"] ?? "");
    const questionFeatures = String(sliderValues["question_features"] ?? "");
    const questionBugsSlider = String(sliderValues["question_bugs_slider"] ?? "");

    // AI answers stored as JSON in question_other or a dedicated field
    let aiQuestionsJson = "";
    if (feedbackLength === "detailed" && aiQuestions.length > 0) {
      const answersObj = Object.fromEntries(
        aiQuestions.map((q, i) => [q.question, aiAnswers[i] ?? ""])
      );
      aiQuestionsJson = JSON.stringify(answersObj);
    }

    // For quick: overall comment goes in question_other
    const questionOther =
      feedbackLength === "quick"
        ? quickNote
        : overallComments;

    const body: any = {
      site,
      rating,
      question_easy: questionEasy,
      question_improve: questionImprove,
      question_bugs: questionBugs,
      question_features: questionFeatures,
      question_bugs_slider: questionBugsSlider,
      question_other: questionOther,
      ai_questions: aiQuestionsJson || null,
      slider_comments: JSON.stringify(sliderComments),
      feedback_length: feedbackLength,
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
        const fb = existingFeedback.find((f: ExistingFeedback) => f.id === data.existing_id);
        if (fb) handleEditExisting(fb);
      } else {
        setError(data.error || "Something went wrong");
      }
      return;
    }

    if (editingId) {
      setExistingFeedback(prev =>
        prev.map(f =>
          f.id === editingId
            ? { ...f, rating, question_easy: questionEasy, question_improve: questionImprove, question_bugs: questionBugs, question_features: questionFeatures, question_other: questionOther, question_bugs_slider: questionBugsSlider, ai_questions: aiQuestionsJson, slider_comments: JSON.stringify(sliderComments) }
            : f
        )
      );
    } else {
      const newFb = data.feedback;
      setExistingFeedback(prev => [...prev, newFb]);
    }

    setStep(TOTAL_STEPS(feedbackLength));
    setLoading(false);
    setTimeout(() => router.push("/"), 2000);
  };

  // Derived — filter to only current user's feedback for edit UI
  const myFeedback = existingFeedback.filter(f => f.submitted_by === user?.id);
  const mySubmittedSites = myFeedback.map(f => f.site);
  const availableSites = SITES.filter(s => !mySubmittedSites.includes(s.value));
  const submittedSitesList = SITES.filter(s => mySubmittedSites.includes(s.value));

  const canProceedFromStep2 = rating > 0;

  // Count of question responses for summary
  const questionCount =
    feedbackLength === "quick"
      ? quickNote.trim() ? 1 : 0
      : feedbackLength === "standard"
      ? Object.values(sliderValues).filter(v => v > 0).length + (overallComments.trim() ? 1 : 0)
      : Object.values(sliderValues).filter(v => v > 0).length +
        Object.values(aiAnswers).filter(a => a.trim()).length +
        (overallComments.trim() ? 1 : 0);

  // Step indicator
  const totalSteps = TOTAL_STEPS(feedbackLength);
  const renderStepIndicator = () => (
    <div className="flex items-center gap-2 mb-8 text-sm text-muted-foreground">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map(n => (
        <div key={n} className="flex items-center gap-2">
          <div
            className={"w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors " +
              (step > n
                ? "bg-primary text-primary-foreground"
                : step === n
                ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                : "bg-secondary")}
          >
            {step > n ? <Check size={12} /> : n}
          </div>
          {n < totalSteps && (
            <div className={"w-10 h-px " + (step > n ? "bg-primary" : "bg-border")} />
          )}
        </div>
      ))}
    </div>
  );

  const starLabel = RATING_LABELS[displayRating] || "";

  return (
    <div className="container mx-auto px-4 py-8 max-w-xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Submit / Edit Feedback</h1>
        <p className="text-muted-foreground mt-1">Help improve Ben&apos;s projects</p>
      </div>

      {step < TOTAL_STEPS(feedbackLength) && renderStepIndicator()}

      <Card>
        <CardContent className="pt-6">
          {error && (
            <div className="bg-destructive/20 border border-destructive/30 text-destructive text-sm p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {/* ══════════════════════════════════════════
              STEP 1 — Length + Site selection
          ══════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Length picker */}
              <div className="space-y-3">
                <Label className="text-base font-medium">How much time do you have?</Label>
                <div className="grid grid-cols-1 gap-3">
                  {LENGTH_OPTIONS.map(opt => {
                    const isDisabled = opt.value === "detailed" && !aiAvailable;
                    return (
                    <button
                      key={opt.value}
                      onClick={() => !isDisabled && setFeedbackLength(opt.value)}
                      disabled={isDisabled}
                      className={"p-4 border rounded-lg text-left transition-all flex items-center gap-3 " +
                        (feedbackLength === opt.value
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : isDisabled
                          ? "border-border opacity-50 cursor-not-allowed"
                          : "border-border hover:border-primary/60")}
                    >
                      <span className="text-2xl">{opt.emoji}</span>
                      <div>
                        <div className="font-medium">{opt.label}{isDisabled ? " (AI unavailable)" : ""}</div>
                        <div className="text-sm text-muted-foreground">{opt.desc}</div>
                      </div>
                      {feedbackLength === opt.value && (
                        <Check size={16} className="ml-auto text-primary" />
                      )}
                    </button>
                    );
                  })}
                </div>
              </div>

              {/* Site picker */}
              <div className="space-y-3">
                {availableSites.length > 0 && (
                  <>
                    <Label className="text-base font-medium">Which project?</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {availableSites.map(s => (
                        <button
                          key={s.value}
                          onClick={() => {
                            setSite(s.value);
                            setStep(2);
                          }}
                          className="p-4 border border-border rounded-lg text-left hover:border-primary transition-colors"
                        >
                          <span className="text-xl">{s.emoji}</span>
                          <span className="block mt-1 font-medium">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {submittedSitesList.length > 0 && (
                <div className="pt-4 border-t border-border space-y-3">
                  <Label className="text-base font-medium text-muted-foreground">
                    Already submitted — edit below:
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {submittedSitesList.map(s => {
                      const fb = myFeedback.find((f: ExistingFeedback) => f.site === s.value);
                      return (
                        <div key={s.value} className="p-4 border border-border rounded-lg relative">
                          <div className="flex items-start gap-2">
                            <button
                              onClick={() => fb && handleEditExisting(fb)}
                              className="flex-1 text-left hover:border-primary transition-colors"
                            >
                              <span className="text-xl">{s.emoji}</span>
                              <span className="block mt-1 font-medium">{s.label}</span>
                              {fb && (
                                <span className="block text-xs text-muted-foreground mt-1">
                                  ★ {fb.rating}/5 — {fb.status}
                                </span>
                              )}
                            </button>
                            <button
                              onClick={() => fb && handleDeleteExisting(fb)}
                              className="text-muted-foreground hover:text-red-500 p-1"
                              title="Delete feedback"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {availableSites.length === 0 && submittedSitesList.length > 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>You&apos;ve submitted feedback for all projects!</p>
                  <p className="text-sm mt-1">Edit any submission above.</p>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════
              STEP 2 — Star rating
          ══════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Edit mode: length picker */}
              {editingId && (
                <div className="space-y-3">
                  <Label className="text-base font-medium">Feedback length</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {LENGTH_OPTIONS.map(opt => {
                      const isDisabled = opt.value === "detailed" && !aiAvailable;
                      const isDowngrade = originalFeedbackLength === "detailed" && (opt.value === "standard" || opt.value === "quick")
                        || originalFeedbackLength === "standard" && opt.value === "quick";
                      return (
                        <button
                          key={opt.value}
                          onClick={() => {
                            if (isDowngrade) {
                              setShowLengthWarning(true);
                            } else {
                              setShowLengthWarning(false);
                            }
                            setFeedbackLength(opt.value);
                          }}
                          disabled={isDisabled}
                          className={"p-3 border rounded-lg text-center transition-all " +
                            (feedbackLength === opt.value
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : isDisabled
                              ? "border-border opacity-50 cursor-not-allowed"
                              : "border-border hover:border-primary/60")}
                        >
                          <div className="text-xl">{opt.emoji}</div>
                          <div className="text-xs font-medium mt-1">{opt.label}</div>
                        </button>
                      );
                    })}
                  </div>

                  {showLengthWarning && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-sm p-3 rounded-md">
                      ⚠️ Switching to {feedbackLength} may hide some of your feedback (scales, AI questions, or comments). You can switch back at any time to see all your data.
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setStep(1);
                    setSite("");
                    setRating(0);
                    setDisplayRating(0);
                    setHoverRating(0);
                    setFeedbackLength("standard");
                    setOriginalFeedbackLength(null);
                    setShowLengthWarning(false);
                    if (editingId) {
                      setEditingId(null);
                    }
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft size={14} /> Back
                </button>
                <span className="text-sm font-medium flex items-center gap-1">
                  {SITES.find(s => s.value === site)?.emoji}{" "}
                  {SITES.find(s => s.value === site)?.label}
                </span>
              </div>

              <div className="text-center space-y-3">
                <Label className="text-lg font-medium block">Overall rating</Label>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => {
                        setRating(n);
                        setDisplayRating(n);
                      }}
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="w-14 h-14 rounded-lg border border-border hover:border-primary transition-colors flex items-center justify-center"
                    >
                      <Star
                        size={24}
                        className={
                          n <= (hoverRating || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-600"
                        }
                      />
                    </button>
                  ))}
                </div>
                {starLabel && (
                  <p className="text-sm font-medium text-foreground animate-in fade-in slide-in-from-bottom-1 duration-200">
                    {rating} — {starLabel}
                  </p>
                )}
              </div>

              <Button
                onClick={() => canProceedFromStep2 && setStep(3)}
                className="w-full"
                disabled={!canProceedFromStep2}
              >
                Continue
              </Button>
            </div>
          )}

          {/* ══════════════════════════════════════════
              STEP 3 — Questions (varies by length)
          ══════════════════════════════════════════ */}
          {(step === 3 || step === 4 || step === 5) && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep((step - 1) as Step)}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft size={14} /> Back
                </button>
                <span className="text-sm flex items-center gap-1">
                  {rating}/5 ★
                  <Badge variant="outline" className="ml-2 text-xs">
                    {feedbackLength}
                  </Badge>
                </span>
              </div>

              {/* ── QUICK ── */}
              {feedbackLength === "quick" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="quick-note">Anything you would like to add? <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Textarea
                      id="quick-note"
                      placeholder="Quick thought, praise, or suggestion..."
                      value={quickNote}
                      onChange={e => setQuickNote(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <Button onClick={handleSubmit} className="w-full" disabled={loading}>
                    {loading ? "Saving..." : editingId ? "Submit / Edit Feedback" : "Submit Feedback"}
                  </Button>
                </div>
              )}

              {/* ── STANDARD ── */}
              {feedbackLength === "standard" && (
                <div className="space-y-5">
                  {SCALE_QUESTIONS.map(({ key, label }) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`slider-${key}`}>{label}</Label>
                        <Badge variant="secondary" className="min-w-[2rem] text-center justify-center">
                          {sliderValues[key] ?? 5}
                        </Badge>
                      </div>
                      <input
                        id={`slider-${key}`}
                        type="range"
                        min="1"
                        max="10"
                        value={sliderValues[key] ?? 5}
                        onChange={e => setSliderValues(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                        className="w-full accent-primary"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{key === "question_bugs_slider" ? "Many bugs" : "Poor"}</span>
                        <span>{key === "question_bugs_slider" ? "No bugs" : "Excellent"}</span>
                      </div>
                      <Textarea
                        placeholder={`Optional comment on ${label.toLowerCase()}...`}
                        value={sliderComments[key] ?? ""}
                        onChange={e => setSliderComments(prev => ({ ...prev, [key]: e.target.value }))}
                        rows={1}
                        className="text-sm"
                      />
                    </div>
                  ))}

                  <div className="space-y-2 pt-2">
                    <Label htmlFor="overall-comments">
                      Overall comments <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Textarea
                      id="overall-comments"
                      placeholder="Anything else on your mind..."
                      value={overallComments}
                      onChange={e => setOverallComments(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Button onClick={handleSubmit} className="w-full" disabled={loading}>
                    {loading ? "Saving..." : editingId ? "Submit / Edit Feedback" : "Submit Feedback"}
                  </Button>
                </div>
              )}

              {/* ── DETAILED: STEP 3 = SLIDERS ONLY ── */}
              {feedbackLength === "detailed" && step === 3 && (
                <div className="space-y-5">
                  {SCALE_QUESTIONS.map(({ key, label }) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`slider-${key}`}>{label}</Label>
                        <Badge variant="secondary" className="min-w-[2rem] text-center justify-center">
                          {sliderValues[key] ?? 5}
                        </Badge>
                      </div>
                      <input
                        id={`slider-${key}`}
                        type="range"
                        min="1"
                        max="10"
                        value={sliderValues[key] ?? 5}
                        onChange={e => setSliderValues(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                        className="w-full accent-primary"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{key === "question_bugs_slider" ? "Many bugs" : "Poor"}</span>
                        <span>{key === "question_bugs_slider" ? "No bugs" : "Excellent"}</span>
                      </div>
                      <Textarea
                        placeholder={`Optional comment on ${label.toLowerCase()}...`}
                        value={sliderComments[key] ?? ""}
                        onChange={e => setSliderComments(prev => ({ ...prev, [key]: e.target.value }))}
                        rows={1}
                        className="text-sm"
                      />
                    </div>
                  ))}

                  <Button onClick={() => setStep(4)} className="w-full">
                    Next: AI Follow-up Questions
                  </Button>
                </div>
              )}

              {feedbackLength === "detailed" && step === 4 && (
                <div className="space-y-5">
                  <div className="border-t border-border pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">AI Follow-up Questions</Label>
                      {aiLoading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
                      {step === 4 && !aiLoading && aiLoaded && aiQuestions.length > 0 && hasAnswersChanged && (
                        <button
                          onClick={() => {
                            if (confirm("Regenerate AI questions? Previous answers will be lost.")) {
                              fetchAIQuestions();
                            }
                          }}
                          className="text-sm font-bold text-red-600 hover:text-red-700"
                        >
                          ⚠️ Answers changed — Regenerate AI questions?
                        </button>
                      )}
                      {step === 4 && aiLoaded && aiQuestions.length > 0 && aiQuestions.length < 5 && !aiLoading && (
                        <button
                          onClick={async () => {
                            setAiLoading(true);
                            setAiAddMoreMsg(null);
                            try {
                              const res = await fetch("/api/ai/feedback-questions", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  site,
                                  rating,
                                  sliderValues,
                                  sliderComments,
                                  aiAnswers,
                                  count: Math.min(5, (5 - aiQuestions.length) * 3),
                                  exclude: aiQuestions.map(q => q.question)
                                }),
                              });
                              const data = await res.json();
                              if (!res.ok) {
                                setAiAddMoreMsg(data.error || "Failed to generate more questions.");
                              } else if (data.questions?.length > 0) {
                                setAiQuestions(prev => {
                                  const existing = prev.map(q => q.question.toLowerCase().trim());
                                  const filtered = (data.questions || []).filter((q: { question: string }) => !existing.includes(q.question.toLowerCase().trim()));
                                  const newQs = filtered.slice(0, 5 - prev.length);
                                  setAiAnswers(prevAnswers => {
                                    const updated = { ...prevAnswers };
                                    newQs.forEach((_: any, i: number) => { updated[prev.length + i] = ""; });
                                    return updated;
                                  });
                                  if (newQs.length === 0) {
                                    setAiAddMoreMsg("No more different questions could be generated.");
                                  } else {
                                    setAiAddMoreMsg(`Added ${newQs.length} new question${newQs.length > 1 ? "s" : ""}!`);
                                  }
                                  return [...prev, ...newQs];
                                });
                              } else {
                                setAiAddMoreMsg("No more different questions could be generated.");
                              }
                              // Always dismiss after 4s
                              setTimeout(() => setAiAddMoreMsg(null), 4000);
                            } catch {
                              setAiAddMoreMsg("Failed to generate more questions. Try again.");
                              setTimeout(() => setAiAddMoreMsg(null), 4000);
                            }
                            setAiLoading(false);
                          }}
                          className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                        >
                          + Add more AI questions ({5 - aiQuestions.length} more available)
                        </button>
                      )}
                      {aiAddMoreMsg && (
                        <p className="text-xs text-muted-foreground">{aiAddMoreMsg}</p>
                      )}
                      {step === 4 && !aiLoading && aiLoaded && aiPreloaded && aiQuestions.length > 0 && !hasAnswersChanged && (
                        <span className="text-xs text-muted-foreground">
                          {aiQuestions.length} question{aiQuestions.length !== 1 ? "s" : ""} loaded from previous submission
                        </span>
                      )}
                    </div>

                    {aiLoading && (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Generating personalized questions based on your scale answers...
                      </div>
                    )}

                    {!aiLoading && aiError && (
                      <p className="text-sm text-muted-foreground">
                        AI follow-up questions unavailable right now.
                      </p>
                    )}

                    {!aiLoading && aiQuestions.length === 0 && !aiError && (
                      <p className="text-sm text-muted-foreground">
                        AI follow-up questions unavailable.
                      </p>
                    )}

                    {aiQuestions.map((q, i) => (
                      <div key={i} className="space-y-2">
                        <Label htmlFor={`ai-q-${i}`} className="text-sm font-medium">
                          {q.question}
                        </Label>
                        <Textarea
                          id={`ai-q-${i}`}
                          placeholder={q.placeholder || "Your answer..."}
                          value={aiAnswers[i] ?? ""}
                          onChange={e => setAiAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    ))}

                    <Button onClick={() => setStep(5)} className="w-full" disabled={aiLoading}>
                      Next: Overall comments
                    </Button>
                  </div>
                </div>
              )}

              {feedbackLength === "detailed" && step === 5 && (
                <div className="space-y-5">
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="overall-comments-detailed">
                      Overall comments <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Textarea
                      id="overall-comments-detailed"
                      placeholder="Anything else on your mind..."
                      value={overallComments}
                      onChange={e => setOverallComments(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <Button onClick={handleSubmit} className="w-full" disabled={loading}>
                    {loading ? "Saving..." : editingId ? "Submit / Edit Feedback" : "Submit Feedback"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════
              SUCCESS STEP
          ══════════════════════════════════════════ */}
          {step === TOTAL_STEPS(feedbackLength) && (
            <div className="text-center py-8 space-y-4">
              <div className="text-5xl">✅</div>
              <CardTitle className="text-2xl">Feedback submitted!</CardTitle>
              <CardDescription>
                Thanks for the {feedbackLength === "quick" ? "quick" : feedbackLength === "standard" ? "standard" : "detailed"} review
                of{" "}
                <strong>
                  {SITES.find(s => s.value === site)?.emoji}{" "}
                  {SITES.find(s => s.value === site)?.label}
                </strong>
                .
              </CardDescription>
              <div className="bg-muted rounded-lg p-4 text-left space-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">Rating:</span>{" "}
                  <span className="font-medium">{rating}/5 ★ — {RATING_LABELS[rating]}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Responses:</span>{" "}
                  <span className="font-medium">
                    {questionCount} question{questionCount !== 1 ? "s" : ""} answered
                  </span>
                </div>
                {editingId && (
                  <div className="text-green-600 font-medium">✓ Updated existing feedback</div>
                )}
              </div>
              <Button onClick={() => router.push("/")} className="w-full mt-2">
                Back to Feedback
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
