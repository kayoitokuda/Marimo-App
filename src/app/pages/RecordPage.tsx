import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import marimoIdle from "../../imports/marimo-idle.png";
import marimoAvatar from "../../imports/marimo-avatar.png";

import {
  type HistoryEntry, type DisputeCase, type FutureFund,
  LS, DEFAULT_FUND,
  loadLS, saveLS,
  formatDate, formatDeadline,
  isDisputeEligible, DISPUTE_WINDOW_MS,
  SEED_HISTORY, SEED_DISPUTES,
} from "../lib";

// ── Status meta ──────────────────────────────────────────────────────────────

type DisputeStatus = "filed" | "info-needed" | "under-review" | "approved" | "denied" | "appealed" | "final";

const STATUS_META: Record<DisputeStatus, { icon: string; label: string; color: string; bg: string }> = {
  "filed":        { icon: "📋", label: "Dispute filed",        color: "#5E7268", bg: "rgba(94,114,104,0.08)"  },
  "info-needed":  { icon: "🔔", label: "Information needed",   color: "#E5A93D", bg: "rgba(229,169,61,0.1)"   },
  "under-review": { icon: "🔍", label: "Under review",         color: "#29483D", bg: "rgba(41,72,61,0.08)"    },
  "approved":     { icon: "✅", label: "Allocation reversed",  color: "#29483D", bg: "rgba(41,72,61,0.08)"    },
  "denied":       { icon: "❌", label: "Dispute denied",       color: "#C0392B", bg: "rgba(192,57,43,0.08)"   },
  "appealed":     { icon: "⚖️", label: "Appealed",             color: "#5E7268", bg: "rgba(94,114,104,0.08)"  },
  "final":        { icon: "🏛️", label: "Final decision",       color: "#5E7268", bg: "rgba(94,114,104,0.08)"  },
};

function StatusBadge({ status }: { status: DisputeStatus }) {
  const m = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: m.bg, color: m.color }}>
      <span>{m.icon}</span>{m.label}
    </span>
  );
}

// ── Timeline entry ───────────────────────────────────────────────────────────

function TimelineItem({ icon, label, date, detail, accent }: {
  icon: string; label: string; date?: string; detail?: string; accent?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm" style={{ background: accent ? "rgba(41,72,61,0.1)" : "rgba(41,72,61,0.05)", border: "1.5px solid rgba(41,72,61,0.14)" }}>{icon}</div>
        <div className="w-px flex-1 mt-1" style={{ background: "rgba(41,72,61,0.1)", minHeight: 12 }} />
      </div>
      <div className="pb-4 flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground">{label}</p>
        {date && <p className="text-[10px] text-muted-foreground mt-0.5">{date}</p>}
        {detail && <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug italic">{detail}</p>}
      </div>
    </div>
  );
}

// ── Entry card ───────────────────────────────────────────────────────────────

function EntryCard({ entry, dispute, futureFundName }: {
  entry: HistoryEntry;
  dispute?: DisputeCase;
  futureFundName: string;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const eligible = isDisputeEligible(entry);
  const windowExpired = entry.result === "failed" && !entry.disputeId &&
    Date.now() - new Date(entry.completedAt).getTime() > DISPUTE_WINDOW_MS;

  const resultLabel = {
    "success":      "Honored",
    "late-success": "Upheld",
    "failed":       "Missed",
    "abandoned":    "Canceled",
  }[entry.result] ?? entry.result;

  const resultColor = (entry.result === "success" || entry.result === "late-success")
    ? { color: "#29483D", bg: "rgba(41,72,61,0.08)" }
    : entry.result === "failed"
    ? { color: "#C0392B", bg: "rgba(192,57,43,0.08)" }
    : { color: "#5E7268", bg: "rgba(94,114,104,0.08)" };

  // Build timeline
  const timeline: { icon: string; label: string; date?: string; detail?: string; accent?: boolean }[] = [
    { icon: "📝", label: "Commitment created", date: formatDate(entry.completedAt) },
    { icon: "⏰", label: "Deadline reached", date: formatDeadline(entry.deadline) },
  ];
  if (entry.result === "success" || entry.result === "late-success") {
    timeline.push({ icon: "✅", label: "Completion recorded", date: formatDate(entry.completedAt), accent: true });
    if (entry.result === "late-success") {
      timeline.push({ icon: "⚖️", label: "Late report accepted", detail: "Completion confirmed on time. Report submitted late.", accent: true });
    }
  } else if (entry.result === "failed") {
    timeline.push({ icon: "🚀", label: "Bounty allocated", date: formatDate(entry.completedAt), detail: `$${entry.bounty} → ${entry.allocationDestination ?? "Marimo Inc."}` });
    if (dispute) {
      timeline.push({ icon: "📋", label: `Dispute filed · ${dispute.caseNumber}`, date: formatDate(dispute.filedAt) });
      if (dispute.followUpQuestion) {
        timeline.push({ icon: "🔔", label: "Follow-up requested", detail: dispute.followUpQuestion });
      }
      if (dispute.followUpAnswer) {
        timeline.push({ icon: "💬", label: "Testimony submitted", detail: dispute.followUpAnswer });
      }
      if (dispute.reviewedAt) {
        timeline.push({ icon: dispute.status === "approved" ? "✅" : "❌", label: dispute.status === "approved" ? "Allocation reversed" : "Dispute denied", date: formatDate(dispute.reviewedAt), detail: dispute.decisionReason });
      }
      if (dispute.appealText) {
        timeline.push({ icon: "⚖️", label: "Final appeal submitted", detail: dispute.appealText.slice(0, 80) + (dispute.appealText.length > 80 ? "…" : "") });
      }
      if (dispute.appealStatus) {
        timeline.push({ icon: dispute.appealStatus === "approved" ? "✅" : "🏛️", label: dispute.appealStatus === "approved" ? "Final appeal approved" : "Final decision: original allocation upheld", accent: dispute.appealStatus === "approved" });
      }
    }
    if (entry.reversal) {
      timeline.push({ icon: "💰", label: "Reversal applied", date: formatDate(entry.reversal.at), detail: `$${entry.reversal.amount} restored to ${entry.reversal.fundName}`, accent: true });
    }
  } else if (entry.result === "abandoned") {
    timeline.push({ icon: "✖️", label: "Commitment canceled" });
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0" style={resultColor}>{resultLabel}</span>
              {dispute && <StatusBadge status={dispute.status as DisputeStatus} />}
              <span className="text-[11px] text-muted-foreground">{formatDate(entry.completedAt)}</span>
            </div>
            <p className="text-sm font-bold text-foreground leading-snug">{entry.task}</p>
            <p className="text-xs text-muted-foreground mt-1">Due {formatDeadline(entry.deadline)}</p>
            {entry.allocationDestination && entry.result === "failed" && !entry.reversal && (
              <p className="text-xs text-muted-foreground mt-0.5">Allocated → {entry.allocationDestination}</p>
            )}
            {entry.reversal && (
              <p className="text-xs mt-0.5" style={{ color: "#29483D" }}>Reversed → ${entry.reversal.amount} restored to {entry.reversal.fundName}</p>
            )}
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Bounty</p>
            <p className={`text-base font-bold mt-0.5 ${(entry.result === "success" || entry.result === "late-success") ? "text-accent" : entry.result === "failed" && !entry.reversal ? "text-destructive" : entry.reversal ? "text-accent" : "text-muted-foreground"}`}>
              {entry.result === "success" || entry.result === "late-success" || entry.reversal ? "+" : entry.result === "failed" ? "−" : ""}${entry.bounty}
            </p>
            {entry.treatEarned && <p className="text-xs text-muted-foreground mt-0.5">🍡</p>}
          </div>
        </div>
      </div>

      {/* Info-needed alert inline */}
      {dispute?.status === "info-needed" && !dispute.followUpAnswer && (
        <div className="mx-5 mb-3 rounded-xl px-4 py-3 flex items-start gap-2" style={{ background: "rgba(229,169,61,0.08)", border: "1px solid rgba(229,169,61,0.24)" }}>
          <span className="text-base flex-shrink-0">🔔</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground">Marimo Compliance requires additional testimony</p>
            <button onClick={() => navigate(`/record/dispute/${entry.id}`)} className="text-xs font-semibold underline underline-offset-2 mt-1" style={{ color: "#E5A93D" }}>Answer follow-up →</button>
          </div>
        </div>
      )}

      {/* Action row */}
      <div className="px-5 py-2.5 flex items-center justify-between gap-3" style={{ borderTop: "1px solid rgba(41,72,61,0.07)", background: "rgba(41,72,61,0.015)" }}>
        <button onClick={() => setExpanded(s => !s)} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Hide timeline" : "View timeline"}
        </button>

        {dispute && (
          <Link to={`/record/dispute/${entry.id}`} className="text-xs font-semibold text-primary underline underline-offset-2 hover:opacity-75 transition-opacity">
            View case {dispute.caseNumber} →
          </Link>
        )}

        {eligible && !dispute && (
          <Link to={`/record/dispute/${entry.id}`} className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors" style={{ background: "rgba(41,72,61,0.08)", color: "#29483D", border: "1px solid rgba(41,72,61,0.18)" }}>
            Dispute allocation
          </Link>
        )}

        {windowExpired && !dispute && (
          <span className="text-[10px] font-semibold text-muted-foreground" style={{ fontFamily: "monospace" }}>Dispute window closed</span>
        )}
      </div>

      {/* Timeline (expanded) */}
      {expanded && (
        <div className="px-5 pt-4 pb-2 border-t border-dashed border-border" style={{ background: "rgba(41,72,61,0.015)", animation: "fadeInUp 0.2s ease both" }}>
          {timeline.map((item, i) => (
            <TimelineItem key={i} {...item} />
          ))}
          {entry.result === "failed" && entry.reversal && (
            <div className="rounded-xl px-4 py-3 mb-3" style={{ background: "rgba(41,72,61,0.06)", border: "1px solid rgba(41,72,61,0.14)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Original allocation</p>
              <p className="text-xs text-muted-foreground">${entry.bounty} allocated to {entry.allocationDestination ?? "Marimo Inc."}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-2 mb-1">Adjustment</p>
              <p className="text-xs" style={{ color: "#29483D" }}>${entry.reversal.amount} restored to {entry.reversal.fundName} on {formatDate(entry.reversal.at)}</p>
            </div>
          )}
          {entry.result === "failed" && !entry.reversal && entry.allocationDestination && (
            <div className="rounded-xl px-4 py-2 mb-3" style={{ background: "rgba(192,57,43,0.03)", border: "1px solid rgba(192,57,43,0.08)" }}>
              <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "monospace" }}>Orbital allocation completed. · Marimo Inc.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RecordPage() {
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const h = loadLS<HistoryEntry[]>(LS.history, []);
    const seedsInjected = loadLS<boolean>(LS.seedsInjected, false);
    if (!seedsInjected) {
      const merged = [...SEED_HISTORY, ...h];
      saveLS(LS.history, merged);
      saveLS(LS.seedsInjected, true);
      return merged;
    }
    return h;
  });

  const [disputes, setDisputes] = useState<DisputeCase[]>(() => {
    const d = loadLS<DisputeCase[]>(LS.disputes, []);
    const hasSeedDisputes = d.some(x => x.id.startsWith("seed-dispute-"));
    if (!hasSeedDisputes) {
      const merged = [...SEED_DISPUTES, ...d];
      saveLS(LS.disputes, merged);
      return merged;
    }
    return d;
  });

  const futureFund = loadLS<FutureFund>(LS.fund, DEFAULT_FUND);

  const getDispute = (entry: HistoryEntry) => entry.disputeId ? disputes.find(d => d.id === entry.disputeId) : undefined;

  const successCount   = history.filter(h => h.result === "success" || h.result === "late-success").length;
  const failedCount    = history.filter(h => h.result === "failed").length;
  const abandonedCount = history.filter(h => h.result === "abandoned").length;
  const bountiesKept   = history
    .filter(h => h.result === "success" || h.result === "late-success")
    .reduce((s, h) => s + h.bounty, 0)
    + history.filter(h => h.reversal).reduce((s, h) => s + (h.reversal?.amount ?? 0), 0);
  const bountiesLost   = history
    .filter(h => h.result === "failed" && !h.reversal)
    .reduce((s, h) => s + h.bounty, 0);
  const honorRate      = history.length > 0 ? Math.round((successCount / history.length) * 100) : null;

  const infoNeededCount = disputes.filter(d => d.status === "info-needed" && !d.followUpAnswer).length;

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
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Home
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-5 py-6 sm:py-8 space-y-5">

        {/* Info needed banner */}
        {infoNeededCount > 0 && (
          <div className="rounded-2xl px-5 py-4 flex items-start gap-3" style={{ background: "rgba(229,169,61,0.08)", border: "1.5px solid rgba(229,169,61,0.28)" }}>
            <span className="text-xl flex-shrink-0">🔔</span>
            <div>
              <p className="text-sm font-bold text-foreground">Marimo Compliance requires additional testimony</p>
              <p className="text-xs text-muted-foreground mt-0.5">{infoNeededCount} open dispute{infoNeededCount !== 1 ? "s" : ""} awaiting your response.</p>
            </div>
          </div>
        )}

        {/* Page title */}
        <div className="flex items-end justify-between px-1">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-muted-foreground mb-0.5">Official Commitment Record</p>
            <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl text-primary">Official Record</h1>
          </div>
          {honorRate !== null && (
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Honor rate</p>
              <p className="text-2xl font-bold text-primary">{honorRate}%</p>
            </div>
          )}
        </div>

        {/* Stats grid */}
        {history.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Honored",  value: successCount,        icon: "✅", color: "#29483D" },
              { label: "Missed",   value: failedCount,         icon: "🚀", color: "#C0392B" },
              { label: "Kept",     value: `$${bountiesKept}`,  icon: "💰", color: "#E5A93D" },
              { label: "Lost",     value: `$${bountiesLost}`,  icon: "💸", color: "#5E7268" },
            ].map(stat => (
              <div key={stat.label} className="bg-card rounded-2xl border border-border p-4 text-center shadow-sm">
                <p className="text-2xl leading-none">{stat.icon}</p>
                <p className="text-lg font-bold mt-1.5" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* History list */}
        {history.length > 0 ? (
          <div className="space-y-3">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground px-1">All records ({history.length})</p>
            {history.map(entry => (
              <EntryCard
                key={entry.id}
                entry={entry}
                dispute={getDispute(entry)}
                futureFundName={futureFund.name || "Future Fund"}
              />
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-3xl border border-border shadow-sm p-10 text-center space-y-4">
            <img src={marimoIdle} alt="Marimo" className="w-24 h-auto object-contain mx-auto" />
            <div>
              <p className="font-bold text-primary" style={{ fontFamily: "'DM Serif Display', serif" }}>Your official record is suspiciously clean.</p>
              <p className="text-sm text-muted-foreground mt-1">Your first commitment will appear here.</p>
            </div>
            <Link to="/" className="inline-block px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all shadow-sm">Make a commitment</Link>
          </div>
        )}

        {abandonedCount > 0 && (
          <p className="text-center text-xs text-muted-foreground">{abandonedCount} commitment{abandonedCount !== 1 ? "s" : ""} canceled. Marimo has noted this.</p>
        )}

        <div className="text-center py-2">
          <p className="text-[9px] text-muted-foreground" style={{ fontFamily: "monospace" }}>Official Commitment Record · Marimo Inc. · Dispute window: 7 days from allocation</p>
        </div>
      </main>
    </div>
  );
}
