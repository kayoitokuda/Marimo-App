// ── Types ────────────────────────────────────────────────────────────────────
export type AppState =
  | "new" | "accepting" | "active" | "proof" | "reviewing" | "success" | "cinematic" | "failed"
  | "grace" | "grace-proof" | "grace-reviewing" | "grace-success"
  | "dispute-form" | "dispute-reviewing" | "dispute-approved" | "dispute-denied";

export type ProofType = "honor" | "screenshot" | "link";
export type CinematicPhase = "freeze" | "review" | "decision" | "swat" | "space";
export type RecoveryReason = "too-large" | "unrealistic-deadline" | "forgot" | "lost-motivation" | "unexpected" | "unclear-done" | "other" | null;
export type DisputeReason = "late-report" | "has-evidence" | "circumstances" | "technical" | null;

export interface Commitment {
  id: string;
  task: string;
  note: string;
  deadline: string;
  reportingDeadline: string;
  bounty: number;
  proofType: ProofType;
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  task: string;
  deadline: string;
  bounty: number;
  result: "success" | "late-success" | "failed" | "abandoned";
  treatEarned: boolean;
  completedAt: string;
  appealOutcome?: "approved" | "denied";
  disputeId?: string;
  allocationDestination?: string;
  reversal?: { amount: number; at: string; fundName: string };
}

export type AllocationDisputeReason =
  | "late-report" | "technical" | "emergency"
  | "wrong-deadline" | "wrong-bounty" | "other";

export type DisputeStatus =
  | "filed" | "info-needed" | "under-review"
  | "approved" | "denied" | "appealed" | "final";

export interface DisputeCase {
  id: string;
  entryId: string;
  caseNumber: string;
  filedAt: string;
  reason: AllocationDisputeReason;
  explanation: Record<string, string>;
  evidence: string;
  followUpQuestion?: string;
  followUpAnswer?: string;
  confirmed: boolean;
  status: DisputeStatus;
  decisionReason?: string;
  reviewedAt?: string;
  appealText?: string;
  appealEvidence?: string;
  appealStatus?: "approved" | "final-denied";
}

export interface TimeLeft {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface FutureFund {
  name: string;
  target: number | null;
}

export interface Preferences {
  defaultProof: ProofType;
  typicalLength: "day" | "week" | "month";
}

// ── Constants ────────────────────────────────────────────────────────────────
export const GRACE_WINDOW_MS = 60 * 60 * 1000; // 1 hour reporting window after deadline

export const DEMO_COMMITMENT: Commitment = {
  id: "demo-seed",
  task: "Finish portfolio case study",
  note: "The one that has been sitting in drafts since February.",
  deadline: (() => {
    const d = new Date(); d.setHours(22, 0, 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
    return d.toISOString();
  })(),
  reportingDeadline: (() => {
    const d = new Date(); d.setHours(22, 0, 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
    return new Date(d.getTime() + GRACE_WINDOW_MS).toISOString();
  })(),
  bounty: 25,
  proofType: "link",
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
};

export const DEFAULT_FUND: FutureFund = { name: "Future Fund", target: null };
export const DEFAULT_PREFS: Preferences = { defaultProof: "honor", typicalLength: "week" };

export const FUND_SUGGESTIONS = [
  "Japan Trip", "New Laptop", "Emergency Fund", "Home Deposit",
  "Side Project", "Investment Account", "Art Studio",
  "Extremely Responsible Purchase", "Something Marimo Would Not Approve",
];

export const ORBITAL_DESTINATIONS = [
  "Marimo Executive Treat Fund",
  "Marimo Retirement Account",
  "Orbital Operations Budget",
  "Executive Compensation (Q3)",
  "Unspecified Corporate Expenditure",
];

export const MARIMO_SUCCESS_COMMENTS = [
  "Marimo acknowledges your competence.",
  "No enforcement action was necessary.",
  "Performance has met expectations.",
  "Future You has received the assets.",
  "This outcome will be reflected in your file.",
  "Management is satisfied. Briefly.",
];

export const COMMITMENT_EXAMPLES = [
  "Finish the Manager's Insights case study",
  "Submit 5 job applications",
  "Run 3 miles",
  "Clean the entire kitchen",
  "Finish portfolio homepage",
];

export const LS = {
  state:          "mb_state",
  commitment:     "mb_commitment",
  history:        "mb_history",
  treats:         "mb_treats",
  streak:         "mb_streak",
  onboarded:      "mb_onboarded",
  fund:           "mb_fund",
  prefs:          "mb_prefs",
  commitCount:    "mb_commit_count",
  disputes:       "mb_disputes",
  seedsInjected:  "mb_seeds_injected",
};

export const DISPUTE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function isDisputeEligible(entry: HistoryEntry): boolean {
  if (entry.result !== "failed") return false;
  if (entry.disputeId) return false;
  return Date.now() - new Date(entry.completedAt).getTime() <= DISPUTE_WINDOW_MS;
}

export function generateCaseNumber(): string {
  return `MRC-${String(Math.floor(Math.random() * 8000) + 1000)}`;
}

const _NOW = Date.now();
export const SEED_HISTORY: HistoryEntry[] = [
  {
    id: "seed-miss-1",
    task: "Prepare Q3 review slides",
    deadline: new Date(_NOW - 26 * 3600000).toISOString(),
    bounty: 40,
    result: "failed",
    treatEarned: false,
    completedAt: new Date(_NOW - 26 * 3600000).toISOString(),
    allocationDestination: "Marimo Executive Treat Fund",
  },
  {
    id: "seed-miss-2",
    task: "Submit freelance invoice by EOD",
    deadline: new Date(_NOW - 72 * 3600000).toISOString(),
    bounty: 25,
    result: "failed",
    treatEarned: false,
    completedAt: new Date(_NOW - 72 * 3600000).toISOString(),
    allocationDestination: "Marimo Retirement Account",
    disputeId: "seed-dispute-1",
  },
  {
    id: "seed-miss-3",
    task: "Complete online certification module",
    deadline: new Date(_NOW - 120 * 3600000).toISOString(),
    bounty: 30,
    result: "failed",
    treatEarned: false,
    completedAt: new Date(_NOW - 120 * 3600000).toISOString(),
    allocationDestination: "Orbital Operations Budget",
    disputeId: "seed-dispute-2",
    reversal: { amount: 30, at: new Date(_NOW - 90 * 3600000).toISOString(), fundName: "Japan Trip" },
  },
];

export const SEED_DISPUTES: DisputeCase[] = [
  {
    id: "seed-dispute-1",
    entryId: "seed-miss-2",
    caseNumber: "MRC-0247",
    filedAt: new Date(_NOW - 60 * 3600000).toISOString(),
    reason: "late-report",
    explanation: {
      whatHappened: "I completed the invoice before the 5pm deadline but my internet went down before I could submit the report.",
      whyReverse: "The task was done on time — only the reporting was delayed due to a connection issue.",
      correction: "Restore $25 to my Future Fund.",
      completionTime: "4:45 PM",
      reportAttempt: "5:10 PM",
      prevented: "Internet outage — connection restored at approximately 6pm.",
    },
    evidence: "",
    followUpQuestion: "You mentioned your internet went down. Approximately when did your connection restore, and did you attempt to report again once it did?",
    confirmed: true,
    status: "info-needed",
  },
  {
    id: "seed-dispute-2",
    entryId: "seed-miss-3",
    caseNumber: "MRC-0246",
    filedAt: new Date(_NOW - 115 * 3600000).toISOString(),
    reason: "technical",
    explanation: {
      whatHappened: "The submission screen froze with a loading spinner after I completed the certification module.",
      whyReverse: "The task was completed on time but the app failed to register my completion submission.",
      correction: "Restore $30 to my Future Fund.",
      whatHappenedTech: "Submission screen hung indefinitely after clicking Submit Completion.",
      whenOccurred: "Around 9:15 PM on the deadline day",
      device: "Chrome on MacBook Pro",
    },
    evidence: "https://example.com/screenshot-evidence",
    followUpAnswer: "Immediately after clicking Submit Completion — the spinner appeared and never resolved.",
    confirmed: true,
    status: "approved",
    decisionReason: "The timeline is complete, consistent, and internally plausible. Technical submission failures of this type have been documented. Administrative correction issued.",
    reviewedAt: new Date(_NOW - 90 * 3600000).toISOString(),
  },
];

function makeStars(n: number) {
  let s = 0xd3a2f1e4;
  const rng = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 0x100000000; };
  return Array.from({ length: n }, () => ({
    cx: rng() * 800, cy: rng() * 480,
    r: 0.25 + rng() * 1.5, op: 0.2 + rng() * 0.8,
    dur: 2 + rng() * 5, delay: rng() * 4,
  }));
}
export const STARS = makeStars(180);

// ── Utilities ────────────────────────────────────────────────────────────────
export function loadLS<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw != null ? (JSON.parse(raw) as T) : fallback; }
  catch { return fallback; }
}

export function saveLS(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function getTimeLeft(deadline: string): TimeLeft {
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

export function pad(n: number) { return String(n).padStart(2, "0"); }

export function supervisionStatus(remaining: number, total: number): string {
  const ratio = remaining / (total || 1);
  if (ratio > 0.72) return "Marimo is presently withholding judgment.";
  if (ratio > 0.45) return "Management is monitoring the situation.";
  if (ratio > 0.18) return "Deadline proximity has been noted.";
  return "Marimo has entered the attentive loaf position.";
}

export function bountyComment(bounty: number | null, custom: string): string | null {
  const val = bounty ?? parseFloat(custom);
  if (isNaN(val) || val <= 0) return null;
  if (val <= 5)  return "A modest contractual interest.";
  if (val <= 10) return "Management is now attentive.";
  if (val <= 25) return "Marimo has joined the meeting.";
  return "Please confirm this remains financially comfortable.";
}

export function deadlineComment(deadline: string): string | null {
  if (!deadline) return null;
  const hours = (new Date(deadline).getTime() - Date.now()) / 3600000;
  if (hours <= 0)   return null;
  if (hours <= 6)   return "Bold. Management will permit it.";
  if (hours <= 14)  return "Ambitious, but technically legal.";
  if (hours <= 72)  return "A reasonable allocation of time.";
  if (hours <= 336) return "Management has noted the timeline.";
  return "Three weeks is beginning to resemble a wish.";
}

export function taskReaction(task: string): string | null {
  const t = task.trim();
  if (!t || t.length < 4) return null;
  const lower = t.toLowerCase();
  if (lower.includes("portfolio") || lower.includes("case study")) return "Specific. Long overdue. Acceptable.";
  if (lower.includes("email") || lower.includes("apply") || lower.includes("application")) return "Management understands the deliverable.";
  if (t.split(" ").length >= 4) return "This appears measurable.";
  if (t.split(" ").length >= 2) return "Specific. Acceptable.";
  return "A real task. Promising.";
}

export function timeRemainingText(deadline: string): string | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return null;
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000) / 60000);
  if (days > 0)  return `${days} day${days !== 1 ? "s" : ""}, ${hours} hour${hours !== 1 ? "s" : ""} remaining`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""}, ${mins} minute${mins !== 1 ? "s" : ""} remaining`;
  return `${mins} minute${mins !== 1 ? "s" : ""} remaining`;
}

export function pickRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDeadline(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function suggestDeadline(typicalLength: Preferences["typicalLength"]): string {
  const d = new Date();
  if (typicalLength === "day") d.setDate(d.getDate() + 1);
  else if (typicalLength === "week") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  d.setHours(23, 59, 0, 0);
  return d.toISOString().slice(0, 16);
}

// ── Sounds ───────────────────────────────────────────────────────────────────
export function playCheckSound() {
  try {
    const ctx = new AudioContext(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
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

export function playStampSound() {
  try {
    const ctx = new AudioContext(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
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

export function playDecisionStinger() {
  try {
    const ctx = new AudioContext();
    [110, 130.8, 164.8].forEach((freq, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = "triangle"; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.11, ctx.currentTime + i * 0.05 + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.05); osc.stop(ctx.currentTime + 1.6);
    });
    setTimeout(() => ctx.close(), 2500);
  } catch {}
}

export function playCoinLaunchSound() {
  try {
    const ctx = new AudioContext(); const master = ctx.createGain();
    master.gain.setValueAtTime(0.48, ctx.currentTime); master.connect(ctx.destination);
    const click = ctx.createOscillator(); const cg = ctx.createGain();
    click.type = "sine"; click.frequency.value = 180;
    cg.gain.setValueAtTime(0.5, ctx.currentTime); cg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    click.connect(cg); cg.connect(master); click.start(); click.stop(ctx.currentTime + 0.06);
    const whoosh = ctx.createOscillator(); const wg = ctx.createGain(); const wf = ctx.createBiquadFilter();
    whoosh.type = "sawtooth";
    whoosh.frequency.setValueAtTime(90, ctx.currentTime + 0.03);
    whoosh.frequency.exponentialRampToValueAtTime(3800, ctx.currentTime + 0.95);
    wf.type = "bandpass"; wf.frequency.value = 900; wf.Q.value = 1.1;
    wg.gain.setValueAtTime(0, ctx.currentTime + 0.03); wg.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.14);
    wg.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.9); wg.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.15);
    whoosh.connect(wf); wf.connect(wg); wg.connect(master);
    whoosh.start(ctx.currentTime + 0.03); whoosh.stop(ctx.currentTime + 1.15);
    const ping = ctx.createOscillator(); const pg = ctx.createGain();
    ping.type = "sine";
    ping.frequency.setValueAtTime(2600, ctx.currentTime + 0.45);
    ping.frequency.exponentialRampToValueAtTime(650, ctx.currentTime + 1.05);
    pg.gain.setValueAtTime(0.32, ctx.currentTime + 0.45); pg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1);
    ping.connect(pg); pg.connect(master); ping.start(ctx.currentTime + 0.45); ping.stop(ctx.currentTime + 1.1);
    const hiss = ctx.createOscillator(); const hg = ctx.createGain(); const hf = ctx.createBiquadFilter();
    hiss.type = "sawtooth"; hiss.frequency.value = 6000; hf.type = "highpass"; hf.frequency.value = 3500;
    hg.gain.setValueAtTime(0.16, ctx.currentTime + 0.85); hg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);
    hiss.connect(hf); hf.connect(hg); hg.connect(master);
    hiss.start(ctx.currentTime + 0.85); hiss.stop(ctx.currentTime + 2.0);
    setTimeout(() => ctx.close(), 2500);
  } catch {}
}

export function playSpaceAmbient() {
  try {
    const ctx = new AudioContext();
    [65.4, 98.0, 130.8].forEach((freq, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.4);
      osc.frequency.linearRampToValueAtTime(freq * 1.008, ctx.currentTime + i * 0.4 + 3.5);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.4);
      gain.gain.linearRampToValueAtTime(0.038, ctx.currentTime + i * 0.4 + 1.2);
      gain.gain.linearRampToValueAtTime(0.038, ctx.currentTime + i * 0.4 + 2.5);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.4 + 3.8);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.4); osc.stop(ctx.currentTime + i * 0.4 + 3.9);
    });
    setTimeout(() => ctx.close(), 6000);
  } catch {}
}
