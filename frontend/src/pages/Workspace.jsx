import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  Loader2,
  Copy,
  Check,
  Trash2,
  Crown,
  Pencil,
  Eye,
  Mail,
  Info,
  X,
  Link2,
  Send,
  SlidersHorizontal,
  MoreVertical,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { TableSkeleton } from '@/components/common/LoadingSkeleton';
import { QueryError } from '@/components/common/QueryError';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useWorkspace, useWorkspaceMutations } from '@/hooks/queries';
import { getErrorMessage } from '@/lib/api';
import { cn, initials, formatDate } from '@/lib/utils';

const ROLE_META = {
  owner: { label: 'Admin', icon: Crown, variant: 'primary' },
  editor: { label: 'Editor', icon: Pencil, variant: 'info' },
  viewer: { label: 'Viewer', icon: Eye, variant: 'neutral' },
};

function RoleBadge({ role }) {
  const meta = ROLE_META[role] || ROLE_META.editor;
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant}>
      <Icon className="h-3 w-3" /> {meta.label}
    </Badge>
  );
}

function FeatureChips({ keys = [], featureMap, empty = 'No features yet' }) {
  if (!keys.length) return <span className="text-xs text-muted-foreground">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {keys.map((k) => (
        <span
          key={k}
          className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground"
        >
          {featureMap[k] || k}
        </span>
      ))}
    </div>
  );
}

/** Multi-select list of grantable features, sourced from the app's live registry. */
function FeaturePicker({ features, selected, onToggle }) {
  if (!features.length) {
    return (
      <p className="rounded-lg border border-border bg-surface-secondary p-3 text-sm text-muted-foreground">
        No features are available to grant right now.
      </p>
    );
  }
  return (
    <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
      {features.map((f) => {
        const on = selected.includes(f.key);
        return (
          <button
            type="button"
            key={f.key}
            onClick={() => onToggle(f.key)}
            className={cn(
              'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
              on ? 'border-brand-300 bg-brand-50' : 'border-border hover:bg-surface-secondary',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border',
                on ? 'border-brand-500 bg-brand-500 text-white' : 'border-border',
              )}
            >
              {on ? <Check className="h-3.5 w-3.5" /> : null}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{f.label}</span>
              <span className="block text-xs leading-snug text-muted-foreground">
                {f.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CopyLinkButton({ link }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Invite link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — copy it manually');
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {copied ? <Check className="h-4 w-4 text-success-500" /> : <Copy className="h-4 w-4" />}
      {copied ? 'Copied' : 'Copy link'}
    </Button>
  );
}

function InviteDialog({ open, onOpenChange, features }) {
  const { invite } = useWorkspaceMutations();
  const [result, setResult] = useState(null); // { link, emailed }
  const [selected, setSelected] = useState([]);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: { email: '', role: 'editor' } });
  const role = watch('role');

  const toggle = (key) =>
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));

  const resetAll = () => {
    reset({ email: '', role: 'editor' });
    setSelected([]);
    setResult(null);
  };

  const close = (v) => {
    onOpenChange(v);
    if (!v) resetAll();
  };

  const onSubmit = (values) => {
    invite.mutate(
      { ...values, assignedFeatures: selected },
      {
        onSuccess: (d) => {
          setResult({ link: d.invite.link, emailed: d.emailed });
          toast.success(d.message || 'Invite created');
        },
        onError: (e) => toast.error(getErrorMessage(e, 'Could not create invite')),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a user</DialogTitle>
          <DialogDescription>
            They&apos;ll join this workspace and share its API keys, with access to only the
            features you grant. Their leads and calls stay private to them.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div
              className={cn(
                'rounded-lg border p-3 text-sm',
                result.emailed
                  ? 'border-success-500/30 bg-success-50 text-success-700'
                  : 'border-brand-200 bg-brand-50 text-brand-800',
              )}
            >
              {result.emailed
                ? 'Invitation emailed. You can also share the link below.'
                : "Invite created, but email isn't configured — share this link instead."}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-secondary p-2">
              <Link2 className="ml-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <input
                readOnly
                value={result.link}
                className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none"
                onFocus={(e) => e.target.select()}
              />
              <CopyLinkButton link={result.link} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetAll}>
                Invite another
              </Button>
              <Button onClick={() => close(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inviteEmail">Email address</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="user@company.com"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email ? (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setValue('role', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor — can use granted features</SelectItem>
                  <SelectItem value="viewer">Viewer — read-only access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Features to grant</Label>
              <FeaturePicker features={features} selected={selected} onToggle={toggle} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={invite.isPending}>
                {invite.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Send invite
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditFeaturesDialog({ member, features, onOpenChange }) {
  const { updateFeatures } = useWorkspaceMutations();
  const [selected, setSelected] = useState(member?.assignedFeatures || []);
  const open = Boolean(member);

  const toggle = (key) =>
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));

  const save = () =>
    updateFeatures.mutate(
      { userId: member.id, assignedFeatures: selected },
      {
        onSuccess: () => {
          toast.success(`Updated ${member.name}'s access`);
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit features</DialogTitle>
          <DialogDescription>
            Choose what {member?.name} can access in this workspace.
          </DialogDescription>
        </DialogHeader>
        <FeaturePicker features={features} selected={selected} onToggle={toggle} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={updateFeatures.isPending}>
            {updateFeatures.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save access
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Workspace() {
  const { data, isLoading, isError, refetch } = useWorkspace();
  const { resendInvite, revokeInvite, changeRole, removeMember } = useWorkspaceMutations();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [featuresTarget, setFeaturesTarget] = useState(null);

  const ws = data?.workspace;
  const features = data?.features || [];
  const members = data?.members || [];
  const invites = data?.invites || [];
  const canManage = ws?.canManage;
  const isOwner = ws?.isOwner;
  const featureMap = Object.fromEntries(features.map((f) => [f.key, f.label]));

  const doChangeRole = (userId, role) =>
    changeRole.mutate(
      { userId, role },
      {
        onSuccess: () => toast.success('Role updated'),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );

  const confirmRemove = () =>
    removeMember.mutate(removeTarget.id, {
      onSuccess: () => {
        toast.success(`${removeTarget.name} removed from the workspace`);
        setRemoveTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });

  const doResend = (id) =>
    resendInvite.mutate(id, {
      onSuccess: (d) => toast.success(d.message || 'Invite re-sent'),
      onError: (e) => toast.error(getErrorMessage(e)),
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description={ws?.name ? `Manage the people in ${ws.name}.` : 'Manage the people in your workspace.'}
        actions={
          canManage ? (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" /> Invite user
            </Button>
          ) : null
        }
      />

      {/* How workspace sharing/isolation works */}
      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-secondary p-4 text-[13px] text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-info-500" />
        <p>
          Users share this workspace&apos;s <span className="font-medium text-foreground">API keys</span> and
          get only the <span className="font-medium text-foreground">features you grant</span>. Each
          user&apos;s{' '}
          <span className="font-medium text-foreground">agents, leads and calls stay private</span> to them.
        </p>
      </div>

      {isLoading ? (
        <TableSkeleton rows={3} cols={4} />
      ) : isError ? (
        <QueryError onRetry={refetch} message="Unable to load your workspace" />
      ) : (
        <>
          {/* Users */}
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Users
                <span className="text-sm font-normal text-muted-foreground">({members.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {members.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                      {initials(m.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-medium text-foreground">
                        <span className="truncate">{m.name}</span>
                        {m.isYou ? (
                          <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                            You
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                      <div className="mt-1.5">
                        {m.isOwner ? (
                          <span className="text-xs text-muted-foreground">All features</span>
                        ) : (
                          <FeatureChips keys={m.assignedFeatures} featureMap={featureMap} />
                        )}
                      </div>
                    </div>
                    <RoleBadge role={m.role} />
                    {/* Actions: owner can manage non-owners; nobody manages the owner */}
                    {isOwner && !m.isOwner ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Manage ${m.name}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setFeaturesTarget(m)}>
                            <SlidersHorizontal className="h-4 w-4" /> Edit features
                          </DropdownMenuItem>
                          {m.role === 'viewer' ? (
                            <DropdownMenuItem onClick={() => doChangeRole(m.id, 'editor')}>
                              <Pencil className="h-4 w-4" /> Make editor
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => doChangeRole(m.id, 'viewer')}>
                              <Eye className="h-4 w-4" /> Make viewer
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setRemoveTarget(m)}
                            className="text-danger-500 focus:bg-danger-50 focus:text-danger-500"
                          >
                            <Trash2 className="h-4 w-4" /> Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="w-8" />
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Pending invites */}
          {canManage ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Pending invites
                  <span className="text-sm font-normal text-muted-foreground">({invites.length})</span>
                </CardTitle>
                <CardDescription>
                  Invited people get an email with a join link. It expires after 7 days.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invites.length ? (
                  <ul className="space-y-2">
                    {invites.map((i) => (
                      <li
                        key={i.id}
                        className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
                      >
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                          <Mail className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{i.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {ROLE_META[i.role]?.label} · expires {formatDate(i.expiresAt)}
                          </p>
                          <div className="mt-1.5">
                            <FeatureChips
                              keys={i.assignedFeatures}
                              featureMap={featureMap}
                              empty="No features granted"
                            />
                          </div>
                        </div>
                        <CopyLinkButton link={i.link} />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => doResend(i.id)}
                          disabled={resendInvite.isPending}
                        >
                          <Send className="h-4 w-4" /> Resend
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            revokeInvite.mutate(i.id, {
                              onSuccess: () => toast.success('Invite revoked'),
                              onError: (e) => toast.error(getErrorMessage(e)),
                            })
                          }
                        >
                          <X className="h-4 w-4" /> Revoke
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={UserPlus}
                    title="No pending invites"
                    description="Invite someone to collaborate in this workspace."
                    className="border-0 py-8"
                    action={
                      <Button onClick={() => setInviteOpen(true)}>
                        <UserPlus className="h-4 w-4" /> Invite user
                      </Button>
                    }
                  />
                )}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} features={features} />
      <EditFeaturesDialog
        key={featuresTarget?.id || 'none'}
        member={featuresTarget}
        features={features}
        onOpenChange={(v) => !v && setFeaturesTarget(null)}
      />
      <ConfirmationDialog
        open={Boolean(removeTarget)}
        onOpenChange={(v) => !v && setRemoveTarget(null)}
        title="Remove user?"
        description={`${removeTarget?.name} will lose access to this workspace and move back to their own. Their data stays with them.`}
        confirmLabel="Remove user"
        variant="destructive"
        loading={removeMember.isPending}
        onConfirm={confirmRemove}
      />
    </div>
  );
}
