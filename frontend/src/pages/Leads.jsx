import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, PhoneOff, ThumbsUp, ThumbsDown, Search, Eye } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { StatGridSkeleton, TableSkeleton } from '@/components/common/LoadingSkeleton';
import { QueryError } from '@/components/common/QueryError';
import { Button } from '@/components/ui/button';
import { LeadDrawer } from '@/pages/partials/LeadDrawer';
import { useLeads, useAgents } from '@/hooks/queries';
import { LEAD_STATUS_OPTIONS, CALL_RESULT_OPTIONS } from '@/lib/constants';
import { formatDate, cn } from '@/lib/utils';

function ScorePill({ score = 0 }) {
  const tone =
    score >= 70 ? 'bg-emerald-50 text-emerald-700' : score >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-secondary text-secondary-foreground';
  return <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', tone)}>{score}</span>;
}

export default function Leads() {
  const [search, setSearch] = useState('');
  const [callStatus, setCallStatus] = useState('');
  const [callResult, setCallResult] = useState('');
  const [agentId, setAgentId] = useState('');
  const [city, setCity] = useState('');

  const [drawerLead, setDrawerLead] = useState(null);

  const { data: agents } = useAgents();
  const { data, isLoading, isError, refetch } = useLeads({
    search,
    callStatus,
    callResult,
    agentId,
    city,
  });

  const leads = data?.leads || [];
  const stats = data?.stats || {};

  const openDrawer = (lead) => setDrawerLead(lead._id);

  const columns = [
    {
      key: 'businessName',
      header: 'Business',
      render: (l) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{l.businessName}</p>
          <p className="truncate text-xs text-muted-foreground">{l.website || l.category || '—'}</p>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: (l) => <span className="whitespace-nowrap text-muted-foreground">{l.phone || '—'}</span> },
    {
      key: 'location',
      header: 'Location',
      render: (l) => <span className="whitespace-nowrap text-muted-foreground">{[l.city, l.state].filter(Boolean).join(', ') || '—'}</span>,
    },
    { key: 'source', header: 'Source', render: (l) => <span className="capitalize text-muted-foreground">{(l.source || '').replace('_', ' ')}</span> },
    { key: 'leadScore', header: 'Score', render: (l) => <ScorePill score={l.leadScore} /> },
    { key: 'agent', header: 'Agent', render: (l) => <span className="text-muted-foreground">{l.agentId?.name || '—'}</span> },
    { key: 'callStatus', header: 'Status', render: (l) => <StatusBadge type="callStatus" value={l.callStatus} /> },
    { key: 'callResult', header: 'Result', render: (l) => <StatusBadge type="callResult" value={l.callResult} /> },
    { key: 'lastCalledAt', header: 'Last Called', render: (l) => <span className="whitespace-nowrap text-muted-foreground">{l.lastCalledAt ? formatDate(l.lastCalledAt) : '—'}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (l) => (
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openDrawer(l); }}>
          <Eye className="h-4 w-4" /> View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Manage every lead you've found and track its calling outcome."
        actions={
          <Button asChild variant="outline">
            <Link to="/lead-finder"><Search className="h-4 w-4" /> Find leads</Link>
          </Button>
        }
      />

      {isLoading ? (
        <StatGridSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Total Leads" value={stats.total ?? 0} tone="primary" />
          <StatCard icon={PhoneOff} label="Not Called" value={stats.notCalled ?? 0} tone="info" />
          <StatCard icon={ThumbsUp} label="Interested" value={stats.interested ?? 0} tone="success" />
          <StatCard icon={ThumbsDown} label="Not Interested" value={stats.notInterested ?? 0} tone="warning" />
        </div>
      )}

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by business name…"
        filters={[
          { key: 'status', placeholder: 'All statuses', value: callStatus, onChange: setCallStatus, options: LEAD_STATUS_OPTIONS },
          { key: 'result', placeholder: 'All results', value: callResult, onChange: setCallResult, options: CALL_RESULT_OPTIONS },
          {
            key: 'agent',
            placeholder: 'All agents',
            value: agentId,
            onChange: setAgentId,
            options: (agents || []).map((a) => ({ value: a._id, label: a.name })),
          },
        ]}
      />

      {isLoading ? (
        <TableSkeleton cols={7} />
      ) : isError ? (
        <QueryError onRetry={refetch} message="Unable to load leads" />
      ) : leads.length ? (
        <DataTable columns={columns} data={leads} onRowClick={openDrawer} />
      ) : (
        <EmptyState
          icon={Users}
          title="No leads match"
          description="Adjust your filters, or head to the Lead Finder to discover new leads."
          action={
            <Button asChild>
              <Link to="/lead-finder">Find leads</Link>
            </Button>
          }
        />
      )}

      <LeadDrawer
        leadId={drawerLead}
        open={Boolean(drawerLead)}
        onOpenChange={(v) => !v && setDrawerLead(null)}
        onDeleted={refetch}
      />
    </div>
  );
}
