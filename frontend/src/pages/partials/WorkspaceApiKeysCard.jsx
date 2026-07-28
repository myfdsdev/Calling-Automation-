import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { KeyRound, Sparkles, Search, PhoneCall, Loader2, Check, Trash2, Info, Lock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api, getErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const SERVICES = [
  {
    key: 'gemini',
    field: 'gemini',
    icon: Sparkles,
    name: 'Gemini',
    desc: 'Script generation, lead scoring & call analysis.',
    placeholder: 'AIza… or your Gemini API key',
    getUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    key: 'serpapi',
    field: 'serpapi',
    icon: Search,
    name: 'SerpAPI',
    desc: 'Google Maps search for finding local leads.',
    placeholder: 'Your 64-character SerpAPI key',
    getUrl: 'https://serpapi.com/manage-api-key',
  },
  {
    key: 'vapi',
    field: 'vapi',
    icon: PhoneCall,
    name: 'Vapi',
    desc: 'AI voice calls — your agents & numbers live in this Vapi account.',
    placeholder: 'Your Vapi private key',
    getUrl: 'https://dashboard.vapi.ai/org/api-keys',
  },
];

function KeyRow({ svc, status, platformFallback, canManage }) {
  const qc = useQueryClient();
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState(false);

  const save = useMutation({
    mutationFn: async (key) => (await api.put('/settings/api-keys', { [svc.field]: key })).data,
    onSuccess: (d) => {
      // For Vapi the server also auto-syncs agents & re-imports numbers.
      toast.success(d.message || `${svc.name} key saved`);
      setValue('');
      setEditing(false);
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      qc.invalidateQueries({ queryKey: ['health'] });
      qc.invalidateQueries({ queryKey: ['telephony'] });
      qc.invalidateQueries({ queryKey: ['agents'] });
    },
    onError: (e) => toast.error(getErrorMessage(e, `Could not save the ${svc.name} key`)),
  });
  const remove = useMutation({
    mutationFn: async () => (await api.delete(`/settings/api-keys/${svc.key}`)).data,
    onSuccess: () => {
      toast.success(`${svc.name} key removed`);
      qc.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const Icon = svc.icon;
  const showForm = canManage && (!status.connected || editing);

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground">{svc.name}</p>
              {status.connected ? (
                <Badge variant="success">Connected</Badge>
              ) : platformFallback ? (
                <Badge variant="neutral">Platform default</Badge>
              ) : (
                <Badge variant="warning">Not set</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{svc.desc}</p>
            {status.connected ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Key ••••{status.last4}
                {status.connectedAt ? ` · added ${formatDate(status.connectedAt)}` : ''}
              </p>
            ) : platformFallback ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Using the platform&apos;s shared key until you add your own.
              </p>
            ) : null}
          </div>
        </div>

        {status.connected && canManage && !editing ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Replace
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
            >
              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Remove
            </Button>
          </div>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            type="password"
            autoComplete="off"
            placeholder={svc.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              onClick={() => value.trim() && save.mutate(value.trim())}
              disabled={!value.trim() || save.isPending}
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editing ? 'Update' : 'Save'}
            </Button>
            {editing ? (
              <Button variant="outline" onClick={() => { setEditing(false); setValue(''); }}>
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {showForm ? (
        <a
          href={svc.getUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs font-medium text-brand-600 hover:underline"
        >
          Get a {svc.name} key →
        </a>
      ) : null}
    </div>
  );
}

/** Shared query for the workspace's API-key status (deduped across consumers). */
export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => (await api.get('/settings/api-keys')).data,
  });
}

/** The connectable key rows + note, without any Card chrome — reused by the
 *  Settings card and the first-run onboarding popup. */
export function WorkspaceApiKeysList() {
  const { data, isLoading } = useApiKeys();
  const status = data?.apiKeys;
  const canManage = data?.canManage;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {SERVICES.map((svc) => (
        <KeyRow
          key={svc.key}
          svc={svc}
          status={status?.[svc.key] || {}}
          platformFallback={status?.platformFallback?.[svc.key]}
          canManage={canManage}
        />
      ))}
      <div className="flex items-start gap-2.5 rounded-lg bg-surface-secondary p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-info-500" />
        Keys are verified with the provider, encrypted before storage, and never shown again. All
        members of this workspace use these keys; each key&apos;s usage is billed to your own
        provider account.
      </div>
    </div>
  );
}

export function WorkspaceApiKeysCard() {
  const { data, isLoading } = useApiKeys();
  const canManage = data?.canManage;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Workspace API keys
            </CardTitle>
            <CardDescription>
              Connect your own keys — used only by this workspace, never another&apos;s.
            </CardDescription>
          </div>
          {!canManage && !isLoading ? (
            <Badge variant="neutral">
              <Lock className="h-3 w-3" /> Owner only
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <WorkspaceApiKeysList />
      </CardContent>
    </Card>
  );
}
