import { PhoneCall, Bot, Search, PhoneOutgoing, LineChart, ShieldCheck } from 'lucide-react';

const FEATURES = [
  {
    icon: Bot,
    title: 'AI calling agents',
    desc: 'Spin up a polite, on-brand voice agent in minutes — no scripts to memorize.',
  },
  {
    icon: Search,
    title: 'Smart lead finding',
    desc: 'Search local businesses and let AI score and select the best prospects.',
  },
  {
    icon: PhoneOutgoing,
    title: 'Automated calling',
    desc: 'Dial your selected leads one by one, completely hands-free.',
  },
  {
    icon: LineChart,
    title: 'Full call insights',
    desc: 'Transcripts, recordings, summaries and outcomes for every call.',
  },
];

function Logo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-graphite-950">
        <PhoneCall className="h-5 w-5" />
      </span>
      <span className="text-lg font-semibold tracking-tight">
        LeadCall<span className="text-brand-500"> AI</span>
      </span>
    </div>
  );
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Left: brand panel (graphite with amber accents) */}
      <div className="relative hidden flex-col overflow-hidden bg-graphite-900 p-10 text-white lg:flex xl:p-12">
        <Logo />

        {/* Value prop + feature cards */}
        <div className="my-auto max-w-[460px] space-y-8 py-10">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-400">
              AI-powered outbound calling
            </span>
            <h2 className="text-[34px] font-bold leading-[1.15] tracking-[-0.02em]">
              Find leads. Let your AI agent call them.
            </h2>
            <p className="text-[15px] leading-relaxed text-graphite-300">
              Everything you need to run automated outbound calling for local business outreach —
              in one clean workspace.
            </p>
          </div>

          <div className="grid gap-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex items-start gap-3.5 rounded-xl border border-graphite-700/70 bg-graphite-800/50 p-4"
              >
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
                  <f.icon className="h-5 w-5" />
                </span>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-[13px] leading-relaxed text-graphite-300">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer trust row */}
        <div className="flex items-center gap-2 border-t border-graphite-800 pt-6 text-xs text-graphite-400">
          <ShieldCheck className="h-4 w-4 text-brand-400" />
          Powered by Fly Design Studio
        </div>

        {/* Soft amber glows */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-brand-500/[0.06] blur-3xl" />
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center bg-background px-4 py-12 sm:px-6">
        <div className="w-full max-w-[420px]">
          <Logo className="mb-10 lg:hidden" />

          <div className="space-y-1.5">
            <h1 className="text-[28px] font-bold tracking-[-0.02em] text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          <div className="mt-7">{children}</div>

          {/* Mobile-only feature strip (the brand panel is hidden below lg) */}
          <div className="mt-10 space-y-3 border-t border-border pt-6 lg:hidden">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              What you get
            </p>
            <ul className="grid gap-2.5">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex items-center gap-2.5 text-sm text-foreground">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-brand-100 text-brand-700">
                    <f.icon className="h-4 w-4" />
                  </span>
                  {f.title}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
