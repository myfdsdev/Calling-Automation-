import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Sparkles,
  PhoneCall,
  Search,
  ShieldCheck,
  Info,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TwilioConnectCard } from '@/pages/partials/TwilioConnectCard';
import { api, getErrorMessage } from '@/lib/api';

const INTEGRATIONS = [
  {
    key: 'gemini',
    icon: Sparkles,
    name: 'Gemini',
    desc: 'Script generation, lead scoring, and call analysis.',
    env: 'GEMINI_API_KEY',
  },
  {
    key: 'leadProvider',
    icon: Search,
    name: 'SerpAPI',
    desc: 'Google Maps search for finding local business leads.',
    env: 'SERPAPI_API_KEY',
  },
  {
    key: 'vapi',
    icon: PhoneCall,
    name: 'Voice calling',
    desc: 'Places outbound AI calls from your connected Twilio number.',
    env: 'VAPI_PRIVATE_KEY (platform)',
  },
];

export default function ApiSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: async () => (await api.get('/health')).data,
  });

  const syncAgents = useMutation({
    mutationFn: async () => (await api.post('/settings/telephony/sync-agents')).data,
    onSuccess: (d) => {
      toast.success(`Synced ${d.synced} of ${d.total} agents`);
      qc.invalidateQueries({ queryKey: ['telephony'] });
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not sync agents')),
  });

  const features = data?.features || {};

  return (
    <div className="space-y-6">
      <PageHeader title="API Settings" description="Integration status for your calling stack." />

      <Card className="border-primary/20 bg-accent/20">
        <CardContent className="grid grid-cols-[24px_1fr] gap-3 p-4">
          <span className="flex h-6 w-6 items-start justify-center pt-0.5 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 space-y-1 text-sm">
            <p className="font-medium leading-5 text-foreground">How your credentials are handled</p>
            <p className="max-w-6xl leading-5 text-muted-foreground">
              Your Twilio Auth Token is encrypted before it&apos;s stored and is never sent back to
              the browser — you&apos;ll only ever see the last few characters of your Account SID.
              Platform keys (Gemini, SerpAPI, voice calling) live in the server&apos;s{' '}
              <code className="rounded bg-secondary px-1 py-0.5 text-xs">.env</code> and are never
              exposed to the client.
            </p>
          </div>
        </CardContent>
      </Card>

      {features.demoMode ? (
        <Card className="border-brand-200 bg-brand-100/60">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-brand-800">Demo mode is ON</p>
              <p className="text-brand-700">
                Calls are simulated with fabricated transcripts — nothing is actually dialed.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <TwilioConnectCard />

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="text-sm">
            <p className="font-medium text-foreground">Agent sync</p>
            <p className="text-muted-foreground">
              Push your agents to the calling service so they can place calls.
            </p>
          </div>
          <Button variant="outline" onClick={() => syncAgents.mutate()} disabled={syncAgents.isPending}>
            {syncAgents.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync agents
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-5 md:grid-cols-3">
        {INTEGRATIONS.map((it) => {
          const live = features[it.key];
          return (
            <Card key={it.key}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <it.icon className="h-5 w-5" />
                  </span>
                  {isLoading ? (
                    <Badge variant="neutral">Checking…</Badge>
                  ) : live ? (
                    <Badge variant="success">Live</Badge>
                  ) : (
                    <Badge variant="destructive">Not configured</Badge>
                  )}
                </div>
                <CardTitle className="pt-2">{it.name}</CardTitle>
                <CardDescription>{it.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Configure:</span> {it.env}
                </p>
                {!live && !isLoading ? (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    {it.key === 'gemini'
                      ? 'Falls back to a built-in script/scoring generator.'
                      : 'This feature is unavailable until a key is added.'}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
