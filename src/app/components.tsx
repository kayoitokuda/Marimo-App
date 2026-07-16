import { useState, useEffect, useRef } from "react";
import marimoIdle from "../imports/marimo-idle.png";
import marimoLaptop from "../imports/marimo-laptop.png";
import marimoTreatPaw from "../imports/marimo-treat-paw.png";
import marimoBountyYeet from "../imports/marimo-bounty-yeet.png";

import {
  type FutureFund, type Preferences, type ProofType, type CinematicPhase,
  FUND_SUGGESTIONS, DEFAULT_FUND, DEFAULT_PREFS, STARS,
  playCheckSound, playStampSound, playDecisionStinger, playCoinLaunchSound, playSpaceAmbient,
} from "./lib";

// ── Global styles ─────────────────────────────────────────────────────────────
export function GlobalStyles() {
  return (
    <style>{`
      .reviewing-dot { display: inline-block; opacity: 0; animation: dotFade 0.85s ease-in-out infinite; }
      @keyframes dotFade { 0%,100%{opacity:0} 50%{opacity:1} }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes stampIn {
        0%   { transform: scale(0.82) translateY(8px); opacity:0; }
        65%  { transform: scale(1.04) translateY(-2px); opacity:1; }
        100% { transform: scale(1) translateY(0); opacity:1; }
      }
      @keyframes fadeInUp {
        from { opacity:0; transform:translateY(14px); }
        to   { opacity:1; transform:translateY(0); }
      }
      @keyframes cinematicShake {
        0%,100% { transform: translate(0,0) rotate(0deg); }
        15%  { transform: translate(-7px,3px) rotate(-0.4deg); }
        30%  { transform: translate(6px,-4px) rotate(0.4deg); }
        45%  { transform: translate(-5px,5px) rotate(-0.3deg); }
        60%  { transform: translate(5px,-3px) rotate(0.3deg); }
        75%  { transform: translate(-2px,2px); }
      }
      @keyframes coinAppear {
        0%   { transform: scale(0) rotate(-30deg); opacity:0; }
        65%  { transform: scale(1.18) rotate(6deg); opacity:1; }
        100% { transform: scale(1) rotate(0deg); opacity:1; }
      }
      @keyframes coinSquash {
        0%   { transform: scale(1,1) rotate(0deg); }
        38%  { transform: scale(1.55,0.62) rotate(-6deg); }
        68%  { transform: scale(0.82,1.38) rotate(9deg); }
        100% { transform: scale(1,1) rotate(5deg); }
      }
      @keyframes coinLaunch {
        0%   { transform: scale(1) translate(0,0) rotate(5deg); opacity:1; }
        7%   { transform: scale(0.78,1.45) translate(14px,-22px) rotate(22deg); opacity:1; }
        22%  { transform: scale(0.9) translate(65px,-120px) rotate(85deg); opacity:1; }
        52%  { transform: scale(0.58) translate(190px,-330px) rotate(230deg); opacity:0.8; }
        78%  { transform: scale(0.22) translate(340px,-560px) rotate(390deg); opacity:0.4; }
        100% { transform: scale(0.04) translate(460px,-780px) rotate(530deg); opacity:0; }
      }
      @keyframes sparkleTrail {
        0%   { opacity:1; transform: scale(1) translate(0,0); }
        100% { opacity:0; transform: scale(0.15) translate(var(--tx),var(--ty)); }
      }
      @keyframes treatPop {
        0%   { transform: scale(0.5) translateY(8px); opacity:0; }
        70%  { transform: scale(1.12) translateY(-4px); opacity:1; }
        100% { transform: scale(1) translateY(0); opacity:1; }
      }
      @keyframes progressPulse { 0%,100%{opacity:1} 50%{opacity:0.72} }
      .treat-pop { animation: treatPop 0.5s cubic-bezier(.34,1.56,.64,1) forwards; }
      @media (prefers-reduced-motion: reduce) {
        .treat-pop, .reviewing-dot { animation: none !important; }
        .reviewing-dot { opacity: 1; }
        * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
      }
    `}</style>
  );
}

// ── Onboarding Flow ───────────────────────────────────────────────────────────
export function OnboardingFlow({ onComplete }: {
  onComplete: (fund: FutureFund, prefs: Preferences) => void;
}) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [fundName, setFundName]     = useState("");
  const [fundTarget, setFundTarget] = useState("");
  const [defaultProof, setDefaultProof]   = useState<ProofType>("honor");
  const [typicalLength, setTypicalLength] = useState<Preferences["typicalLength"]>("week");

  const TOTAL_STEPS = 4;

  function transition(nextStep: number) {
    setVisible(false);
    setTimeout(() => { setStep(nextStep); setVisible(true); }, 210);
  }

  function advance() {
    if (step < TOTAL_STEPS - 1) {
      transition(step + 1);
    } else {
      onComplete(
        { name: fundName.trim() || "Future Fund", target: fundTarget ? parseFloat(fundTarget) : null },
        { defaultProof, typicalLength },
      );
    }
  }

  function retreat() { if (step > 0) transition(step - 1); }

  const ctaLabel = ["Get started", "Got it", "She is extremely qualified", "Create my first commitment"][step];

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ fontFamily: "'Nunito Sans', system-ui, sans-serif" }}>
      <div className="flex justify-center pt-10 pb-2 gap-1.5" aria-hidden>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} className="rounded-full transition-all duration-300" style={{ width: i === step ? 22 : 6, height: 6, background: i < step ? "rgba(41,72,61,0.35)" : i === step ? "#29483D" : "rgba(41,72,61,0.14)" }} />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-6" style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.21s ease, transform 0.21s ease" }}>
        <div className="w-full max-w-sm space-y-6">

          {step === 0 && (
            <>
              <div className="flex justify-center">
                <img src={marimoIdle} alt="Marimo" className="w-36 h-auto object-contain drop-shadow-sm" />
              </div>
              <div className="space-y-3 text-center">
                <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-[2rem] leading-tight text-primary">Keep a promise to Future You.</h1>
                <p className="text-base text-muted-foreground leading-relaxed">Choose something important, set a deadline, and place a bounty on the outcome.</p>
              </div>
              <div className="rounded-2xl px-5 py-4 text-sm text-muted-foreground text-center leading-snug" style={{ background: "rgba(41,72,61,0.04)", border: "1px solid rgba(41,72,61,0.1)" }}>
                No payment setup required to get started. Connect one when you're ready to raise the real stakes.
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-1.5 text-center">
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-muted-foreground">How it works</p>
                <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-[1.75rem] leading-snug text-primary">Finish it, or Marimo takes it.</h1>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl p-4 flex items-start gap-3.5" style={{ background: "rgba(41,72,61,0.05)", border: "1.5px solid rgba(41,72,61,0.13)" }}>
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary flex items-center justify-center"><span className="text-primary-foreground font-bold text-sm">✓</span></div>
                  <div>
                    <p className="font-bold text-primary text-sm">Commitment honored</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">Commitment → Completion → Future Fund</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-snug">Your bounty is protected and goes toward your goal. Marimo earns a treat.</p>
                  </div>
                </div>
                <div className="rounded-2xl p-4 flex items-start gap-3.5" style={{ background: "rgba(192,57,43,0.04)", border: "1.5px solid rgba(192,57,43,0.13)" }}>
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#C0392B" }}><span className="text-white font-bold text-sm">✕</span></div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: "#C0392B" }}>Deadline missed</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">Commitment → Missed deadline → Orbital reallocation</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-snug">Marimo claims the bounty and sends it to low Earth orbit. It's in the contract.</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center gap-10 pt-1">
                <div className="text-center">
                  <img src={marimoTreatPaw} alt="Marimo happy" className="w-20 h-auto object-contain mx-auto" />
                  <p className="text-[11px] text-muted-foreground mt-1.5 font-semibold">Treat earned</p>
                </div>
                <div className="text-center">
                  <img src={marimoBountyYeet} alt="Marimo yeeting" className="w-20 h-auto object-contain mx-auto" />
                  <p className="text-[11px] text-muted-foreground mt-1.5 font-semibold">Bounty yeeted</p>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex justify-center">
                <img src={marimoLaptop} alt="Marimo at her laptop" className="w-36 h-auto object-contain drop-shadow-sm" />
              </div>
              <div className="space-y-1.5 text-center">
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-muted-foreground">Office of Commitment Compliance</p>
                <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-[1.75rem] leading-snug text-primary">Meet Marimo, Chief Accountability Officer.</h1>
                <p className="text-sm text-muted-foreground leading-snug">She reviews commitments, monitors deadlines, accepts treats, and administers consequences.</p>
              </div>
              <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFDF7", border: "1.5px solid rgba(41,72,61,0.14)" }}>
                <div className="px-4 py-2.5" style={{ background: "rgba(41,72,61,0.04)", borderBottom: "1px solid rgba(41,72,61,0.1)" }}>
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "monospace" }}>Marimo Inc. — Personnel File</p>
                </div>
                <div className="px-4 py-4 space-y-3 text-sm">
                  {[
                    { role: "CEO",                        detail: "Marimo" },
                    { role: "Staff",                      detail: "1 cat, 0 humans" },
                    { role: "Specialties",                detail: "Commitment enforcement, treat acquisition" },
                    { role: "Orbital Allocation Program", detail: "Active" },
                    { role: "Quarterly report",           detail: "Pending" },
                  ].map(row => (
                    <div key={row.role} className="flex items-start justify-between gap-4">
                      <span className="text-muted-foreground text-xs">{row.role}</span>
                      <span className="text-xs font-semibold text-foreground text-right">{row.detail}</span>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 text-center" style={{ borderTop: "1px solid rgba(41,72,61,0.08)" }}>
                  <p className="text-[9px] text-muted-foreground italic" style={{ fontFamily: "monospace" }}>"Management has reviewed your onboarding materials."</p>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex justify-center">
                <img src={marimoIdle} alt="Marimo" className="w-24 h-auto object-contain" />
              </div>
              <div className="space-y-1.5 text-center">
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-muted-foreground">Future Fund</p>
                <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-[1.75rem] leading-snug text-primary">What are you building for Future You?</h1>
                <p className="text-sm text-muted-foreground leading-snug">Give your kept bounties somewhere meaningful to go.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-foreground">Fund name</label>
                  <input type="text" value={fundName} onChange={e => setFundName(e.target.value)} placeholder="e.g. Japan Trip, New Laptop…" className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none placeholder:text-muted-foreground transition-colors text-foreground" autoFocus />
                </div>
                <div className="flex flex-wrap gap-2">
                  {FUND_SUGGESTIONS.slice(0, 6).map(s => (
                    <button key={s} onClick={() => setFundName(s)} className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all" style={{ background: fundName === s ? "rgba(41,72,61,0.09)" : "transparent", borderColor: fundName === s ? "rgba(41,72,61,0.28)" : "rgba(41,72,61,0.14)", color: fundName === s ? "#29483D" : "#5E7268" }}>
                      {s}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-foreground">Typical commitment length</label>
                  <p className="text-xs text-muted-foreground -mt-1">Used to suggest a deadline when you create a task.</p>
                  <div className="flex gap-2">
                    {([{ v: "day", label: "One day" }, { v: "week", label: "One week" }, { v: "month", label: "One month" }] as { v: Preferences["typicalLength"]; label: string }[]).map(opt => (
                      <button key={opt.v} onClick={() => setTypicalLength(opt.v)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-colors ${typicalLength === opt.v ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground border-transparent hover:border-primary/25"}`}>{opt.label}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-foreground">Default completion proof</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([{ v: "honor", label: "Honor system", icon: "🤞" }, { v: "screenshot", label: "Screenshot", icon: "📸" }, { v: "link", label: "Paste link", icon: "🔗" }] as { v: ProofType; label: string; icon: string }[]).map(opt => (
                      <button key={opt.v} onClick={() => setDefaultProof(opt.v)} className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-bold transition-colors ${defaultProof === opt.v ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground border-transparent hover:border-primary/25"}`}>
                        <span className="text-xl leading-none">{opt.icon}</span>
                        <span className="text-center leading-tight">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="px-5 pb-10 flex flex-col gap-2 w-full max-w-sm mx-auto">
        <button onClick={advance} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:opacity-90 active:scale-[0.985] transition-all shadow-sm">{ctaLabel}</button>
        {step > 0 ? (
          <button onClick={retreat} className="w-full py-2.5 rounded-2xl text-muted-foreground text-sm font-semibold hover:bg-secondary transition-colors">Back</button>
        ) : (
          <p className="text-center text-xs text-muted-foreground py-1">No account required. No spam.</p>
        )}
      </div>
    </div>
  );
}

// ── Accepting Animation ───────────────────────────────────────────────────────
export function AcceptingAnimation({ task, bounty, onDone }: { task: string; bounty: number; onDone: () => void }) {
  const [panelIn, setPanelIn] = useState(false);
  const [step, setStep] = useState(0);
  const [stamped, setStamped] = useState(false);
  const [out, setOut] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const at = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); timers.current.push(id); };
    at(200,  () => setPanelIn(true));
    at(700,  () => { setStep(1); playCheckSound(); });
    at(1300, () => { setStep(2); playCheckSound(); });
    at(1900, () => { setStep(3); playCheckSound(); });
    at(2550, () => { setStep(4); playCheckSound(); });
    at(3250, () => { setStamped(true); playStampSound(); });
    at(4200, () => setOut(true));
    at(4700, () => doneRef.current());
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const steps = ["Reviewing terms…", "Searching for obvious loopholes…", "Evaluating excuse exposure…", "Informing management…"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(255,248,236,0.96)", backdropFilter: "blur(10px)", opacity: out ? 0 : 1, transition: "opacity 0.6s ease" }}>
      <div className="w-72 sm:w-80 space-y-4" style={{ opacity: panelIn ? 1 : 0, transform: panelIn ? "translateY(0) scale(1)" : "translateY(14px) scale(0.96)", transition: "opacity 0.45s cubic-bezier(0.22,1,0.36,1), transform 0.45s cubic-bezier(0.22,1,0.36,1)" }}>
        <div className="flex justify-center"><img src={marimoLaptop} alt="Marimo reviewing" className="w-28 h-auto object-contain" /></div>
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFDF7", border: "1.5px solid rgba(41,72,61,0.16)", boxShadow: "0 4px 40px rgba(41,72,61,0.08)" }}>
          <div className="flex items-center px-4 py-2.5" style={{ borderBottom: "1px solid rgba(41,72,61,0.09)", background: "rgba(41,72,61,0.02)" }}>
            <p className="flex-1 text-center text-[10px] font-bold tracking-[0.22em] uppercase text-primary" style={{ fontFamily: "monospace" }}>Commitment Review Division</p>
          </div>
          <div className="px-5 py-4 space-y-1">
            <div className="bg-secondary rounded-xl px-3.5 py-2.5 mb-3.5">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Task</p>
              <p className="text-sm font-bold text-primary truncate mt-0.5">{task}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Bounty: <span className="text-accent font-bold">${bounty}</span></p>
            </div>
            {steps.map((label, i) => (
              <div key={i} className="flex items-center gap-3 py-1" style={{ opacity: step > i ? 1 : step === i ? 0.5 : 0.18, transition: "opacity 0.35s ease" }}>
                <div className="w-4 flex-shrink-0 flex items-center justify-center">
                  {step === i + 1 && !stamped ? (
                    <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: "#29483D", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                  ) : step > i || stamped ? (
                    <span className="text-[11px] font-bold text-primary">✓</span>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-border" />
                  )}
                </div>
                <span className="text-[13px] text-foreground" style={{ fontFamily: "monospace" }}>{label}</span>
              </div>
            ))}
          </div>
          {stamped && (
            <div className="mx-4 mb-4 rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(41,72,61,0.06)", border: "1.5px solid rgba(41,72,61,0.16)", animation: "stampIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
              <span className="text-2xl select-none">🐾</span>
              <div>
                <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-primary">Commitment Accepted</p>
                <p className="text-xs text-muted-foreground mt-0.5">Management has been informed.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reviewing Animation ───────────────────────────────────────────────────────
export function ReviewingAnimation({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [approved, setApproved] = useState(false);
  const [out, setOut] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const at = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); timers.current.push(id); };
    at(150,  () => setStep(1));
    at(700,  () => { setStep(2); playCheckSound(); });
    at(1350, () => { setStep(3); playCheckSound(); });
    at(2000, () => { setStep(4); playCheckSound(); });
    at(2700, () => { setStep(5); playCheckSound(); });
    at(3400, () => { setApproved(true); playStampSound(); });
    at(4100, () => setOut(true));
    at(4500, () => doneRef.current());
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const reviewSteps = ["Evidence received.", "Verifying contractual terms…", "Inspecting suspicious pixels…", "Consulting management…", "Determining treat eligibility…"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(255,248,236,0.96)", backdropFilter: "blur(10px)", opacity: out ? 0 : 1, transition: "opacity 0.5s ease" }}>
      <div className="w-72 sm:w-80 space-y-4">
        <div className="flex justify-center"><img src={marimoIdle} alt="Marimo reviewing" className="w-24 h-auto object-contain" /></div>
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFDF7", border: "1.5px solid rgba(41,72,61,0.16)", boxShadow: "0 4px 40px rgba(41,72,61,0.08)" }}>
          <div className="px-4 py-2.5" style={{ borderBottom: "1px solid rgba(41,72,61,0.09)", background: "rgba(41,72,61,0.02)" }}>
            <p className="text-center text-[10px] font-bold tracking-[0.22em] uppercase text-primary" style={{ fontFamily: "monospace" }}>Evidence Review Division</p>
          </div>
          <div className="px-5 py-4 space-y-1">
            {reviewSteps.map((label, i) => (
              <div key={i} className="flex items-center gap-3 py-1" style={{ opacity: step > i ? 1 : step === i ? 0.5 : 0.18, transition: "opacity 0.35s ease" }}>
                <div className="w-4 flex-shrink-0 flex items-center justify-center">
                  {step === i + 1 && !approved ? (
                    <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: "#29483D", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                  ) : step > i || approved ? (
                    <span className="text-[11px] font-bold text-primary">✓</span>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-border" />
                  )}
                </div>
                <span className="text-[13px] text-foreground" style={{ fontFamily: "monospace" }}>{label}</span>
              </div>
            ))}
          </div>
          {approved && (
            <div className="mx-4 mb-4 rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(41,72,61,0.06)", border: "1.5px solid rgba(41,72,61,0.16)", animation: "stampIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
              <span className="text-2xl select-none">✅</span>
              <div>
                <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-primary">Evidence Accepted</p>
                <p className="text-xs text-muted-foreground mt-0.5">Marimo recognizes your compliance.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Abandon Dialog ────────────────────────────────────────────────────────────
export function AbandonDialog({ bounty, onConfirm, onCancel }: { bounty: number; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.38)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-sm bg-card rounded-3xl border border-border p-6 space-y-5" style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.18)", animation: "stampIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
        <div className="flex flex-col items-center gap-3 text-center">
          <img src={marimoIdle} alt="Marimo watching" className="w-20 h-auto object-contain" />
          <div>
            <h3 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-xl text-primary">Leaving so soon?</h3>
            <p className="text-sm text-muted-foreground mt-1 italic leading-snug">"Marimo requires a reason for the quarterly report."</p>
          </div>
        </div>
        <div className="bg-secondary rounded-2xl p-4 text-center space-y-1">
          <p className="text-sm text-foreground">Canceling releases your</p>
          <p className="text-2xl font-bold text-accent">${bounty} bounty</p>
          <p className="text-xs text-muted-foreground">No treats will be earned. Marimo will note this.</p>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={onCancel} className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-sm">Keep my commitment</button>
          <button onClick={onConfirm} className="w-full py-2.5 rounded-2xl text-destructive text-sm font-semibold hover:bg-secondary transition-colors">Cancel commitment</button>
        </div>
      </div>
    </div>
  );
}

// ── Grace Period Reviewing Animation ─────────────────────────────────────────
export function GraceReviewingAnimation({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [stamped, setStamped] = useState(false);
  const [out, setOut] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const at = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); timers.current.push(id); };
    at(150,  () => setStep(1));
    at(800,  () => { setStep(2); playCheckSound(); });
    at(1500, () => { setStep(3); playCheckSound(); });
    at(2200, () => { setStep(4); playCheckSound(); });
    at(2900, () => { setStep(5); playCheckSound(); });
    at(3500, () => { setStamped(true); playStampSound(); });
    at(4300, () => setOut(true));
    at(4700, () => doneRef.current());
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const steps = ["Reviewing completion claim…", "Checking original agreement…", "Examining submitted evidence…", "Verifying timeline…", "Consulting management…"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(255,248,236,0.96)", backdropFilter: "blur(10px)", opacity: out ? 0 : 1, transition: "opacity 0.5s ease" }}>
      <div className="w-72 sm:w-80 space-y-4">
        <div className="flex justify-center"><img src={marimoLaptop} alt="Marimo" className="w-24 h-auto object-contain" /></div>
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFDF7", border: "1.5px solid rgba(41,72,61,0.16)", boxShadow: "0 4px 40px rgba(41,72,61,0.08)" }}>
          <div className="px-4 py-2.5" style={{ borderBottom: "1px solid rgba(41,72,61,0.09)", background: "rgba(41,72,61,0.02)" }}>
            <p className="text-center text-[10px] font-bold tracking-[0.22em] uppercase text-primary" style={{ fontFamily: "monospace" }}>Late Completion Review · Marimo Inc.</p>
          </div>
          <div className="px-5 py-4 space-y-1">
            {steps.map((label, i) => (
              <div key={i} className="flex items-center gap-3 py-1" style={{ opacity: step > i ? 1 : step === i ? 0.5 : 0.18, transition: "opacity 0.35s ease" }}>
                <div className="w-4 flex-shrink-0 flex items-center justify-center">
                  {step === i + 1 && !stamped ? <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: "#29483D", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                    : step > i || stamped ? <span className="text-[11px] font-bold text-primary">✓</span>
                    : <div className="w-2 h-2 rounded-full bg-border" />}
                </div>
                <span className="text-[13px] text-foreground" style={{ fontFamily: "monospace" }}>{label}</span>
              </div>
            ))}
          </div>
          {stamped && (
            <div className="mx-4 mb-4 rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(41,72,61,0.06)", border: "1.5px solid rgba(41,72,61,0.16)", animation: "stampIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
              <span className="text-2xl select-none">⚖️</span>
              <div>
                <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-primary">Commitment Upheld</p>
                <p className="text-xs text-muted-foreground mt-0.5">Late report. On-time completion.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Dispute Reviewing Animation ───────────────────────────────────────────────
export function DisputeReviewingAnimation({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [stamped, setStamped] = useState(false);
  const [out, setOut] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const at = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); timers.current.push(id); };
    at(200,  () => setStep(1));
    at(900,  () => { setStep(2); playCheckSound(); });
    at(1700, () => { setStep(3); playCheckSound(); });
    at(2500, () => { setStep(4); playCheckSound(); });
    at(3400, () => { setStep(5); playCheckSound(); });
    at(4200, () => { setStamped(true); playStampSound(); });
    at(5000, () => setOut(true));
    at(5400, () => doneRef.current());
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const steps = ["Opening case file…", "Reviewing original terms…", "Examining submitted evidence…", "Checking for suspicious excuses…", "Consulting Marimo…"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(255,248,236,0.96)", backdropFilter: "blur(10px)", opacity: out ? 0 : 1, transition: "opacity 0.5s ease" }}>
      <div className="w-72 sm:w-80 space-y-4">
        <div className="flex justify-center"><img src={marimoIdle} alt="Marimo" className="w-24 h-auto object-contain" /></div>
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFDF7", border: "1.5px solid rgba(41,72,61,0.16)", boxShadow: "0 4px 40px rgba(41,72,61,0.08)" }}>
          <div className="px-4 py-2.5" style={{ borderBottom: "1px solid rgba(41,72,61,0.09)", background: "rgba(41,72,61,0.02)" }}>
            <p className="text-center text-[10px] font-bold tracking-[0.22em] uppercase text-primary" style={{ fontFamily: "monospace" }}>Office of Appeals · Marimo Inc.</p>
          </div>
          <div className="px-5 py-4 space-y-1">
            {steps.map((label, i) => (
              <div key={i} className="flex items-center gap-3 py-1" style={{ opacity: step > i ? 1 : step === i ? 0.5 : 0.18, transition: "opacity 0.35s ease" }}>
                <div className="w-4 flex-shrink-0 flex items-center justify-center">
                  {step === i + 1 && !stamped ? <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: "#29483D", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                    : step > i || stamped ? <span className="text-[11px] font-bold text-primary">✓</span>
                    : <div className="w-2 h-2 rounded-full bg-border" />}
                </div>
                <span className="text-[13px] text-foreground" style={{ fontFamily: "monospace" }}>{label}</span>
              </div>
            ))}
          </div>
          {stamped && (
            <div className="mx-4 mb-4 rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(41,72,61,0.06)", border: "1.5px solid rgba(41,72,61,0.16)", animation: "stampIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
              <span className="text-2xl select-none">📋</span>
              <div>
                <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-primary">Review Complete</p>
                <p className="text-xs text-muted-foreground mt-0.5">Ruling is being prepared.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Cinematic Failure ─────────────────────────────────────────────────────────
export function CinematicFailure({ bounty, onAnimationEnd }: { bounty: number; onAnimationEnd: () => void }) {
  const [phase, setPhase] = useState<CinematicPhase>("freeze");
  const [reviewStep, setReviewStep] = useState(-1);
  const [panelIn, setPanelIn] = useState(false);
  const [decisionIn, setDecisionIn] = useState(false);
  const [coinState, setCoinState] = useState<"hidden" | "present" | "squash" | "launch">("hidden");
  const [shaking, setShaking] = useState(false);
  const [spaceIn, setSpaceIn] = useState(false);
  const [msgIn, setMsgIn] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const endRef = useRef(onAnimationEnd);
  endRef.current = onAnimationEnd;

  useEffect(() => {
    const at = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); timers.current.push(id); };
    at(300,   () => { setPanelIn(true); setReviewStep(0); });
    at(1500,  () => { setReviewStep(1); playCheckSound(); });
    at(2350,  () => { setReviewStep(2); playCheckSound(); });
    at(3200,  () => { setReviewStep(3); playCheckSound(); });
    at(4100,  () => setPanelIn(false));
    at(4450,  () => { setPhase("decision"); setDecisionIn(true); playDecisionStinger(); });
    at(5600,  () => setDecisionIn(false));
    at(5950,  () => { setPhase("swat"); setCoinState("present"); });
    at(6300,  () => setCoinState("squash"));
    at(6450,  () => { setShaking(true); setCoinState("launch"); playCoinLaunchSound(); });
    at(6720,  () => setShaking(false));
    at(7000,  () => { setPhase("space"); setSpaceIn(true); playSpaceAmbient(); });
    at(8400,  () => setMsgIn(true));
    at(11000, () => { setSpaceIn(false); setMsgIn(false); });
    at(11600, () => endRef.current());
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const bg = phase === "freeze" ? "rgba(0,0,0,0.38)" : phase === "review" ? "rgba(0,0,0,0.62)" : phase === "decision" ? "#0b1811" : phase === "swat" ? "#FFF8EC" : "transparent";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden" style={{ backgroundColor: bg, transition: "background-color 0.5s ease", backdropFilter: phase === "freeze" ? "blur(0.4px) brightness(0.78)" : "none", animation: shaking ? "cinematicShake 0.28s ease-out" : "none" }}>
      {(phase === "freeze" || phase === "review") && (
        <div style={{ opacity: panelIn ? 1 : 0, transform: panelIn ? "translateY(0) scale(1)" : "translateY(10px) scale(0.97)", transition: "opacity 0.4s cubic-bezier(0.22,1,0.36,1), transform 0.4s cubic-bezier(0.22,1,0.36,1)" }}>
          <div className="w-72 sm:w-80 rounded-2xl overflow-hidden" style={{ background: "#0c1a12", border: "1px solid rgba(229,169,61,0.32)", boxShadow: "0 0 0 1px rgba(229,169,61,0.08), 0 24px 60px rgba(0,0,0,0.9)" }}>
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid rgba(229,169,61,0.18)", background: "rgba(229,169,61,0.05)" }}>
              <div className="flex gap-1.5">{["#ff5f57","#ffbd2e","#28c840"].map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: 0.8 }} />)}</div>
              <p className="flex-1 text-center text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: "#E5A93D", fontFamily: "monospace" }}>Executive Review</p>
            </div>
            <div className="px-5 py-4 space-y-3.5" style={{ fontFamily: "monospace" }}>
              <div className="flex items-center gap-3" style={{ opacity: reviewStep >= 0 ? 1 : 0, transform: reviewStep >= 0 ? "translateY(0)" : "translateY(5px)", transition: "opacity 0.3s ease, transform 0.3s ease" }}>
                <div className="w-4 flex-shrink-0 flex items-center justify-center">
                  {reviewStep === 0 ? <div className="w-3 h-3 rounded-full border-2 border-t-transparent" style={{ borderColor: "#E5A93D", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} /> : <span style={{ color: "rgba(163,184,175,0.35)", fontSize: 12 }}>·</span>}
                </div>
                <span className="text-[13px]" style={{ color: reviewStep === 0 ? "#8dac9a" : "rgba(141,172,154,0.3)" }}>
                  Reviewing
                  {reviewStep === 0 && (<><span className="reviewing-dot" style={{ animationDelay: "0s" }}>.</span><span className="reviewing-dot" style={{ animationDelay: "0.28s" }}>.</span><span className="reviewing-dot" style={{ animationDelay: "0.56s" }}>.</span></>)}
                  {reviewStep > 0 && "..."}
                </span>
              </div>
              {[{ label: "Deadline Missed", step: 1, gold: false }, { label: "Excuse Rejected", step: 2, gold: false }, { label: "Executive Approval Granted", step: 3, gold: true }].map(item => (
                <div key={item.step} className="flex items-start gap-3" style={{ opacity: reviewStep >= item.step ? 1 : 0, transform: reviewStep >= item.step ? "translateY(0)" : "translateY(6px)", transition: "opacity 0.45s cubic-bezier(0.34,1.56,0.64,1), transform 0.45s cubic-bezier(0.34,1.56,0.64,1)" }}>
                  <div className="w-4 flex-shrink-0 flex items-center justify-center pt-0.5"><span className="text-xs font-bold" style={{ color: item.gold ? "#E5A93D" : "#4ade80" }}>✓</span></div>
                  <span className="text-[13px] leading-snug" style={{ color: item.gold ? "#E5A93D" : "#b8d8c6" }}>{item.label}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 text-center" style={{ borderTop: "1px solid rgba(229,169,61,0.12)", background: "rgba(229,169,61,0.03)", opacity: reviewStep >= 3 ? 1 : 0, transition: "opacity 0.6s ease 0.3s" }}>
              <p className="text-[9px] tracking-[0.18em] uppercase" style={{ color: "rgba(229,169,61,0.4)", fontFamily: "monospace" }}>Orbital Allocation Department · Marimo Inc.</p>
            </div>
          </div>
        </div>
      )}
      {phase === "decision" && (
        <div className="text-center px-8 max-w-sm space-y-7" style={{ opacity: decisionIn ? 1 : 0, transform: decisionIn ? "translateY(0)" : "translateY(6px)", transition: "opacity 0.55s ease, transform 0.55s ease" }}>
          <img src={marimoIdle} alt="Marimo" className="w-28 sm:w-32 h-auto mx-auto object-contain" style={{ filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.8))" }} />
          <div className="space-y-2">
            <p className="text-[9px] tracking-[0.28em] uppercase font-bold" style={{ color: "rgba(229,169,61,0.55)", fontFamily: "monospace" }}>Official Statement — Marimo Inc.</p>
            <h2 className="text-2xl sm:text-3xl leading-snug" style={{ color: "#F7F0E4", fontFamily: "'DM Serif Display', serif" }}>Marimo has made<br />an executive decision.</h2>
          </div>
        </div>
      )}
      {phase === "swat" && (
        <div className="flex flex-col items-center relative">
          <div className="relative">
            <img src={marimoBountyYeet} alt="Marimo" className="w-44 sm:w-56 h-auto object-contain" style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.1))" }} />
            {coinState !== "hidden" && (
              <span className="absolute text-3xl select-none pointer-events-none" style={{ top: "22%", left: "62%", lineHeight: 1, transformOrigin: "center center", animation: coinState === "present" ? "coinAppear 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards" : coinState === "squash" ? "coinSquash 0.16s ease-in-out forwards" : "coinLaunch 0.72s cubic-bezier(0.12,0.8,0.3,1) forwards" }}>💰</span>
            )}
            {coinState === "launch" && [{ dx: "55px", dy: "-110px", delay: "0.04s", e: "✨", t: "18%", l: "68%" }, { dx: "100px", dy: "-200px", delay: "0.10s", e: "⭐", t: "10%", l: "71%" }, { dx: "75px", dy: "-155px", delay: "0.17s", e: "💫", t: "6%", l: "64%" }, { dx: "135px", dy: "-270px", delay: "0.07s", e: "✨", t: "3%", l: "73%" }].map((p, i) => (
              <span key={i} className="absolute text-base pointer-events-none select-none" style={{ top: p.t, left: p.l, "--tx": p.dx, "--ty": p.dy, animation: `sparkleTrail 1.1s ease-out ${p.delay} forwards` } as React.CSSProperties}>{p.e}</span>
            ))}
          </div>
          <p className="mt-5 text-sm tracking-wide" style={{ color: "#29483D", fontFamily: "monospace", opacity: 0.4 }}>{coinState === "launch" ? "Allocation complete." : "Initiating consequence protocol…"}</p>
        </div>
      )}
      {phase === "space" && (
        <div className="absolute inset-0" style={{ opacity: spaceIn ? 1 : 0, transition: "opacity 0.85s ease" }}>
          <svg viewBox="0 0 800 480" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
            <defs>
              <radialGradient id="spaceBg" cx="50%" cy="50%" r="72%"><stop offset="0%" stopColor="#0e1225"/><stop offset="100%" stopColor="#020308"/></radialGradient>
              <radialGradient id="earthBase" cx="36%" cy="30%" r="62%"><stop offset="0%" stopColor="#5bbef8"/><stop offset="32%" stopColor="#2873cc"/><stop offset="100%" stopColor="#05102a"/></radialGradient>
              <radialGradient id="earthAtmo" cx="50%" cy="50%" r="50%"><stop offset="68%" stopColor="transparent"/><stop offset="86%" stopColor="#6cb4f0" stopOpacity="0.28"/><stop offset="100%" stopColor="#9ed4ff" stopOpacity="0"/></radialGradient>
              <radialGradient id="earthGlow" cx="50%" cy="50%" r="50%"><stop offset="60%" stopColor="transparent"/><stop offset="100%" stopColor="#3d8bd4" stopOpacity="0.14"/></radialGradient>
              <radialGradient id="vignette" cx="50%" cy="50%" r="70%"><stop offset="45%" stopColor="transparent"/><stop offset="100%" stopColor="rgba(0,0,0,0.65)"/></radialGradient>
              <path id="orbitPath" d="M 538,248 A 148,50 0 0,1 242,248 A 148,50 0 0,1 538,248" />
            </defs>
            <rect width="800" height="480" fill="url(#spaceBg)"/>
            {STARS.map((star, i) => (
              <circle key={i} cx={star.cx} cy={star.cy} r={star.r} fill="white" opacity={star.op}>
                <animate attributeName="opacity" values={`${star.op.toFixed(2)};${(star.op * 0.22).toFixed(2)};${star.op.toFixed(2)}`} dur={`${star.dur.toFixed(1)}s`} repeatCount="indefinite" begin={`${star.delay.toFixed(1)}s`} />
              </circle>
            ))}
            <circle cx="390" cy="268" r="112" fill="url(#earthGlow)"/><circle cx="390" cy="268" r="84" fill="#040e1e"/><circle cx="390" cy="268" r="82" fill="url(#earthBase)"/>
            <path d="M374,240 C383,231 397,229 407,236 C417,243 419,253 413,262 C408,270 396,272 387,266 C378,260 368,250 374,240Z" fill="#2d6a4f" opacity="0.88"/>
            <path d="M349,255 C356,247 369,245 378,251 C387,257 388,268 383,276 C378,283 366,284 358,279 C350,274 346,263 349,255Z" fill="#40916c" opacity="0.78"/>
            <ellipse cx="390" cy="188" rx="17" ry="7.5" fill="white" opacity="0.74"/>
            <circle cx="390" cy="268" r="82" fill="url(#earthAtmo)"/>
            <ellipse cx="390" cy="248" rx="148" ry="50" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" strokeDasharray="3 7"/>
            <g><animateMotion dur="7s" repeatCount="indefinite" rotate="0"><mpath href="#orbitPath"/></animateMotion><text fontSize="19" textAnchor="middle" dominantBaseline="middle" style={{ userSelect: "none" }}>💰</text></g>
            <rect width="800" height="480" fill="url(#vignette)"/>
            <g style={{ opacity: msgIn ? 1 : 0, transition: "opacity 0.9s ease" }}>
              <text x="390" y="406" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.3)" fontFamily="monospace" letterSpacing="2">MISSION REPORT — MARIMO INC.</text>
              <text x="390" y="430" textAnchor="middle" fontSize="15.5" fill="rgba(252,245,230,0.9)" fontFamily="'DM Serif Display', serif">{`Your $${bounty} bounty has entered low Earth orbit.`}</text>
            </g>
          </svg>
        </div>
      )}
    </div>
  );
}
