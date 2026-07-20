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
  Languages,
  Target,
  MoreVertical,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { CardGridSkeleton } from '@/components/common/LoadingSkeleton';
import { QueryError } from '@/components/common/QueryError';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { Card, CardContent } from '@/components/ui/card';
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

function AgentCard({ agent, onEdit, onTest, onToggle, onDelete }) {
  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Bot className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{agent.name}</p>
              <p className="truncate text-xs text-muted-foreground">{agent.companyName || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <StatusBadge type="agent" value={agent.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
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
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <Meta icon={Mic} label="Voice" value={voiceLabel(agent.voiceId)} />
          <Meta icon={Languages} label="Language" value={langLabel(agent.language)} />
          <Meta icon={Target} label="Service" value={agent.serviceName || '—'} />
          <Meta icon={PhoneOutgoing} label="Calls made" value={agent.totalCalls || 0} />
        </div>

        {agent.callGoal ? (
          <div className="rounded-lg bg-secondary/60 p-3">
            <p className="text-xs font-medium text-muted-foreground">Call goal</p>
            <p className="mt-0.5 line-clamp-2 text-sm text-foreground">{agent.callGoal}</p>
          </div>
        ) : null}

        <div className="mt-auto flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(agent)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => onTest(agent)}>
            <Play className="h-4 w-4" /> Test
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Meta({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
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
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
              <p className="text-red-800">{error}</p>
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
                <Languages className="h-3 w-3" /> {langLabel(preview.language)}
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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
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
