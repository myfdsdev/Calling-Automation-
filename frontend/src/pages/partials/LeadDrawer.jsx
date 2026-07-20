import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Phone,
  Globe,
  MapPin,
  Star,
  Bot,
  PhoneCall,
  ListPlus,
  Ban,
  Trash2,
  FileText,
  PlayCircle,
  Loader2,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useLead, useLeadMutations } from '@/hooks/queries';
import { api, getErrorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="break-words text-sm font-medium text-foreground">{value || '—'}</p>
      </div>
    </div>
  );
}

export function LeadDrawer({ leadId, open, onOpenChange, onDeleted }) {
  const { data: lead, isLoading } = useLead(open ? leadId : null);
  const { update, remove } = useLeadMutations();

  const { data: latestCall } = useQuery({
    queryKey: ['calls', 'byLead', leadId],
    enabled: open && Boolean(leadId),
    queryFn: async () => (await api.get('/calls', { params: { leadId } })).data.calls?.[0] || null,
  });

  const doUpdate = (payload, msg) =>
    update.mutate(
      { id: leadId, ...payload },
      { onSuccess: () => toast.success(msg), onError: (e) => toast.error(getErrorMessage(e)) },
    );

  const callNow = async () => {
    try {
      await api.post(`/calls/${leadId}/start`);
      toast.success('Call started');
      onOpenChange(false);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Call could not be started'));
    }
  };

  const doDelete = () =>
    remove.mutate(leadId, {
      onSuccess: () => {
        toast.success('Lead deleted');
        onOpenChange(false);
        onDeleted?.();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        {isLoading || !lead ? (
          <div className="space-y-4 pt-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <SheetTitle className="truncate">{lead.businessName}</SheetTitle>
                <StatusBadge type="callStatus" value={lead.callStatus} />
              </div>
              <SheetDescription>
                {lead.category || 'Lead'} · Score {lead.leadScore ?? 0}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <Detail icon={Phone} label="Phone" value={lead.phone} />
                <Detail icon={Globe} label="Website" value={lead.website} />
                <Detail icon={MapPin} label="Address" value={lead.address} />
                <Detail
                  icon={Star}
                  label="Rating / Reviews"
                  value={`${lead.rating || '—'} · ${lead.reviewCount ?? 0} reviews`}
                />
                <Detail icon={Bot} label="Assigned agent" value={lead.agentId?.name} />
                <Detail
                  icon={PhoneCall}
                  label="Call attempts / result"
                  value={`${lead.callAttempts || 0} attempts`}
                />
              </div>

              {latestCall ? (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">Latest call</p>
                    <div className="flex items-center gap-2">
                      <StatusBadge type="callResult" value={latestCall.result} />
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(latestCall.createdAt)}
                      </span>
                    </div>
                    {latestCall.summary ? (
                      <p className="rounded-lg bg-secondary/60 p-3 text-sm text-foreground">
                        {latestCall.summary}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {latestCall.recordingUrl ? (
                        <Button asChild variant="outline" size="sm">
                          <a href={latestCall.recordingUrl} target="_blank" rel="noreferrer">
                            <PlayCircle className="h-4 w-4" /> Recording
                          </a>
                        </Button>
                      ) : null}
                      {latestCall.transcript ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toast.message('Transcript', {
                              description: latestCall.transcript.slice(0, 400),
                            })
                          }
                        >
                          <FileText className="h-4 w-4" /> Transcript
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : null}

              {lead.notes ? (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
                    <p className="mt-1 text-sm text-foreground">{lead.notes}</p>
                  </div>
                </>
              ) : null}

              <Separator />

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={callNow}
                  disabled={lead.doNotCall || !lead.phone || !lead.agentId}
                >
                  <PhoneCall className="h-4 w-4" /> Call Now
                </Button>
                <Button
                  variant="outline"
                  onClick={() => doUpdate({ callStatus: 'in_queue' }, 'Added to queue')}
                  disabled={lead.doNotCall}
                >
                  <ListPlus className="h-4 w-4" /> Add to Queue
                </Button>
                <Button
                  variant="outline"
                  onClick={() => doUpdate({ doNotCall: true }, 'Marked Do Not Call')}
                  disabled={lead.doNotCall}
                >
                  <Ban className="h-4 w-4" /> Do Not Call
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={doDelete}
                  disabled={remove.isPending}
                >
                  {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
