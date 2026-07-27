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
  ShieldCheck,
  User as UserIcon,
  Mail,
  Info,
  X,
  Link2,
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
import { MoreVertical } from 'lucide-react';
import { useWorkspace, useWorkspaceMutations } from '@/hooks/queries';
import { getErrorMessage } from '@/lib/api';
import { initials, formatDate } from '@/lib/utils';

const ROLE_META = {
  owner: { label: 'Owner', icon: Crown, variant: 'primary' },
  admin: { label: 'Admin', icon: ShieldCheck, variant: 'info' },
  member: { label: 'Member', icon: UserIcon, variant: 'neutral' },
};

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

function InviteDialog({ open, onOpenChange, canInviteAdmins }) {
  const { invite } = useWorkspaceMutations();
  const [createdLink, setCreatedLink] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: { email: '', role: 'member' } });
  const role = watch('role');

  const close = (v) => {
    onOpenChange(v);
    if (!v) {
      reset();
      setCreatedLink('');
    }
  };

  const onSubmit = (values) => {
    invite.mutate(values, {
      onSuccess: (d) => {
        setCreatedLink(d.invite.link);
        toast.success('Invite created — share the link');
      },
      onError: (e) => toast.error(getErrorMessage(e, 'Could not create invite')),
    });
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a member</DialogTitle>
          <DialogDescription>
            They&apos;ll join this workspace and share its credits &amp; plan. Their leads and calls
            stay private to them.
          </DialogDescription>
        </DialogHeader>

        {createdLink ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-success-500/30 bg-success-50 p-3 text-sm text-success-700">
              Invite ready. Send this link to the person — they must sign in with the invited email
              to join.
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-secondary p-2">
              <Link2 className="ml-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <input
                readOnly
                value={createdLink}
                className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none"
                onFocus={(e) => e.target.select()}
              />
              <CopyLinkButton link={createdLink} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { reset(); setCreatedLink(''); }}>
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
                placeholder="teammate@company.com"
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
                  <SelectItem value="member">Member — can use the workspace</SelectItem>
                  {canInviteAdmins ? (
                    <SelectItem value="admin">Admin — can also invite &amp; manage members</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
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
                Create invite
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RoleBadge({ role }) {
  const meta = ROLE_META[role] || ROLE_META.member;
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant}>
      <Icon className="h-3 w-3" /> {meta.label}
    </Badge>
  );
}

export default function Workspace() {
  const { data, isLoading, isError, refetch } = useWorkspace();
  const { revokeInvite, changeRole, removeMember } = useWorkspaceMutations();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

  const ws = data?.workspace;
  const members = data?.members || [];
  const invites = data?.invites || [];
  const canManage = ws?.canManage;
  const isOwner = ws?.isOwner;

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace"
        description={ws?.name ? `Manage members of ${ws.name}.` : 'Manage your team members.'}
        actions={
          canManage ? (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" /> Invite member
            </Button>
          ) : null
        }
      />

      {/* How billing/isolation works */}
      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-secondary p-4 text-[13px] text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-info-500" />
        <p>
          Members share this workspace&apos;s <span className="font-medium text-foreground">credits and plan</span> —
          all usage is billed to the owner. Each member&apos;s{' '}
          <span className="font-medium text-foreground">agents, leads and calls stay private</span> to them.
        </p>
      </div>

      {isLoading ? (
        <TableSkeleton rows={3} cols={4} />
      ) : isError ? (
        <QueryError onRetry={refetch} message="Unable to load your workspace" />
      ) : (
        <>
          {/* Members */}
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Members
                <span className="text-sm font-normal text-muted-foreground">({members.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-4 sm:px-6">
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
                          {m.role === 'member' ? (
                            <DropdownMenuItem onClick={() => doChangeRole(m.id, 'admin')}>
                              <ShieldCheck className="h-4 w-4" /> Make admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => doChangeRole(m.id, 'member')}>
                              <UserIcon className="h-4 w-4" /> Make member
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
                <CardDescription>Anyone with the link can join by signing in with the invited email.</CardDescription>
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
                        </div>
                        <CopyLinkButton link={i.link} />
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
                    description="Invite a teammate to collaborate in this workspace."
                    className="border-0 py-8"
                    action={
                      <Button onClick={() => setInviteOpen(true)}>
                        <UserPlus className="h-4 w-4" /> Invite member
                      </Button>
                    }
                  />
                )}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} canInviteAdmins={isOwner} />
      <ConfirmationDialog
        open={Boolean(removeTarget)}
        onOpenChange={(v) => !v && setRemoveTarget(null)}
        title="Remove member?"
        description={`${removeTarget?.name} will lose access to this workspace and move back to their own. Their data stays with them.`}
        confirmLabel="Remove member"
        variant="destructive"
        loading={removeMember.isPending}
        onConfirm={confirmRemove}
      />
    </div>
  );
}
