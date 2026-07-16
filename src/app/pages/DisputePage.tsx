import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeft, ChevronDown, ChevronUp, CheckSquare, Square, Paperclip } from "lucide-react";
import marimoAvatar from "../../imports/marimo-avatar.png";
import marimoIdle from "../../imports/marimo-idle.png";
import marimoLaptop from "../../imports/marimo-laptop.png";
import marimoTreatPaw from "../../imports/marimo-treat-paw.png";

import {
  type HistoryEntry, type DisputeCase, type AllocationDisputeReason, type DisputeStatus,
  type FutureFund,
  LS, DEFAULT_FUND,
  loadLS, saveLS,
  formatDate, formatDeadline, formatTime, generateCaseNumber,
} from "../lib";

// ── Status display helpers ──────────────────────────────────────────────────

const STATUS_META: Record<DisputeStatus, { icon: string; label: string; color: string; bg: string }> = {
  "filed":        { icon: "📋", label: "Dispute filed",              color: "#5E7268", bg: "rgba(94,114,104,0.08)" },
  "info-needed":  { icon: "🔔", label: "Information needed",         color: "#E5A93D", bg: "rgba(229,169,61,0.1)"  },
  "under-review": { icon: "🔍", label: "Under review",               color: "#29483D", bg: "rgba(41,72,61,0.08)"  },
  "approved":     { icon: "✅", label: "Allocation reversed",        color: "#29483D", bg: "rgba(41,72,61,0.08)"  },
  "denied":       { icon: "❌", label: "Dispute denied",             color: "#C0392B", bg: "rgba(192,57,43,0.08)" },
  "appealed":     { icon: "⚖️", label: "Appealed",                   color: "#5E7268", bg: "rgba(94,114,104,0.08)" },
  "final":        { icon: "🏛️", label: "Final decision",             color: "#5E7268", bg: "rgba(94,114,104,0.08)" },
};

const REASON_LABELS: Record<AllocationDisputeReason, string> = {
  "late-report":    "Task completed before deadline but reported late",
  "technical":      "Technical problem prevented submission",
  "emergency":      "Emergency or unavoidable interruption",
  "wrong-deadline": "Deadline or time zone recorded incorrectly",
  "wrong-bounty":   "Bounty charged or allocated incorrectly",
  "other":          "Something else happened",
};

function StatusBadge({ status }: { status: DisputeStatus }) {
  const m = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: m.bg, color: m.color }}>
      <span>{m.icon}</span>{m.label}
    </span>
  );
}

// ── Determine follow-up question ────────────────────────────────────────────

function getFollowUp(reason: AllocationDisputeReason, expl: Record<string, string>): string | null {
  switch (reason) {
    case "late-report":
      if (!expl.completionTime) return "Approximately what time did you complete the task?";
      if (!expl.prevented) return "What prevented you from reporting before the deadline closed?";
      return null;
    case "technical":
      if (!expl.whatHappenedTech) return "What happened when you attempted to submit your completion?";
      if (!expl.whenOccurred) return "Approximately when did the technical problem occur?";
      return null;
    case "emergency":
      if (!expl.beforeAfter) return "Did the interruption happen before or after completing the task?";
      return null;
    case "wrong-deadline":
      if (!expl.expectedDeadline) return "What deadline did you expect based on how you set up the commitment?";
      return null;
    case "wrong-bounty":
      if (!expl.expectedAmount) return "What amount did you expect to be the bounty?";
      if (!expl.chargedMore) return "Were you charged or allocated more than once?";
      return null;
    case "other":
      if (!expl.whatWrong || expl.whatWrong.length < 20) return "What part of the decision was incorrect, and what should the correct outcome have been?";
      return null;
  }
}

// ── Case view (dispute already filed) ──────────────────────────────────────

function CaseView({ entry, dispute, onUpdate }: {
  entry: HistoryEntry;
  dispute: DisputeCase;
  onUpdate: (d: DisputeCase, e?: Partial<HistoryEntry>) => void;
}) {
  const [showDemo, setShowDemo]       = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [followUpAnswer, setFollowUpAnswer] = useState(dispute.followUpAnswer ?? "");
  const [appealText, setAppealText]   = useState(dispute.appealText ?? "");
  const [appealEv, setAppealEv]       = useState(dispute.appealEvidence ?? "");
  const [showAppeal, setShowAppeal]   = useState(false);
  const futureFund = loadLS<FutureFund>(LS.fund, DEFAULT_FUND);
  const navigate = useNavigate();

  const applyDemo = (status: DisputeStatus) => {
    if (status === "approved") {
      const updated: DisputeCase = { ...dispute, status: "approved", reviewedAt: new Date().toISOString(), decisionReason: "The explanation provided a complete, consistent, and plausible account. Administrative correction issued." };
      const entryUpdate: Partial<HistoryEntry> = { reversal: { amount: entry.bounty, at: new Date().toISOString(), fundName: futureFund.name || "Future Fund" } };
      onUpdate(updated, entryUpdate);
    } else if (status === "denied") {
      const updated: DisputeCase = { ...dispute, status: "denied", reviewedAt: new Date().toISOString(), decisionReason: "The information provided did not establish that the task was completed before the deadline." };
      onUpdate(updated);
    } else if (status === "info-needed") {
      const fq = getFollowUp(dispute.reason, dispute.explanation) ?? "Please provide additional clarification about your timeline.";
      const updated: DisputeCase = { ...dispute, status: "info-needed", followUpQuestion: fq };
      onUpdate(updated);
    }
    setShowDemo(false);
  };

  const submitFollowUp = () => {
    if (!followUpAnswer.trim()) return;
    const updated: DisputeCase = { ...dispute, followUpAnswer, status: "under-review" };
    onUpdate(updated);
  };

  const submitAppeal = () => {
    if (!appealText.trim()) return;
    const updated: DisputeCase = { ...dispute, appealText, appealEvidence: appealEv, status: "appealed" };
    onUpdate(updated);
    setShowAppeal(false);
  };

  const applyFinalAppeal = (outcome: "approved" | "final-denied") => {
    if (outcome === "approved") {
      const updated: DisputeCase = { ...dispute, status: "approved", appealStatus: "approved", reviewedAt: new Date().toISOString(), decisionReason: "Final appeal approved. New information considered. Administrative correction issued." };
      const entryUpdate: Partial<HistoryEntry> = { reversal: { amount: entry.bounty, at: new Date().toISOString(), fundName: futureFund.name || "Future Fund" } };
      onUpdate(updated, entryUpdate);
    } else {
      const updated: DisputeCase = { ...dispute, status: "final", appealStatus: "final-denied", reviewedAt: new Date().toISOString(), decisionReason: "Final decision: original allocation upheld. No further review available." };
      onUpdate(updated);
    }
    setShowDemo(false);
  };

  const sm = STATUS_META[dispute.status];

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Nunito Sans', system-ui, sans-serif" }}>
      <header className="sticky top-0 z-20 bg-card border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={marimoAvatar} alt="Marimo" className="w-9 h-9 rounded-full object-cover ring-2 ring-secondary" />
            <div className="leading-none">
              <p className="text-base font-bold text-primary">Marimo</p>
              <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase">Office of Commitment Compliance</p>
            </div>
          </div>
          <Link to="/record" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Official Records
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-5 py-6 sm:py-8 space-y-4">

        {/* Case header */}
        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 space-y-2" style={{ background: "rgba(41,72,61,0.03)", borderBottom: "1px solid rgba(41,72,61,0.1)" }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-muted-foreground" style={{ fontFamily: "monospace" }}>Case {dispute.caseNumber} · Marimo Compliance</p>
                <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl text-primary mt-0.5">Dispute Review</h1>
              </div>
              <StatusBadge status={dispute.status} />
            </div>
            <p className="text-xs text-muted-foreground">Filed {formatDate(dispute.filedAt)}</p>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Original decision */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFDF7", border: "1.5px solid rgba(41,72,61,0.14)" }}>
              <div className="px-4 py-2.5" style={{ background: "rgba(41,72,61,0.03)", borderBottom: "1px solid rgba(41,72,61,0.08)" }}>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "monospace" }}>Original Allocation</p>
              </div>
              <div className="px-4 py-4 space-y-2">
                {[
                  { l: "Task",         v: entry.task },
                  { l: "Deadline",     v: formatDeadline(entry.deadline) },
                  { l: "Outcome",      v: "Not completed" },
                  { l: "Bounty",       v: `$${entry.bounty}` },
                  { l: "Allocated to", v: entry.allocationDestination ?? "Marimo Inc." },
                  { l: "Filed",        v: formatDate(dispute.filedAt) },
                ].map(row => (
                  <div key={row.l} className="flex items-start justify-between gap-4">
                    <span className="text-xs text-muted-foreground flex-shrink-0">{row.l}</span>
                    <span className="text-xs font-semibold text-foreground text-right leading-snug">{row.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dispute reason */}
            <div className="rounded-xl px-4 py-3" style={{ background: "rgba(41,72,61,0.04)", border: "1px solid rgba(41,72,61,0.1)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Reason for dispute</p>
              <p className="text-sm font-semibold text-foreground">{REASON_LABELS[dispute.reason]}</p>
            </div>
          </div>
        </div>

        {/* Info needed alert */}
        {dispute.status === "info-needed" && dispute.followUpQuestion && !dispute.followUpAnswer && (
          <div className="bg-card rounded-3xl border-2 border-accent/40 shadow-sm p-6 space-y-4" style={{ animation: "fadeInUp 0.3s ease both" }}>
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">🔔</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Marimo Compliance requires additional testimony</p>
                <p className="text-sm font-bold text-foreground leading-snug">{dispute.followUpQuestion}</p>
              </div>
            </div>
            <textarea
              value={followUpAnswer}
              onChange={e => setFollowUpAnswer(e.target.value)}
              placeholder="Provide your answer here…"
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground transition-colors"
            />
            <button onClick={submitFollowUp} disabled={!followUpAnswer.trim()} className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all disabled:opacity-40 disabled:pointer-events-none">Submit testimony</button>
          </div>
        )}

        {/* Under review */}
        {dispute.status === "under-review" && (
          <div className="bg-card rounded-3xl border border-border shadow-sm p-6 text-center space-y-3" style={{ animation: "fadeInUp 0.3s ease both" }}>
            <img src={marimoLaptop} alt="Marimo" className="w-24 h-auto object-contain mx-auto" />
            <div>
              <p className="font-bold text-primary" style={{ fontFamily: "'DM Serif Display', serif" }}>Under review</p>
              <p className="text-sm text-muted-foreground mt-1 leading-snug">Marimo Compliance has received your testimony and is reviewing the case. Your original allocation remains visible while the case is open.</p>
            </div>
          </div>
        )}

        {/* Approved outcome */}
        {(dispute.status === "approved" || dispute.appealStatus === "approved") && entry.reversal && (
          <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden" style={{ animation: "fadeInUp 0.4s ease both" }}>
            <div className="px-6 py-4" style={{ background: "rgba(41,72,61,0.04)", borderBottom: "1px solid rgba(41,72,61,0.1)" }}>
              <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl text-primary">Allocation reversed</h2>
              <p className="text-sm text-muted-foreground mt-0.5 italic">"Administrative correction issued. Do not make this a habit."</p>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-foreground leading-relaxed">The review supports that your commitment was completed before the deadline. <strong>${entry.bounty}</strong> has been restored to your {entry.reversal.fundName}.</p>
              {dispute.decisionReason && (
                <div className="rounded-xl px-4 py-3" style={{ background: "rgba(41,72,61,0.04)", border: "1px solid rgba(41,72,61,0.1)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Decision reasoning</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{dispute.decisionReason}</p>
                </div>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <Link to="/record" className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-center hover:opacity-90 transition-all shadow-sm">View updated record</Link>
              <Link to="/" className="px-5 py-3.5 rounded-2xl bg-secondary text-muted-foreground font-bold hover:bg-border transition-colors">Home</Link>
            </div>
          </div>
        )}

        {/* Denied outcome */}
        {(dispute.status === "denied" || dispute.status === "final") && (
          <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden" style={{ animation: "fadeInUp 0.4s ease both" }}>
            <div className="px-6 py-4" style={{ background: "rgba(192,57,43,0.04)", borderBottom: "1px solid rgba(192,57,43,0.1)" }}>
              <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl text-primary">
                {dispute.status === "final" ? "Final decision: original allocation upheld" : "Original allocation upheld"}
              </h2>
            </div>
            <div className="px-6 py-5 space-y-3">
              {dispute.decisionReason && (
                <p className="text-sm text-muted-foreground leading-relaxed">{dispute.decisionReason}</p>
              )}
              {dispute.status === "denied" && !showAppeal && (
                <div className="rounded-xl px-4 py-3" style={{ background: "rgba(41,72,61,0.04)", border: "1px solid rgba(41,72,61,0.1)" }}>
                  <p className="text-xs text-muted-foreground leading-snug">If you have new or corrected information that was not included in the original dispute, you may submit one final appeal.</p>
                </div>
              )}
            </div>
            {dispute.status === "denied" && (
              <div className="px-6 pb-6 flex flex-col gap-2">
                <button onClick={() => setShowAppeal(s => !s)} className="w-full py-3.5 rounded-2xl border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors">
                  {showAppeal ? "Cancel" : "Submit final appeal"}
                </button>
                {showAppeal && (
                  <div className="space-y-3 mt-1" style={{ animation: "fadeInUp 0.2s ease both" }}>
                    <div className="rounded-xl px-4 py-3" style={{ background: "rgba(229,169,61,0.06)", border: "1px solid rgba(229,169,61,0.2)" }}>
                      <p className="text-xs font-semibold text-foreground italic">"A final appeal must include new or corrected information."</p>
                    </div>
                    <textarea
                      value={appealText}
                      onChange={e => setAppealText(e.target.value)}
                      placeholder="What new or corrected information should be considered?"
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground transition-colors"
                    />
                    <input
                      type="url"
                      value={appealEv}
                      onChange={e => setAppealEv(e.target.value)}
                      placeholder="Additional evidence link (optional)"
                      className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none text-foreground placeholder:text-muted-foreground text-sm transition-colors"
                    />
                    <button onClick={submitAppeal} disabled={!appealText.trim()} className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all disabled:opacity-40 disabled:pointer-events-none">Submit final appeal</button>
                  </div>
                )}
                <Link to="/record" className="w-full py-2.5 rounded-2xl text-center text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors">Return to records</Link>
              </div>
            )}
            {dispute.status === "final" && (
              <div className="px-6 pb-6">
                <p className="text-xs text-muted-foreground text-center mb-3">No further review is available for this commitment.</p>
                <Link to="/record" className="block w-full py-3.5 rounded-2xl bg-secondary text-center text-sm font-semibold text-muted-foreground hover:bg-border transition-colors">Return to records</Link>
              </div>
            )}
          </div>
        )}

        {/* Appealed */}
        {dispute.status === "appealed" && (
          <div className="bg-card rounded-3xl border border-border shadow-sm p-6 text-center space-y-3">
            <img src={marimoLaptop} alt="Marimo" className="w-24 h-auto object-contain mx-auto" />
            <p className="font-bold text-primary" style={{ fontFamily: "'DM Serif Display', serif" }}>Final appeal under review</p>
            <p className="text-sm text-muted-foreground leading-snug">Marimo Compliance is considering the new information. This is the final round of review.</p>
          </div>
        )}

        {/* Explanation summary */}
        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
          <button onClick={() => setShowTimeline(s => !s)} className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-secondary/50 transition-colors">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">Official case file</p>
              <p className="text-base font-bold text-primary mt-0.5">Your statement &amp; timeline</p>
            </div>
            {showTimeline ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showTimeline && (
            <div className="px-6 pb-6 space-y-4 border-t border-border pt-4">
              {Object.entries(dispute.explanation).map(([k, v]) => {
                const labels: Record<string, string> = {
                  whatHappened: "What happened", whyReverse: "Why the allocation should be reversed",
                  correction: "Requested correction", completionTime: "Completion time",
                  reportAttempt: "Report attempt time", prevented: "What prevented reporting",
                  whatHappenedTech: "Technical issue", whenOccurred: "When it occurred",
                  device: "Device / browser", beforeAfter: "Interruption timing",
                  affected: "How it affected the task", expectedDeadline: "Expected deadline",
                  displayedDeadline: "App-displayed deadline", timezone: "Time zone",
                  expectedAmount: "Expected bounty amount", actualAmount: "Allocated amount",
                  chargedMore: "Charged more than once", whatWrong: "What was incorrect",
                  correctOutcome: "What the correct outcome should be",
                };
                return (
                  <div key={k}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{labels[k] ?? k}</p>
                    <p className="text-sm text-foreground leading-snug">{v}</p>
                  </div>
                );
              })}
              {dispute.evidence && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Evidence</p>
                  <p className="text-sm text-foreground break-all">{dispute.evidence}</p>
                </div>
              )}
              {dispute.followUpQuestion && (
                <div className="rounded-xl px-4 py-3" style={{ background: "rgba(229,169,61,0.06)", border: "1px solid rgba(229,169,61,0.14)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Follow-up question</p>
                  <p className="text-xs italic text-foreground">{dispute.followUpQuestion}</p>
                  {dispute.followUpAnswer && (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-2 mb-1">Your answer</p>
                      <p className="text-xs text-foreground">{dispute.followUpAnswer}</p>
                    </>
                  )}
                </div>
              )}
              {dispute.appealText && (
                <div className="rounded-xl px-4 py-3" style={{ background: "rgba(41,72,61,0.04)", border: "1px solid rgba(41,72,61,0.1)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Final appeal statement</p>
                  <p className="text-xs text-foreground leading-relaxed">{dispute.appealText}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Demo controls */}
        {["filed", "info-needed", "under-review", "appealed"].includes(dispute.status) && (
          <div className="rounded-2xl border border-dashed border-border p-4 space-y-3">
            <button onClick={() => setShowDemo(s => !s)} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              🧪 Demo controls {showDemo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showDemo && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Simulate a compliance decision:</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => applyDemo("info-needed")} className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-semibold text-foreground hover:bg-border transition-colors">Request information</button>
                  <button onClick={() => applyDemo("approved")} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors" style={{ background: "rgba(41,72,61,0.08)", color: "#29483D", border: "1px solid rgba(41,72,61,0.2)" }}>Approve dispute</button>
                  <button onClick={() => applyDemo("denied")} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors" style={{ background: "rgba(192,57,43,0.08)", color: "#C0392B", border: "1px solid rgba(192,57,43,0.2)" }}>Deny dispute</button>
                </div>
              </div>
            )}
          </div>
        )}

        {dispute.status === "appealed" && (
          <div className="rounded-2xl border border-dashed border-border p-4 space-y-3">
            <button onClick={() => setShowDemo(s => !s)} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              🧪 Demo controls (final appeal) {showDemo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showDemo && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Simulate final appeal outcome:</p>
                <div className="flex gap-2">
                  <button onClick={() => applyFinalAppeal("approved")} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "rgba(41,72,61,0.08)", color: "#29483D", border: "1px solid rgba(41,72,61,0.2)" }}>Approve final appeal</button>
                  <button onClick={() => applyFinalAppeal("final-denied")} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "rgba(192,57,43,0.08)", color: "#C0392B", border: "1px solid rgba(192,57,43,0.2)" }}>Uphold original decision</button>
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

// ── Filing flow ─────────────────────────────────────────────────────────────

const PROCESSING_STEPS = [
  "Reviewing your statement…",
  "Comparing the official timeline…",
  "Checking for missing information…",
  "Consulting Marimo Compliance…",
];

function FilingFlow({ entry, onSubmit }: {
  entry: HistoryEntry;
  onSubmit: (d: DisputeCase) => void;
}) {
  const navigate = useNavigate();
  const [step, setStep]                 = useState(0);
  const [reason, setReason]             = useState<AllocationDisputeReason | null>(null);
  const [expl, setExpl]                 = useState<Record<string, string>>({});
  const [evidence, setEvidence]         = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [processingIdx, setProcessingIdx] = useState(0);
  const [followUpQ, setFollowUpQ]       = useState<string | null>(null);
  const [followUpA, setFollowUpA]       = useState("");
  const [followUpDone, setFollowUpDone] = useState(false);
  const [confirmed, setConfirmed]       = useState(false);

  const field = (k: string, placeholder: string, rows?: number) => (
    <div className="space-y-1.5">
      <input
        type="text"
        value={expl[k] ?? ""}
        onChange={e => setExpl(p => ({ ...p, [k]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none text-sm text-foreground placeholder:text-muted-foreground transition-colors"
      />
    </div>
  );

  const textarea = (k: string, placeholder: string, required = false) => (
    <div className="space-y-1.5">
      <textarea
        value={expl[k] ?? ""}
        onChange={e => setExpl(p => ({ ...p, [k]: e.target.value }))}
        placeholder={placeholder}
        rows={3}
        className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground transition-colors"
      />
    </div>
  );

  // Processing animation
  useEffect(() => {
    if (step !== 4) return;
    let i = 0;
    const advance = () => {
      i++;
      if (i < PROCESSING_STEPS.length) {
        setProcessingIdx(i);
        setTimeout(advance, 900 + Math.random() * 400);
      } else {
        setTimeout(() => {
          const fq = reason ? getFollowUp(reason, expl) : null;
          setFollowUpQ(fq);
          if (!fq) setStep(5);
        }, 700);
      }
    };
    setTimeout(advance, 900);
    return () => {};
  }, [step]);

  const baseFields = (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">What happened? <span className="text-destructive">*</span></label>
        {textarea("whatHappened", "Describe what occurred…", true)}
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Why should the allocation be reversed?</label>
        {textarea("whyReverse", "Explain why this was an error…")}
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">What correction are you requesting?</label>
        {field("correction", "e.g. Restore $25 to my Future Fund")}
      </div>
    </div>
  );

  const reasonFields: Record<AllocationDisputeReason, React.ReactNode> = {
    "late-report": (
      <div className="space-y-3 mt-3 pt-3 border-t border-dashed border-border">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Late-report details</p>
        {field("completionTime", "Approximately when did you complete the task?")}
        {field("reportAttempt", "When did you attempt to report it?")}
        {field("prevented", "What prevented you from reporting before the deadline?")}
      </div>
    ),
    "technical": (
      <div className="space-y-3 mt-3 pt-3 border-t border-dashed border-border">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Technical details</p>
        {field("whatHappenedTech", "What happened when you tried to submit?")}
        {field("whenOccurred", "Approximately when did the problem occur?")}
        {field("device", "What device or browser were you using?")}
      </div>
    ),
    "emergency": (
      <div className="space-y-3 mt-3 pt-3 border-t border-dashed border-border">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Interruption details</p>
        {field("beforeAfter", "Did the interruption happen before or after completing the task?")}
        {field("affected", "How did it affect your ability to complete or report?")}
        <p className="text-[10px] text-muted-foreground italic">Personal or medical documentation is not required.</p>
      </div>
    ),
    "wrong-deadline": (
      <div className="space-y-3 mt-3 pt-3 border-t border-dashed border-border">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deadline details</p>
        {field("expectedDeadline", "What deadline did you expect?")}
        {field("displayedDeadline", "What deadline did the app display?")}
        {field("timezone", "What time zone were you using?")}
      </div>
    ),
    "wrong-bounty": (
      <div className="space-y-3 mt-3 pt-3 border-t border-dashed border-border">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bounty details</p>
        {field("expectedAmount", "What amount did you expect?")}
        {field("actualAmount", "What amount was actually allocated?")}
        {field("chargedMore", "Were you charged or allocated more than once? (yes/no)")}
      </div>
    ),
    "other": (
      <div className="space-y-3 mt-3 pt-3 border-t border-dashed border-border">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Additional details</p>
        {field("whatWrong", "What part of the decision was incorrect?")}
        {field("correctOutcome", "What should the correct outcome have been?")}
      </div>
    ),
  };

  const submit = () => {
    if (!reason || !confirmed) return;
    const caseNumber = generateCaseNumber();
    const dispute: DisputeCase = {
      id: `dispute-${Date.now()}`,
      entryId: entry.id,
      caseNumber,
      filedAt: new Date().toISOString(),
      reason,
      explanation: expl,
      evidence: evidence || evidenceNote,
      followUpQuestion: followUpQ ?? undefined,
      followUpAnswer: followUpA || undefined,
      confirmed: true,
      status: "filed",
    };
    onSubmit(dispute);
    setStep(6);
  };

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Nunito Sans', system-ui, sans-serif" }}>
      <header className="sticky top-0 z-20 bg-card border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={marimoAvatar} alt="Marimo" className="w-9 h-9 rounded-full object-cover ring-2 ring-secondary" />
            <div className="leading-none">
              <p className="text-base font-bold text-primary">Marimo</p>
              <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase">Office of Commitment Compliance</p>
            </div>
          </div>
          {step < 6 && (
            <button
              onClick={() => step === 0 ? navigate("/record") : setStep(s => s - 1)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {step === 0 ? "Records" : "Back"}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-5 py-6 sm:py-8 space-y-4">

        {/* Step 0: Review decision */}
        {step === 0 && (
          <div className="space-y-4" style={{ animation: "fadeInUp 0.3s ease both" }}>
            <div className="px-1">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-0.5">Office of Appeals · Step 1 of 7</p>
              <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl text-primary">Review the decision</h1>
              <p className="text-sm text-muted-foreground mt-1">If this record does not accurately reflect what happened, you may request a review.</p>
            </div>
            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4" style={{ background: "rgba(192,57,43,0.04)", borderBottom: "1px solid rgba(192,57,43,0.1)" }}>
                <p className="text-sm text-foreground font-semibold">Marimo allocated <strong>${entry.bounty}</strong> after no completion was recorded by {formatDeadline(entry.deadline)}.</p>
              </div>
              <div className="px-5 py-4 space-y-2.5">
                {[
                  { l: "Task",           v: entry.task },
                  { l: "Deadline",       v: formatDeadline(entry.deadline) },
                  { l: "Recorded completion", v: "Not recorded" },
                  { l: "Bounty",         v: `$${entry.bounty}` },
                  { l: "Allocated to",   v: entry.allocationDestination ?? "Marimo Inc." },
                  { l: "Reason",         v: "No completion report received before deadline." },
                ].map(row => (
                  <div key={row.l} className="flex items-start justify-between gap-4">
                    <span className="text-xs text-muted-foreground flex-shrink-0">{row.l}</span>
                    <span className="text-xs font-semibold text-foreground text-right leading-snug">{row.v}</span>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-5 flex flex-col gap-2">
                <button onClick={() => setStep(1)} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-sm">Start dispute</button>
                <Link to="/record" className="w-full py-2.5 rounded-2xl text-center text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors">Return to records</Link>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Reason selection */}
        {step === 1 && (
          <div className="space-y-4" style={{ animation: "fadeInUp 0.3s ease both" }}>
            <div className="px-1">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-0.5">Office of Appeals · Step 2 of 7</p>
              <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl text-primary">What went wrong?</h1>
              <p className="text-sm text-muted-foreground mt-1">Select the reason that best describes the issue.</p>
            </div>
            <div className="bg-card rounded-3xl border border-border shadow-sm p-5 space-y-2">
              {([
                { v: "late-report",    label: "I completed the task before the deadline but reported it late" },
                { v: "technical",     label: "A technical problem prevented me from submitting" },
                { v: "emergency",     label: "An emergency or unavoidable interruption occurred" },
                { v: "wrong-deadline",label: "The deadline or time zone was recorded incorrectly" },
                { v: "wrong-bounty",  label: "The bounty was charged or allocated incorrectly" },
                { v: "other",         label: "Something else happened" },
              ] as { v: AllocationDisputeReason; label: string }[]).map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setReason(opt.v)}
                  className="w-full text-left flex items-center gap-3 p-4 rounded-2xl border-2 transition-all"
                  style={{ background: reason === opt.v ? "rgba(41,72,61,0.06)" : "transparent", borderColor: reason === opt.v ? "rgba(41,72,61,0.28)" : "rgba(41,72,61,0.12)" }}
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground leading-snug">{opt.label}</p>
                  </div>
                  {reason === opt.v && <span className="text-primary font-bold text-sm flex-shrink-0">✓</span>}
                </button>
              ))}
              <button onClick={() => { if (reason) setStep(2); }} disabled={!reason} className="w-full mt-2 py-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-sm disabled:opacity-40 disabled:pointer-events-none">Continue →</button>
            </div>
          </div>
        )}

        {/* Step 2: Explain */}
        {step === 2 && reason && (
          <div className="space-y-4" style={{ animation: "fadeInUp 0.3s ease both" }}>
            <div className="px-1">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-0.5">Office of Appeals · Step 3 of 7</p>
              <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl text-primary">Explain what happened</h1>
              <p className="text-sm text-muted-foreground mt-1">Provide a brief, structured timeline. Concise but complete.</p>
            </div>
            <div className="bg-card rounded-3xl border border-border shadow-sm p-5 space-y-4">
              <div className="rounded-xl px-3.5 py-2.5" style={{ background: "rgba(41,72,61,0.04)", border: "1px solid rgba(41,72,61,0.1)" }}>
                <p className="text-xs text-muted-foreground font-semibold">{REASON_LABELS[reason]}</p>
              </div>
              {baseFields}
              {reasonFields[reason]}
              <button onClick={() => { if (expl.whatHappened?.trim()) setStep(3); }} disabled={!expl.whatHappened?.trim()} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-sm disabled:opacity-40 disabled:pointer-events-none">Continue →</button>
            </div>
          </div>
        )}

        {/* Step 3: Evidence */}
        {step === 3 && (
          <div className="space-y-4" style={{ animation: "fadeInUp 0.3s ease both" }}>
            <div className="px-1">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-0.5">Office of Appeals · Step 4 of 7</p>
              <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl text-primary">Supporting evidence</h1>
              <p className="text-sm text-muted-foreground mt-1">Evidence can help, but it is not required for every type of commitment.</p>
            </div>
            <div className="bg-card rounded-3xl border border-border shadow-sm p-5 space-y-4">
              <div className="rounded-xl px-4 py-3" style={{ background: "rgba(41,72,61,0.04)", border: "1px solid rgba(41,72,61,0.1)" }}>
                <p className="text-xs text-muted-foreground italic">Do not include sensitive personal or medical documentation. Marimo Compliance does not require it.</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Link to evidence <span className="font-normal normal-case">(optional)</span></label>
                  <input
                    type="url"
                    value={evidence}
                    onChange={e => setEvidence(e.target.value)}
                    placeholder="Screenshot URL, document, or timestamp link"
                    className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none text-sm text-foreground placeholder:text-muted-foreground transition-colors"
                  />
                </div>
                <div className="border-2 border-dashed border-border rounded-2xl p-5 text-center space-y-1.5">
                  <Paperclip className="w-5 h-5 text-muted-foreground mx-auto" />
                  <p className="text-sm font-semibold text-foreground">Attach a file</p>
                  <p className="text-xs text-muted-foreground">Screenshot, image, or document. Prototype: upload UI is simulated.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Additional note <span className="font-normal normal-case">(optional)</span></label>
                  <textarea
                    value={evidenceNote}
                    onChange={e => setEvidenceNote(e.target.value)}
                    placeholder="Any other supporting information…"
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground transition-colors"
                  />
                </div>
              </div>
              <button onClick={() => setStep(4)} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-sm">Continue →</button>
              <button onClick={() => setStep(4)} className="w-full py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary rounded-2xl transition-colors">Skip — no evidence to submit</button>
            </div>
          </div>
        )}

        {/* Step 4: Processing animation + follow-up */}
        {step === 4 && (
          <div className="space-y-4" style={{ animation: "fadeInUp 0.3s ease both" }}>
            <div className="px-1">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-0.5">Office of Appeals · Step 5 of 7</p>
              <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl text-primary">Automated review</h1>
            </div>
            <div className="bg-card rounded-3xl border border-border shadow-sm p-6 space-y-5">
              <div className="flex flex-col items-center gap-3 py-2">
                <img src={marimoLaptop} alt="Marimo" className="w-24 h-auto object-contain" />
                <p className="text-xs text-muted-foreground italic text-center">"Marimo Compliance is reviewing your statement."</p>
              </div>
              <div className="space-y-2.5">
                {PROCESSING_STEPS.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 transition-opacity duration-500" style={{ opacity: i <= processingIdx ? 1 : 0.25 }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: i < processingIdx ? "rgba(41,72,61,0.12)" : i === processingIdx ? "rgba(41,72,61,0.15)" : "rgba(41,72,61,0.05)" }}>
                      {i < processingIdx ? <span className="text-[9px] font-bold text-primary">✓</span> : <span className="text-[9px] font-bold text-muted-foreground">{i + 1}</span>}
                    </div>
                    <p className="text-sm font-semibold text-foreground">{s}</p>
                  </div>
                ))}
              </div>
              {/* Follow-up question appears after animation */}
              {processingIdx >= PROCESSING_STEPS.length - 1 && followUpQ && !followUpDone && (
                <div className="space-y-3 pt-2 border-t border-dashed border-border" style={{ animation: "fadeInUp 0.3s ease both" }}>
                  <div className="rounded-xl px-4 py-3" style={{ background: "rgba(229,169,61,0.06)", border: "1px solid rgba(229,169,61,0.2)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Follow-up question</p>
                    <p className="text-sm font-semibold text-foreground">{followUpQ}</p>
                  </div>
                  <textarea
                    value={followUpA}
                    onChange={e => setFollowUpA(e.target.value)}
                    placeholder="Your answer…"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground transition-colors"
                  />
                  <button
                    onClick={() => { setFollowUpDone(true); setStep(5); }}
                    className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-sm"
                  >
                    Continue →
                  </button>
                  <button
                    onClick={() => { setFollowUpDone(true); setStep(5); }}
                    className="w-full py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary rounded-2xl transition-colors"
                  >
                    Skip this question
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Review & confirm */}
        {step === 5 && reason && (
          <div className="space-y-4" style={{ animation: "fadeInUp 0.3s ease both" }}>
            <div className="px-1">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-0.5">Office of Appeals · Step 6 of 7</p>
              <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl text-primary">Review &amp; confirm</h1>
              <p className="text-sm text-muted-foreground mt-1">Review your complete statement before submission.</p>
            </div>
            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-3" style={{ background: "rgba(41,72,61,0.03)", borderBottom: "1px solid rgba(41,72,61,0.1)" }}>
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-primary" style={{ fontFamily: "monospace" }}>Dispute Summary</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Original allocation</p>
                  <p className="text-sm text-foreground mt-0.5">${entry.bounty} allocated to {entry.allocationDestination ?? "Marimo Inc."} · {formatDeadline(entry.deadline)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dispute reason</p>
                  <p className="text-sm text-foreground mt-0.5">{REASON_LABELS[reason]}</p>
                </div>
                {expl.whatHappened && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Statement</p>
                    <p className="text-sm text-foreground mt-0.5 leading-snug">{expl.whatHappened}</p>
                  </div>
                )}
                {expl.correction && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Requested correction</p>
                    <p className="text-sm text-foreground mt-0.5">{expl.correction}</p>
                  </div>
                )}
                {(evidence || evidenceNote) && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Evidence</p>
                    <p className="text-sm text-foreground mt-0.5 break-all">{evidence || evidenceNote}</p>
                  </div>
                )}
                {followUpQ && followUpA && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Follow-up answered</p>
                    <p className="text-xs text-muted-foreground italic mt-0.5">{followUpQ}</p>
                    <p className="text-sm text-foreground mt-0.5">{followUpA}</p>
                  </div>
                )}
              </div>
              <div className="mx-5 mb-5 rounded-2xl p-4" style={{ background: "rgba(41,72,61,0.04)", border: "1.5px solid rgba(41,72,61,0.12)" }}>
                <button onClick={() => setConfirmed(c => !c)} className="flex items-start gap-3 w-full text-left">
                  {confirmed ? <CheckSquare className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" /> : <Square className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />}
                  <p className="text-sm font-semibold text-foreground leading-snug">I confirm that this explanation is accurate to the best of my knowledge.</p>
                </button>
              </div>
              <div className="px-5 pb-5 flex flex-col gap-2">
                <button onClick={submit} disabled={!confirmed} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-sm disabled:opacity-40 disabled:pointer-events-none">Submit dispute</button>
                <button onClick={() => setStep(2)} className="w-full py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary rounded-2xl transition-colors">Edit responses</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Submitted */}
        {step === 6 && (
          <div className="space-y-4" style={{ animation: "fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) both" }}>
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="relative">
                <img src={marimoLaptop} alt="Marimo" className="w-36 h-auto object-contain drop-shadow-md" />
                <span className="absolute -top-1 -right-2 text-2xl" style={{ animation: "fadeInUp 0.3s ease 0.4s both" }}>📋</span>
              </div>
            </div>
            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
              <div className="px-6 py-4 text-center" style={{ background: "rgba(41,72,61,0.04)", borderBottom: "1px solid rgba(41,72,61,0.1)" }}>
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-muted-foreground" style={{ fontFamily: "monospace" }}>Office of Appeals · Marimo Inc.</p>
                <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl text-primary mt-1">Dispute filed</h2>
                <p className="text-sm text-muted-foreground mt-1 italic">"Marimo Compliance has opened a formal review."</p>
              </div>
              <div className="px-6 py-5 space-y-3">
                <p className="text-sm text-foreground leading-relaxed text-center">Your original allocation will remain visible while the case is reviewed.</p>
                <div className="rounded-2xl px-5 py-4 text-center" style={{ background: "rgba(41,72,61,0.05)", border: "1.5px solid rgba(41,72,61,0.14)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1" style={{ fontFamily: "monospace" }}>Case number</p>
                  <p className="text-2xl font-bold text-primary" style={{ fontFamily: "monospace" }}>{generateCaseNumber()}</p>
                </div>
                <StatusBadge status="filed" />
              </div>
              <div className="px-6 pb-6 flex flex-col gap-2">
                <Link to="/record" className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-center hover:opacity-90 transition-all shadow-sm">Return to Official Records</Link>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

// ── Root component ──────────────────────────────────────────────────────────

export default function DisputePage() {
  const { entryId } = useParams<{ entryId: string }>();

  const [history, setHistory] = useState<HistoryEntry[]>(() => loadLS(LS.history, []));
  const [disputes, setDisputes] = useState<DisputeCase[]>(() => loadLS(LS.disputes, []));

  const entry = history.find(e => e.id === entryId) ?? null;
  const existingDispute = entry?.disputeId ? disputes.find(d => d.id === entry.disputeId) ?? null : null;

  const handleSubmit = (newDispute: DisputeCase) => {
    const updatedDisputes = [...disputes, newDispute];
    const updatedHistory = history.map(e => e.id === entryId ? { ...e, disputeId: newDispute.id } : e);
    setDisputes(updatedDisputes);
    setHistory(updatedHistory);
    saveLS(LS.disputes, updatedDisputes);
    saveLS(LS.history, updatedHistory);
  };

  const handleUpdate = (updatedDispute: DisputeCase, entryPatch?: Partial<HistoryEntry>) => {
    const updatedDisputes = disputes.map(d => d.id === updatedDispute.id ? updatedDispute : d);
    setDisputes(updatedDisputes);
    saveLS(LS.disputes, updatedDisputes);
    if (entryPatch && entry) {
      const updatedHistory = history.map(e => e.id === entry.id ? { ...e, ...entryPatch } : e);
      setHistory(updatedHistory);
      saveLS(LS.history, updatedHistory);
    }
  };

  if (!entry) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" style={{ fontFamily: "'Nunito Sans', system-ui, sans-serif" }}>
        <div className="text-center space-y-4">
          <img src={marimoIdle} alt="Marimo" className="w-20 h-auto object-contain mx-auto" />
          <p className="text-foreground font-bold">Record not found</p>
          <Link to="/record" className="inline-block px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold">Return to records</Link>
        </div>
      </div>
    );
  }

  if (existingDispute) {
    return <CaseView entry={entry} dispute={existingDispute} onUpdate={handleUpdate} />;
  }

  return <FilingFlow entry={entry} onSubmit={handleSubmit} />;
}
