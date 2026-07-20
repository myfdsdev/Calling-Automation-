import { Link } from 'react-router-dom';
import { PhoneCall, Plus, Sparkles, Building2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

function Waveform() {
  const bars = [10, 22, 34, 20, 44, 30, 52, 26, 40, 18, 34, 24, 46, 28, 14];
  return (
    <div className="flex h-14 items-center gap-1">
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full bg-primary/70"
          style={{
            height: `${h}px`,
            animation: `pulse-ring 1.6s ease-in-out ${i * 0.08}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

export function DashboardBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-accent via-card to-card p-6 sm:p-8">
      <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_1fr]">
        {/* Text */}
        <div className="space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> AI-powered outbound calling
          </span>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
            Find Leads. Let Your AI Agent Call Them.
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            Create an AI calling agent, discover local business leads, and automatically start
            personalized outbound calls from one simple dashboard.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild size="lg">
              <Link to="/lead-finder">
                <PhoneCall className="h-4 w-4" /> Start New Automation
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/agents">
                <Plus className="h-4 w-4" /> Create Agent
              </Link>
            </Button>
          </div>
        </div>

        {/* Visual */}
        <div className="relative hidden h-52 lg:block">
          {/* Central phone card */}
          <div className="absolute left-1/2 top-1/2 flex w-56 -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-lg">
            <div className="flex items-center gap-3">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <PhoneCall className="h-5 w-5" />
                <span className="absolute inset-0 rounded-full bg-primary/40 animate-pulse-ring" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Calling…</p>
                <p className="text-xs text-muted-foreground">Riley — Web Redesign</p>
              </div>
            </div>
            <Waveform />
          </div>

          {/* Floating lead cards */}
          <div className="absolute -left-2 top-2 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-md">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Building2 className="h-4 w-4" />
            </span>
            <div className="text-xs">
              <p className="font-medium text-foreground">Coastal Cafe</p>
              <p className="text-emerald-600">Interested</p>
            </div>
          </div>
          <div className="absolute -right-2 bottom-2 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-md">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </span>
            <div className="text-xs">
              <p className="font-medium text-foreground">Score 92</p>
              <p className="text-muted-foreground">Summit Group</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
