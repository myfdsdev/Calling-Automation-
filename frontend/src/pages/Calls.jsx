import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  PhoneCall,
  PhoneForwarded,
  ThumbsUp,
  Clock,
  Pause,
  Play,
  Square,
  Eye,
  PlayCircle,
  FileText,
  Radio,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { StatGridSkeleton, TableSkeleton } from '@/components/common/LoadingSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CallDetailsModal } from '@/pages/partials/CallDetailsModal';
import {
  useCalls,
  useActiveAutomation,
  useAutomationControls,
} from '@/hooks/queries';
import { CALL_RESULT_OPTIONS } from '@/lib/constants';
import { formatDuration, formatDateTime } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';

function AutomationFailed({ automation }) {
  if (automation?.status !== 'failed' || !automation.lastError) return null;
  return (
    <Card className="border-danger-200 bg-danger-50/60">
      <CardContent className="flex items-start gap-3 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger-500" />
        <div className="space-y-1 text-sm">
          <p className="font-medium text-danger-800">
            Automation stopped — no calls were placed
          </p>
          <p className="text-danger-700">{automation.lastError}</p>
          <p className="text-danger-700">
            Your leads were returned to “Selected”. Fix the setup in{' '}
            <Link to="/api-settings" className="font-medium underline">
              API Settings
            </Link>
            , then start the automation again.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function LiveCalling({ automation, calls }) {
  const { pause, resume, stop } = useAutomationControls();
  const isActive = ['running', 'paused'].includes(automation?.status);
  if (!automation || !isActive) return null;

  const current = (calls || []).find((c) => ['ringing', 'in_progress'].includes(c.status));
  const total = automation.totalLeads || automation.queue?.length || 0;
  const done = automation.completedCalls || 0;
  const remaining = Math.max(0, total - done);
  const progress = total ? (done / total) * 100 : 0;

  const act = (m, msg) =>
    m.mutate(automation._id, {
      onSuccess: () => toast.success(msg),
      onError: (e) => toast.error(getErrorMessage(e)),
    });

  return (
    <Card className="border-primary/30 bg-accent/20">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          Live automation
          <StatusBadge type="automation" value={automation.status} />
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          {automation.status === 'running' ? (
            <Button variant="outline" size="sm" onClick={() => act(pause, 'Paused')}>
              <Pause className="h-4 w-4" /> Pause
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => act(resume, 'Resumed')}>
              <Play className="h-4 w-4" /> Resume
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={() => act(stop, 'Stopped')}>
            <Square className="h-4 w-4" /> Stop
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Current lead</p>
            <p className="mt-1 truncate text-sm font-semibold text-foreground">
              {current?.leadId?.businessName || (automation.status === 'paused' ? 'Paused' : 'Connecting…')}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Agent</p>
            <p className="mt-1 truncate text-sm font-semibold text-foreground">
              {automation.agentId?.name || '—'}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="mt-1 text-sm font-semibold capitalize text-foreground">
              {current ? current.status.replace('_', ' ') : automation.status}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Leads remaining</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{remaining}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{done} of {total} calls completed</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Calls() {
  const [result, setResult] = useState('');
  const [status, setStatus] = useState('');
  const [detailCall, setDetailCall] = useState(null);

  const autoQ = useActiveAutomation(true);
  const { data, isLoading, isError } = useCalls({ result, status }, true);

  const calls = data?.calls || [];
  const stats = data?.stats || {};

  const columns = [
    {
      key: 'business',
      header: 'Business',
      className: 'max-w-[260px]',
      render: (c) => (
        <div className="max-w-[260px]">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-foreground">
              {c.leadId?.businessName || 'Lead'}
            </p>
            {c.simulated ? <Badge variant="warning">Simulated</Badge> : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {c.failureReason || c.leadId?.phone || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'agent',
      header: 'Agent',
      className: 'max-w-[160px]',
      render: (c) => (
        <span className="block max-w-[160px] truncate text-muted-foreground">{c.agentId?.name || '—'}</span>
      ),
    },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge type="callStatus" value={c.status} /> },
    { key: 'result', header: 'Result', render: (c) => <StatusBadge type="callResult" value={c.result} /> },
    { key: 'duration', header: 'Duration', render: (c) => <span className="whitespace-nowrap text-muted-foreground">{formatDuration(c.duration)}</span> },
    { key: 'date', header: 'Date', render: (c) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(c.createdAt)}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (c) => (
        <div className="flex justify-end gap-1">
          {c.recordingUrl ? (
            <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Play recording">
              <a href={c.recordingUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                <PlayCircle className="h-4 w-4" />
              </a>
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setDetailCall(c._id);
            }}
          >
            <Eye className="h-4 w-4" /> Details
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calls"
        description="Live call activity and full call history with transcripts and recordings."
      />

      {isLoading ? (
        <StatGridSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={PhoneCall} label="Calls Today" value={stats.callsToday ?? 0} tone="primary" />
          <StatCard icon={PhoneForwarded} label="Connected Calls" value={stats.connected ?? 0} tone="info" />
          <StatCard icon={ThumbsUp} label="Interested Leads" value={stats.interested ?? 0} tone="success" />
          <StatCard icon={Clock} label="Avg Call Duration" value={formatDuration(stats.avgDuration)} tone="warning" />
        </div>
      )}

      <AutomationFailed automation={autoQ.data} />
      <LiveCalling automation={autoQ.data} calls={calls} />

      <FilterBar
        filters={[
          { key: 'result', placeholder: 'All results', value: result, onChange: setResult, options: CALL_RESULT_OPTIONS },
          {
            key: 'status',
            placeholder: 'All statuses',
            value: status,
            onChange: setStatus,
            options: [
              { value: 'completed', label: 'Completed' },
              { value: 'no_answer', label: 'No Answer' },
              { value: 'busy', label: 'Busy' },
              { value: 'ringing', label: 'Ringing' },
              { value: 'in_progress', label: 'In Progress' },
            ],
          },
        ]}
      />

      {isLoading ? (
        <TableSkeleton cols={6} />
      ) : isError ? (
        <EmptyState icon={PhoneCall} title="Unable to load calls" description="Please refresh and try again." />
      ) : calls.length ? (
        <DataTable columns={columns} data={calls} onRowClick={(c) => setDetailCall(c._id)} />
      ) : (
        <EmptyState
          icon={Radio}
          title="No calls yet"
          description="Start an automation from the Lead Finder to begin calling your leads."
          action={
            <Button asChild>
              <Link to="/lead-finder">Start an automation</Link>
            </Button>
          }
        />
      )}

      <CallDetailsModal
        callId={detailCall}
        open={Boolean(detailCall)}
        onOpenChange={(v) => !v && setDetailCall(null)}
      />
    </div>
  );
}
