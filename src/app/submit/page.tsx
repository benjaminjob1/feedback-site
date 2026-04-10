"use client";

import { useState, useEffect } from "react";
import { supabase, SITES } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, ChevronLeft, ChevronRight, Check } from "lucide-react";

type Step = 1 | 2 | 3 | 4;

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
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/login");
        return;
      }
      setUser(authUser);
      
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        const profile = data.users?.find((u: any) => u.id === authUser.id);
        if (profile?.email_verified) setVerified(true);
      }
    };
    checkUser();
  }, [router]);

  const canProceed = () => {
    if (step === 1) return !!site;
    if (step === 2) return rating > 0;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site,
          rating,
          question_easy: questionEasy,
          question_improve: questionImprove,
          question_bugs: questionBugs,
          question_features: questionFeatures,
          question_other: questionOther,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit feedback");
      }
      
      router.push("/");
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  const siteInfo = SITES.find(s => s.value === site);

  if (!verified && user) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Verify your email</CardTitle>
            <CardDescription>
              Please check your inbox and click the confirmation link before submitting feedback.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" onClick={() => router.push("/")}>
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Submit Feedback</h1>
        <p className="text-muted-foreground mt-1">Help improve Ben&apos;s projects</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${step >= s ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              {step > s ? <Check size={14} /> : s}
            </div>
            {s < 4 && <div className={`h-0.5 w-8 sm:w-16 transition-colors ${step > s ? "bg-primary" : "bg-secondary"}`} />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && "Step 1: Which project?"}
            {step === 2 && "Step 2: Rate your experience"}
            {step === 3 && "Step 3: Tell us more"}
            {step === 4 && "Step 4: Review & Submit"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Select the project you want to give feedback on"}
            {step === 2 && "How easy was it to use?"}
            {step === 3 && "Optional: Bugs, features, anything else"}
            {step === 4 && "Review your feedback before submitting"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-destructive/20 border border-destructive/30 text-destructive text-sm p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {/* Step 1: Site picker */}
          {step === 1 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SITES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setSite(s.value)}
                  className={`p-4 rounded-lg border text-left transition-colors ${site === s.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                >
                  <span className="text-2xl mb-2 block">{s.emoji}</span>
                  <span className="font-medium">{s.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Rating */}
          {step === 2 && (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-6">How would you rate your experience?</p>
              <div className="flex justify-center gap-3 mb-6">
                {[1, 2, 3, 4, 5].map(i => (
                  <button
                    key={i}
                    onClick={() => setRating(i)}
                    className="p-2 transition-transform hover:scale-110"
                  >
                    <Star
                      size={36}
                      className={i <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {rating === 1 && "Poor - needs a lot of work"}
                {rating === 2 && "Fair - some issues"}
                {rating === 3 && "Good - generally works well"}
                {rating === 4 && "Great - mostly excellent"}
                {rating === 5 && "Excellent - better than expected!"}
              </p>
              <div className="mt-8 space-y-3">
                <Label htmlFor="easy">What was easy to use?</Label>
                <Textarea
                  id="easy"
                  placeholder="e.g. The navigation was intuitive..."
                  value={questionEasy}
                  onChange={e => setQuestionEasy(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 3: More details */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="improve">What could be better?</Label>
                <Textarea
                  id="improve"
                  placeholder="e.g. The page load times could be faster..."
                  value={questionImprove}
                  onChange={e => setQuestionImprove(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="bugs">Any bugs or issues?</Label>
                <Textarea
                  id="bugs"
                  placeholder="Describe any bugs you encountered..."
                  value={questionBugs}
                  onChange={e => setQuestionBugs(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="features">What features do you want next?</Label>
                <Textarea
                  id="features"
                  placeholder="e.g. Dark mode, more charts..."
                  value={questionFeatures}
                  onChange={e => setQuestionFeatures(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="other">Anything else?</Label>
                <Textarea
                  id="other"
                  placeholder="Any other thoughts or suggestions..."
                  value={questionOther}
                  onChange={e => setQuestionOther(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-card rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{siteInfo?.emoji}</span>
                  <span className="font-semibold">{siteInfo?.label}</span>
                  <div className="ml-auto flex">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} size={16} className={i <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"} />
                    ))}
                  </div>
                </div>
                {questionEasy && <div><span className="text-xs text-muted-foreground uppercase">Easy to use</span><p className="text-sm">{questionEasy}</p></div>}
                {questionImprove && <div><span className="text-xs text-muted-foreground uppercase">Could be better</span><p className="text-sm">{questionImprove}</p></div>}
                {questionBugs && <div><span className="text-xs text-muted-foreground uppercase">Bugs & issues</span><p className="text-sm">{questionBugs}</p></div>}
                {questionFeatures && <div><span className="text-xs text-muted-foreground uppercase">Requested features</span><p className="text-sm">{questionFeatures}</p></div>}
                {questionOther && <div><span className="text-xs text-muted-foreground uppercase">Anything else</span><p className="text-sm">{questionOther}</p></div>}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Your feedback will be visible once approved. Thank you! 🙏
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => step > 1 ? setStep((step - 1) as Step) : router.push("/")}
            >
              <ChevronLeft size={16} className="mr-1" />
              {step > 1 ? "Back" : "Cancel"}
            </Button>
            {step < 4 ? (
              <Button
                onClick={() => setStep((step + 1) as Step)}
                disabled={!canProceed()}
              >
                Next
                <ChevronRight size={16} className="ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Submitting..." : "Submit Feedback"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
