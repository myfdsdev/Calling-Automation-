import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Bot,
  Plus,
  Pencil,
  Play,
  Power,
  Trash2,
  PhoneOutgoing,
  Mic,
  Globe,
  Target,
  MoreVertical,
  AlertTriangle,
  Ticket,
  Utensils,
  BedDouble,
  Stethoscope,
  PartyPopper,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { CardGridSkeleton } from '@/components/common/LoadingSkeleton';
import { QueryError } from '@/components/common/QueryError';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { AgentFormDialog } from '@/pages/partials/AgentFormDialog';
import { useAgents, useAgentMutations } from '@/hooks/queries';
import { getErrorMessage } from '@/lib/api';
import { VOICES, LANGUAGES } from '@/lib/constants';

const voiceLabel = (id) => VOICES.find((v) => v.id === id)?.label?.split(' (')[0] || id;
const langLabel = (id) => LANGUAGES.find((l) => l.id === id)?.label || id;

/**
 * Derive a category icon + soft color from the agent's own data (name / service /
 * goal). Keeps everything dynamic — no hardcoded per-agent values. Defaults to the
 * app's amber accent so most agents stay on the Graphite + Amber theme.
 */
const CATEGORY_VISUALS = [
  { test: /ticket|book|reserv/i, icon: Ticket, bg: '#FFF4DD', fg: '#E58A00' },
  { test: /restaurant|food|cafe|caf[eé]|diner|dining|kitchen|menu/i, icon: Utensils, bg: '#FCE8EF', fg: '#D6336C' },
  { test: /hotel|stay|room|resort|lodg|hospitality/i, icon: BedDouble, bg: '#E7F3FC', fg: '#1683C7' },
  { test: /doctor|clinic|health|medical|dental|dentist|patient|care/i, icon: Stethoscope, bg: '#E3F7F3', fg: '#109486' },
  { test: /event|wedding|party|venue|celebrat/i, icon: PartyPopper, bg: '#F2E8FC', fg: '#8B43C6' },
];
function agentVisual(agent) {
  const hay = `${agent.name || ''} ${agent.serviceName || ''} ${agent.callGoal || ''}`;
  return (
    CATEGORY_VISUALS.find((c) => c.test.test(hay)) || {
      icon: Bot,
      bg: '#FFF4DD',
      fg: '#E58A00',
    }
  );
}

/** Compact metadata chip. `label` is muted, `value` is emphasized. */
function Chip({ icon: Icon, label, value, title }) {
  return (
    <span
      title={title}
      className="inline-flex h-10 max-w-full items-center gap-2 rounded-[9px] border border-border bg-card px-[13px] text-[13px] text-graphite-600"
    >
      <Icon className="h-[17px] w-[17px] flex-shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="truncate">
        {label ? <span>{label} </span> : null}
        <span className="font-semibold text-foreground">{value}</span>
      </span>
    </span>
  );
}

function AgentCard({ agent, onEdit, onTest, onToggle, onDelete }) {
  const visual = agentVisual(agent);
  const Icon = visual.icon;
  const subtitle = agent.companyName || 'AI calling agent';

  return (
    <div className="group flex min-h-[350px] flex-col rounded-[20px] border border-border bg-card p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-graphite-300 hover:shadow-[0_12px_30px_rgba(15,23,42,0.10)] sm:p-6">
      {/* 1. Header */}
      <div className="flex items-start justify-between">
        <span
          className="flex h-[60px] w-[60px] items-center justify-center rounded-2xl sm:h-[72px] sm:w-[72px]"
          style={{ backgroundColor: visual.bg }}
        >
          <Icon className="h-7 w-7 sm:h-8 sm:w-8" style={{ color: visual.fg }} aria-hidden="true" />
        </span>
        <div className="flex items-center gap-2">
          <StatusBadge type="agent" value={agent.status} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-graphite-500 hover:bg-graphite-100 hover:text-foreground"
                aria-label={`Options for ${agent.name}`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(agent)}>
                <Pencil className="h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTest(agent)}>
                <Play className="h-4 w-4" /> Test Agent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggle(agent)}>
                <Power className="h-4 w-4" />
                {agent.status === 'active' ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(agent)}
                className="text-danger-500 focus:bg-danger-50 focus:text-danger-500"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 2. Title */}
      <p className="mt-[22px] text-[13px] text-muted-foreground">{subtitle}</p>
      <h3 className="mt-1 line-clamp-2 min-h-[52px] text-[20px] font-bold leading-[1.25] tracking-[-0.02em] text-foreground sm:min-h-[58px] sm:text-[23px]">
        {agent.name}
      </h3>

      {/* 3. Metadata chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Chip icon={Mic} label="Voice:" value={voiceLabel(agent.voiceId)} />
        <Chip icon={Globe} value={langLabel(agent.language)} />
        {agent.serviceName ? (
          <Chip icon={Target} label="Service:" value={agent.serviceName} title={agent.serviceName} />
        ) : null}
      </div>

      {/* 4. Flexible space (keeps footers bottom-aligned) */}
      <div className="min-h-[26px] flex-grow" />

      {/* 5. Footer */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
            <PhoneOutgoing className="h-4 w-4" aria-hidden="true" /> Calls Made
          </div>
          <p className="mt-1 text-[18px] font-bold text-foreground">{agent.totalCalls || 0}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => onEdit(agent)}
            className="text-graphite-600 hover:bg-graphite-100 hover:text-foreground"
          >
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          <Button onClick={() => onTest(agent)}>
            <Play className="h-4 w-4 text-brand-500" /> Test
          </Button>
        </div>
      </div>
    </div>
  );
}

function TestAgentDialog({ agent, open, onOpenChange }) {
  const { test } = useAgentMutations();
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  // The dialog is opened programmatically by the parent, so Radix's onOpenChange
  // never fires with `true` — run the test off the `open` prop instead.
  const runTest = useCallback(() => {
    if (!agent?._id) return;
    setPreview(null);
    setError('');
    test.mutate(agent._id, {
      onSuccess: setPreview,
      onError: (e) => {
        const msg = getErrorMessage(e, 'Could not test agent');
        setError(msg);
        toast.error(msg);
      },
    });
    // `test` is a fresh object each render; depending on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?._id]);

  useEffect(() => {
    if (open) runTest();
  }, [open, runTest]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Test agent — {agent?.name}</DialogTitle>
          <DialogDescription>
            Preview exactly what this agent will say. No real call is placed.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger-500" />
              <p className="text-danger-700">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={runTest}>
              Try again
            </Button>
          </div>
        ) : test.isPending || !preview ? (
          <div className="space-y-3">
            <div className="h-16 animate-pulse rounded-lg bg-muted" />
            <div className="h-28 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="primary">
                <Mic className="h-3 w-3" /> {preview.voiceId || '—'}
              </Badge>
              <Badge variant="neutral">
                <Globe className="h-3 w-3" /> {langLabel(preview.language)}
              </Badge>
            </div>
            <div className="rounded-lg border border-border bg-accent/40 p-3">
              <p className="text-xs font-semibold text-muted-foreground">Opening message</p>
              <p className="mt-1 text-sm text-foreground">{preview.openingMessage || '—'}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-semibold text-muted-foreground">System prompt</p>
              <pre className="mt-1 max-h-56 overflow-y-auto whitespace-pre-wrap text-xs text-foreground">
                {preview.systemPrompt}
              </pre>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Agents() {
  const { data: agents, isLoading, isError, refetch } = useAgents();
  const { update, remove } = useAgentMutations();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [testing, setTesting] = useState(null);
  const [testOpen, setTestOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (agent) => {
    setEditing(agent);
    setFormOpen(true);
  };
  const openTest = (agent) => {
    setTesting(agent);
    setTestOpen(true);
  };
  const toggle = (agent) => {
    update.mutate(
      { id: agent._id, status: agent.status === 'active' ? 'inactive' : 'active' },
      {
        onSuccess: () =>
          toast.success(agent.status === 'active' ? 'Agent deactivated' : 'Agent activated'),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  };
  const confirmDelete = () => {
    remove.mutate(deleteTarget._id, {
      onSuccess: () => {
        toast.success('Agent deleted');
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  return (
    <div>
      <PageHeader
        title="Agents"
        description="Create and manage your AI calling agents."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Create Agent
          </Button>
        }
      />

      {isLoading ? (
        <CardGridSkeleton />
      ) : isError ? (
        <QueryError onRetry={refetch} message="Unable to load agents" />
      ) : agents?.length ? (
        <div className="grid gap-4 sm:gap-5 lg:gap-6 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
          {agents.map((agent) => (
            <AgentCard
              key={agent._id}
              agent={agent}
              onEdit={openEdit}
              onTest={openTest}
              onToggle={toggle}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bot}
          title="No agents yet"
          description="Create your first AI calling agent to start finding and calling leads."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Create your first agent
            </Button>
          }
        />
      )}

      <AgentFormDialog open={formOpen} onOpenChange={setFormOpen} agent={editing} />
      <TestAgentDialog agent={testing} open={testOpen} onOpenChange={setTestOpen} />
      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete agent?"
        description={`This will permanently remove "${deleteTarget?.name}". Leads assigned to it will be unassigned.`}
        confirmLabel="Delete agent"
        variant="destructive"
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
