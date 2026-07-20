import { PhoneCall, Sparkles, Users, BarChart3 } from 'lucide-react';

const HIGHLIGHTS = [
  { icon: Sparkles, text: 'Create an AI calling agent in minutes' },
  { icon: Users, text: 'Find & auto-select local business leads' },
  { icon: BarChart3, text: 'Track calls, transcripts & outcomes' },
];

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <PhoneCall className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold">LeadCall AI</span>
        </div>
        <div className="space-y-6">
          <h2 className="max-w-md text-3xl font-semibold leading-tight">
            Find leads. Let your AI agent call them.
          </h2>
          <ul className="space-y-3">
            {HIGHLIGHTS.map((h) => (
              <li key={h.text} className="flex items-center gap-3 text-sm text-primary-foreground/90">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                  <h.icon className="h-4 w-4" />
                </span>
                {h.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/70">
          Automated outbound calling for local business outreach.
        </p>
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <PhoneCall className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold">LeadCall AI</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
