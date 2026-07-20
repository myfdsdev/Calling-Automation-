import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Search,
  Sparkles,
  Loader2,
  PhoneCall,
  Globe,
  Star,
  Wand2,
  Rocket,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { api, getErrorMessage } from '@/lib/api';
import { useAgents } from '@/hooks/queries';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const AVG_MIN_PER_CALL = 2;

export default function LeadFinder() {
  const navigate = useNavigate();
  const { patchUser } = useAuth();
  const { data: agents } = useAgents();
  const activeAgents = useMemo(() => (agents || []).filter((a) => a.status === 'active'), [agents]);

  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { register, handleSubmit, control, watch } = useForm({
    defaultValues: {
      agentId: '',
      businessCategory: '',
      country: 'US',
      state: '',
      city: '',
      limit: 20,
      minRating: 0,
      minReviews: 0,
      mustHavePhone: true,
      mustHaveWebsite: false,
      excludeCalled: true,
    },
  });

  // Automation setup state
  const [delayBetweenCalls, setDelay] = useState(15);
  const [maxRetries, setMaxRetries] = useState(1);
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');
  const [autoAgentId, setAutoAgentId] = useState('');

  const searchMut = useMutation({
    mutationFn: async (payload) => (await api.post('/leads/search', payload)).data,
    onSuccess: (data) => {
      setResults(data.leads || []);
      setSelected(new Set());
      if (typeof data.creditsRemaining === 'number') {
        patchUser({ leadCredits: data.creditsRemaining });
      }
      if (!data.leads?.length) {
        toast.info(data.message || 'No new leads matched your filters.');
      } else {
        toast.success(`Found ${data.leads.length} leads`);
      }
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Unable to find leads')),
  });

  const selectBestMut = useMutation({
    mutationFn: async (payload) => (await api.post('/leads/select-best', payload)).data,
    onSuccess: (data) => {
      const ids = new Set((data.selected || []).map((l) => l._id));
      setSelected(ids);
      toast.success(`Selected ${ids.size} best leads`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const startMut = useMutation({
    mutationFn: async (payload) => {
      const created = (await api.post('/automations', payload)).data.automation;
      await api.post(`/automations/${created._id}/start`);
      return created;
    },
    onSuccess: () => {
      toast.success('Automation started — calling leads now');
      navigate('/calls');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not start automation')),
  });

  const onSearch = (values) => {
    setAutoAgentId(values.agentId || activeAgents[0]?._id || '');
    searchMut.mutate({
      ...values,
      limit: Number(values.limit),
      minRating: Number(values.minRating),
      minReviews: Number(values.minReviews),
    });
  };

  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === results.length ? new Set() : new Set(results.map((r) => r._id)),
    );
  const removeRow = (id) => {
    setResults((prev) => prev.filter((r) => r._id !== id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const selectBest = () => {
    if (!results.length) return;
    selectBestMut.mutate({
      leadIds: results.map((r) => r._id),
      count: Math.max(1, Math.ceil(results.length / 2)),
    });
  };

  const selectedList = results.filter((r) => selected.has(r._id));
  const selectedAgent = activeAgents.find((a) => a._id === autoAgentId);
  const estMinutes = selectedList.length * AVG_MIN_PER_CALL;

  const openConfirm = () => {
    if (!selectedList.length) return toast.info('Select at least one lead first');
    if (!autoAgentId) return toast.info('Choose an agent for the automation');
    setConfirmOpen(true);
  };
  const startAutomation = () => {
    const values = watch();
    startMut.mutate({
      agentId: autoAgentId,
      name: `${values.businessCategory} — ${[values.city, values.state].filter(Boolean).join(', ')}`,
      businessCategory: values.businessCategory,
      location: [values.city, values.state, values.country].filter(Boolean).join(', '),
      leadIds: selectedList.map((l) => l._id),
      delayBetweenCalls: Number(delayBetweenCalls),
      maxRetries: Number(maxRetries),
      callWindow: { start: windowStart, end: windowEnd },
    });
  };

  const noAgents = !activeAgents.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Finder"
        description="Search local businesses, let AI score them, and start automated calling."
      />

      {noAgents ? (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-amber-800">
            <Sparkles className="h-4 w-4 flex-shrink-0" />
            You need an active agent before starting an automation.{' '}
            <Button variant="link" className="h-auto p-0 text-amber-900" onClick={() => navigate('/agents')}>
              Create one →
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Search form */}
      <Card>
        <CardHeader>
          <CardTitle>Search criteria</CardTitle>
          <CardDescription>Find local business leads by category and location.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSearch)} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Agent">
                <Controller
                  control={control}
                  name="agentId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                      <SelectContent>
                        {activeAgents.map((a) => (
                          <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label="Business category *">
                <Input placeholder="e.g. Restaurants" {...register('businessCategory', { required: true })} />
              </Field>
              <Field label="Number of leads">
                <Input type="number" min={1} max={50} {...register('limit')} />
              </Field>
              <Field label="Country">
                <Input placeholder="US" {...register('country')} />
              </Field>
              <Field label="State / region">
                <Input placeholder="California" {...register('state')} />
              </Field>
              <Field label="City">
                <Input placeholder="San Francisco" {...register('city')} />
              </Field>
              <Field label="Minimum rating">
                <Input type="number" min={0} max={5} step="0.1" {...register('minRating')} />
              </Field>
              <Field label="Minimum reviews">
                <Input type="number" min={0} {...register('minReviews')} />
              </Field>
            </div>

            <div className="flex flex-wrap gap-6 rounded-lg bg-secondary/50 p-4">
              <ToggleField control={control} name="mustHavePhone" label="Must have phone number" />
              <ToggleField control={control} name="mustHaveWebsite" label="Must have website" />
              <ToggleField control={control} name="excludeCalled" label="Exclude already-called leads" />
            </div>

            <Button type="submit" disabled={searchMut.isPending}>
              {searchMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Find Leads
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {searchMut.isPending ? (
        <Card><CardContent className="p-6"><div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}</div></CardContent></Card>
      ) : results.length ? (
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Results</CardTitle>
              <CardDescription>{selected.size} of {results.length} selected · AI-scored</CardDescription>
            </div>
            <Button variant="secondary" size="sm" onClick={selectBest} disabled={selectBestMut.isPending}>
              {selectBestMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Select Best Automatically
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selected.size === results.length && results.length > 0}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Reviews</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((lead) => {
                  const isSel = selected.has(lead._id);
                  return (
                    <TableRow key={lead._id} className={cn(isSel && 'bg-accent/30')}>
                      <TableCell>
                        <Checkbox checked={isSel} onCheckedChange={() => toggleOne(lead._id)} />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{lead.businessName}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{lead.phone || '—'}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {[lead.city, lead.state].filter(Boolean).join(', ') || '—'}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {lead.rating || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{lead.reviewCount ?? 0}</TableCell>
                      <TableCell>
                        {lead.website ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600"><Globe className="h-3.5 w-3.5" /> Yes</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ScorePill score={lead.leadScore} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => toggleOne(lead._id)}>
                            {isSel ? 'Deselect' : 'Select'}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => removeRow(lead._id)}>
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : searchMut.isSuccess ? (
        <EmptyState icon={Search} title="No leads found" description="Try widening your filters or a different location." />
      ) : (
        <EmptyState icon={PhoneCall} title="Search to find leads" description="Enter a business category and location, then click Find Leads." />
      )}

      {/* Automation setup */}
      {selectedList.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Automation setup</CardTitle>
            <CardDescription>Review settings, then start calling the selected leads.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Agent">
                <Select value={autoAgentId} onValueChange={setAutoAgentId}>
                  <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                  <SelectContent>
                    {activeAgents.map((a) => (
                      <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Selected leads">
                <Input value={selectedList.length} readOnly className="bg-secondary/50" />
              </Field>
              <Field label="Delay between calls (s)">
                <Input type="number" min={5} value={delayBetweenCalls} onChange={(e) => setDelay(e.target.value)} />
              </Field>
              <Field label="Max retry attempts">
                <Input type="number" min={0} max={5} value={maxRetries} onChange={(e) => setMaxRetries(e.target.value)} />
              </Field>
              <Field label="Call window start">
                <Input type="time" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
              </Field>
              <Field label="Call window end">
                <Input type="time" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
              </Field>
            </div>
            <Button size="lg" onClick={openConfirm} disabled={startMut.isPending}>
              <Rocket className="h-4 w-4" /> Start Automated Calling
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Confirmation modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start automated calling?</DialogTitle>
            <DialogDescription>Review the details before your agent begins calling.</DialogDescription>
          </DialogHeader>
          <dl className="divide-y divide-border rounded-lg border border-border">
            <Row label="Agent" value={selectedAgent?.name || '—'} />
            <Row label="Leads to call" value={selectedList.length} />
            <Row label="Calling number" value="Your imported Twilio number (via Vapi)" />
            <Row label="Estimated minutes" value={`~${estMinutes} min`} />
            <Row label="Schedule" value={windowStart && windowEnd ? `${windowStart}–${windowEnd}` : 'Immediately, sequential'} />
          </dl>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={startAutomation} disabled={startMut.isPending}>
              {startMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
              Start Calling
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ToggleField({ control, name, label }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <Switch checked={field.value} onCheckedChange={field.onChange} />
          {label}
        </label>
      )}
    />
  );
}

function ScorePill({ score = 0 }) {
  const tone =
    score >= 70 ? 'bg-emerald-50 text-emerald-700' : score >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-secondary text-secondary-foreground';
  return <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', tone)}>{score}</span>;
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
