import { useQuery } from '@tanstack/react-query';
import { PhoneCall, Bot, Clock, Gauge, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/common/StatusBadge';
import { api } from '@/lib/api';
import { formatDuration, formatDateTime } from '@/lib/utils';

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function CallDetailsModal({ callId, open, onOpenChange }) {
  const { data: call, isLoading } = useQuery({
    queryKey: ['calls', 'detail', callId],
    enabled: open && Boolean(callId),
    queryFn: async () => (await api.get(`/calls/${callId}`)).data.call,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {isLoading || !call ? (
          <div className="space-y-4 py-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle>{call.leadId?.businessName || 'Call'}</DialogTitle>
                <StatusBadge type="callResult" value={call.result} />
              </div>
              <DialogDescription>
                {call.agentId?.name || 'Agent'} · {formatDateTime(call.createdAt)}
              </DialogDescription>
            </DialogHeader>

            {call.simulated ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                <p className="text-amber-800">
                  <span className="font-medium">Simulated call.</span> This was generated locally in
                  demo mode — the transcript and outcome are fabricated and no number was dialed.
                </p>
              </div>
            ) : null}

            {call.failureReason ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                <p className="text-red-800">
                  <span className="font-medium">Call could not be placed.</span>{' '}
                  {call.failureReason}
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric icon={PhoneCall} label="Status" value={<StatusBadge type="callStatus" value={call.status} />} />
              <Metric icon={Clock} label="Duration" value={formatDuration(call.duration)} />
              <Metric icon={Gauge} label="Interest" value={call.interestLevel != null ? `${call.interestLevel}/10` : '—'} />
              <Metric icon={Bot} label="Ended reason" value={<span className="capitalize">{(call.endedReason || '—').replace(/-/g, ' ')}</span>} />
            </div>

            {call.recordingUrl ? (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recording</p>
                <audio controls src={call.recordingUrl} className="w-full">
                  Your browser does not support audio playback.
                </audio>
              </div>
            ) : null}

            {call.summary ? (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI summary</p>
                <p className="rounded-lg bg-accent/40 p-3 text-sm text-foreground">{call.summary}</p>
              </div>
            ) : null}

            {call.objections?.length ? (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Objections</p>
                <div className="flex flex-wrap gap-2">
                  {call.objections.map((o, i) => (
                    <span key={i} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                      {o}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <Separator />

            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transcript</p>
              {call.transcript ? (
                <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border p-3 text-sm text-foreground">
                  {call.transcript}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">No transcript available for this call.</p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
