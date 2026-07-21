import { Link } from 'react-router-dom';
import { PhoneCall, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Deterministic pseudo-waveform: two out-of-phase sines read as organic speech
// without needing a hand-written array. Percentage heights so bars scale with
// the panel rather than being fixed px.
const BARS = Array.from({ length: 52 }, (_, i) => {
  const v = Math.abs(Math.sin(i * 0.7) * 0.62 + Math.sin(i * 1.31) * 0.38);
  return 14 + Math.round(v * 72);
});

function Waveform() {
  return (
    // Animated amber equalizer waveform.
    <div className="flex h-full w-full items-center justify-between">
      {BARS.map((h, i) => {
        // Vary duration per bar and stagger with a negative delay so they start
        // mid-cycle — no synchronized "all bars rise together" moment.
        const duration = 0.9 + (i % 6) * 0.13; // 0.90s – 1.55s
        const delay = -(i % 9) * 0.12; // staggered head-start
        return (
          <span
            key={i}
            className="wave-bar w-[2px] origin-center rounded-full bg-brand-500/70"
            style={{
              height: `${h}%`,
              animation: `wave-bar ${duration}s ease-in-out ${delay}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}

export function DashboardBanner() {
  return (
    // White hero card with a subtle amber radial glow on the right (spec).
    <div
      className="rounded-panel border border-border bg-card p-6 shadow-card sm:p-8"
      style={{
        backgroundImage:
          'radial-gradient(circle at 78% 50%, rgba(245, 158, 11, 0.07), transparent 38%)',
      }}
    >
      <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_1fr]">
        {/* Copy + actions */}
        <div className="space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
            <Sparkles className="h-3.5 w-3.5" /> AI-powered outbound calling
          </span>
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.03em] text-foreground sm:text-[36px]">
            Find Leads. Let Your AI Agent Call Them.
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            Create an AI calling agent, discover local business leads, and automatically start
            personalized outbound calls from one simple dashboard.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild size="lg">
              <Link to="/lead-finder">
                <PhoneCall className="h-4 w-4 text-brand-500" /> Start New Automation
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/agents">
                <Plus className="h-4 w-4" /> Create Agent
              </Link>
            </Button>
          </div>
        </div>

        {/* Waveform visual */}
        <div className="hidden h-40 lg:block">
          <Waveform />
        </div>
      </div>
    </div>
  );
}
