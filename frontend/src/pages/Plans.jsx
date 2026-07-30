import { toast } from 'sonner';
import { Check, Loader2, Sparkles, Bot, Users, Info } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { CardGridSkeleton } from '@/components/common/LoadingSkeleton';
import { QueryError } from '@/components/common/QueryError';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePlans, useSubscribe } from '@/hooks/queries';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

function UsageStat({ icon: Icon, label, value, tone = 'brand', className }) {
  const tones = {
    brand: 'bg-brand-100 text-brand-700',
    success: 'bg-success-50 text-success-700',
    info: 'bg-info-50 text-info-700',
  };
  return (
    <div
      className={cn(
        'flex min-h-[112px] flex-col items-center justify-center gap-2 px-4 py-5 text-center',
        className,
      )}
    >
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg', tones[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
        <p className="text-[18px] font-bold leading-tight text-foreground">{value}</p>
      </div>
    </div>
  );
}

function PlanCard({ plan, isCurrent, onChoose, pending }) {
  const priceLabel = plan.price === 0 ? 'Free' : `$${plan.price}`;
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-[20px] border bg-card p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all duration-200',
        plan.highlighted
          ? 'border-brand-500 ring-1 ring-brand-500'
          : 'border-border hover:border-graphite-300 hover:shadow-[0_12px_30px_rgba(15,23,42,0.10)]',
      )}
    >
      {plan.highlighted ? (
        <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-[11px] font-semibold text-graphite-950">
          <Sparkles className="h-3 w-3" /> Most popular
        </span>
      ) : null}

      {/* Header */}
      <div>
        <h3 className="text-[18px] font-bold text-foreground">{plan.name}</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{plan.tagline}</p>
      </div>

      {/* Price */}
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-[34px] font-bold tracking-[-0.02em] text-foreground">{priceLabel}</span>
        {plan.price > 0 ? <span className="text-[13px] text-muted-foreground">/month</span> : null}
      </div>

      {/* Features */}
      <ul className="mt-5 flex-grow space-y-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[13px] text-graphite-600">
            <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-brand-100">
              <Check className="h-3 w-3 text-brand-700" />
            </span>
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-6">
        {isCurrent ? (
          <Button variant="outline" className="w-full" disabled>
            <Check className="h-4 w-4 text-success-500" /> Current plan
          </Button>
        ) : (
          <Button
            variant={plan.highlighted ? 'amber' : 'default'}
            className="w-full"
            onClick={() => onChoose(plan)}
            disabled={pending}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {plan.price === 0 ? 'Switch to Free' : plan.cta}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Plans() {
  const { data, isLoading, isError, refetch } = usePlans();
  const subscribe = useSubscribe();
  const { patchUser } = useAuth();

  const plans = data?.plans || [];
  const currentPlan = data?.currentPlan || 'free';
  const usage = data?.usage;
  const current = plans.find((p) => p.id === currentPlan);

  const choose = (plan) => {
    subscribe.mutate(plan.id, {
      onSuccess: (res) => {
        patchUser(res.user);
        toast.success(res.message || `Switched to ${plan.name}`);
      },
      onError: (e) => toast.error(getErrorMessage(e, 'Could not change plan')),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plans & Billing"
        description="A flat monthly platform fee — you bring your own API keys, so leads & calls are unlimited."
      />

      {/* Current plan + usage */}
      {isLoading ? null : usage ? (
        <Card>
          <CardContent className="grid overflow-hidden p-0 sm:grid-cols-3">
            <div className="flex min-h-[112px] flex-col items-center justify-center gap-2 border-b border-border px-4 py-5 text-center sm:border-b-0 sm:border-r">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                  Current plan
                </p>
                <p className="text-[18px] font-bold text-foreground">{current?.name || 'Free'}</p>
              </div>
            </div>

            <UsageStat
              icon={Bot}
              label="AI agents"
              value={current?.maxAgents == null ? `${usage.agents}` : `${usage.agents} / ${current?.maxAgents}`}
              tone="info"
              className="border-b border-border sm:border-b-0 sm:border-r"
            />
            <UsageStat
              icon={Users}
              label="Team members"
              value={current?.maxMembers == null ? `${usage.members}` : `${usage.members} / ${current?.maxMembers}`}
              tone="brand"
            />
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <CardGridSkeleton count={4} />
      ) : isError ? (
        <QueryError onRetry={refetch} message="Unable to load plans" />
      ) : (
        <div className="grid gap-4 sm:gap-5 lg:gap-6 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={plan.id === currentPlan}
              onChoose={choose}
              pending={subscribe.isPending && subscribe.variables === plan.id}
            />
          ))}
        </div>
      )}

      {/* Demo billing note */}
      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-secondary p-4 text-[13px] text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-info-500" />
        <p>
          You bring your own API keys, so leads and calls are unlimited — plans are just a flat
          platform fee for access and team seats. Payments aren&apos;t connected yet: selecting a
          plan activates it in demo mode without charging. Wire a payment provider (e.g. Stripe) to
          take real payments.
        </p>
      </div>
    </div>
  );
}
