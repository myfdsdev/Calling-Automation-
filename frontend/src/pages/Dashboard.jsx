import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Bot,
  Users,
  PhoneCall,
  ThumbsUp,
  Pause,
  Play,
  Square,
  ArrowRight,
  Search,
  Plus,
  Rocket,
} from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { ProgressCard } from '@/components/common/ProgressCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { StatGridSkeleton, TableSkeleton } from '@/components/common/LoadingSkeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardBanner } from '@/pages/partials/DashboardBanner';
import {
  useDashboardStats,
  useRecentLeads,
  useRecentCalls,
  useActiveAutomation,
  useAutomationControls,
} from '@/hooks/queries';
import { getErrorMessage } from '@/lib/api';
import { formatDuration, formatDate } from '@/lib/utils';

function OnboardingCard() {
  const steps = [
    {
      icon: Bot,
      title: 'Create your first calling agent',
      desc: 'Set up voice, script and objective.',
      to: '/agents',
      cta: 'Create Agent',
    },
    {
      icon: Search,
      title: 'Find your first leads',
      desc: 'Search local businesses by category & location.',
      to: '/lead-finder',
      cta: 'Find Leads',
    },
    {
      icon: Rocket,
      title: 'Start your first automation',
      desc: 'Let your agent call the best leads automatically.',
      to: '/lead-finder',
      cta: 'Start Calling',
    },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Get started in 3 steps</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="flex flex-col rounded-xl border border-border p-5">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <s.icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold text-muted-foreground">Step {i + 1}</span>
            </div>
            <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{s.desc}</p>
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link to={s.to}>{s.cta}</Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CurrentAutomation({ automation }) {
  const { pause, resume, stop } = useAutomationControls();
  if (!automation) return null;

  const isActive = ['running', 'paused'].includes(automation.status);
  const total = automation.totalLeads || automation.queue?.length || 0;
  const done = automation.completedCalls || 0;
  const progress = total ? (done / total) * 100 : automation.status === 'completed' ? 100 : 0;

  const act = (mutation, label) =>
    mutation.mutate(automation._id, {
      onSuccess: () => toast.success(label),
      onError: (e) => toast.error(getErrorMessage(e)),
    });

  const actions = (
    <>
      <Button asChild variant="outline" size="sm">
        <Link to="/calls">
          View Automation <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
      {automation.status === 'running' ? (
        <Button variant="outline" size="sm" onClick={() => act(pause, 'Automation paused')}>
          <Pause className="h-4 w-4" /> Pause
        </Button>
      ) : null}
      {automation.status === 'paused' ? (
        <Button variant="outline" size="sm" onClick={() => act(resume, 'Automation resumed')}>
          <Play className="h-4 w-4" /> Resume
        </Button>
      ) : null}
      {isActive ? (
        <Button variant="destructive" size="sm" onClick={() => act(stop, 'Automation stopped')}>
          <Square className="h-4 w-4" /> Stop
        </Button>
      ) : null}
    </>
  );

  return (
    <ProgressCard
      title={automation.name || automation.agentId?.name || 'Automation'}
      subtitle={[automation.businessCategory, automation.location].filter(Boolean).join(' • ')}
      status={automation.status}
      progress={progress}
      actions={actions}
      stats={[
        { label: 'Agent', value: automation.agentId?.name || '—' },
        { label: 'Leads', value: total },
        { label: 'Calls Done', value: done },
        { label: 'Interested', value: automation.interestedLeads || 0 },
      ]}
    />
  );
}

export default function Dashboard() {
  const statsQ = useDashboardStats();
  const leadsQ = useRecentLeads();
  const callsQ = useRecentCalls();
  const autoQ = useActiveAutomation(true);

  const stats = statsQ.data || {};
  const isEmpty =
    !statsQ.isLoading &&
    (stats.totalAgents || 0) === 0 &&
    (stats.leadsFound || 0) === 0 &&
    !autoQ.data;

  return (
    <div className="space-y-6">
      <DashboardBanner />

      {statsQ.isLoading ? (
        <StatGridSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Bot} label="Total Agents" value={stats.totalAgents ?? 0} hint="AI calling agents" tone="primary" />
          <StatCard icon={Users} label="Leads Found" value={stats.leadsFound ?? 0} hint="Across all searches" tone="info" />
          <StatCard icon={PhoneCall} label="Calls Completed" value={stats.callsCompleted ?? 0} hint="Connected calls" tone="success" />
          <StatCard icon={ThumbsUp} label="Interested Leads" value={stats.interestedLeads ?? 0} hint="Positive outcomes" tone="warning" />
        </div>
      )}

      {isEmpty ? (
        <OnboardingCard />
      ) : (
        <>
          {autoQ.data ? <CurrentAutomation automation={autoQ.data} /> : null}

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Recent leads */}
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Recent Leads</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/leads">View all <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {leadsQ.isLoading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
                    ))}
                  </div>
                ) : leadsQ.data?.length ? (
                  <ul className="divide-y divide-border">
                    {leadsQ.data.map((lead) => (
                      <li key={lead._id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{lead.businessName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {lead.phone || 'No phone'} · {[lead.city, lead.state].filter(Boolean).join(', ') || '—'}
                          </p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-3">
                          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                            {lead.leadScore ?? 0}
                          </span>
                          <StatusBadge type="callStatus" value={lead.callStatus} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">No leads yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Recent calls */}
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Recent Calls</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/calls">View all <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {callsQ.isLoading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
                    ))}
                  </div>
                ) : callsQ.data?.length ? (
                  <ul className="divide-y divide-border">
                    {callsQ.data.map((call) => (
                      <li key={call._id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {call.leadId?.businessName || 'Lead'}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {call.agentId?.name || '—'} · {formatDate(call.createdAt)}
                          </p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-3">
                          <span className="text-xs text-muted-foreground">{formatDuration(call.duration)}</span>
                          <StatusBadge type="callResult" value={call.result} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={PhoneCall}
                    title="No calls yet"
                    description="Start an automation to see call activity here."
                    className="border-0 py-6"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
