import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ShieldCheck, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TwilioConnectCard } from '@/pages/partials/TwilioConnectCard';
import { WorkspaceApiKeysCard } from '@/pages/partials/WorkspaceApiKeysCard';
import { api, getErrorMessage } from '@/lib/api';

export default function ApiSettings() {
  const qc = useQueryClient();
  const { data } = useQuery({
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
      <PageHeader title="API Settings" description="Connect the keys and number your workspace calls with." />

      <Card className="border-primary/20 bg-accent/20">
        <CardContent className="grid grid-cols-[24px_1fr] gap-3 p-5 sm:p-6">
          <span className="flex h-6 w-6 items-start justify-center pt-0.5 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 space-y-1 text-sm">
            <p className="font-medium leading-5 text-foreground">How your credentials are handled</p>
            <p className="max-w-6xl leading-5 text-muted-foreground">
              Your workspace uses <span className="font-medium text-foreground">only your own API keys</span> —
              the app never falls back to any shared or platform key. Each key is verified with the
              provider, encrypted before storage, and never sent back to the browser (you&apos;ll only
              see the last few characters). Your Twilio Auth Token is handled the same way.
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

      <WorkspaceApiKeysCard />

      <TwilioConnectCard />

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
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
    </div>
  );
}
