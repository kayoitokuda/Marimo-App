import { useState } from "react";
import { Link } from "react-router";
import { Flame, ArrowLeft } from "lucide-react";
import marimoIdle from "../../imports/marimo-idle.png";
import marimoTreatPaw from "../../imports/marimo-treat-paw.png";
import marimoAvatar from "../../imports/marimo-avatar.png";
import {
  type FutureFund, type HistoryEntry,
  LS, loadLS, formatDate, DEFAULT_FUND, FUND_SUGGESTIONS,
} from "../lib";

export default function FundPage() {
  const futureFund  = loadLS<FutureFund>(LS.fund, DEFAULT_FUND);
  const history     = loadLS<HistoryEntry[]>(LS.history, []);
  const treats      = loadLS<number>(LS.treats, 0);
  const streak      = loadLS<number>(LS.streak, 0);

  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(futureFund.name);
  const [editTarget, setEditTarget] = useState(futureFund.target ? String(futureFund.target) : "");

  const successHistory = history.filter(h => h.result === "success");
  const bountiesKept   = successHistory.reduce((s, h) => s + h.bounty, 0);
  const fundProgress   = futureFund.target ? Math.min((bountiesKept / futureFund.target) * 100, 100) : null;
  const projected      = futureFund.target && bountiesKept > 0
    ? Math.ceil((futureFund.target - bountiesKept) / (bountiesKept / Math.max(successHistory.length, 1)))
    : null;

  function saveEdit() {
    const updated: FutureFund = {
      name: editName.trim() || "Future Fund",
      target: editTarget ? parseFloat(editTarget) : null,
    };
    localStorage.setItem(LS.fund, JSON.stringify(updated));
    setEditMode(false);
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Nunito Sans', system-ui, sans-serif" }}>

      {/* Header */}
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

        {/* Fund hero */}
        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-muted-foreground mb-1">Future Fund · Marimo Inc.</p>
                <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl text-primary">{futureFund.name}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Built through promises kept.</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total</p>
                <p className="text-3xl font-bold text-accent leading-none mt-0.5">${bountiesKept}</p>
              </div>
            </div>

            {fundProgress !== null && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{Math.round(fundProgress)}% toward goal</span>
                  <span>${futureFund.target?.toLocaleString()}</span>
                </div>
                <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${fundProgress}%`, background: "#29483D" }} />
                </div>
                {projected !== null && projected > 0 && (
                  <p className="text-xs text-muted-foreground">{projected} more commitment{projected !== 1 ? "s" : ""} at this pace to reach the goal.</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 pt-1">
              {[
                { label: "Contributed",  value: `$${bountiesKept}`, icon: "💰" },
                { label: "Streak",       value: streak > 0 ? `${streak} 🔥` : "—", icon: "🔥" },
                { label: "Treats",       value: `${treats} 🍡`, icon: "🍡" },
              ].map(stat => (
                <div key={stat.label} className="bg-secondary rounded-2xl p-3.5 text-center">
                  <p className="text-xl leading-none">{stat.icon}</p>
                  <p className="text-base font-bold text-primary mt-1.5">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            <button onClick={() => setEditMode(e => !e)} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">
              {editMode ? "Cancel" : "Edit fund"}
            </button>

            {editMode && (
              <div className="space-y-3 pt-1" style={{ animation: "fadeInUp 0.22s ease both" }}>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Fund name</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none text-foreground" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {FUND_SUGGESTIONS.slice(0, 5).map(s => (
                    <button key={s} onClick={() => setEditName(s)} className="px-3 py-1 rounded-full text-xs font-semibold border transition-all" style={{ background: editName === s ? "rgba(41,72,61,0.09)" : "transparent", borderColor: editName === s ? "rgba(41,72,61,0.28)" : "rgba(41,72,61,0.14)", color: editName === s ? "#29483D" : "#5E7268" }}>{s}</button>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Target amount (optional)</label>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">$</span>
                    <input type="number" value={editTarget} onChange={e => setEditTarget(e.target.value)} placeholder="500" min="1" className="flex-1 px-4 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none text-foreground placeholder:text-muted-foreground" />
                  </div>
                </div>
                <button onClick={saveEdit} className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-sm">Save changes</button>
              </div>
            )}
          </div>
        </div>

        {/* Contribution history */}
        {successHistory.length > 0 ? (
          <div className="bg-card rounded-3xl border border-border shadow-sm p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-primary">Contributions</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{successHistory.length} promise{successHistory.length !== 1 ? "s" : ""} kept.</p>
            </div>
            <div className="divide-y divide-border">
              {successHistory.map(entry => (
                <div key={entry.id} className="flex items-center justify-between py-3.5 gap-3 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{entry.task}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(entry.completedAt)}</p>
                  </div>
                  <p className="text-sm font-bold text-accent flex-shrink-0">+${entry.bounty}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-3xl border border-border shadow-sm p-8 text-center space-y-4">
            <img src={marimoIdle} alt="Marimo" className="w-24 h-auto object-contain mx-auto" />
            <div>
              <p className="font-bold text-primary" style={{ fontFamily: "'DM Serif Display', serif" }}>Future You is awaiting funding.</p>
              <p className="text-sm text-muted-foreground mt-1">Complete a commitment to make the first contribution.</p>
            </div>
            <Link to="/" className="inline-block px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all shadow-sm">Make a commitment</Link>
          </div>
        )}

        {/* Marimo's treats */}
        {treats > 0 && (
          <div className="bg-card rounded-3xl border border-border shadow-sm p-5 sm:p-6 flex items-center gap-4">
            <img src={marimoTreatPaw} alt="Marimo" className="w-20 h-auto object-contain flex-shrink-0" />
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">Executive Treat Budget</p>
              <p className="text-xl font-bold text-primary mt-0.5">🍡 {treats} treat{treats !== 1 ? "s" : ""} disbursed</p>
              <p className="text-xs text-muted-foreground mt-0.5">Marimo accepts partial credit and one treat per commitment.</p>
            </div>
          </div>
        )}

        {streak >= 3 && (
          <div className="rounded-2xl px-5 py-4 flex items-center gap-4" style={{ background: "rgba(229,169,61,0.06)", border: "1.5px solid rgba(229,169,61,0.2)" }}>
            <Flame className="w-6 h-6 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-foreground">{streak}-commitment streak</p>
              <p className="text-xs text-muted-foreground mt-0.5">Management is reluctantly impressed.</p>
            </div>
            <span className="ml-auto text-2xl font-bold text-amber-500">{streak}🔥</span>
          </div>
        )}

        <div className="text-center py-2">
          <p className="text-[9px] text-muted-foreground" style={{ fontFamily: "monospace" }}>Future You Capital Program · Marimo Inc.</p>
        </div>
      </main>
    </div>
  );
}
