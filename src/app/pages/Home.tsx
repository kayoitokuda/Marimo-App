import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { Clock, Settings, RotateCcw, ChevronDown, ChevronUp, X, Flame, ArrowLeft } from "lucide-react";
import marimoIdle from "../../imports/marimo-idle.png";
import marimoLaptop from "../../imports/marimo-laptop.png";
import marimoTreatPaw from "../../imports/marimo-treat-paw.png";
import marimoAvatar from "../../imports/marimo-avatar.png";

import {
  type AppState, type ProofType, type RecoveryReason, type DisputeReason,
  type Commitment, type HistoryEntry, type TimeLeft,
  type FutureFund, type Preferences,
  GRACE_WINDOW_MS,
  LS, DEMO_COMMITMENT, DEFAULT_FUND, DEFAULT_PREFS,
  ORBITAL_DESTINATIONS, MARIMO_SUCCESS_COMMENTS, COMMITMENT_EXAMPLES,
  loadLS, saveLS, getTimeLeft, pad, supervisionStatus, bountyComment,
  deadlineComment, taskReaction, timeRemainingText, pickRandom,
  formatDate, formatDeadline, formatTime, suggestDeadline,
} from "../lib";

import {
  AcceptingAnimation, ReviewingAnimation,
  GraceReviewingAnimation, DisputeReviewingAnimation,
  AbandonDialog, CinematicFailure,
} from "../components";

function resolveInitialState(): AppState {
  if (!loadLS<boolean>(LS.onboarded, false)) return "new";
  const saved = loadLS<string>(LS.state, "new");
  const RESTORE: Partial<Record<string, AppState>> = {
    cinematic:           "failed",
    accepting:           "active",
    reviewing:           "proof",
    "grace-reviewing":   "grace",
    "dispute-reviewing": "dispute-form",
  };
  let state = (RESTORE[saved] ?? saved) as AppState;
  if (state === "grace" || state === "grace-proof") {
    const c = loadLS<Commitment | null>(LS.commitment, null);
    if (c?.reportingDeadline && new Date(c.reportingDeadline).getTime() <= Date.now()) {
      state = "failed";
    }
  }
  return state;
}

export default function Home() {
  const navigate = useNavigate();

  const [onboarded, setOnboarded]     = useState(() => loadLS<boolean>(LS.onboarded, false));
  const [futureFund, setFutureFund]   = useState<FutureFund>(() => loadLS(LS.fund, DEFAULT_FUND));
  const [prefs, setPrefs]             = useState<Preferences>(() => loadLS(LS.prefs, DEFAULT_PREFS));
  const [commitCount, setCommitCount] = useState(() => loadLS<number>(LS.commitCount, 0));

  const [appState, setAppState] = useState<AppState>(resolveInitialState);
  const [commitment, setCommitment] = useState<Commitment | null>(() => {
    if (!loadLS<boolean>(LS.onboarded, false)) return null;
    return loadLS<Commitment | null>(LS.commitment, DEMO_COMMITMENT);
  });
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadLS(LS.history, []));
  const [treats, setTreats]   = useState<number>(() => loadLS(LS.treats, 0));
  const [streak, setStreak]   = useState<number>(() => loadLS(LS.streak, 0));

  // form
  const [flowStep, setFlowStep]   = useState(0);
  const [fTask, setFTask]         = useState("");
  const [fNote, setFNote]         = useState("");
  const [fDeadline, setFDeadline] = useState(() => suggestDeadline(loadLS(LS.prefs, DEFAULT_PREFS).typicalLength));
  const [fBounty, setFBounty]     = useState<number | null>(25);
  const [fCustom, setFCustom]     = useState("");
  const [fProof, setFProof]       = useState<ProofType>(() => loadLS<Preferences>(LS.prefs, DEFAULT_PREFS).defaultProof);
  const [fErrors, setFErrors]     = useState<Record<string, string>>({});

  // proof
  const [proofLink, setProofLink] = useState("");
  const [proofErr, setProofErr]   = useState("");

  // grace period
  const [graceTimeLeft, setGraceTimeLeft]   = useState<TimeLeft>({ total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [graceActualTime, setGraceActualTime] = useState("");
  const [graceProofLink, setGraceProofLink]   = useState("");
  const [graceProofErr, setGraceProofErr]     = useState("");

  // dispute
  const [disputeEligible, setDisputeEligible]   = useState(false);
  const [disputeReason, setDisputeReason]       = useState<DisputeReason>(null);
  const [disputeText, setDisputeText]           = useState("");
  const [disputeProofLink, setDisputeProofLink] = useState("");
  const [disputeOutcome, setDisputeOutcome]     = useState<"approved" | "denied" | null>(null);

  // ui
  const [recoveryReason, setRecoveryReason]       = useState<RecoveryReason>(null);
  const [orbitalDestination, setOrbitalDestination] = useState(() => pickRandom(ORBITAL_DESTINATIONS));
  const [successComment]                          = useState(() => pickRandom(MARIMO_SUCCESS_COMMENTS));
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    commitment ? getTimeLeft(commitment.deadline) : { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 }
  );
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory]   = useState(false);
  const [showAbandon, setShowAbandon]   = useState(false);

  // redirect
  useEffect(() => {
    if (!onboarded) navigate("/onboarding", { replace: true });
  }, [onboarded, navigate]);

  // persist
  useEffect(() => { saveLS(LS.state, appState); },         [appState]);
  useEffect(() => { saveLS(LS.commitment, commitment); },   [commitment]);
  useEffect(() => { saveLS(LS.history, history); },         [history]);
  useEffect(() => { saveLS(LS.treats, treats); },           [treats]);
  useEffect(() => { saveLS(LS.streak, streak); },           [streak]);
  useEffect(() => { saveLS(LS.fund, futureFund); },         [futureFund]);
  useEffect(() => { saveLS(LS.prefs, prefs); },             [prefs]);
  useEffect(() => { saveLS(LS.commitCount, commitCount); }, [commitCount]);

  // ── handlers ──────────────────────────────────────────────────────────────

  // Deadline passed → enter grace period (no history write yet)
  const handleDeadlinePassed = useCallback(() => {
    setAppState("grace");
  }, []);

  // Final fail: write history, reset streak, trigger cinematic
  const handleFinalFail = useCallback((canDispute: boolean) => {
    setOrbitalDestination(pickRandom(ORBITAL_DESTINATIONS));
    setCommitment(prev => {
      if (prev) {
        const entry: HistoryEntry = {
          id: Date.now().toString(), task: prev.task, deadline: prev.deadline,
          bounty: prev.bounty, result: "failed", treatEarned: false, completedAt: new Date().toISOString(),
        };
        setHistory(h => [entry, ...h]);
      }
      return prev;
    });
    setStreak(0);
    setDisputeEligible(canDispute);
    setAppState("cinematic");
  }, []);

  // Active countdown
  useEffect(() => {
    if (appState !== "active" || !commitment) return;
    const tick = () => {
      const tl = getTimeLeft(commitment.deadline);
      setTimeLeft(tl);
      if (tl.total <= 0) handleDeadlinePassed();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [appState, commitment, handleDeadlinePassed]);

  // Grace countdown
  useEffect(() => {
    if (appState !== "grace" || !commitment?.reportingDeadline) return;
    const tick = () => {
      const tl = getTimeLeft(commitment.reportingDeadline);
      setGraceTimeLeft(tl);
      if (tl.total <= 0) handleFinalFail(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [appState, commitment, handleFinalFail]);

  // Check on mount for already-expired active commitment
  useEffect(() => {
    if (appState === "active" && commitment && getTimeLeft(commitment.deadline).total <= 0) {
      handleDeadlinePassed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submitGraceProof() {
    if (commitment?.proofType === "link" && !graceProofLink.trim()) { setGraceProofErr("Please paste a link as proof."); return; }
    setAppState("grace-reviewing");
  }

  function handleGraceReviewingDone() {
    setTreats(t => t + 1);
    setStreak(s => s + 1);
    setCommitment(prev => {
      if (prev) {
        const entry: HistoryEntry = {
          id: Date.now().toString(), task: prev.task, deadline: prev.deadline,
          bounty: prev.bounty, result: "late-success", treatEarned: true, completedAt: new Date().toISOString(),
        };
        setHistory(h => [entry, ...h]);
      }
      return prev;
    });
    setAppState("grace-success");
  }

  function submitDispute() {
    if (!disputeReason) return;
    const outcome: "approved" | "denied" =
      disputeReason === "late-report" || disputeReason === "has-evidence" ? "approved" : "denied";
    setDisputeOutcome(outcome);
    if (outcome === "approved") {
      setHistory(h => {
        const idx = h.findIndex(e => e.task === commitment?.task && e.result === "failed");
        const filtered = idx >= 0 ? [...h.slice(0, idx), ...h.slice(idx + 1)] : h;
        const entry: HistoryEntry = {
          id: Date.now().toString(), task: commitment?.task ?? "",
          deadline: commitment?.deadline ?? "", bounty: commitment?.bounty ?? 0,
          result: "late-success", treatEarned: true, completedAt: new Date().toISOString(), appealOutcome: "approved",
        };
        return [entry, ...filtered];
      });
      setTreats(t => t + 1);
      setStreak(s => s + 1);
    }
    setAppState("dispute-reviewing");
  }

  function handleDisputeReviewingDone() {
    setAppState(disputeOutcome === "approved" ? "dispute-approved" : "dispute-denied");
  }

  function submitProof() {
    if (commitment?.proofType === "link" && !proofLink.trim()) { setProofErr("Please paste a link as proof."); return; }
    setAppState("reviewing");
  }

  function handleReviewingDone() {
    setTreats(t => t + 1);
    setStreak(s => s + 1);
    setCommitment(prev => {
      if (prev) {
        const entry: HistoryEntry = {
          id: Date.now().toString(), task: prev.task, deadline: prev.deadline,
          bounty: prev.bounty, result: "success", treatEarned: true, completedAt: new Date().toISOString(),
        };
        setHistory(h => [entry, ...h]);
      }
      return prev;
    });
    setAppState("success");
  }

  function validateStep(step: number): boolean {
    const errs: Record<string, string> = {};
    if (step === 0 && !fTask.trim()) errs.task = "Task is required.";
    if (step === 2) {
      if (!fDeadline) errs.deadline = "Deadline is required.";
      else if (new Date(fDeadline).getTime() <= Date.now()) errs.deadline = "Deadline must be in the future.";
    }
    if (step === 3) {
      const val = fBounty ?? parseFloat(fCustom);
      if (isNaN(val) || val <= 0) errs.bounty = "Enter a valid bounty amount.";
    }
    setFErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function advanceStep() {
    if (flowStep < 4) { if (!validateStep(flowStep)) return; setFErrors({}); setFlowStep(s => s + 1); }
    else submitCommitment();
  }
  function retreatStep() { if (flowStep > 0) { setFErrors({}); setFlowStep(s => s - 1); } }

  function setQuickDeadline(type: "tonight" | "tomorrow" | "weekend") {
    const d = new Date();
    if (type === "tonight") { d.setHours(22, 0, 0, 0); if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1); }
    else if (type === "tomorrow") { d.setDate(d.getDate() + 1); d.setHours(22, 0, 0, 0); }
    else { const day = d.getDay(); const daysToSat = day === 6 ? 7 : 6 - day; d.setDate(d.getDate() + daysToSat); d.setHours(17, 0, 0, 0); }
    setFDeadline(d.toISOString().slice(0, 16));
    setFErrors({});
  }

  function submitCommitment() {
    const errs: Record<string, string> = {};
    if (!fTask.trim()) errs.task = "Task is required.";
    if (!fDeadline) errs.deadline = "Deadline is required.";
    else if (new Date(fDeadline).getTime() <= Date.now()) errs.deadline = "Deadline must be in the future.";
    const bountyVal = fBounty ?? parseFloat(fCustom);
    if (isNaN(bountyVal) || bountyVal <= 0) errs.bounty = "Enter a valid bounty amount.";
    setFErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const deadlineMs = new Date(fDeadline).getTime();
    const c: Commitment = {
      id: Date.now().toString(), task: fTask.trim(), note: fNote.trim(),
      deadline: new Date(fDeadline).toISOString(),
      reportingDeadline: new Date(deadlineMs + GRACE_WINDOW_MS).toISOString(),
      bounty: bountyVal, proofType: fProof, createdAt: new Date().toISOString(),
    };
    const newCount = commitCount + 1;
    setCommitCount(newCount); saveLS(LS.commitCount, newCount);
    setCommitment(c); setTimeLeft(getTimeLeft(c.deadline));
    setAppState("accepting");
  }

  function abandonCommitment() {
    setCommitment(prev => {
      if (prev) {
        const entry: HistoryEntry = {
          id: Date.now().toString(), task: prev.task, deadline: prev.deadline,
          bounty: prev.bounty, result: "abandoned", treatEarned: false, completedAt: new Date().toISOString(),
        };
        setHistory(h => [entry, ...h]);
      }
      return prev;
    });
    setShowAbandon(false);
    startFresh();
  }

  function startFresh() {
    setFTask(""); setFNote(""); setFDeadline(suggestDeadline(prefs.typicalLength));
    setFBounty(25); setFCustom(""); setFProof(prefs.defaultProof); setFErrors({});
    setProofLink(""); setProofErr("");
    setGraceActualTime(""); setGraceProofLink(""); setGraceProofErr("");
    setDisputeReason(null); setDisputeText(""); setDisputeProofLink(""); setDisputeOutcome(null);
    setDisputeEligible(false); setShowAbandon(false); setFlowStep(0); setRecoveryReason(null);
    setAppState("new");
  }

  function resetDemo() {
    Object.values(LS).forEach(k => localStorage.removeItem(k));
    setHistory([]); setTreats(0); setCommitment(null); setStreak(0);
    setFutureFund(DEFAULT_FUND); setPrefs(DEFAULT_PREFS); setCommitCount(0);
    setOnboarded(false); setShowSettings(false);
    navigate("/onboarding", { replace: true });
  }

  // derived
  const totalTime      = commitment ? new Date(commitment.deadline).getTime() - new Date(commitment.createdAt).getTime() : 1;
  const urgencyRatio   = commitment && totalTime > 0 ? 1 - (timeLeft.total / totalTime) : 0;
  const urgencyColor   = urgencyRatio < 0.6 ? "#29483D" : urgencyRatio < 0.82 ? "#E5A93D" : "#C0392B";
  const statusLine     = commitment ? supervisionStatus(timeLeft.total, totalTime) : "";
  const successCount   = history.filter(h => h.result === "success" || h.result === "late-success").length;
  const failedCount    = history.filter(h => h.result === "failed").length;
  const abandonedCount = history.filter(h => h.result === "abandoned").length;
  const bountiesKept   = history.filter(h => h.result === "success" || h.result === "late-success").reduce((s, h) => s + h.bounty, 0);
  const bountiesYeeted = history.filter(h => h.result === "failed").reduce((s, h) => s + h.bounty, 0);
  const fundProgress   = futureFund.target ? Math.min((bountiesKept / futureFund.target) * 100, 100) : null;
  const agreementNo      = String(commitCount + 1).padStart(4, "0");
  const currentBountyVal = fBounty ?? (parseFloat(fCustom) || 0);
  const bComment         = bountyComment(fBounty, fCustom);
  const dComment         = deadlineComment(fDeadline);
  const tReaction        = taskReaction(fTask);
  const timeRemaining    = timeRemainingText(fDeadline);
  const stepCtaLabels    = ["Continue →", "Set deadline →", "Set bounty →", "Review agreement →", "Accept commitment"];
  const stepLabels       = ["Promise", "Evidence", "Deadline", "Stakes", "Review"];

  if (!onboarded) return null;

  return (
    <div className="min-h-screen bg-background font-sans text-foreground" style={{ fontFamily: "'Nunito Sans', system-ui, sans-serif" }}>

      {/* overlays */}
      {appState === "cinematic" && commitment && (
        <CinematicFailure bounty={commitment.bounty} onAnimationEnd={() => { setAppState("failed"); setRecoveryReason(null); }} />
      )}
      {appState === "accepting" && commitment && (
        <AcceptingAnimation task={commitment.task} bounty={commitment.bounty} onDone={() => setAppState("active")} />
      )}
      {appState === "reviewing" && <ReviewingAnimation onDone={handleReviewingDone} />}
      {appState === "grace-reviewing" && <GraceReviewingAnimation onDone={handleGraceReviewingDone} />}
      {appState === "dispute-reviewing" && <DisputeReviewingAnimation onDone={handleDisputeReviewingDone} />}
      {showAbandon && commitment && (
        <AbandonDialog bounty={commitment.bounty} onConfirm={abandonCommitment} onCancel={() => setShowAbandon(false)} />
      )}

      {/* header */}
      <header className="sticky top-0 z-20 bg-card border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={marimoAvatar} alt="Marimo" className="w-9 h-9 rounded-full object-cover ring-2 ring-secondary" />
            <div className="leading-none">
              <p className="text-base font-bold text-primary">Marimo</p>
              <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase">Office of Commitment Compliance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {streak >= 2 && (
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-full">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-sm font-bold text-amber-700">{streak}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-full border border-border">
              <span className="text-sm leading-none">🍡</span>
              <span className="text-sm font-bold text-primary">{treats}</span>
            </div>
            <button onClick={() => setShowSettings(s => !s)} className="p-2 rounded-full hover:bg-secondary transition-colors">
              <Settings className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {showSettings && (
        <div className="fixed inset-0 z-30" onClick={() => setShowSettings(false)}>
          <div className="absolute right-4 top-[60px] w-60 bg-card rounded-2xl border border-border shadow-xl p-1.5" onClick={e => e.stopPropagation()}>
            <div className="px-3.5 py-2 text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">Marimo Inc. Personnel File</div>
            <Link to="/record" onClick={() => setShowSettings(false)} className="block px-3.5 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary rounded-xl transition-colors">View official record</Link>
            <Link to="/fund" onClick={() => setShowSettings(false)} className="block px-3.5 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary rounded-xl transition-colors">View future fund</Link>
            <div className="my-1 border-t border-border" />
            <button onClick={resetDemo} className="w-full text-left px-3.5 py-2.5 text-sm font-semibold text-destructive hover:bg-secondary rounded-xl transition-colors flex items-center gap-2">
              <RotateCcw className="w-3.5 h-3.5" /> Reset &amp; re-onboard
            </button>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 sm:px-5 py-6 sm:py-8 space-y-4 sm:space-y-5">

        {/* ══ NEW ══════════════════════════════════════════════════════════ */}
        {appState === "new" && (
          <>
            {flowStep === 0 && (
              <div className="flex flex-col items-center gap-2 pt-2 pb-1">
                <img src={marimoLaptop} alt="Marimo" className="w-36 h-auto object-contain drop-shadow-sm" />
                <p className="text-sm text-muted-foreground italic text-center max-w-[280px] leading-snug">"Marimo currently has nothing to supervise."</p>
              </div>
            )}
            <div className="flex items-center gap-2 justify-center py-1">
              {stepLabels.map((label, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="rounded-full flex items-center justify-center transition-all duration-300" style={{ width: 22, height: 22, background: i < flowStep ? "rgba(41,72,61,0.18)" : i === flowStep ? "#29483D" : "rgba(41,72,61,0.08)" }}>
                      {i < flowStep ? <span className="text-[9px] font-bold text-primary">✓</span> : <span className="text-[9px] font-bold" style={{ color: i === flowStep ? "#FFF8EC" : "rgba(41,72,61,0.4)" }}>{i + 1}</span>}
                    </div>
                    {i === flowStep && <span className="text-[10px] font-bold text-primary tracking-wide hidden sm:inline">{label}</span>}
                  </div>
                  {i < stepLabels.length - 1 && <div className="w-4 h-px" style={{ background: i < flowStep ? "rgba(41,72,61,0.3)" : "rgba(41,72,61,0.12)" }} />}
                </div>
              ))}
            </div>

            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
              {/* step 0 – promise */}
              {flowStep === 0 && (
                <div className="p-6 space-y-5">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1">Step 1 · Promise</p>
                    <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl text-primary">What are you committing to?</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Choose one outcome you can clearly finish.</p>
                  </div>
                  <div className="space-y-1.5">
                    <input type="text" value={fTask} onChange={e => { setFTask(e.target.value); setFErrors({}); }} placeholder="e.g. Finish the portfolio case study" className="w-full px-4 py-3.5 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none placeholder:text-muted-foreground transition-colors text-foreground text-base" autoFocus />
                    {fErrors.task && <p className="text-xs font-semibold text-destructive">{fErrors.task}</p>}
                    {tReaction && fTask.trim().length > 3 && (
                      <div className="flex items-center gap-2 px-1 pt-0.5" style={{ animation: "fadeInUp 0.28s ease both" }}>
                        <img src={marimoAvatar} alt="Marimo" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                        <p className="text-xs text-muted-foreground italic">"{tReaction}"</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Definition of done <span className="font-normal normal-case">(optional)</span></label>
                    <textarea value={fNote} onChange={e => setFNote(e.target.value)} placeholder="What would 'done' look like?" rows={2} className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none placeholder:text-muted-foreground transition-colors resize-none text-foreground text-sm" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Or pick an example</p>
                    <div className="flex flex-col gap-1.5">
                      {COMMITMENT_EXAMPLES.map(ex => (
                        <button key={ex} onClick={() => { setFTask(ex); setFErrors({}); }} className="text-left text-sm text-muted-foreground px-3 py-2 rounded-xl hover:bg-secondary hover:text-foreground transition-colors border border-transparent hover:border-border">{ex}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* step 1 – evidence */}
              {flowStep === 1 && (
                <div className="p-6 space-y-5">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1">Step 2 · Evidence</p>
                    <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl text-primary">What counts as done?</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Decide now, before Deadline You begins negotiating.</p>
                  </div>
                  <div className="bg-secondary rounded-xl px-3.5 py-2.5">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Commitment</p>
                    <p className="text-sm font-bold text-primary mt-0.5">{fTask}</p>
                  </div>
                  <div className="space-y-2">
                    {([
                      { v: "honor",      label: "I'll confirm it myself",  sub: "Self-attestation. Marimo is choosing to trust you.", icon: "🤞" },
                      { v: "screenshot", label: "Upload a screenshot",     sub: "Upload visual evidence of completion.",              icon: "📸" },
                      { v: "link",       label: "Submit a link",           sub: "Provide a URL as proof of completion.",              icon: "🔗" },
                    ] as { v: ProofType; label: string; sub: string; icon: string }[]).map(opt => (
                      <button key={opt.v} onClick={() => setFProof(opt.v)} className="w-full text-left flex items-start gap-3.5 p-4 rounded-2xl border-2 transition-all" style={{ background: fProof === opt.v ? "rgba(41,72,61,0.06)" : "transparent", borderColor: fProof === opt.v ? "rgba(41,72,61,0.28)" : "rgba(41,72,61,0.12)" }}>
                        <span className="text-xl mt-0.5 flex-shrink-0">{opt.icon}</span>
                        <div>
                          <p className="text-sm font-bold text-foreground">{opt.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{opt.sub}</p>
                        </div>
                        {fProof === opt.v && <span className="ml-auto text-primary font-bold text-sm flex-shrink-0">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* step 2 – deadline */}
              {flowStep === 2 && (
                <div className="p-6 space-y-5">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1">Step 3 · Deadline</p>
                    <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl text-primary">When is this due?</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Marimo enforces the minute. You have 1 hour after to report.</p>
                  </div>
                  <div className="flex gap-2">
                    {[{ label: "Tonight", action: () => setQuickDeadline("tonight") }, { label: "Tomorrow", action: () => setQuickDeadline("tomorrow") }, { label: "This weekend", action: () => setQuickDeadline("weekend") }].map(q => (
                      <button key={q.label} onClick={q.action} className="flex-1 py-2 rounded-xl text-xs font-bold border-2 border-border hover:border-primary/30 hover:bg-secondary transition-all text-foreground">{q.label}</button>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <input type="datetime-local" value={fDeadline} onChange={e => { setFDeadline(e.target.value); setFErrors({}); }} className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none transition-colors text-foreground" />
                    {fErrors.deadline && <p className="text-xs font-semibold text-destructive">{fErrors.deadline}</p>}
                  </div>
                  {timeRemaining && (
                    <div className="rounded-2xl px-4 py-3.5 space-y-1" style={{ background: "rgba(41,72,61,0.05)", border: "1.5px solid rgba(41,72,61,0.12)" }}>
                      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">Time remaining</p>
                      <p className="text-xl font-bold text-primary">{timeRemaining}</p>
                      {dComment && <p className="text-xs text-muted-foreground italic" style={{ fontFamily: "monospace" }}>"{dComment}"</p>}
                    </div>
                  )}
                </div>
              )}

              {/* step 3 – stakes */}
              {flowStep === 3 && (
                <div className="p-6 space-y-5">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1">Step 4 · Stakes</p>
                    <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl text-primary">Put something on the line.</h2>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {[5, 10, 25, 50].map(amt => (
                        <button key={amt} onClick={() => { setFBounty(amt); setFCustom(""); setFErrors({}); }} className={`px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${fBounty === amt ? "bg-accent text-foreground border-accent" : "bg-secondary text-foreground border-transparent hover:border-primary/25"}`}>${amt}</button>
                      ))}
                      <button onClick={() => { setFBounty(null); setFErrors({}); }} className={`px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${fBounty === null ? "bg-accent text-foreground border-accent" : "bg-secondary text-foreground border-transparent hover:border-primary/25"}`}>Custom</button>
                    </div>
                    {fBounty === null && (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">$</span>
                        <input type="number" value={fCustom} onChange={e => { setFCustom(e.target.value); setFErrors({}); }} placeholder="Enter amount" min="1" className="flex-1 px-4 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none text-foreground placeholder:text-muted-foreground" />
                      </div>
                    )}
                    {fErrors.bounty && <p className="text-xs font-semibold text-destructive">{fErrors.bounty}</p>}
                    {bComment && <p className="text-xs text-muted-foreground italic px-1" style={{ fontFamily: "monospace" }}>"{bComment}"</p>}
                  </div>
                  {currentBountyVal > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl p-4 space-y-1" style={{ background: "rgba(41,72,61,0.05)", border: "1.5px solid rgba(41,72,61,0.14)" }}>
                        <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-foreground">If completed</p>
                        <p className="text-lg font-bold text-primary">+${currentBountyVal}</p>
                        <p className="text-xs text-muted-foreground">→ {futureFund.name || "Future Fund"}</p>
                      </div>
                      <div className="rounded-2xl p-4 space-y-1" style={{ background: "rgba(192,57,43,0.04)", border: "1.5px solid rgba(192,57,43,0.14)" }}>
                        <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-foreground">If missed</p>
                        <p className="text-lg font-bold" style={{ color: "#C0392B" }}>${currentBountyVal}</p>
                        <p className="text-xs text-muted-foreground">→ Marimo</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* step 4 – review */}
              {flowStep === 4 && (
                <div className="p-6 space-y-5">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1">Step 5 · Review</p>
                    <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl text-primary">Review your commitment.</h2>
                  </div>
                  <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFDF7", border: "1.5px solid rgba(41,72,61,0.18)" }}>
                    <div className="px-5 py-3" style={{ background: "rgba(41,72,61,0.04)", borderBottom: "1px solid rgba(41,72,61,0.1)" }}>
                      <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-primary" style={{ fontFamily: "monospace" }}>Commitment Agreement No. {agreementNo}</p>
                    </div>
                    <div className="px-5 py-4 space-y-3.5">
                      {[
                        { label: "Promise",           value: fTask },
                        { label: "Done when",         value: fNote || "Confirmed by self-attestation" },
                        { label: "Deadline",          value: formatDeadline(fDeadline) },
                        { label: "Reporting window",  value: "1 hour after deadline" },
                        { label: "Bounty",            value: `$${currentBountyVal.toFixed(2)}` },
                        { label: "If completed",      value: `$${currentBountyVal} → ${futureFund.name || "Future Fund"}` },
                        { label: "If missed",         value: `$${currentBountyVal} → Marimo` },
                        { label: "Evidence",          value: fProof === "honor" ? "Self-attestation" : fProof === "screenshot" ? "Screenshot" : "Link" },
                      ].map(row => (
                        <div key={row.label} className="flex items-start justify-between gap-4">
                          <span className="text-xs text-muted-foreground flex-shrink-0 pt-0.5">{row.label}</span>
                          <span className="text-xs font-semibold text-foreground text-right leading-snug">{row.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="px-5 py-2.5" style={{ borderTop: "1px solid rgba(41,72,61,0.08)", background: "rgba(41,72,61,0.02)" }}>
                      <button onClick={() => setFlowStep(0)} className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-2">Revise terms</button>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center leading-relaxed px-2">
                    By accepting, you confirm the task is achievable, the deadline is intentional, and Marimo has been granted entirely too much authority.
                  </p>
                </div>
              )}

              <div className="px-6 pb-6 space-y-2">
                <button onClick={advanceStep} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:opacity-90 active:scale-[0.985] transition-all shadow-sm">{stepCtaLabels[flowStep]}</button>
                {flowStep > 0 && (
                  <button onClick={retreatStep} className="w-full py-2.5 rounded-2xl text-muted-foreground text-sm font-semibold hover:bg-secondary transition-colors flex items-center justify-center gap-1.5">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* ══ ACTIVE ═══════════════════════════════════════════════════════ */}
        {appState === "active" && commitment && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 px-1">
              <img src={marimoIdle} alt="Marimo watching" className="w-24 h-auto object-contain flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Compliance Status</p>
                <p className="text-base font-bold text-primary leading-snug">Management has been informed.</p>
                <p className="text-sm text-muted-foreground italic leading-snug mt-0.5">{statusLine}</p>
              </div>
            </div>
            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
              <div className="h-1 bg-secondary">
                <div className="h-full transition-all duration-1000" style={{ width: `${Math.min(urgencyRatio * 100, 100)}%`, background: urgencyColor, animation: urgencyRatio > 0.82 ? "progressPulse 2s ease-in-out infinite" : "none" }} />
              </div>
              <div className="p-5 sm:p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Active commitment</p>
                    <h2 className="text-xl font-bold text-primary leading-tight">{commitment.task}</h2>
                    {commitment.note && <p className="text-sm text-muted-foreground mt-1.5 leading-snug">{commitment.note}</p>}
                  </div>
                  <div className="text-right flex-shrink-0 rounded-2xl px-4 py-2.5" style={{ background: "rgba(229,169,61,0.1)", border: "1px solid rgba(229,169,61,0.2)" }}>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Bounty</p>
                    <p className="text-2xl font-bold text-accent leading-none mt-0.5">${commitment.bounty}</p>
                  </div>
                </div>
                <div className="bg-secondary rounded-2xl p-4">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3"><Clock className="w-3.5 h-3.5" /> Time remaining</p>
                  <div className="flex gap-4 sm:gap-5">
                    {timeLeft.days > 0 && (
                      <div className="text-center">
                        <p className="text-3xl sm:text-4xl font-bold tabular-nums leading-none" style={{ color: urgencyColor }}>{timeLeft.days}</p>
                        <p className="text-xs text-muted-foreground font-semibold mt-1">days</p>
                      </div>
                    )}
                    {[{ v: pad(timeLeft.hours), l: "hrs" }, { v: pad(timeLeft.minutes), l: "min" }, { v: pad(timeLeft.seconds), l: "sec" }].map(t => (
                      <div key={t.l} className="text-center">
                        <p className="text-3xl sm:text-4xl font-bold tabular-nums leading-none" style={{ color: urgencyColor }}>{t.v}</p>
                        <p className="text-xs text-muted-foreground font-semibold mt-1">{t.l}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">Due {formatDeadline(commitment.deadline)}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => setAppState("proof")} className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-sm">Submit completion ✓</button>
                  <button onClick={handleDeadlinePassed} title="Demo — enter grace period" className="px-4 py-3.5 rounded-2xl bg-secondary text-muted-foreground text-sm font-bold hover:bg-border transition-colors border border-border">Simulate deadline</button>
                </div>
                <button onClick={() => setShowAbandon(true)} className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">Cancel commitment</button>
              </div>
            </div>
          </div>
        )}

        {/* ══ PROOF ════════════════════════════════════════════════════════ */}
        {appState === "proof" && commitment && (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-2 pt-2 pb-1">
              <img src={marimoIdle} alt="Marimo" className="w-32 h-auto object-contain" />
              <p className="text-sm text-muted-foreground italic text-center max-w-[260px] leading-snug">"Evidence Review Division is standing by."</p>
            </div>
            <div className="bg-card rounded-3xl border border-border shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl text-primary">Submit completion</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Send the agreed evidence for review.</p>
                </div>
                <button onClick={() => setAppState("active")} className="p-1.5 rounded-full hover:bg-secondary transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <div className="bg-secondary rounded-xl px-3.5 py-2.5">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Commitment</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{commitment.task}</p>
              </div>
              {commitment.proofType === "honor" && <div className="bg-secondary rounded-2xl p-4"><p className="font-bold text-foreground">Honor system selected.</p><p className="text-sm text-muted-foreground mt-1">Marimo is choosing to trust you on this one.</p></div>}
              {commitment.proofType === "screenshot" && <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center space-y-2"><p className="text-4xl">📸</p><p className="font-bold text-foreground">Upload a screenshot</p><p className="text-xs text-muted-foreground">Prototype: submitting is sufficient.</p></div>}
              {commitment.proofType === "link" && (
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-foreground">Paste a link as proof</label>
                  <input type="url" value={proofLink} onChange={e => setProofLink(e.target.value)} placeholder="https://…" className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none text-foreground placeholder:text-muted-foreground transition-colors" />
                  {proofErr && <p className="text-xs font-semibold text-destructive">{proofErr}</p>}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={submitProof} className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-sm">Submit for review</button>
                <button onClick={() => setAppState("active")} className="px-4 py-3.5 rounded-2xl bg-secondary text-muted-foreground text-sm font-bold hover:bg-border transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* ══ GRACE ════════════════════════════════════════════════════════ */}
        {appState === "grace" && commitment && (
          <div className="space-y-5" style={{ animation: "fadeInUp 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
            <div className="flex flex-col items-center gap-2 pt-2 pb-1">
              <img src={marimoIdle} alt="Marimo" className="w-28 h-auto object-contain" />
              <p className="text-xs text-muted-foreground italic text-center max-w-[300px] leading-snug">"The deadline was {formatTime(commitment.deadline)}. I am asking when you finished, not when you clicked this button."</p>
            </div>
            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
              <div className="px-6 py-4 space-y-1" style={{ background: "rgba(229,169,61,0.04)", borderBottom: "1px solid rgba(229,169,61,0.14)" }}>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">Deadline passed · Reporting window open</p>
                <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl text-primary">Did you complete this by {formatTime(commitment.deadline)}?</h2>
                <p className="text-sm text-muted-foreground mt-0.5 leading-snug">Your commitment deadline has passed, but you still have time to report the outcome.</p>
              </div>
              <div className="px-6 pt-4">
                <div className="bg-secondary rounded-xl px-3.5 py-2.5">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Commitment</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{commitment.task}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Deadline: {formatDeadline(commitment.deadline)}</p>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="rounded-2xl p-4" style={{ background: "rgba(229,169,61,0.06)", border: "1.5px solid rgba(229,169,61,0.2)" }}>
                  <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-1">Reporting window closes</p>
                  <p className="text-sm font-semibold text-foreground mb-3">{formatDeadline(commitment.reportingDeadline)}</p>
                  <div className="flex gap-4">
                    {[{ v: pad(graceTimeLeft.hours), l: "hrs" }, { v: pad(graceTimeLeft.minutes), l: "min" }, { v: pad(graceTimeLeft.seconds), l: "sec" }].map(t => (
                      <div key={t.l} className="text-center">
                        <p className="text-2xl font-bold tabular-nums leading-none text-accent">{t.v}</p>
                        <p className="text-[10px] text-muted-foreground font-semibold mt-1">{t.l}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">left to report</p>
                </div>
              </div>
              <div className="px-6 pb-6 space-y-3">
                <button onClick={() => setAppState("grace-proof")} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-sm">Yes, I completed it on time</button>
                <button onClick={() => handleFinalFail(false)} className="w-full py-3.5 rounded-2xl text-muted-foreground text-sm font-semibold hover:bg-secondary transition-colors border border-border">No, I didn't complete it</button>
              </div>
            </div>
          </div>
        )}

        {/* ══ GRACE PROOF ══════════════════════════════════════════════════ */}
        {appState === "grace-proof" && commitment && (
          <div className="space-y-5" style={{ animation: "fadeInUp 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
            <div className="flex flex-col items-center gap-2 pt-2 pb-1">
              <img src={marimoLaptop} alt="Marimo" className="w-28 h-auto object-contain" />
              <p className="text-xs text-muted-foreground italic text-center max-w-[280px] leading-snug">"You may present your case."</p>
            </div>
            <div className="bg-card rounded-3xl border border-border shadow-sm p-6 space-y-5">
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1">Late Completion Report</p>
                <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl text-primary">When did you actually finish?</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Report your actual completion time, then provide the agreed evidence.</p>
              </div>
              <div className="bg-secondary rounded-xl px-3.5 py-2.5">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Commitment</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{commitment.task}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Original deadline: {formatDeadline(commitment.deadline)}</p>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider">Completion time</label>
                <input type="time" value={graceActualTime} onChange={e => setGraceActualTime(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none text-foreground transition-colors" />
                <p className="text-xs text-muted-foreground">Approximate is fine. This becomes part of the record.</p>
              </div>
              {commitment.proofType !== "honor" && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider">{commitment.proofType === "link" ? "Proof link" : "Evidence"} <span className="font-normal normal-case text-muted-foreground">(as originally agreed)</span></label>
                  {commitment.proofType === "link" ? (
                    <>
                      <input type="url" value={graceProofLink} onChange={e => { setGraceProofLink(e.target.value); setGraceProofErr(""); }} placeholder="https://…" className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none text-foreground placeholder:text-muted-foreground transition-colors" />
                      {graceProofErr && <p className="text-xs font-semibold text-destructive">{graceProofErr}</p>}
                    </>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center space-y-1">
                      <p className="text-3xl">📸</p>
                      <p className="text-sm font-semibold text-foreground">Upload screenshot</p>
                      <p className="text-xs text-muted-foreground">Prototype: submitting without file is sufficient.</p>
                    </div>
                  )}
                </div>
              )}
              <div className="rounded-xl px-3.5 py-2.5" style={{ background: "rgba(41,72,61,0.04)", border: "1px solid rgba(41,72,61,0.1)" }}>
                <p className="text-xs text-muted-foreground italic" style={{ fontFamily: "monospace" }}>"Submitting does not guarantee your bounty will be returned."</p>
              </div>
              <div className="flex gap-3">
                <button onClick={submitGraceProof} className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-sm">Submit for review</button>
                <button onClick={() => setAppState("grace")} className="px-4 py-3.5 rounded-2xl bg-secondary text-muted-foreground text-sm font-bold hover:bg-border transition-colors">Back</button>
              </div>
            </div>
          </div>
        )}

        {/* ══ GRACE SUCCESS ════════════════════════════════════════════════ */}
        {appState === "grace-success" && commitment && (
          <div className="space-y-4" style={{ animation: "fadeInUp 0.55s cubic-bezier(0.22,1,0.36,1) both" }}>
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="relative">
                <img src={marimoTreatPaw} alt="Marimo" className="w-44 h-auto object-contain drop-shadow-md" />
                <span className="absolute -top-1 -right-1 text-2xl treat-pop" style={{ animationDelay: "0.15s" }}>✨</span>
                <span className="absolute top-4 -left-3 text-xl treat-pop" style={{ animationDelay: "0.35s" }}>🍡</span>
              </div>
            </div>
            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
              <div className="px-6 py-4 text-center" style={{ background: "rgba(41,72,61,0.04)", borderBottom: "1px solid rgba(41,72,61,0.1)" }}>
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-muted-foreground" style={{ fontFamily: "monospace" }}>Official Record · Marimo Inc.</p>
                <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl text-primary mt-1">Commitment upheld.</h2>
                <p className="text-sm text-muted-foreground mt-1 italic">"You were late to tell me. You were not late to finish. Acceptable."</p>
              </div>
              <div className="px-6 py-5 space-y-3">
                {[
                  { label: "Completed on time", value: "✓ Confirmed" },
                  { label: "Reported",          value: "Late" },
                  { label: "Final outcome",     value: "Completed", accent: true },
                  { label: "Bounty protected",  value: `$${commitment.bounty}`, accent: true },
                  { label: `→ ${futureFund.name}`, value: `+$${commitment.bounty}`, accent: true },
                  { label: "Treat disbursed",   value: `🍡 ${treats} total` },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-dashed border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    <span className={`text-sm font-bold ${"accent" in row && row.accent ? "text-accent" : "text-primary"}`}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="px-6 pb-6 space-y-2">
                <button onClick={startFresh} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-sm">Make another commitment</button>
                <div className="flex gap-2">
                  <Link to="/fund" className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors text-center">View fund →</Link>
                  <Link to="/record" className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors text-center">View record →</Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ SUCCESS ══════════════════════════════════════════════════════ */}
        {appState === "success" && commitment && (
          <div className="space-y-4" style={{ animation: "fadeInUp 0.55s cubic-bezier(0.22,1,0.36,1) both" }}>
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="relative">
                <img src={marimoTreatPaw} alt="Marimo" className="w-48 h-auto object-contain drop-shadow-md" />
                <span className="absolute -top-1 -right-1 text-2xl treat-pop" style={{ animationDelay: "0.15s" }}>✨</span>
                <span className="absolute top-4 -left-3 text-xl treat-pop" style={{ animationDelay: "0.35s" }}>🍡</span>
                <span className="absolute top-12 -right-4 text-lg treat-pop" style={{ animationDelay: "0.55s" }}>⭐</span>
              </div>
            </div>
            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
              <div className="px-6 py-4 text-center" style={{ background: "rgba(41,72,61,0.04)", borderBottom: "1px solid rgba(41,72,61,0.1)" }}>
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-muted-foreground" style={{ fontFamily: "monospace" }}>Official Record — Marimo Inc.</p>
                <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl text-primary mt-1">Commitment honored.</h2>
                <p className="text-sm text-muted-foreground mt-1 italic">"{successComment}"</p>
              </div>
              <div className="px-6 py-5 space-y-3">
                {[
                  { label: "Promise kept",         value: "✓", accent: false },
                  { label: "Bounty protected",     value: `$${commitment.bounty} secured`, accent: false },
                  { label: `→ ${futureFund.name}`, value: `+$${commitment.bounty}`, accent: true },
                  { label: "Streak",               value: streak >= 2 ? `${streak} in a row 🔥` : "Active", accent: false },
                  { label: "Treat disbursed",      value: `🍡 ${treats} total`, accent: false },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-dashed border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    <span className={`text-sm font-bold ${row.accent ? "text-accent" : "text-primary"}`}>{row.value}</span>
                  </div>
                ))}
              </div>
              {fundProgress !== null && (
                <div className="mx-6 mb-5 rounded-2xl p-4 space-y-3" style={{ background: "rgba(41,72,61,0.05)", border: "1.5px solid rgba(41,72,61,0.1)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">Future Fund</p>
                      <p className="text-base font-bold text-primary mt-0.5">{futureFund.name}</p>
                    </div>
                    <p className="text-xl font-bold text-accent">${bountiesKept}</p>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${fundProgress}%`, background: "#29483D" }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{Math.round(fundProgress)}% toward ${futureFund.target?.toLocaleString()}</p>
                </div>
              )}
              <div className="px-6 pb-6 space-y-2">
                <button onClick={startFresh} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-sm">Make another commitment</button>
                <div className="flex gap-2">
                  <Link to="/fund" className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors text-center">View fund →</Link>
                  <Link to="/record" className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors text-center">View record →</Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ FAILED ═══════════════════════════════════════════════════════ */}
        {appState === "failed" && commitment && (
          <div className="space-y-5" style={{ animation: "fadeInUp 0.55s cubic-bezier(0.22,1,0.36,1) both" }}>
            <div className="flex flex-col items-center gap-2 pt-3">
              <img src={marimoIdle} alt="Marimo" className="w-28 sm:w-36 h-auto object-contain" />
              <p className="text-[9px] font-bold tracking-[0.22em] uppercase" style={{ color: "#29483D", opacity: 0.38, fontFamily: "monospace" }}>Orbital Allocation Department · Marimo Inc.</p>
            </div>
            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
              <div className="px-6 py-4" style={{ background: "rgba(192,57,43,0.04)", borderBottom: "1px solid rgba(192,57,43,0.1)" }}>
                <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl text-primary">{disputeEligible ? "Reporting window closed." : "Deadline missed."}</h2>
                <p className="text-sm text-muted-foreground mt-1">{disputeEligible ? "The reporting window has closed. Your bounty has been claimed by Marimo." : "Completion was not submitted before the agreed time."}</p>
              </div>
              <div className="px-6 py-5 space-y-3">
                {[
                  { label: "Commitment",              value: commitment.task },
                  { label: "Deadline",                value: formatDeadline(commitment.deadline) },
                  { label: "Reporting window closed", value: formatDeadline(commitment.reportingDeadline) },
                  { label: "Bounty claimed",          value: `$${commitment.bounty} → Marimo`, red: true },
                  { label: "Streak",                  value: "Reset to 0" },
                  { label: "Allocated to",            value: orbitalDestination },
                ].map(row => (
                  <div key={row.label} className="flex items-start justify-between gap-4 py-1.5 border-b border-dashed border-border last:border-0">
                    <span className="text-sm text-muted-foreground flex-shrink-0">{row.label}</span>
                    <span className={`text-sm font-bold text-right leading-snug ${"red" in row && row.red ? "text-destructive" : "text-foreground"}`}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="px-6 py-2 mb-3 text-center" style={{ borderTop: "1px solid rgba(41,72,61,0.08)" }}>
                <p className="text-[9px] text-muted-foreground" style={{ fontFamily: "monospace" }}>Destinations shown are fictional and used for product simulation.</p>
              </div>
            </div>
            <div className="bg-card rounded-3xl border border-border shadow-sm p-5 sm:p-6 space-y-4">
              <div>
                <h3 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-xl text-primary">What made this difficult?</h3>
                <p className="text-xs text-muted-foreground mt-0.5">A smaller promise is still a real promise.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {([
                  { v: "too-large",            label: "Task was too large" },
                  { v: "unrealistic-deadline", label: "Deadline was unrealistic" },
                  { v: "forgot",               label: "I forgot" },
                  { v: "lost-motivation",      label: "Lost motivation" },
                  { v: "unexpected",           label: "Something unexpected came up" },
                  { v: "unclear-done",         label: "Unclear what counted as done" },
                  { v: "other",                label: "Other" },
                ] as { v: RecoveryReason; label: string }[]).map(opt => (
                  <button key={opt.v!} onClick={() => setRecoveryReason(r => r === opt.v ? null : opt.v)} className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all" style={{ background: recoveryReason === opt.v ? "rgba(41,72,61,0.09)" : "transparent", borderColor: recoveryReason === opt.v ? "rgba(41,72,61,0.28)" : "rgba(41,72,61,0.14)", color: recoveryReason === opt.v ? "#29483D" : "#5E7268" }}>{opt.label}</button>
                ))}
              </div>
              {recoveryReason && (
                <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(41,72,61,0.04)", border: "1px solid rgba(41,72,61,0.1)", animation: "fadeInUp 0.25s ease both" }}>
                  {recoveryReason === "too-large" && <p className="text-muted-foreground">Try breaking it into a single, clearly finishable section.</p>}
                  {recoveryReason === "unrealistic-deadline" && <p className="text-muted-foreground">Choose a deadline you'd bet on. Management supports improved forecasting.</p>}
                  {recoveryReason === "forgot" && <p className="text-muted-foreground">The objective remains available. Set a reminder for the next attempt.</p>}
                  {recoveryReason === "lost-motivation" && <p className="text-muted-foreground">Lower the bounty if needed — a smaller promise is still a real promise.</p>}
                  {recoveryReason === "unexpected" && <p className="text-muted-foreground">Management supports rescheduling due to genuine circumstances.</p>}
                  {recoveryReason === "unclear-done" && <p className="text-muted-foreground">Marimo cannot enforce vague outcomes. Define the exact deliverable next time.</p>}
                  {recoveryReason === "other" && <p className="text-muted-foreground">Revise the terms. Continue.</p>}
                </div>
              )}
              <div className="flex flex-col gap-2 pt-1">
                <button onClick={startFresh} className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-sm">Make it smaller and recommit</button>
                {disputeEligible && (
                  <button onClick={() => setAppState("dispute-form")} className="w-full py-3 rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors border border-border">Dispute this outcome →</button>
                )}
                <button onClick={startFresh} className="w-full py-2.5 rounded-2xl text-muted-foreground text-sm font-semibold hover:bg-secondary transition-colors">Return home</button>
              </div>
            </div>
          </div>
        )}

        {/* ══ DISPUTE FORM ═════════════════════════════════════════════════ */}
        {appState === "dispute-form" && commitment && (
          <div className="space-y-5" style={{ animation: "fadeInUp 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
            <div className="flex flex-col items-center gap-2 pt-2 pb-1">
              <img src={marimoLaptop} alt="Marimo" className="w-28 h-auto object-contain" />
              <p className="text-xs text-muted-foreground italic text-center max-w-[280px] leading-snug">"You may present your case. Marimo is listening."</p>
            </div>
            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
              <div className="px-6 py-4" style={{ background: "rgba(41,72,61,0.03)", borderBottom: "1px solid rgba(41,72,61,0.1)" }}>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1">Office of Appeals · Marimo Inc.</p>
                <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl text-primary">Dispute this outcome</h2>
                <p className="text-sm text-muted-foreground mt-0.5">If Marimo claimed your bounty incorrectly, you may submit an appeal.</p>
              </div>
              <div className="px-6 pt-5">
                <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFDF7", border: "1.5px solid rgba(41,72,61,0.14)" }}>
                  <div className="px-4 py-2.5" style={{ background: "rgba(41,72,61,0.03)", borderBottom: "1px solid rgba(41,72,61,0.08)" }}>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "monospace" }}>Original Commitment Terms</p>
                  </div>
                  <div className="px-4 py-4 space-y-2.5">
                    {[
                      { label: "Task",         value: commitment.task },
                      { label: "Deadline",     value: formatDeadline(commitment.deadline) },
                      { label: "Evidence req.", value: commitment.proofType === "honor" ? "Self-attestation" : commitment.proofType === "screenshot" ? "Screenshot" : "Link" },
                      { label: "Bounty",       value: `$${commitment.bounty}` },
                    ].map(row => (
                      <div key={row.label} className="flex items-start justify-between gap-4">
                        <span className="text-xs text-muted-foreground flex-shrink-0">{row.label}</span>
                        <span className="text-xs font-semibold text-foreground text-right leading-snug">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-6 pt-5 space-y-3">
                <div>
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider">Why are you disputing this outcome?</p>
                  <p className="text-xs text-muted-foreground mt-1">Changing your mind or simply missing the commitment is not grounds for an appeal.</p>
                </div>
                {([
                  { v: "late-report",   label: "I completed the task on time but reported it late",  sub: "Evidence of on-time completion required." },
                  { v: "has-evidence",  label: "I have evidence the task was completed on time",      sub: "A link, screenshot, or timestamp." },
                  { v: "circumstances", label: "An unexpected circumstance affected my commitment",   sub: "Marimo cannot verify circumstantial claims." },
                  { v: "technical",     label: "Something went wrong with the app",                   sub: "No app-side logs exist for this period." },
                ] as { v: DisputeReason; label: string; sub: string }[]).map(opt => (
                  <button key={opt.v!} onClick={() => setDisputeReason(r => r === opt.v ? null : opt.v)} className="w-full text-left flex items-start gap-3 p-4 rounded-2xl border-2 transition-all" style={{ background: disputeReason === opt.v ? "rgba(41,72,61,0.06)" : "transparent", borderColor: disputeReason === opt.v ? "rgba(41,72,61,0.28)" : "rgba(41,72,61,0.12)" }}>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground leading-snug">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 italic" style={{ fontFamily: "monospace" }}>{opt.sub}</p>
                    </div>
                    {disputeReason === opt.v && <span className="text-primary font-bold text-sm flex-shrink-0 mt-0.5">✓</span>}
                  </button>
                ))}
              </div>
              {(disputeReason === "late-report" || disputeReason === "has-evidence") && (
                <div className="px-6 pt-4 space-y-2" style={{ animation: "fadeInUp 0.22s ease both" }}>
                  {commitment.proofType === "link" ? (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-foreground uppercase tracking-wider">Proof link</label>
                      <input type="url" value={disputeProofLink} onChange={e => setDisputeProofLink(e.target.value)} placeholder="https://…" className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none text-foreground placeholder:text-muted-foreground transition-colors" />
                    </div>
                  ) : commitment.proofType === "screenshot" ? (
                    <div className="border-2 border-dashed border-border rounded-2xl p-5 text-center space-y-1">
                      <p className="text-2xl">📸</p>
                      <p className="text-sm font-semibold text-foreground">Upload screenshot evidence</p>
                      <p className="text-xs text-muted-foreground">Prototype: submitting is sufficient.</p>
                    </div>
                  ) : null}
                </div>
              )}
              {(disputeReason === "circumstances" || disputeReason === "technical") && (
                <div className="px-6 pt-4 space-y-1.5" style={{ animation: "fadeInUp 0.22s ease both" }}>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider">{disputeReason === "technical" ? "Describe what went wrong" : "What happened?"}</label>
                  <textarea value={disputeText} onChange={e => setDisputeText(e.target.value)} rows={3} placeholder="Provide as much detail as possible." className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none text-foreground placeholder:text-muted-foreground resize-none text-sm transition-colors" />
                </div>
              )}
              <div className="px-6 pt-4 pb-6 space-y-3">
                <div className="rounded-xl px-3.5 py-2.5" style={{ background: "rgba(41,72,61,0.04)", border: "1px solid rgba(41,72,61,0.1)" }}>
                  <p className="text-xs text-muted-foreground italic" style={{ fontFamily: "monospace" }}>"Submitting an appeal does not guarantee your bounty will be returned."</p>
                </div>
                <button onClick={submitDispute} disabled={!disputeReason} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-sm disabled:opacity-40 disabled:pointer-events-none">Submit appeal</button>
                <button onClick={() => setAppState("failed")} className="w-full py-2.5 rounded-2xl text-muted-foreground text-sm font-semibold hover:bg-secondary transition-colors flex items-center justify-center gap-1.5">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ DISPUTE APPROVED ═════════════════════════════════════════════ */}
        {appState === "dispute-approved" && commitment && (
          <div className="space-y-5" style={{ animation: "fadeInUp 0.55s cubic-bezier(0.22,1,0.36,1) both" }}>
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="relative">
                <img src={marimoTreatPaw} alt="Marimo" className="w-44 h-auto object-contain drop-shadow-md" />
                <span className="absolute -top-1 -right-1 text-2xl treat-pop" style={{ animationDelay: "0.15s" }}>✨</span>
              </div>
            </div>
            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
              <div className="px-6 py-4" style={{ background: "rgba(41,72,61,0.04)", borderBottom: "1px solid rgba(41,72,61,0.1)" }}>
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-muted-foreground mb-1" style={{ fontFamily: "monospace" }}>Office of Appeals · Marimo Inc.</p>
                <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl text-primary">Ruling overturned.</h2>
                <p className="text-sm text-muted-foreground mt-1 italic">"The evidence is annoyingly sufficient."</p>
              </div>
              <div className="px-6 py-5 space-y-3">
                {[
                  { label: "Original outcome", value: "Missed" },
                  { label: "Final outcome",    value: "Completed on time", accent: true },
                  { label: "Bounty returned",  value: `$${commitment.bounty}`, accent: true },
                  { label: `→ ${futureFund.name}`, value: `+$${commitment.bounty}`, accent: true },
                  { label: "Reason",           value: disputeReason === "late-report" ? "Completion reported late" : "Evidence of on-time completion" },
                  { label: "Treat disbursed",  value: `🍡 ${treats} total` },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-dashed border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    <span className={`text-sm font-bold ${"accent" in row && row.accent ? "text-accent" : "text-primary"}`}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="px-6 pb-6">
                <button onClick={startFresh} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-sm">Return to commitments</button>
              </div>
            </div>
          </div>
        )}

        {/* ══ DISPUTE DENIED ═══════════════════════════════════════════════ */}
        {appState === "dispute-denied" && commitment && (
          <div className="space-y-5" style={{ animation: "fadeInUp 0.55s cubic-bezier(0.22,1,0.36,1) both" }}>
            <div className="flex flex-col items-center gap-2 pt-3">
              <img src={marimoIdle} alt="Marimo" className="w-28 h-auto object-contain" />
            </div>
            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
              <div className="px-6 py-4" style={{ background: "rgba(192,57,43,0.04)", borderBottom: "1px solid rgba(192,57,43,0.1)" }}>
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-muted-foreground mb-1" style={{ fontFamily: "monospace" }}>Office of Appeals · Marimo Inc.</p>
                <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl text-primary">Ruling upheld.</h2>
                <p className="text-sm text-muted-foreground mt-1 italic">"Nice try."</p>
              </div>
              <div className="px-6 py-5 space-y-3">
                {[
                  { label: "Original outcome", value: "Missed" },
                  { label: "Final outcome",    value: "Missed", red: true },
                  { label: "Bounty",           value: `$${commitment.bounty} → Marimo`, red: true },
                  { label: "Reason",           value: disputeReason === "circumstances" ? "Management is sympathetic but unable to process circumstantial appeals." : "No verifiable technical incident was recorded." },
                ].map(row => (
                  <div key={row.label} className="flex items-start justify-between gap-4 py-1.5 border-b border-dashed border-border last:border-0">
                    <span className="text-sm text-muted-foreground flex-shrink-0">{row.label}</span>
                    <span className={`text-sm font-bold text-right leading-snug ${"red" in row && row.red ? "text-destructive" : "text-foreground"}`}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="mx-6 mb-5 rounded-xl px-4 py-3" style={{ background: "rgba(41,72,61,0.04)", border: "1px solid rgba(41,72,61,0.1)" }}>
                <p className="text-xs text-muted-foreground leading-snug">The original outcome remains unchanged. No further review is available for this commitment.</p>
              </div>
              <div className="px-6 pb-6">
                <button onClick={startFresh} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-sm">Return to commitments</button>
              </div>
            </div>
          </div>
        )}

        {/* ══ HISTORY ══════════════════════════════════════════════════════ */}
        {history.length > 0 && !["cinematic","accepting","reviewing","grace-reviewing","dispute-reviewing"].includes(appState) && (
          <div className="bg-card rounded-3xl border border-border shadow-sm p-5 sm:p-6 space-y-3 sm:space-y-4">
            <button onClick={() => setShowHistory(s => !s)} className="w-full flex items-center justify-between text-left">
              <div>
                <h3 className="text-base font-bold text-primary">Official Record <span className="text-muted-foreground font-normal">({history.length})</span></h3>
                {!showHistory && <p className="text-xs text-muted-foreground mt-0.5">{successCount} honored · {failedCount} missed{abandonedCount > 0 ? ` · ${abandonedCount} canceled` : ""} · {treats} 🍡</p>}
              </div>
              {showHistory ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showHistory && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: "Honored", value: successCount,        icon: "✅" },
                    { label: "Missed",  value: failedCount,         icon: "🚀" },
                    { label: "Kept",    value: `$${bountiesKept}`,  icon: "💰" },
                    { label: "Lost",    value: `$${bountiesYeeted}`,icon: "💸" },
                  ].map(stat => (
                    <div key={stat.label} className="bg-secondary rounded-2xl p-3 text-center">
                      <p className="text-xl leading-none">{stat.icon}</p>
                      <p className="text-base font-bold text-primary mt-1">{stat.value}</p>
                      <p className="text-[11px] text-muted-foreground font-semibold">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="divide-y divide-border">
                  {history.slice(0, 5).map(entry => (
                    <div key={entry.id} className="flex items-center justify-between py-3.5 gap-3 first:pt-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{entry.task}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(entry.completedAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide" style={{
                          background: entry.result === "success" || entry.result === "late-success" ? "rgba(41,72,61,0.08)" : entry.result === "failed" ? "rgba(192,57,43,0.08)" : "rgba(94,114,104,0.08)",
                          color:      entry.result === "success" || entry.result === "late-success" ? "#29483D" : entry.result === "failed" ? "#C0392B" : "#5E7268",
                        }}>
                          {entry.result === "success" ? "Honored" : entry.result === "late-success" ? "Upheld" : entry.result === "failed" ? "Missed" : "Canceled"}
                        </span>
                        <p className={`text-sm font-bold ${entry.result === "success" || entry.result === "late-success" ? "text-accent" : "text-destructive"}`}>
                          {entry.result === "success" || entry.result === "late-success" ? "+" : "−"}${entry.bounty}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {history.length > 5 && (
                  <Link to="/record" className="block text-center text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 pt-1">View all {history.length} records →</Link>
                )}
              </>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
