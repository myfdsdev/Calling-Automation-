import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Phone,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Unplug,
  Search,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime } from '@/lib/utils';

function Check({ ok, children }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
      )}
      <span className={ok ? 'text-foreground' : 'text-muted-foreground'}>{children}</span>
    </li>
  );
}

export function TwilioConnectCard() {
  const qc = useQueryClient();
  const { refreshUser } = useAuth();
  const [numbers, setNumbers] = useState(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const { data: t, isLoading } = useQuery({
    queryKey: ['telephony'],
    queryFn: async () => (await api.get('/settings/telephony')).data.telephony,
  });

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { accountSid: '', authToken: '', phoneNumber: '' } });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['telephony'] });
    refreshUser();
  };

  const lookup = useMutation({
    mutationFn: async (body) => (await api.post('/settings/telephony/lookup', body)).data.numbers,
    onSuccess: (list) => {
      setNumbers(list);
      if (!list.length) {
        toast.info('No voice-capable numbers found on that Twilio account');
      } else {
        toast.success(`Found ${list.length} number${list.length > 1 ? 's' : ''}`);
        if (list.length === 1) setValue('phoneNumber', list[0].phoneNumber);
      }
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not reach Twilio')),
  });

  const connect = useMutation({
    mutationFn: async (body) => (await api.post('/settings/telephony/connect', body)).data,
    onSuccess: (d) => {
      toast.success(d.message || 'Twilio connected');
      reset();
      setNumbers(null);
      refresh();
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not connect Twilio')),
  });

  const test = useMutation({
    mutationFn: async () => (await api.post('/settings/telephony/test')).data,
    onSuccess: (d) => toast.success(d.message || 'Connection is working'),
    onError: (e) => toast.error(getErrorMessage(e, 'Connection test failed')),
  });

  const disconnect = useMutation({
    mutationFn: async () => (await api.delete('/settings/telephony')).data,
    onSuccess: (d) => {
      toast.success(d.message || 'Disconnected');
      setDisconnectOpen(false);
      refresh();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const onLookup = () => {
    const { accountSid, authToken } = getValues();
    if (!accountSid || !authToken) {
      return toast.info('Enter your Account SID and Auth Token first');
    }
    lookup.mutate({ accountSid, authToken });
  };

  const connected = t?.connected;
  const selectedNumber = watch('phoneNumber');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> Your Twilio number
            </CardTitle>
            <CardDescription>
              Connect your own Twilio account — calls are placed from your number.
            </CardDescription>
          </div>
          {isLoading ? (
            <Badge variant="neutral">Checking…</Badge>
          ) : connected ? (
            <Badge variant="success">Connected</Badge>
          ) : (
            <Badge variant="destructive">Not connected</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {connected ? (
          <>
            <div className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">{t.phoneNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {t.friendlyName || 'Twilio number'} · SID {t.accountSid.slice(0, 8)}…
                  </p>
                  {t.verifiedAt ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Verified {formatDateTime(t.verifiedAt)}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => test.mutate()} disabled={test.isPending}>
                    {test.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDisconnectOpen(true)}
                  >
                    <Unplug className="h-4 w-4" /> Disconnect
                  </Button>
                </div>
              </div>
            </div>

            <ul className="space-y-2">
              <Check ok={t.platformReady}>Calling service available</Check>
              <Check ok={t.webhookConfigured}>
                {t.webhookConfigured
                  ? 'Call results will be delivered back'
                  : 'Webhook not configured — calls will dial but transcripts and outcomes won’t be saved'}
              </Check>
              <Check ok={!t.unsyncedAgents}>
                {t.unsyncedAgents
                  ? `${t.unsyncedAgents} agent(s) not yet synced`
                  : 'All agents synced and callable'}
              </Check>
            </ul>

            <p className="text-xs text-muted-foreground">
              To switch numbers, disconnect first and connect the new one.
            </p>
          </>
        ) : (
          <>
            {!t?.platformReady && !isLoading ? (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                <p className="text-amber-800">
                  The calling service isn&apos;t available right now, so connecting won&apos;t
                  enable calls yet.
                </p>
              </div>
            ) : null}

            <form onSubmit={handleSubmit((v) => connect.mutate(v))} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="accountSid">Account SID</Label>
                <Input
                  id="accountSid"
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  autoComplete="off"
                  spellCheck="false"
                  {...register('accountSid', { required: 'Account SID is required' })}
                />
                {errors.accountSid ? (
                  <p className="text-xs text-destructive">{errors.accountSid.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="authToken">Auth Token</Label>
                <Input
                  id="authToken"
                  type="password"
                  placeholder="Your Twilio Auth Token"
                  autoComplete="new-password"
                  spellCheck="false"
                  {...register('authToken', { required: 'Auth Token is required' })}
                />
                {errors.authToken ? (
                  <p className="text-xs text-destructive">{errors.authToken.message}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Stored encrypted on our servers and never shown again.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="phoneNumber">Phone number</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onLookup}
                    disabled={lookup.isPending}
                  >
                    {lookup.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Find my numbers
                  </Button>
                </div>

                {numbers?.length ? (
                  <Select value={selectedNumber} onValueChange={(v) => setValue('phoneNumber', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a number" />
                    </SelectTrigger>
                    <SelectContent>
                      {numbers.map((n) => (
                        <SelectItem key={n.phoneNumber} value={n.phoneNumber}>
                          {n.phoneNumber}
                          {n.friendlyName ? ` — ${n.friendlyName}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="phoneNumber"
                    placeholder="+14155550123"
                    autoComplete="off"
                    {...register('phoneNumber', { required: 'Phone number is required' })}
                  />
                )}
                {errors.phoneNumber ? (
                  <p className="text-xs text-destructive">{errors.phoneNumber.message}</p>
                ) : null}
              </div>

              <Button type="submit" disabled={connect.isPending}>
                {connect.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Phone className="h-4 w-4" />
                )}
                Connect Twilio
              </Button>
            </form>

            <Separator />

            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              Find your Account SID and Auth Token on the{' '}
              <a
                href="https://console.twilio.com"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary hover:underline"
              >
                Twilio Console
              </a>{' '}
              dashboard. The number must be voice-capable and in E.164 format.
            </p>
          </>
        )}
      </CardContent>

      <ConfirmationDialog
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        title="Disconnect Twilio?"
        description="Your stored credentials will be deleted and the number released from the calling service. Running automations will stop placing calls."
        confirmLabel="Disconnect"
        variant="destructive"
        loading={disconnect.isPending}
        onConfirm={() => disconnect.mutate()}
      />
    </Card>
  );
}
