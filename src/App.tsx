import { useEffect, useMemo, useState } from "react";

type AuthTab = "sign-in" | "create" | "recover";

type Toast = { title: string; detail?: string };

type Role = "admin" | "member";

type BadgeTier = "First 10" | "First 30" | "First 80" | "Common";

type UserRecord = {
  password: string;
  createdAt: number;
  role: Role;
  ordinal: number; // sign-up order
  badgeTier: BadgeTier;
};

function IconFlame(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.4 2.5c.2 2.2-1 3.7-2.3 5.1-1.1 1.2-2.2 2.3-2 3.9.3 2.1 2.3 2.9 2.3 2.9s.4-1.2 1.4-2.3c1-1.1 2.2-2.1 2.4-3.8 1.6 1.7 3.3 4 3.3 7 0 4.6-3.6 7.2-7.4 7.2-4.4 0-8-3.2-8-8.1 0-3.9 2.4-6.5 4.9-8.8C9.6 4 11.2 2.6 11.4 1c.8.5 1.8 1.1 2 1.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconEye(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none">
      <path
        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7S2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function IconEyeOff(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none">
      <path
        d="M3.2 5.2 20.8 18.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M10.4 6c.5-.1 1.1-.2 1.6-.2 6 0 9.5 6.2 9.5 6.2a19 19 0 0 1-4 4.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M6.6 7.7C3.8 9.7 2.5 12 2.5 12s3.5 6.2 9.5 6.2c1.7 0 3.2-.3 4.5-.9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10.2 10.2a3.2 3.2 0 0 0 4.4 4.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ADMIN_EMAILS = ["info@truthbtoldhub.com"].map((e) => e.toLowerCase());

function loadUsers(): Record<string, UserRecord> {
  try {
    const raw = localStorage.getItem("tbt_users");
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, UserRecord>;
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, UserRecord>) {
  localStorage.setItem("tbt_users", JSON.stringify(users));
}

function computeTier(ordinal: number): BadgeTier {
  if (ordinal <= 10) return "First 10";
  if (ordinal <= 30) return "First 30";
  if (ordinal <= 80) return "First 80";
  return "Common";
}

function setSession(email: string) {
  localStorage.setItem("tbt_session", JSON.stringify({ email, at: Date.now() }));
}

function getSession(): { email: string; at: number } | null {
  try {
    const raw = localStorage.getItem("tbt_session");
    if (!raw) return null;
    return JSON.parse(raw) as { email: string; at: number };
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem("tbt_session");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function strengthLabel(pw: string): { label: string; score: number } {
  const v = pw;
  let score = 0;
  if (v.length >= 8) score++;
  if (v.length >= 12) score++;
  if (/[A-Z]/.test(v)) score++;
  if (/[0-9]/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;
  const clamped = Math.min(4, Math.floor((score / 5) * 5));
  const map: Array<{ label: string; score: number }> = [
    { label: "Ash", score: 1 },
    { label: "Ember", score: 2 },
    { label: "Flame", score: 3 },
    { label: "Inferno", score: 4 },
  ];
  return map[Math.max(0, Math.min(map.length - 1, clamped - 1))] ?? map[0];
}

export function App() {
  const [tab, setTab] = useState<AuthTab>("sign-in");
  const [copied, setCopied] = useState<null | "suggestion" | "email">(null);
  const [suggestionEmail, setSuggestionEmail] = useState("");
  const [suggestionText, setSuggestionText] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [showPw, setShowPw] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [createEmail, setCreateEmail] = useState("");
  const [createPw, setCreatePw] = useState("");
  const [createPw2, setCreatePw2] = useState("");

  const [recoverEmail, setRecoverEmail] = useState("");

  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [view, setView] = useState<"sign-in" | "scroll">("sign-in");

  useEffect(() => {
    const s = getSession();
    if (s?.email) setSessionEmail(s.email);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const createStrength = useMemo(() => strengthLabel(createPw), [createPw]);

  const onSignOut = () => {
    clearSession();
    setSessionEmail(null);
    setPassword("");
    setToast({ title: "The seal is lifted.", detail: "Signed out." });
  };

  const onSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!isValidEmail(em)) {
      setToast({ title: "Inscribe a valid email." });
      return;
    }
    if (!password) {
      setToast({ title: "Speak the passphrase." });
      return;
    }
    const users = loadUsers();
    const u = users[em];
    if (!u || u.password !== password) {
      setToast({ title: "The seal rejects this offering.", detail: "Email or passphrase is incorrect." });
      return;
    }
    setSession(em);
    setSessionEmail(em);
    setToast({ title: "Welcome back, keeper.", detail: "Access granted." });
  };

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const em = createEmail.trim().toLowerCase();
    if (!isValidEmail(em)) {
      setToast({ title: "Inscribe a valid email." });
      return;
    }
    if (createPw.length < 8) {
      setToast({ title: "Passphrase too short.", detail: "Use at least 8 characters." });
      return;
    }
    if (createPw !== createPw2) {
      setToast({ title: "The echoes do not match.", detail: "Confirm passphrase must match." });
      return;
    }
    const users = loadUsers();
    if (users[em]) {
      setToast({ title: "Already inscribed.", detail: "That email already has a seal." });
      return;
    }

    const existingOrdinals = Object.values(users).map((u) => u.ordinal ?? 0);
    const nextOrdinal = (existingOrdinals.length ? Math.max(...existingOrdinals) : 0) + 1;
    const role: Role = ADMIN_EMAILS.includes(em) ? "admin" : "member";
    const tier = computeTier(nextOrdinal);

    users[em] = {
      password: createPw,
      createdAt: Date.now(),
      role,
      ordinal: nextOrdinal,
      badgeTier: tier,
    };
    saveUsers(users);
    setSession(em);
    setSessionEmail(em);
    setToast({
      title: "Seal forged.",
      detail: `Account created. Early adopter tier: ${tier}.`,
    });
  };

  const onRecover = (e: React.FormEvent) => {
    e.preventDefault();
    const em = recoverEmail.trim().toLowerCase();
    if (!isValidEmail(em)) {
      setToast({ title: "Inscribe a valid email." });
      return;
    }
    const users = loadUsers();
    if (!users[em]) {
      setToast({ title: "No seal found.", detail: "That email is not yet inscribed." });
      return;
    }
    const subject = encodeURIComponent("Truth B Told Hub — Passphrase Recovery");
    const body = encodeURIComponent(
      `Sacred recovery request for: ${em}\n\nIf this was you, reply to this email and we will assist.\n\n— Truth B Told Hub`
    );
    // Some hosted/embedded environments block mailto. We still try, and we also show a toast.
    window.location.href = `mailto:info@truthbtoldhub.com?subject=${subject}&body=${body}`;
    setToast({ title: "A raven is dispatched.", detail: "If nothing opened, copy the text and email info@truthbtoldhub.com." });
  };

  const suggestionMailto = useMemo(() => {
    const subject = encodeURIComponent("Truth B Told Hub — Scroll Suggestion");
    const body = encodeURIComponent(
      `Add a Line to the Scroll\n\nFrom (optional): ${suggestionEmail.trim()}\n\nSuggestion:\n${suggestionText.trim()}\n\n— Sent from truthbtoldhub.com`
    );
    return `mailto:info@truthbtoldhub.com?subject=${subject}&body=${body}`;
  }, [suggestionEmail, suggestionText]);

  const onCopy = async (kind: "suggestion" | "email") => {
    try {
      if (kind === "email") {
        await navigator.clipboard.writeText("info@truthbtoldhub.com");
        setCopied("email");
        setToast({ title: "Copied.", detail: "info@truthbtoldhub.com" });
      } else {
        const payload = `From (optional): ${suggestionEmail.trim()}\nSuggestion:\n${suggestionText.trim()}`.trim();
        await navigator.clipboard.writeText(payload);
        setCopied("suggestion");
        setToast({ title: "Copied.", detail: "Your inscription is copied to clipboard." });
      }
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      setToast({ title: "Copy blocked.", detail: "Select the text and copy manually." });
    }
  };

  const onOpenEmail = () => {
    if (!suggestionText.trim()) {
      setToast({ title: "Inscribe your counsel first.", detail: "Write a suggestion, then send it to the Archive." });
      return;
    }

    // Many mobile browsers (and in-app browsers) block `window.open()` and sometimes suppress `mailto:`.
    // Try the simplest navigation first; if the user has no mail app configured, it may appear to do nothing.
    const href = suggestionMailto;

    try {
      window.location.assign(href);
      setToast({
        title: "Opening your email…",
        detail:
          "If nothing opens, use Copy inscription and paste it into an email to info@truthbtoldhub.com.",
      });
    } catch {
      // Last-resort fallback
      window.location.href = href;
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0a09] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Softer ember glow + a parchment wash to keep red/orange from overpowering */}
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,130,70,.22),transparent_65%)] blur-2xl" />
        <div className="absolute -bottom-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(188,92,44,.18),transparent_65%)] blur-2xl" />
        <div className="absolute inset-0 opacity-[0.14] [background-image:radial-gradient(rgba(255,236,210,.35)_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,244,230,.06),transparent_55%)]" />
      </div>

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#1b0a06] to-[#0c0504] shadow-[0_0_0_1px_rgba(255,120,60,.08),0_25px_80px_-40px_rgba(255,86,34,.55)]">
            <IconFlame className="h-6 w-6 text-amber-200" />
          </div>
          <div className="leading-tight">
            <div className="text-sm tracking-[0.32em] text-amber-200/80">TRUTH BE TOLD HUB</div>
            <div className="text-xs text-zinc-300/70">The Sacred Scroll • Sacred Sign‑In</div>
          </div>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <div className="mr-2 inline-flex overflow-hidden rounded-full border border-amber-500/20 bg-black/20">
            <button
              onClick={() => setView("sign-in")}
              className={
                "px-4 py-2 text-xs transition " +
                (view === "sign-in" ? "bg-black/40 text-amber-100" : "text-zinc-200/70 hover:text-zinc-100")
              }
            >
              Sign‑In
            </button>
            <button
              onClick={() => setView("scroll")}
              className={
                "px-4 py-2 text-xs transition " +
                (view === "scroll" ? "bg-black/40 text-amber-100" : "text-zinc-200/70 hover:text-zinc-100")
              }
            >
              Scroll
            </button>
          </div>
          {sessionEmail ? (
            <>
              <div className="text-xs text-zinc-300/70">Signed in as</div>
              <div className="rounded-full border border-amber-500/20 bg-black/30 px-3 py-1 text-xs text-amber-100">
                {sessionEmail}
              </div>
              <button
                onClick={onSignOut}
                className="rounded-full border border-amber-500/30 bg-gradient-to-b from-[#1b0a06] to-[#0b0504] px-4 py-2 text-xs text-amber-100 shadow-sm transition hover:border-amber-400/40 hover:text-amber-50"
              >
                Break Seal
              </button>
            </>
          ) : (
            <a
              href="mailto:info@truthbtoldhub.com"
              className="rounded-full border border-amber-500/25 bg-black/25 px-4 py-2 text-xs text-zinc-100/80 transition hover:border-amber-400/40"
            >
              Contact the Archive
            </a>
          )}
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-6 pb-16">
        <section className="grid gap-10 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            {view === "scroll" ? (
              <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-b from-[#120806]/80 to-[#070303]/80 p-6 shadow-[0_40px_120px_-80px_rgba(255,86,34,.55)]">
                <div className="space-y-2">
                  <div className="text-xs tracking-[0.35em] text-amber-200/70">TRUTH BE TOLD HUB</div>
                  <h1 className="text-2xl font-semibold tracking-tight">The Sacred Scroll</h1>
                  <p className="text-sm leading-relaxed text-zinc-200/75">
                    Your live voting system is hosted at <span className="text-amber-100">tbt-scroll-api.vercel.app</span>.
                    On mobile, opening it directly is usually more reliable than embedding inside builders.
                  </p>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-amber-500/15 bg-black/20">
                  <div className="flex items-center justify-between gap-3 border-b border-amber-500/10 bg-black/20 px-4 py-3">
                    <div className="text-xs tracking-[0.3em] text-amber-200/70">LIVE SCROLL</div>
                    <a
                      href="https://tbt-scroll-api.vercel.app"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-amber-100/90 hover:text-amber-50"
                    >
                      Open full screen
                    </a>
                  </div>
                  <iframe
                    title="Truth B Told Hub — Sacred Scroll"
                    src="https://tbt-scroll-api.vercel.app"
                    className="h-[70vh] w-full"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="mt-4 rounded-2xl border border-amber-500/15 bg-black/20 p-4 text-xs leading-relaxed text-zinc-200/70">
                  If this iframe is blocked in your host, use <span className="text-amber-100">Open full screen</span>.
                  That’s the best mobile experience.
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-b from-[#120806]/80 to-[#070303]/80 p-8 shadow-[0_40px_120px_-80px_rgba(255,86,34,.55)]">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div className="space-y-2">
                  <div className="text-xs tracking-[0.35em] text-amber-200/70">THE SACRED SCROLL</div>
                  <h1 className="text-3xl font-semibold tracking-tight">Sacred Sign‑In</h1>
                  <p className="max-w-xl text-sm leading-relaxed text-zinc-200/75">
                    The embers decided: member access to save progress, vote once per round, and unlock community features.
                    This is a front‑end forge—no server yet. Seals and sessions are stored locally in your browser.
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <button
                  onClick={() => setTab("sign-in")}
                  className={
                    "rounded-2xl border px-4 py-3 text-left transition " +
                    (tab === "sign-in"
                      ? "border-amber-400/40 bg-black/40"
                      : "border-amber-500/15 bg-black/20 hover:border-amber-400/25")
                  }
                >
                  <div className="text-xs tracking-[0.28em] text-amber-200/70">RITE I</div>
                  <div className="mt-1 text-sm font-medium">Enter the Sanctuary</div>
                  <div className="mt-1 text-xs text-zinc-300/65">Sign in</div>
                </button>

                <button
                  onClick={() => setTab("create")}
                  className={
                    "rounded-2xl border px-4 py-3 text-left transition " +
                    (tab === "create"
                      ? "border-amber-400/40 bg-black/40"
                      : "border-amber-500/15 bg-black/20 hover:border-amber-400/25")
                  }
                >
                  <div className="text-xs tracking-[0.28em] text-amber-200/70">RITE II</div>
                  <div className="mt-1 text-sm font-medium">Forge a Seal</div>
                  <div className="mt-1 text-xs text-zinc-300/65">Create account</div>
                </button>

                <button
                  onClick={() => setTab("recover")}
                  className={
                    "rounded-2xl border px-4 py-3 text-left transition " +
                    (tab === "recover"
                      ? "border-amber-400/40 bg-black/40"
                      : "border-amber-500/15 bg-black/20 hover:border-amber-400/25")
                  }
                >
                  <div className="text-xs tracking-[0.28em] text-amber-200/70">RITE III</div>
                  <div className="mt-1 text-sm font-medium">Recover the Passphrase</div>
                  <div className="mt-1 text-xs text-zinc-300/65">Email the Archive</div>
                </button>
              </div>

              <div className="mt-8">
                {sessionEmail ? (
                  <div className="rounded-2xl border border-amber-500/20 bg-black/25 p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-xs tracking-[0.3em] text-amber-200/70">ACCESS GRANTED</div>
                        <div className="mt-1 text-lg font-medium text-amber-50">Welcome, keeper.</div>
                        <div className="mt-1 text-sm text-zinc-200/70">
                          Signed in as <span className="text-amber-100">{sessionEmail}</span>.
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => setToast({ title: "Marked.", detail: "(Demo) Your vote will be sealed to one per round." })}
                          className="rounded-full border border-amber-500/30 bg-gradient-to-b from-[#2a0f07] to-[#0b0504] px-4 py-2 text-sm text-amber-100 transition hover:border-amber-400/45"
                        >
                          Seal Vote Rule
                        </button>
                        <button
                          onClick={onSignOut}
                          className="rounded-full border border-amber-500/30 bg-black/30 px-4 py-2 text-sm text-zinc-100/85 transition hover:border-amber-400/40"
                        >
                          Sign out
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {[
                        { k: "Progress", v: "Stored locally" },
                        { k: "Vote Limit", v: "One mark/round" },
                        { k: "Community", v: "Unlocks soon" },
                      ].map((item) => (
                        <div
                          key={item.k}
                          className="rounded-2xl border border-amber-500/15 bg-black/20 p-4"
                        >
                          <div className="text-xs tracking-[0.26em] text-amber-200/65">{item.k.toUpperCase()}</div>
                          <div className="mt-1 text-sm text-zinc-100/85">{item.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : tab === "sign-in" ? (
                  <form onSubmit={onSignIn} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <div className="mb-2 text-xs tracking-[0.28em] text-amber-200/70">EMAIL</div>
                        <input
                          value={email}
                          onChange={(ev) => setEmail(ev.target.value)}
                          type="email"
                          placeholder="yourname@domain.com"
                          className="w-full rounded-2xl border border-amber-500/20 bg-black/30 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-amber-400/45"
                          required
                        />
                      </label>

                      <label className="block">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-xs tracking-[0.28em] text-amber-200/70">PASSPHRASE</div>
                          <button
                            type="button"
                            onClick={() => setShowPw((s) => !s)}
                            className="inline-flex items-center gap-2 text-xs text-zinc-200/70 hover:text-zinc-100"
                          >
                            {showPw ? (
                              <>
                                <IconEyeOff className="h-4 w-4" /> Hide
                              </>
                            ) : (
                              <>
                                <IconEye className="h-4 w-4" /> Show
                              </>
                            )}
                          </button>
                        </div>
                        <input
                          value={password}
                          onChange={(ev) => setPassword(ev.target.value)}
                          type={showPw ? "text" : "password"}
                          placeholder="••••••••"
                          className="w-full rounded-2xl border border-amber-500/20 bg-black/30 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-amber-400/45"
                          required
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="submit"
                        className="rounded-full border border-amber-400/30 bg-gradient-to-b from-[#3a1408] to-[#0b0504] px-5 py-2.5 text-sm text-amber-100 shadow-sm transition hover:border-amber-300/45"
                      >
                        Enter
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab("recover")}
                        className="text-sm text-zinc-200/70 hover:text-amber-100"
                      >
                        Forgotten passphrase?
                      </button>
                    </div>

                    <div className="rounded-2xl border border-amber-500/15 bg-black/20 p-4 text-xs leading-relaxed text-zinc-200/70">
                      <div className="text-amber-200/70">Note:</div>
                      This demo stores your seal in <span className="text-zinc-100/85">localStorage</span>. For production,
                      we’ll forge a real backend and encrypted sessions.
                    </div>
                  </form>
                ) : tab === "create" ? (
                  <form onSubmit={onCreate} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <div className="mb-2 text-xs tracking-[0.28em] text-amber-200/70">EMAIL</div>
                        <input
                          value={createEmail}
                          onChange={(ev) => setCreateEmail(ev.target.value)}
                          type="email"
                          placeholder="yourname@domain.com"
                          className="w-full rounded-2xl border border-amber-500/20 bg-black/30 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-amber-400/45"
                          required
                        />
                      </label>

                      <label className="block">
                        <div className="mb-2 text-xs tracking-[0.28em] text-amber-200/70">PASSPHRASE</div>
                        <input
                          value={createPw}
                          onChange={(ev) => setCreatePw(ev.target.value)}
                          type={showPw ? "text" : "password"}
                          placeholder="At least 8 characters"
                          className="w-full rounded-2xl border border-amber-500/20 bg-black/30 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-amber-400/45"
                          required
                        />
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="text-zinc-300/65">Strength</span>
                          <span className="text-amber-200/80">{createStrength.label}</span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/50">
                          <div
                            className={
                              "h-full rounded-full bg-gradient-to-r transition-all " +
                              (createStrength.score <= 1
                                ? "from-[#6b2b1c] to-[#a44622] w-1/4"
                                : createStrength.score === 2
                                  ? "from-[#8a341b] to-[#ff7a2c] w-2/4"
                                  : createStrength.score === 3
                                    ? "from-[#b44618] to-[#ff9a3d] w-3/4"
                                    : "from-[#ff5a1f] to-[#ffd08a] w-full")
                            }
                          />
                        </div>
                      </label>
                    </div>

                    <label className="block">
                      <div className="mb-2 text-xs tracking-[0.28em] text-amber-200/70">CONFIRM PASSPHRASE</div>
                      <input
                        value={createPw2}
                        onChange={(ev) => setCreatePw2(ev.target.value)}
                        type={showPw ? "text" : "password"}
                        placeholder="Repeat"
                        className="w-full rounded-2xl border border-amber-500/20 bg-black/30 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-amber-400/45"
                        required
                      />
                    </label>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="submit"
                        className="rounded-full border border-amber-400/30 bg-gradient-to-b from-[#3a1408] to-[#0b0504] px-5 py-2.5 text-sm text-amber-100 shadow-sm transition hover:border-amber-300/45"
                      >
                        Forge Seal
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        className="inline-flex items-center gap-2 text-sm text-zinc-200/70 hover:text-zinc-100"
                      >
                        {showPw ? (
                          <>
                            <IconEyeOff className="h-4 w-4" /> Hide
                          </>
                        ) : (
                          <>
                            <IconEye className="h-4 w-4" /> Show
                          </>
                        )}
                      </button>
                    </div>

                    <div className="rounded-2xl border border-amber-500/15 bg-black/20 p-4 text-xs leading-relaxed text-zinc-200/70">
                      Use a unique passphrase. In the future, this will connect to real membership, voting locks, and
                      community rooms.
                    </div>
                  </form>
                ) : (
                  <form onSubmit={onRecover} className="space-y-4">
                    <label className="block">
                      <div className="mb-2 text-xs tracking-[0.28em] text-amber-200/70">EMAIL</div>
                      <input
                        value={recoverEmail}
                        onChange={(ev) => setRecoverEmail(ev.target.value)}
                        type="email"
                        placeholder="yourname@domain.com"
                        className="w-full rounded-2xl border border-amber-500/20 bg-black/30 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-amber-400/45"
                        required
                      />
                    </label>

                    <button
                      type="submit"
                      className="rounded-full border border-amber-400/30 bg-gradient-to-b from-[#3a1408] to-[#0b0504] px-5 py-2.5 text-sm text-amber-100 shadow-sm transition hover:border-amber-300/45"
                    >
                      Send to Archive
                    </button>

                    <div className="rounded-2xl border border-amber-500/15 bg-black/20 p-4 text-xs leading-relaxed text-zinc-200/70">
                      This opens your email client and sends your message to <span className="text-amber-100">info@truthbtoldhub.com</span>.
                    </div>
                  </form>
                )}
              </div>
            </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-b from-[#0f0706]/80 to-[#070303]/70 p-7">
              <div className="text-xs tracking-[0.35em] text-amber-200/70">FROM THE SCROLL</div>
              <h2 className="mt-2 text-lg font-semibold">Voting closed. Results are locked.</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-200/70">
                A hush falls over the sanctuary. The community speaks. The embers decide.
              </p>

              <div className="mt-5 space-y-3">
                {[{ name: "Sacred Sign‑In", pct: 50.0, marks: 3 }, { name: "Teachings & Dialogues", pct: 33.3, marks: 2 }, { name: "The Pool", pct: 16.7, marks: 1 }].map(
                  (row) => (
                    <div key={row.name} className="rounded-2xl border border-amber-500/15 bg-black/25 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-zinc-100/90">{row.name}</div>
                        <div className="text-xs text-zinc-300/70">{row.marks} marks</div>
                      </div>
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/50">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#ff5a1f] to-[#ffd08a]"
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-amber-200/70">{row.pct.toFixed(1)}%</div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-amber-500/20 bg-black/25 p-7">
              <div className="text-xs tracking-[0.35em] text-amber-200/70">WHAT’S NEXT</div>
              <h3 className="mt-2 text-base font-semibold">After the Scroll Seals</h3>
              <ul className="mt-3 space-y-2 text-sm text-zinc-200/70">
                <li>• The winning page enters active construction.</li>
                <li>• Progress updates appear here for all to witness.</li>
                <li>• The next vote cycle begins after the current work is complete.</li>
              </ul>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-amber-500/15 bg-black/20 p-4">
                  <div className="text-xs tracking-[0.28em] text-amber-200/70">ADD A LINE TO THE SCROLL</div>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-200/70">
                    Some hosts/embeds (including certain GHL setups) block <span className="text-zinc-100/80">mailto</span> links.
                    Use this form to copy your inscription, or try opening your email client.
                  </p>

                  <div className="mt-4 grid gap-3">
                    <label className="block">
                      <div className="mb-1.5 text-[11px] tracking-[0.26em] text-amber-200/65">YOUR EMAIL (OPTIONAL)</div>
                      <input
                        value={suggestionEmail}
                        onChange={(e) => setSuggestionEmail(e.target.value)}
                        type="email"
                        placeholder="yourname@domain.com"
                        className="w-full rounded-2xl border border-amber-500/15 bg-black/25 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-amber-400/40"
                      />
                    </label>

                    <label className="block">
                      <div className="mb-1.5 text-[11px] tracking-[0.26em] text-amber-200/65">INSCRIBE YOUR COUNSEL</div>
                      <textarea
                        value={suggestionText}
                        onChange={(e) => setSuggestionText(e.target.value)}
                        placeholder="Write what the community should build…"
                        rows={4}
                        className="w-full resize-none rounded-2xl border border-amber-500/15 bg-black/25 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-amber-400/40"
                      />
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={onOpenEmail}
                        className="rounded-full border border-amber-400/25 bg-gradient-to-b from-[#3a1408] to-[#0b0504] px-4 py-2 text-sm text-amber-100 transition hover:border-amber-300/40"
                      >
                        Begin your inscription
                      </button>
                      <button
                        type="button"
                        onClick={() => onCopy("suggestion")}
                        className="rounded-full border border-amber-500/20 bg-black/25 px-4 py-2 text-sm text-zinc-100/85 transition hover:border-amber-400/35"
                      >
                        Copy inscription
                      </button>
                      <button
                        type="button"
                        onClick={() => onCopy("email")}
                        className="rounded-full border border-amber-500/20 bg-black/25 px-4 py-2 text-sm text-zinc-100/85 transition hover:border-amber-400/35"
                      >
                        Copy email
                      </button>
                    </div>

                    <div className="text-xs text-zinc-200/70">
                      Send to: <span className="text-amber-100">info@truthbtoldhub.com</span>
                      {copied ? <span className="ml-2 text-amber-200/80">(copied)</span> : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      const users = loadUsers();
                      const count = Object.keys(users).length;
                      setToast({ title: "Local seals counted.", detail: `${count} account(s) stored in this browser.` });
                    }}
                    className="rounded-full border border-amber-500/25 bg-black/30 px-4 py-2 text-sm text-zinc-100/85 transition hover:border-amber-400/40"
                  >
                    View Local Seals
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <footer className="mt-12 border-t border-amber-500/10 pt-6 text-center text-xs text-zinc-400/70">
          © 2026 Truth B Told — Unlearn Everything
        </footer>
      </main>

      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-50 w-[min(560px,calc(100%-2rem))] -translate-x-1/2">
          <div className="rounded-2xl border border-amber-400/25 bg-black/60 p-4 shadow-[0_30px_120px_-60px_rgba(255,86,34,.65)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-amber-50">{toast.title}</div>
                {toast.detail ? (
                  <div className="mt-1 text-xs text-zinc-200/75">{toast.detail}</div>
                ) : null}
              </div>
              <button
                onClick={() => setToast(null)}
                className="rounded-full border border-amber-500/20 bg-black/30 px-3 py-1 text-xs text-zinc-200/70 hover:text-zinc-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
