import { useState, useEffect, useCallback, useRef } from "react";
import { Clock, Settings, RotateCcw, ChevronDown, ChevronUp, X, Flame } from "lucide-react";
import marimoIdle from "../imports/marimo-idle.png";
import marimoLaptop from "../imports/marimo-laptop.png";
import marimoTreatPaw from "../imports/marimo-treat-paw.png";
import marimoBountyYeet from "../imports/marimo-bounty-yeet.png";
import marimoAvatar from "../imports/marimo-avatar.png";

// ── Types ────────────────────────────────────────────────────────────────────
type AppState = "new" | "accepting" | "active" | "proof" | "reviewing" | "success" | "cinematic" | "failed";
type ProofType = "honor" | "screenshot" | "link";
type CinematicPhase = "freeze" | "review" | "decision" | "swat" | "space";

interface Commitment {
  id: string;
  task: string;
  note: string;
  deadline: string;
  bounty: number;
  proofType: ProofType;
  createdAt: string;
}

interface HistoryEntry {
  id: string;
  task: string;
  deadline: string;
  bounty: number;
  result: "success" | "failed" | "abandoned";
  treatEarned: boolean;
  completedAt: string;
}

interface TimeLeft {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface FutureFund {
  name: string;
  target: number | null;
}

interface Preferences {
  defaultProof: ProofType;
  typicalLength: "day" | "week" | "month";
}

// ── Constants ────────────────────────────────────────────────────────────────
const DEMO_COMMITMENT: Commitment = {
  id: "demo-seed",
  task: "Finish portfolio case study",
  note: "The one that has been sitting in drafts since February.",
  deadline: (() => {
    const d = new Date();
    d.setHours(22, 0, 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
    return d.toISOString();
  })(),
  bounty: 25,
  proofType: "link",
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
};

const DEFAULT_FUND: FutureFund = { name: "Future Fund", target: null };
const DEFAULT_PREFS: Preferences = { defaultProof: "honor", typicalLength: "week" };

const FUND_SUGGESTIONS = ["Japan Trip", "New Laptop", "Emergency Fund", "Home Deposit", "Side Project", "Investment Account"];

const LS = {
  state:      "mb_state",
  commitment: "mb_commitment",
  history:    "mb_history",
  treats:     "mb_treats",
  streak:     "mb_streak",
  onboarded:  "mb_onboarded",
  fund:       "mb_fund",
  prefs:      "mb_prefs",
};

// Deterministic star field for the space scene
function makeStars(n: number) {
  let s = 0xd3a2f1e4;
  const rng = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 0x100000000; };
  return Array.from({ length: n }, () => ({
    cx: rng() * 800, cy: rng() * 480,
    r: 0.25 + rng() * 1.5,
    op: 0.2 + rng() * 0.8,
    dur: 2 + rng() * 5,
    delay: rng() * 4,
  }));
}
const STARS = makeStars(180);

// ── Utilities ────────────────────────────────────────────────────────────────
function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw != null ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function saveLS(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function getTimeLeft(deadline: string): TimeLeft {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    total: diff,
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function judgmentalLine(remaining: number, total: number): string {
  const ratio = remaining / (total || 1);
  if (ratio > 0.72) return "Plenty of time. Allegedly.";
  if (ratio > 0.45) return "Management is monitoring the situation.";
  if (ratio > 0.18) return "She would like to remind you that failure is not free.";
  return "The clock is ticking. Marimo is watching. Always watching.";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDeadline(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function suggestDeadline(typicalLength: Preferences["typicalLength"]): string {
  const d = new Date();
  if (typicalLength === "day") d.setDate(d.getDate() + 1);
  else if (typicalLength === "week") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  d.setHours(23, 59, 0, 0);
  return d.toISOString().slice(0, 16);
}

// ── Sound ────────────────────────────────────────────────────────────────────
function playCheckSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1760, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1050, ctx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.16);
    setTimeout(() => ctx.close(), 500);
  } catch {}
}

function playStampSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(280, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.25);
    setTimeout(() => ctx.close(), 600);
  } catch {}
}

function playDecisionStinger() {
  try {
    const ctx = new AudioContext();
    [110, 130.8, 164.8].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.11, ctx.currentTime + i * 0.05 + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.05);
      osc.stop(ctx.currentTime + 1.6);
    });
    setTimeout(() => ctx.close(), 2500);
  } catch {}
}

function playCoinLaunchSound() {
  try {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.48, ctx.currentTime);
    master.connect(ctx.destination);

    const click = ctx.createOscillator();
    const cg = ctx.createGain();
    click.type = "sine"; click.frequency.value = 180;
    cg.gain.setValueAtTime(0.5, ctx.currentTime);
    cg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    click.connect(cg); cg.connect(master);
    click.start(); click.stop(ctx.currentTime + 0.06);

    const whoosh = ctx.createOscillator();
    const wg = ctx.createGain();
    const wf = ctx.createBiquadFilter();
    whoosh.type = "sawtooth";
    whoosh.frequency.setValueAtTime(90, ctx.currentTime + 0.03);
    whoosh.frequency.exponentialRampToValueAtTime(3800, ctx.currentTime + 0.95);
    wf.type = "bandpass"; wf.frequency.value = 900; wf.Q.value = 1.1;
    wg.gain.setValueAtTime(0, ctx.currentTime + 0.03);
    wg.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.14);
    wg.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.9);
    wg.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.15);
    whoosh.connect(wf); wf.connect(wg); wg.connect(master);
    whoosh.start(ctx.currentTime + 0.03); whoosh.stop(ctx.currentTime + 1.15);

    const ping = ctx.createOscillator();
    const pg = ctx.createGain();
    ping.type = "sine";
    ping.frequency.setValueAtTime(2600, ctx.currentTime + 0.45);
    ping.frequency.exponentialRampToValueAtTime(650, ctx.currentTime + 1.05);
    pg.gain.setValueAtTime(0.32, ctx.currentTime + 0.45);
    pg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1);
    ping.connect(pg); pg.connect(master);
    ping.start(ctx.currentTime + 0.45); ping.stop(ctx.currentTime + 1.1);

    const hiss = ctx.createOscillator();
    const hg = ctx.createGain();
    const hf = ctx.createBiquadFilter();
    hiss.type = "sawtooth"; hiss.frequency.value = 6000;
    hf.type = "highpass"; hf.frequency.value = 3500;
    hg.gain.setValueAtTime(0.16, ctx.currentTime + 0.85);
    hg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);
    hiss.connect(hf); hf.connect(hg); hg.connect(master);
    hiss.start(ctx.currentTime + 0.85); hiss.stop(ctx.currentTime + 2.0);

    setTimeout(() => ctx.close(), 2500);
  } catch {}
}

function playSpaceAmbient() {
  try {
    const ctx = new AudioContext();
    [65.4, 98.0, 130.8].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.4);
      osc.frequency.linearRampToValueAtTime(freq * 1.008, ctx.currentTime + i * 0.4 + 3.5);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.4);
      gain.gain.linearRampToValueAtTime(0.038, ctx.currentTime + i * 0.4 + 1.2);
      gain.gain.linearRampToValueAtTime(0.038, ctx.currentTime + i * 0.4 + 2.5);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.4 + 3.8);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.4);
      osc.stop(ctx.currentTime + i * 0.4 + 3.9);
    });
    setTimeout(() => ctx.close(), 6000);
  } catch {}
}

// ── Onboarding Flow ───────────────────────────────────────────────────────────
function OnboardingFlow({ onComplete }: {
  onComplete: (fund: FutureFund, prefs: Preferences) => void;
}) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  // Fund
  const [fundName, setFundName]     = useState("");
  const [fundTarget, setFundTarget] = useState("");

  // Prefs
  const [defaultProof, setDefaultProof]     = useState<ProofType>("honor");
  const [typicalLength, setTypicalLength]   = useState<Preferences["typicalLength"]>("week");

  const TOTAL_STEPS = 4;

  function transition(nextStep: number) {
    setVisible(false);
    setTimeout(() => {
      setStep(nextStep);
      setVisible(true);
    }, 210);
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

  function retreat() {
    if (step > 0) transition(step - 1);
  }

  const ctaLabel = [
    "Get started",
    "Got it",
    "Save my goal",
    "Create my first commitment",
  ][step];

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ fontFamily: "'Nunito Sans', system-ui, sans-serif" }}>

      {/* Progress pip track */}
      <div className="flex justify-center pt-10 pb-2 gap-1.5" aria-hidden>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === step ? 22 : 6,
              height: 6,
              background: i < step ? "rgba(41,72,61,0.35)" : i === step ? "#29483D" : "rgba(41,72,61,0.14)",
            }}
          />
        ))}
      </div>

      {/* Step content */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-5 py-6"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.21s ease, transform 0.21s ease",
        }}
      >
        <div className="w-full max-w-sm space-y-6">

          {/* ── Step 0: Meet Marimo ─────────────────────── */}
          {step === 0 && (
            <>
              <div className="flex justify-center">
                <img
                  src={marimoLaptop}
                  alt="Marimo the calico cat"
                  className="w-44 h-auto object-contain drop-shadow-sm"
                />
              </div>

              <div className="space-y-3 text-center">
                <h1
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                  className="text-[2rem] leading-tight text-primary"
                >
                  Marimo helps you keep promises to your future self.
                </h1>
                <p className="text-base text-muted-foreground leading-relaxed">
                  You already know how to make a to-do list.<br />
                  Marimo is here to make sure you actually do it.
                </p>
              </div>

              <div
                className="rounded-2xl px-5 py-4 text-sm text-muted-foreground text-center leading-snug"
                style={{ background: "rgba(41,72,61,0.04)", border: "1px solid rgba(41,72,61,0.1)" }}
              >
                No payment setup required to get started. Connect one when you're ready to raise the real stakes.
              </div>
            </>
          )}

          {/* ── Step 1: How it works ────────────────────── */}
          {step === 1 && (
            <>
              <div className="space-y-1.5 text-center">
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-muted-foreground">
                  How it works
                </p>
                <h1
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                  className="text-[1.75rem] leading-snug text-primary"
                >
                  Simple stakes.<br />Real accountability.
                </h1>
              </div>

              <div className="space-y-3">
                {/* Success */}
                <div
                  className="rounded-2xl p-4 flex items-start gap-3.5"
                  style={{ background: "rgba(41,72,61,0.05)", border: "1.5px solid rgba(41,72,61,0.13)" }}
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-sm">✓</span>
                  </div>
                  <div>
                    <p className="font-bold text-primary text-sm">You finish on time</p>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                      Bounty stays safe — it goes toward your goal. Marimo earns a treat. Your streak grows.
                    </p>
                  </div>
                </div>

                {/* Failure */}
                <div
                  className="rounded-2xl p-4 flex items-start gap-3.5"
                  style={{ background: "rgba(192,57,43,0.04)", border: "1.5px solid rgba(192,57,43,0.13)" }}
                >
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "#C0392B" }}
                  >
                    <span className="text-white font-bold text-sm">✕</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: "#C0392B" }}>You miss the deadline</p>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                      Marimo claims the bounty. She sends it to low Earth orbit. No exceptions. It's in the contract.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dual Marimo visual */}
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

          {/* ── Step 2: Create Future Fund ──────────────── */}
          {step === 2 && (
            <>
              <div className="flex justify-center">
                <img src={marimoIdle} alt="Marimo" className="w-28 h-auto object-contain" />
              </div>

              <div className="space-y-1.5 text-center">
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-muted-foreground">
                  Future Fund
                </p>
                <h1
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                  className="text-[1.75rem] leading-snug text-primary"
                >
                  What are you working toward?
                </h1>
                <p className="text-sm text-muted-foreground leading-snug">
                  Give your bounties somewhere meaningful to go when you succeed. Make it worth fighting for.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-foreground">Fund name</label>
                  <input
                    type="text"
                    value={fundName}
                    onChange={e => setFundName(e.target.value)}
                    placeholder="e.g. Japan Trip, New Laptop…"
                    className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none placeholder:text-muted-foreground transition-colors text-foreground"
                    autoFocus
                  />
                </div>

                {/* Suggestion chips */}
                <div className="flex flex-wrap gap-2">
                  {FUND_SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => setFundName(s)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                      style={{
                        background:   fundName === s ? "rgba(41,72,61,0.09)" : "transparent",
                        borderColor:  fundName === s ? "rgba(41,72,61,0.28)" : "rgba(41,72,61,0.14)",
                        color:        fundName === s ? "#29483D" : "#5E7268",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-foreground">
                    Target amount <span className="font-normal text-muted-foreground text-xs">(optional)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-foreground">$</span>
                    <input
                      type="number"
                      value={fundTarget}
                      onChange={e => setFundTarget(e.target.value)}
                      placeholder="500"
                      min="1"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  {fundTarget && parseFloat(fundTarget) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      At $25 per commitment, that's about {Math.ceil(parseFloat(fundTarget) / 25)} commitments to get there.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Step 3: Accountability preferences ─────── */}
          {step === 3 && (
            <>
              <div className="space-y-1.5 text-center">
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-muted-foreground">
                  Your defaults
                </p>
                <h1
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                  className="text-[1.75rem] leading-snug text-primary"
                >
                  Set your accountability style.
                </h1>
                <p className="text-sm text-muted-foreground">
                  You can change these on any commitment.
                </p>
              </div>

              <div className="space-y-5">
                {/* Proof preference */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-foreground">Default completion proof</label>
                  <p className="text-xs text-muted-foreground -mt-1">How will Marimo know you finished?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { v: "honor",      label: "Honor system", icon: "🤞" },
                      { v: "screenshot", label: "Screenshot",   icon: "📸" },
                      { v: "link",       label: "Paste link",   icon: "🔗" },
                    ] as { v: ProofType; label: string; icon: string }[]).map(opt => (
                      <button
                        key={opt.v}
                        onClick={() => setDefaultProof(opt.v)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-bold transition-colors ${defaultProof === opt.v ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground border-transparent hover:border-primary/25"}`}
                      >
                        <span className="text-xl leading-none">{opt.icon}</span>
                        <span className="text-center leading-tight">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Typical length */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-foreground">Typical commitment length</label>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Used to suggest a deadline when you create a task.
                  </p>
                  <div className="flex gap-2">
                    {([
                      { v: "day",   label: "One day" },
                      { v: "week",  label: "One week" },
                      { v: "month", label: "One month" },
                    ] as { v: Preferences["typicalLength"]; label: string }[]).map(opt => (
                      <button
                        key={opt.v}
                        onClick={() => setTypicalLength(opt.v)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-colors ${typicalLength === opt.v ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground border-transparent hover:border-primary/25"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview summary */}
                <div
                  className="rounded-2xl p-4 space-y-2"
                  style={{ background: "rgba(41,72,61,0.04)", border: "1.5px solid rgba(41,72,61,0.1)" }}
                >
                  <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-foreground">
                    Your setup
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Proof</span>
                    <span className="font-semibold text-foreground capitalize">{defaultProof === "honor" ? "Honor system" : defaultProof === "screenshot" ? "Screenshot" : "Link"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Deadline window</span>
                    <span className="font-semibold text-foreground">{typicalLength === "day" ? "One day" : typicalLength === "week" ? "One week" : "One month"}</span>
                  </div>
                  {fundName.trim() && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Future Fund</span>
                      <span className="font-semibold text-accent">{fundName.trim()}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer nav */}
      <div className="px-5 pb-10 flex flex-col gap-2 w-full max-w-sm mx-auto">
        <button
          onClick={advance}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:opacity-90 active:scale-[0.985] transition-all shadow-sm"
        >
          {ctaLabel}
        </button>
        {step > 0 ? (
          <button
            onClick={retreat}
            className="w-full py-2.5 rounded-2xl text-muted-foreground text-sm font-semibold hover:bg-secondary transition-colors"
          >
            Back
          </button>
        ) : (
          <p className="text-center text-xs text-muted-foreground py-1">
            No account required. No spam.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Accepting Animation ───────────────────────────────────────────────────────
function AcceptingAnimation({ task, bounty, onDone }: { task: string; bounty: number; onDone: () => void }) {
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
    at(1350, () => { setStep(2); playCheckSound(); });
    at(2000, () => { setStep(3); playCheckSound(); });
    at(2700, () => { setStamped(true); playStampSound(); });
    at(3500, () => setOut(true));
    at(4000, () => doneRef.current());
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const steps = ["Reviewing terms…", "Evaluating excuses…", "Informing Marimo…"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: "rgba(255,248,236,0.96)",
        backdropFilter: "blur(10px)",
        opacity: out ? 0 : 1,
        transition: "opacity 0.6s ease",
      }}
    >
      <div
        className="w-72 sm:w-80 space-y-4"
        style={{
          opacity: panelIn ? 1 : 0,
          transform: panelIn ? "translateY(0) scale(1)" : "translateY(14px) scale(0.96)",
          transition: "opacity 0.45s cubic-bezier(0.22,1,0.36,1), transform 0.45s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div className="flex justify-center">
          <img src={marimoLaptop} alt="Marimo reviewing" className="w-28 h-auto object-contain" />
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFDF7", border: "1.5px solid rgba(41,72,61,0.16)", boxShadow: "0 4px 40px rgba(41,72,61,0.08)" }}>
          <div className="flex items-center px-4 py-2.5" style={{ borderBottom: "1px solid rgba(41,72,61,0.09)", background: "rgba(41,72,61,0.02)" }}>
            <p className="flex-1 text-center text-[10px] font-bold tracking-[0.22em] uppercase text-primary" style={{ fontFamily: "monospace" }}>Commitment Review</p>
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
                <p className="text-xs text-muted-foreground mt-0.5">Marimo has been informed.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reviewing Animation ───────────────────────────────────────────────────────
function ReviewingAnimation({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [approved, setApproved] = useState(false);
  const [out, setOut] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const at = (ms: number, fn: () => void) => { const id = setTimeout(fn, ms); timers.current.push(id); };
    at(150,  () => setStep(1));
    at(750,  () => { setStep(2); playCheckSound(); });
    at(1450, () => { setStep(3); playCheckSound(); });
    at(2100, () => { setApproved(true); playStampSound(); });
    at(2800, () => setOut(true));
    at(3200, () => doneRef.current());
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const reviewSteps = ["Receiving evidence…", "Checking for suspicious behavior…", "Consulting management…"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(255,248,236,0.96)", backdropFilter: "blur(10px)", opacity: out ? 0 : 1, transition: "opacity 0.5s ease" }}>
      <div className="w-72 sm:w-80 space-y-4">
        <div className="flex justify-center">
          <img src={marimoIdle} alt="Marimo reviewing" className="w-24 h-auto object-contain" />
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFDF7", border: "1.5px solid rgba(41,72,61,0.16)", boxShadow: "0 4px 40px rgba(41,72,61,0.08)" }}>
          <div className="px-4 py-2.5" style={{ borderBottom: "1px solid rgba(41,72,61,0.09)", background: "rgba(41,72,61,0.02)" }}>
            <p className="text-center text-[10px] font-bold tracking-[0.22em] uppercase text-primary" style={{ fontFamily: "monospace" }}>Evidence Review</p>
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
function AbandonDialog({ bounty, onConfirm, onCancel }: { bounty: number; onConfirm: () => void; onCancel: () => void }) {
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
          <p className="text-sm text-foreground">Abandoning releases your</p>
          <p className="text-2xl font-bold text-accent">${bounty} bounty</p>
          <p className="text-xs text-muted-foreground">No treats will be earned. Marimo will note this.</p>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={onCancel} className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-sm">Keep my commitment</button>
          <button onClick={onConfirm} className="w-full py-2.5 rounded-2xl text-destructive text-sm font-semibold hover:bg-secondary transition-colors">Abandon commitment</button>
        </div>
      </div>
    </div>
  );
}

// ── Cinematic Failure ────────────────────────────────────────────────────────
function CinematicFailure({ bounty, onAnimationEnd }: { bounty: number; onAnimationEnd: () => void }) {
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

  const bg =
    phase === "freeze"    ? "rgba(0,0,0,0.38)"
    : phase === "review"  ? "rgba(0,0,0,0.62)"
    : phase === "decision"? "#0b1811"
    : phase === "swat"    ? "#FFF8EC"
    : "transparent";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden" style={{ backgroundColor: bg, transition: "background-color 0.5s ease", backdropFilter: phase === "freeze" ? "blur(0.4px) brightness(0.78)" : "none", animation: shaking ? "cinematicShake 0.28s ease-out" : "none" }}>

      {(phase === "freeze" || phase === "review") && (
        <div style={{ opacity: panelIn ? 1 : 0, transform: panelIn ? "translateY(0) scale(1)" : "translateY(10px) scale(0.97)", transition: "opacity 0.4s cubic-bezier(0.22,1,0.36,1), transform 0.4s cubic-bezier(0.22,1,0.36,1)" }}>
          <div className="w-72 sm:w-80 rounded-2xl overflow-hidden" style={{ background: "#0c1a12", border: "1px solid rgba(229,169,61,0.32)", boxShadow: "0 0 0 1px rgba(229,169,61,0.08), 0 24px 60px rgba(0,0,0,0.9)" }}>
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid rgba(229,169,61,0.18)", background: "rgba(229,169,61,0.05)" }}>
              <div className="flex gap-1.5">
                {["#ff5f57","#ffbd2e","#28c840"].map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: 0.8 }} />)}
              </div>
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
              {[
                { label: "Deadline Missed",            step: 1, gold: false },
                { label: "Excuse Rejected",            step: 2, gold: false },
                { label: "Executive Approval Granted", step: 3, gold: true  },
              ].map(item => (
                <div key={item.step} className="flex items-start gap-3" style={{ opacity: reviewStep >= item.step ? 1 : 0, transform: reviewStep >= item.step ? "translateY(0)" : "translateY(6px)", transition: "opacity 0.45s cubic-bezier(0.34,1.56,0.64,1), transform 0.45s cubic-bezier(0.34,1.56,0.64,1)" }}>
                  <div className="w-4 flex-shrink-0 flex items-center justify-center pt-0.5">
                    <span className="text-xs font-bold" style={{ color: item.gold ? "#E5A93D" : "#4ade80" }}>✓</span>
                  </div>
                  <span className="text-[13px] leading-snug" style={{ color: item.gold ? "#E5A93D" : "#b8d8c6" }}>{item.label}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 text-center" style={{ borderTop: "1px solid rgba(229,169,61,0.12)", background: "rgba(229,169,61,0.03)", opacity: reviewStep >= 3 ? 1 : 0, transition: "opacity 0.6s ease 0.3s" }}>
              <p className="text-[9px] tracking-[0.18em] uppercase" style={{ color: "rgba(229,169,61,0.4)", fontFamily: "monospace" }}>Marimo Corp. · Orbital Accountability Division</p>
            </div>
          </div>
        </div>
      )}

      {phase === "decision" && (
        <div className="text-center px-8 max-w-sm space-y-7" style={{ opacity: decisionIn ? 1 : 0, transform: decisionIn ? "translateY(0)" : "translateY(6px)", transition: "opacity 0.55s ease, transform 0.55s ease" }}>
          <img src={marimoIdle} alt="Marimo" className="w-28 sm:w-32 h-auto mx-auto object-contain" style={{ filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.8))" }} />
          <div className="space-y-2">
            <p className="text-[9px] tracking-[0.28em] uppercase font-bold" style={{ color: "rgba(229,169,61,0.55)", fontFamily: "monospace" }}>Official Statement — Marimo Corp.</p>
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
            {coinState === "launch" && [
              { dx: "55px",  dy: "-110px", delay: "0.04s", e: "✨", t: "18%", l: "68%" },
              { dx: "100px", dy: "-200px", delay: "0.10s", e: "⭐", t: "10%", l: "71%" },
              { dx: "75px",  dy: "-155px", delay: "0.17s", e: "💫", t: "6%",  l: "64%" },
              { dx: "135px", dy: "-270px", delay: "0.07s", e: "✨", t: "3%",  l: "73%" },
            ].map((p, i) => (
              <span key={i} className="absolute text-base pointer-events-none select-none" style={{ top: p.t, left: p.l, "--tx": p.dx, "--ty": p.dy, animation: `sparkleTrail 1.1s ease-out ${p.delay} forwards` } as React.CSSProperties}>{p.e}</span>
            ))}
          </div>
          <p className="mt-5 text-sm tracking-wide" style={{ color: "#29483D", fontFamily: "monospace", opacity: 0.4 }}>
            {coinState === "launch" ? "Filing complete." : "Routine administrative action."}
          </p>
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
            <ellipse cx="660" cy="110" rx="160" ry="90" fill="rgba(90,50,170,0.035)"/>
            <ellipse cx="130" cy="390" rx="130" ry="80" fill="rgba(30,90,200,0.035)"/>
            <circle cx="390" cy="268" r="112" fill="url(#earthGlow)"/>
            <circle cx="390" cy="268" r="84"  fill="#040e1e"/>
            <circle cx="390" cy="268" r="82"  fill="url(#earthBase)"/>
            <path d="M374,240 C383,231 397,229 407,236 C417,243 419,253 413,262 C408,270 396,272 387,266 C378,260 368,250 374,240Z" fill="#2d6a4f" opacity="0.88"/>
            <path d="M349,255 C356,247 369,245 378,251 C387,257 388,268 383,276 C378,283 366,284 358,279 C350,274 346,263 349,255Z" fill="#40916c" opacity="0.78"/>
            <path d="M410,260 C418,252 430,250 439,257 C447,264 447,275 441,282 C436,289 424,289 417,283 C410,278 403,268 410,260Z" fill="#2d6a4f" opacity="0.72"/>
            <path d="M370,280 C375,272 385,271 392,276 C399,282 399,291 393,296 C388,301 378,299 373,293 C368,288 366,287 370,280Z" fill="#52b788" opacity="0.66"/>
            <path d="M398,247 C404,241 412,240 417,245 C422,251 421,260 415,264 C409,267 401,264 398,259 C395,254 394,252 398,247Z" fill="#3a8f6a" opacity="0.55"/>
            <ellipse cx="390" cy="188" rx="17" ry="7.5" fill="white" opacity="0.74"/>
            <ellipse cx="390" cy="349" rx="11" ry="5"   fill="white" opacity="0.54"/>
            <circle cx="390" cy="268" r="82"  fill="url(#earthAtmo)"/>
            <circle cx="390" cy="268" r="84"  fill="none" stroke="#7ec8f5" strokeWidth="2.5" opacity="0.17"/>
            <circle cx="390" cy="268" r="89"  fill="none" stroke="#a8d8f0" strokeWidth="1.5" opacity="0.08"/>
            <ellipse cx="390" cy="248" rx="148" ry="50" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" strokeDasharray="3 7"/>
            <text x="553" y="218" fontSize="7.5" fill="rgba(255,255,255,0.28)" fontFamily="monospace" letterSpacing="1.8">LEO</text>
            <line x1="537" y1="222" x2="526" y2="232" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8"/>
            <g>
              <animateMotion dur="7s" repeatCount="indefinite" rotate="0"><mpath href="#orbitPath"/></animateMotion>
              <text fontSize="19" textAnchor="middle" dominantBaseline="middle" style={{ userSelect: "none" }}>💰</text>
            </g>
            <rect width="800" height="480" fill="url(#vignette)"/>
            <g style={{ opacity: msgIn ? 1 : 0, transition: "opacity 0.9s ease" }}>
              <text x="390" y="406" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.3)" fontFamily="monospace" letterSpacing="2">MISSION REPORT — MARIMO CORP.</text>
              <text x="390" y="430" textAnchor="middle" fontSize="15.5" fill="rgba(252,245,230,0.9)" fontFamily="'DM Serif Display', serif">
                {`Your $${bounty} bounty has entered low Earth orbit.`}
              </text>
            </g>
          </svg>
        </div>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [onboarded, setOnboarded] = useState(() => loadLS<boolean>(LS.onboarded, false));
  const [futureFund, setFutureFund] = useState<FutureFund>(() => loadLS(LS.fund, DEFAULT_FUND));
  const [prefs, setPrefs] = useState<Preferences>(() => loadLS(LS.prefs, DEFAULT_PREFS));

  const [appState, setAppState] = useState<AppState>(() => {
    if (!loadLS<boolean>(LS.onboarded, false)) return "new";
    const saved = loadLS<string>(LS.state, "active");
    return (saved === "cinematic" || saved === "accepting" || saved === "reviewing" ? "failed" : saved) as AppState;
  });
  const [commitment, setCommitment] = useState<Commitment | null>(() => {
    if (!loadLS<boolean>(LS.onboarded, false)) return null;
    return loadLS<Commitment | null>(LS.commitment, DEMO_COMMITMENT);
  });
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadLS(LS.history, []));
  const [treats, setTreats]   = useState<number>(() => loadLS(LS.treats, 0));
  const [streak, setStreak]   = useState<number>(() => loadLS(LS.streak, 0));

  // Form
  const [fTask, setFTask]         = useState("");
  const [fNote, setFNote]         = useState("");
  const [fDeadline, setFDeadline] = useState(() => suggestDeadline(loadLS(LS.prefs, DEFAULT_PREFS).typicalLength));
  const [fBounty, setFBounty]     = useState<number | null>(25);
  const [fCustom, setFCustom]     = useState("");
  const [fProof, setFProof]       = useState<ProofType>(() => loadLS<Preferences>(LS.prefs, DEFAULT_PREFS).defaultProof);
  const [fErrors, setFErrors]     = useState<Record<string, string>>({});

  // Proof
  const [proofLink, setProofLink] = useState("");
  const [proofErr, setProofErr]   = useState("");

  // Countdown
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    commitment ? getTimeLeft(commitment.deadline) : { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 }
  );

  // UI
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory]   = useState(false);
  const [showAbandon, setShowAbandon]   = useState(false);

  // Persist
  useEffect(() => { saveLS(LS.state, appState); },       [appState]);
  useEffect(() => { saveLS(LS.commitment, commitment); }, [commitment]);
  useEffect(() => { saveLS(LS.history, history); },       [history]);
  useEffect(() => { saveLS(LS.treats, treats); },         [treats]);
  useEffect(() => { saveLS(LS.streak, streak); },         [streak]);
  useEffect(() => { saveLS(LS.fund, futureFund); },       [futureFund]);
  useEffect(() => { saveLS(LS.prefs, prefs); },           [prefs]);

  function completeOnboarding(fund: FutureFund, newPrefs: Preferences) {
    setFutureFund(fund);
    setPrefs(newPrefs);
    saveLS(LS.fund, fund);
    saveLS(LS.prefs, newPrefs);
    saveLS(LS.onboarded, true);
    setOnboarded(true);
    setCommitment(null);
    // Pre-fill form with new prefs
    setFProof(newPrefs.defaultProof);
    setFDeadline(suggestDeadline(newPrefs.typicalLength));
    setFTask(""); setFNote(""); setFBounty(25); setFCustom(""); setFErrors({});
    setAppState("new");
  }

  const handleMissedDeadline = useCallback(() => {
    setCommitment(prev => {
      if (prev) {
        const entry: HistoryEntry = {
          id: Date.now().toString(),
          task: prev.task,
          deadline: prev.deadline,
          bounty: prev.bounty,
          result: "failed",
          treatEarned: false,
          completedAt: new Date().toISOString(),
        };
        setHistory(h => [entry, ...h]);
      }
      return prev;
    });
    setStreak(0);
    saveLS(LS.state, "failed");
    setAppState("cinematic");
  }, []);

  // Countdown ticker
  useEffect(() => {
    if (appState !== "active" || !commitment) return;
    const tick = () => {
      const tl = getTimeLeft(commitment.deadline);
      setTimeLeft(tl);
      if (tl.total <= 0) handleMissedDeadline();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [appState, commitment, handleMissedDeadline]);

  // On mount: if active and already expired
  useEffect(() => {
    if (appState === "active" && commitment && getTimeLeft(commitment.deadline).total <= 0) {
      handleMissedDeadline();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validateForm(): boolean {
    const errs: Record<string, string> = {};
    if (!fTask.trim()) errs.task = "Task name is required.";
    if (!fDeadline) {
      errs.deadline = "Deadline is required.";
    } else if (new Date(fDeadline).getTime() <= Date.now()) {
      errs.deadline = "Deadline must be in the future.";
    }
    const bountyVal = fBounty ?? parseFloat(fCustom);
    if (isNaN(bountyVal) || bountyVal <= 0) errs.bounty = "Enter a valid bounty amount.";
    setFErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function submitCommitment() {
    if (!validateForm()) return;
    const bountyVal = fBounty ?? parseFloat(fCustom);
    const c: Commitment = {
      id: Date.now().toString(),
      task: fTask.trim(),
      note: fNote.trim(),
      deadline: new Date(fDeadline).toISOString(),
      bounty: bountyVal,
      proofType: fProof,
      createdAt: new Date().toISOString(),
    };
    setCommitment(c);
    setTimeLeft(getTimeLeft(c.deadline));
    setAppState("accepting");
  }

  function submitProof() {
    if (commitment?.proofType === "link" && !proofLink.trim()) {
      setProofErr("Please paste a link as proof.");
      return;
    }
    setAppState("reviewing");
  }

  function handleReviewingDone() {
    const newTreats = treats + 1;
    const newStreak = streak + 1;
    setTreats(newTreats);
    setStreak(newStreak);
    setCommitment(prev => {
      if (prev) {
        const entry: HistoryEntry = {
          id: Date.now().toString(),
          task: prev.task,
          deadline: prev.deadline,
          bounty: prev.bounty,
          result: "success",
          treatEarned: true,
          completedAt: new Date().toISOString(),
        };
        setHistory(h => [entry, ...h]);
      }
      return prev;
    });
    setAppState("success");
  }

  function abandonCommitment() {
    setCommitment(prev => {
      if (prev) {
        const entry: HistoryEntry = {
          id: Date.now().toString(),
          task: prev.task,
          deadline: prev.deadline,
          bounty: prev.bounty,
          result: "abandoned",
          treatEarned: false,
          completedAt: new Date().toISOString(),
        };
        setHistory(h => [entry, ...h]);
      }
      return prev;
    });
    setShowAbandon(false);
    startFresh();
  }

  function startFresh() {
    setFTask(""); setFNote("");
    setFDeadline(suggestDeadline(prefs.typicalLength));
    setFBounty(25); setFCustom(""); setFProof(prefs.defaultProof);
    setFErrors({}); setProofLink(""); setProofErr("");
    setShowAbandon(false);
    setAppState("new");
  }

  function resetDemo() {
    Object.values(LS).forEach(k => localStorage.removeItem(k));
    setHistory([]); setTreats(0); setCommitment(null); setStreak(0);
    setFutureFund(DEFAULT_FUND); setPrefs(DEFAULT_PREFS);
    setOnboarded(false);
    setShowSettings(false);
  }

  const totalTime = commitment
    ? new Date(commitment.deadline).getTime() - new Date(commitment.createdAt).getTime()
    : 1;
  const line = commitment ? judgmentalLine(timeLeft.total, totalTime) : "";
  const urgencyRatio = commitment && totalTime > 0 ? 1 - (timeLeft.total / totalTime) : 0;
  const urgencyColor = urgencyRatio < 0.6 ? "#29483D" : urgencyRatio < 0.82 ? "#E5A93D" : "#C0392B";

  const successCount   = history.filter(h => h.result === "success").length;
  const failedCount    = history.filter(h => h.result === "failed").length;
  const abandonedCount = history.filter(h => h.result === "abandoned").length;
  const bountiesKept   = history.filter(h => h.result === "success").reduce((s, h) => s + h.bounty, 0);
  const bountiesYeeted = history.filter(h => h.result === "failed").reduce((s, h) => s + h.bounty, 0);
  const fundProgress   = futureFund.target ? Math.min((bountiesKept / futureFund.target) * 100, 100) : null;

  // Show onboarding for first-time users
  if (!onboarded) {
    return (
      <>
        <GlobalStyles />
        <OnboardingFlow onComplete={completeOnboarding} />
      </>
    );
  }

  return (
    <>
      <GlobalStyles />

      {/* Cinematic overlay */}
      {appState === "cinematic" && commitment && (
        <CinematicFailure bounty={commitment.bounty} onAnimationEnd={() => setAppState("failed")} />
      )}
      {appState === "accepting" && commitment && (
        <AcceptingAnimation task={commitment.task} bounty={commitment.bounty} onDone={() => setAppState("active")} />
      )}
      {appState === "reviewing" && (
        <ReviewingAnimation onDone={handleReviewingDone} />
      )}
      {showAbandon && commitment && (
        <AbandonDialog bounty={commitment.bounty} onConfirm={abandonCommitment} onCancel={() => setShowAbandon(false)} />
      )}

      <div className="min-h-screen bg-background font-sans text-foreground" style={{ fontFamily: "'Nunito Sans', system-ui, sans-serif" }}>

        {/* Header */}
        <header className="sticky top-0 z-20 bg-card border-b border-border px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src={marimoAvatar} alt="Marimo the calico cat" className="w-9 h-9 rounded-full object-cover ring-2 ring-secondary" />
              <div className="leading-none">
                <p className="text-base font-bold text-primary">{"Marimo's Bounty"}</p>
                <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase">
                  Supervised accountability
                </p>
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
              <button onClick={() => setShowSettings(s => !s)} aria-label="Settings" className="p-2 rounded-full hover:bg-secondary transition-colors">
                <Settings className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </header>

        {/* Settings dropdown */}
        {showSettings && (
          <div className="fixed inset-0 z-30" onClick={() => setShowSettings(false)}>
            <div className="absolute right-4 top-[60px] w-52 bg-card rounded-2xl border border-border shadow-xl p-1.5" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setShowHistory(s => !s); setShowSettings(false); }} className="w-full text-left px-3.5 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary rounded-xl transition-colors">
                {showHistory ? "Hide" : "Show"} history
              </button>
              <div className="my-1 border-t border-border" />
              <button
                onClick={resetDemo}
                className="w-full text-left px-3.5 py-2.5 text-sm font-semibold text-destructive hover:bg-secondary rounded-xl transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset &amp; re-onboard
              </button>
            </div>
          </div>
        )}

        <main className="max-w-2xl mx-auto px-4 sm:px-5 py-6 sm:py-8 space-y-4 sm:space-y-5">

          {/* ── NEW COMMITMENT ─────────────────────────── */}
          {appState === "new" && (
            <>
              <div className="flex flex-col items-center gap-2 pt-2 pb-1">
                <img src={marimoLaptop} alt="Marimo lounging on a laptop" className="w-40 h-auto object-contain drop-shadow-sm" />
                <p className="text-sm text-muted-foreground italic text-center max-w-[280px] leading-snug">
                  "She cannot believe this required supervision."
                </p>
              </div>

              <div className="bg-card rounded-3xl border border-border shadow-sm p-6 space-y-5">
                <div>
                  <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl text-primary">New Commitment</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Make it concrete. Marimo will hold you to it.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-foreground">Task <span className="text-destructive">*</span></label>
                  <input type="text" value={fTask} onChange={e => setFTask(e.target.value)} placeholder="What are you actually going to do?" className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none placeholder:text-muted-foreground transition-colors text-foreground" />
                  {fErrors.task && <p className="text-xs font-semibold text-destructive">{fErrors.task}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-foreground">Definition of done <span className="font-normal text-muted-foreground text-xs">(optional)</span></label>
                  <textarea value={fNote} onChange={e => setFNote(e.target.value)} placeholder="How will you know it's done? Any context Marimo should know..." rows={2} className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none placeholder:text-muted-foreground transition-colors resize-none text-foreground" />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-foreground">Deadline <span className="text-destructive">*</span></label>
                  <input type="datetime-local" value={fDeadline} onChange={e => setFDeadline(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none transition-colors text-foreground" />
                  {fErrors.deadline && <p className="text-xs font-semibold text-destructive">{fErrors.deadline}</p>}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-foreground">Bounty at stake <span className="text-destructive">*</span></label>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Miss the deadline and it goes toward {futureFund.name === "Future Fund" ? "the void" : "Marimo Corp."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[5, 10, 25, 50].map(amt => (
                      <button key={amt} onClick={() => { setFBounty(amt); setFCustom(""); }} className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${fBounty === amt ? "bg-accent text-foreground border-accent" : "bg-secondary text-foreground border-transparent hover:border-primary/25"}`}>${amt}</button>
                    ))}
                    <button onClick={() => setFBounty(null)} className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${fBounty === null ? "bg-accent text-foreground border-accent" : "bg-secondary text-foreground border-transparent hover:border-primary/25"}`}>Custom</button>
                  </div>
                  {fBounty === null && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-foreground font-bold text-lg">$</span>
                      <input type="number" value={fCustom} onChange={e => setFCustom(e.target.value)} placeholder="Enter amount" min="1" className="flex-1 px-4 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none text-foreground placeholder:text-muted-foreground" />
                    </div>
                  )}
                  {fErrors.bounty && <p className="text-xs font-semibold text-destructive">{fErrors.bounty}</p>}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-foreground">Completion requirement</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { v: "honor",      label: "Honor system", icon: "🤞" },
                      { v: "screenshot", label: "Screenshot",   icon: "📸" },
                      { v: "link",       label: "Paste link",   icon: "🔗" },
                    ] as { v: ProofType; label: string; icon: string }[]).map(opt => (
                      <button key={opt.v} onClick={() => setFProof(opt.v)} className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-bold transition-colors ${fProof === opt.v ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground border-transparent hover:border-primary/25"}`}>
                        <span className="text-xl leading-none">{opt.icon}</span>
                        <span className="text-center leading-tight">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Commitment summary preview */}
                {fTask.trim() && fDeadline && (
                  <div className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(41,72,61,0.05)", border: "1.5px solid rgba(41,72,61,0.12)" }}>
                    <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">Commitment Summary</p>
                    <p className="text-sm font-bold text-primary">{fTask.trim()}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Due {formatDeadline(fDeadline)}</span>
                      <span className="font-bold text-accent">${fBounty ?? (fCustom || "—")} at stake</span>
                    </div>
                    {futureFund.name && futureFund.name !== "Future Fund" && (
                      <p className="text-xs text-muted-foreground">
                        Success sends it toward <span className="font-semibold text-primary">{futureFund.name}</span>
                      </p>
                    )}
                  </div>
                )}

                <button onClick={submitCommitment} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:opacity-90 active:scale-[0.985] transition-all shadow-sm">
                  Inform Marimo
                </button>
              </div>
            </>
          )}

          {/* ── ACTIVE COMMITMENT ──────────────────────── */}
          {appState === "active" && commitment && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 px-1">
                <img src={marimoIdle} alt="Marimo watching you" className="w-24 h-auto object-contain flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Supervision Status</p>
                  <p className="text-base font-bold text-primary leading-snug">Marimo has been informed.</p>
                  <p className="text-sm text-muted-foreground italic leading-snug mt-0.5">{line}</p>
                </div>
              </div>

              <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                {/* Urgency bar */}
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
                    <p className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                      <Clock className="w-3.5 h-3.5" /> Time remaining
                    </p>
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

                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <span className="text-base">{commitment.proofType === "honor" ? "🤞" : commitment.proofType === "screenshot" ? "📸" : "🔗"}</span>
                    {commitment.proofType === "honor" ? "Honor system — Marimo is choosing to trust you" : commitment.proofType === "screenshot" ? "Screenshot required on completion" : "Link required on completion"}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => setAppState("proof")} className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-sm">
                      Submit completion ✓
                    </button>
                    <button onClick={handleMissedDeadline} title="Demo control — simulate missed deadline" className="px-4 py-3.5 rounded-2xl bg-secondary text-muted-foreground text-sm font-bold hover:bg-border transition-colors border border-border">
                      Simulate missed deadline
                    </button>
                  </div>

                  <button onClick={() => setShowAbandon(true)} className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">
                    Abandon commitment
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── PROOF ──────────────────────────────────── */}
          {appState === "proof" && commitment && (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-2 pt-2 pb-1">
                <img src={marimoIdle} alt="Marimo waiting for proof" className="w-32 h-auto object-contain" />
                <p className="text-sm text-muted-foreground italic text-center max-w-[260px] leading-snug">
                  "She requires evidence. Just a formality. Mostly."
                </p>
              </div>
              <div className="bg-card rounded-3xl border border-border shadow-sm p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl text-primary">Submit for review</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Evidence has been forwarded for review.</p>
                  </div>
                  <button onClick={() => setAppState("active")} className="p-1.5 rounded-full hover:bg-secondary transition-colors" aria-label="Go back"><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
                <div className="bg-secondary rounded-xl px-3.5 py-2.5">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Task</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{commitment.task}</p>
                </div>
                {commitment.proofType === "honor" && (
                  <div className="bg-secondary rounded-2xl p-4 space-y-1">
                    <p className="font-bold text-foreground">Honor system selected.</p>
                    <p className="text-sm text-muted-foreground">Marimo is choosing to trust you on this one. Do not make her regret it.</p>
                  </div>
                )}
                {commitment.proofType === "screenshot" && (
                  <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center space-y-2">
                    <p className="text-4xl">📸</p>
                    <p className="font-bold text-foreground">Upload a screenshot</p>
                    <p className="text-xs text-muted-foreground">In a real app, you would upload a file here. For this demo, submitting is sufficient.</p>
                  </div>
                )}
                {commitment.proofType === "link" && (
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-foreground">Paste a link as proof</label>
                    <input type="url" value={proofLink} onChange={e => setProofLink(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary focus:outline-none text-foreground placeholder:text-muted-foreground transition-colors" />
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

          {/* ── SUCCESS ────────────────────────────────── */}
          {appState === "success" && commitment && (
            <div className="space-y-4" style={{ animation: "fadeInUp 0.55s cubic-bezier(0.22,1,0.36,1) both" }}>
              <div className="flex flex-col items-center gap-3 pt-2">
                <div className="relative">
                  <img src={marimoTreatPaw} alt="Marimo accepting her treat" className="w-48 h-auto object-contain drop-shadow-md" />
                  <span className="absolute -top-1 -right-1 text-2xl treat-pop" style={{ animationDelay: "0.15s" }}>✨</span>
                  <span className="absolute top-4 -left-3 text-xl treat-pop" style={{ animationDelay: "0.35s" }}>🍡</span>
                  <span className="absolute top-12 -right-4 text-lg treat-pop" style={{ animationDelay: "0.55s" }}>⭐</span>
                </div>
              </div>
              <div className="bg-card rounded-3xl border border-border shadow-sm p-6 space-y-5 text-center">
                <div>
                  <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl text-primary">Commitment honored.</h2>
                  <p className="text-base text-foreground mt-1">Your bounty is safe. Marimo acknowledges your competence.</p>
                  {streak >= 2 && (
                    <div className="inline-flex items-center gap-1.5 mt-3 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-sm font-bold text-amber-700">{streak} in a row</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Bounty kept</p>
                    <p className="text-2xl font-bold text-accent mt-0.5">${commitment.bounty}</p>
                  </div>
                  <div className="bg-secondary rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Treats earned</p>
                    <p className="text-2xl font-bold text-primary mt-0.5">🍡 {treats}</p>
                  </div>
                </div>

                {/* Future Fund progress */}
                <div className="rounded-2xl p-4 text-left space-y-3" style={{ background: "rgba(41,72,61,0.05)", border: "1.5px solid rgba(41,72,61,0.1)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">Future Fund</p>
                      <p className="text-base font-bold text-primary mt-0.5">{futureFund.name}</p>
                    </div>
                    <p className="text-xl font-bold text-accent">${bountiesKept}</p>
                  </div>
                  {fundProgress !== null && (
                    <>
                      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${fundProgress}%`, background: "#29483D" }} />
                      </div>
                      <p className="text-xs text-muted-foreground">{Math.round(fundProgress)}% toward ${futureFund.target?.toLocaleString()}</p>
                    </>
                  )}
                  {fundProgress === null && (
                    <p className="text-xs text-muted-foreground">
                      Across {successCount} completed {successCount === 1 ? "commitment" : "commitments"}.
                    </p>
                  )}
                </div>

                <button onClick={startFresh} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-sm">
                  Make another commitment
                </button>
              </div>
            </div>
          )}

          {/* ── FAILED ─────────────────────────────────── */}
          {appState === "failed" && commitment && (
            <div className="space-y-5" style={{ animation: "fadeInUp 0.55s cubic-bezier(0.22,1,0.36,1) both" }}>
              <div className="flex flex-col items-center gap-2 pt-3">
                <img src={marimoIdle} alt="Marimo" className="w-28 sm:w-36 h-auto object-contain" style={{ filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.08))" }} />
                <p className="text-[9px] font-bold tracking-[0.22em] uppercase" style={{ color: "#29483D", opacity: 0.38, fontFamily: "monospace" }}>Case closed — Marimo Corp.</p>
              </div>
              <div className="bg-card rounded-3xl border border-border shadow-sm p-5 sm:p-8 space-y-5 sm:space-y-6 text-center">
                <div className="space-y-1.5">
                  <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl text-primary">Deadline missed.</h2>
                  <p className="text-sm sm:text-base text-foreground">Marimo has made an executive decision.</p>
                  <p className="text-xs sm:text-sm text-muted-foreground italic">
                    "The bounty has left the atmosphere. Marimo has allocated the funds accordingly."
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary rounded-2xl py-4 sm:py-5 px-4 flex flex-col items-center gap-1.5">
                    <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Bounty lost</p>
                    <p className="text-2xl sm:text-3xl font-bold text-destructive">${commitment.bounty}</p>
                  </div>
                  <div className="bg-secondary rounded-2xl py-4 sm:py-5 px-4 flex flex-col items-center gap-1.5">
                    <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Destination</p>
                    <p className="text-sm sm:text-base font-bold text-foreground mt-0.5">🚀 Low Earth Orbit</p>
                  </div>
                </div>
                {bountiesKept > 0 && (
                  <div className="rounded-2xl p-3.5 text-left" style={{ background: "rgba(41,72,61,0.05)", border: "1.5px solid rgba(41,72,61,0.1)" }}>
                    <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-foreground">Still safe in {futureFund.name}</p>
                    <p className="text-base font-bold text-primary mt-0.5">${bountiesKept} protected</p>
                  </div>
                )}
                <button onClick={startFresh} className="w-full py-3.5 sm:py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm sm:text-base hover:opacity-90 transition-all shadow-sm">
                  Try again — Marimo dares you
                </button>
              </div>
            </div>
          )}

          {/* ── HISTORY ────────────────────────────────── */}
          {history.length > 0 && !["cinematic","accepting","reviewing"].includes(appState) && (
            <div className="bg-card rounded-3xl border border-border shadow-sm p-5 sm:p-6 space-y-3 sm:space-y-4">
              <button onClick={() => setShowHistory(s => !s)} className="w-full flex items-center justify-between text-left">
                <div>
                  <h3 className="text-base font-bold text-primary">History <span className="text-muted-foreground font-normal">({history.length})</span></h3>
                  {!showHistory && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {successCount} completed · {failedCount} yeeted{abandonedCount > 0 ? ` · ${abandonedCount} abandoned` : ""} · {treats} 🍡
                    </p>
                  )}
                </div>
                {showHistory ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {showHistory && (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { label: "Completed", value: successCount,        icon: "✅" },
                      { label: "Yeeted",    value: failedCount,         icon: "🚀" },
                      { label: "Kept",      value: `$${bountiesKept}`,  icon: "💰" },
                      { label: "Lost",      value: `$${bountiesYeeted}`,icon: "💸" },
                    ].map(stat => (
                      <div key={stat.label} className="bg-secondary rounded-2xl p-3 text-center">
                        <p className="text-xl leading-none">{stat.icon}</p>
                        <p className="text-base font-bold text-primary mt-1">{stat.value}</p>
                        <p className="text-[11px] text-muted-foreground font-semibold">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="divide-y divide-border">
                    {history.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between py-3.5 gap-3 first:pt-0 last:pb-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{entry.task}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(entry.completedAt)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide" style={{ background: entry.result === "success" ? "rgba(41,72,61,0.08)" : entry.result === "failed" ? "rgba(192,57,43,0.08)" : "rgba(94,114,104,0.08)", color: entry.result === "success" ? "#29483D" : entry.result === "failed" ? "#C0392B" : "#5E7268" }}>
                            {entry.result === "success" ? "Honored" : entry.result === "failed" ? "Yeeted" : "Abandoned"}
                          </span>
                          <p className={`text-sm font-bold ${entry.result === "success" ? "text-accent" : "text-destructive"}`}>
                            {entry.result === "success" ? "+" : "−"}${entry.bounty}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

// ── Global styles (shared by onboarding and main app) ────────────────────────
function GlobalStyles() {
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
