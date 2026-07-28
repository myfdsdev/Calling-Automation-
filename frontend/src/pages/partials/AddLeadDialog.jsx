import { lazy, Suspense, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { Loader2, UserPlus, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAgents, useLeadMutations } from '@/hooks/queries';
import { getErrorMessage } from '@/lib/api';

// Heavy country/state/city dataset — loaded only when this dialog is opened.
const LocationPicker = lazy(() =>
  import('@/components/common/LocationPicker').then((m) => ({ default: m.LocationPicker })),
);
const PhoneCountrySelect = lazy(() =>
  import('@/components/common/LocationPicker').then((m) => ({ default: m.PhoneCountrySelect })),
);

const EMPTY = {
  businessName: '',
  phone: '',
  agentId: '',
  website: '',
  category: '',
  notes: '',
};
const EMPTY_LOC = { countryCode: 'US', stateCode: '', city: '', country: '', state: '' };

/** Combine a dial-code prefix with a locally-typed number into E.164. */
function toE164(dial, raw) {
  const num = (raw || '').trim();
  if (!num) return '';
  if (num.startsWith('+')) return num.replace(/[^\d+]/g, '');
  const digits = num.replace(/\D/g, '').replace(/^0+/, '');
  return `${dial || ''}${digits}`;
}

export function AddLeadDialog({ open, onOpenChange }) {
  const { data: agents } = useAgents();
  const { create } = useLeadMutations();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: EMPTY });

  const [phoneCountry, setPhoneCountry] = useState('US');
  const [phoneDial, setPhoneDial] = useState('+1');
  const [loc, setLoc] = useState(EMPTY_LOC);

  useEffect(() => {
    if (open) {
      reset(EMPTY);
      setPhoneCountry('US');
      setPhoneDial('+1');
      setLoc(EMPTY_LOC);
    }
  }, [open, reset]);

  const onSubmit = (values) => {
    create.mutate(
      {
        ...values,
        phone: toE164(phoneDial, values.phone),
        country: loc.country || '',
        state: loc.state || '',
        city: loc.city || '',
      },
      {
        onSuccess: (lead) => {
          toast.success(`${lead.businessName} added — ready to call`);
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e, 'Lead could not be added')),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a lead manually</DialogTitle>
          <DialogDescription>
            Useful for testing — add your own number and call it to try an agent end to end.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="businessName">Business name *</Label>
            <Input
              id="businessName"
              placeholder="Coastal Cafe"
              {...register('businessName', {
                required: 'Business name is required',
                minLength: { value: 2, message: 'Business name is too short' },
              })}
            />
            {errors.businessName ? (
              <p className="text-xs text-destructive">{errors.businessName.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone number *</Label>
            <div className="flex gap-2">
              <Suspense
                fallback={<div className="h-11 w-28 flex-shrink-0 animate-pulse rounded-lg bg-muted" />}
              >
                <PhoneCountrySelect
                  value={phoneCountry}
                  onChange={(iso, dial) => {
                    setPhoneCountry(iso);
                    setPhoneDial(dial);
                  }}
                />
              </Suspense>
              <Input
                id="phone"
                className="flex-1"
                placeholder="415 555 0123"
                autoComplete="off"
                {...register('phone', { required: 'Phone number is required' })}
              />
            </div>
            {errors.phone ? (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Pick the country code, then type the local number — or paste a full{' '}
                <code className="rounded bg-secondary px-1">+</code> number.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Assign agent</Label>
            <Controller
              control={control}
              name="agentId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="No agent (assign later)" />
                  </SelectTrigger>
                  <SelectContent>
                    {(agents || []).map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.name}
                        {a.status !== 'active' ? ' (inactive)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Required before you can use “Call Now” on this lead.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Suspense
              fallback={['Country', 'State', 'City'].map((l) => (
                <div key={l} className="space-y-1.5">
                  <Label>{l}</Label>
                  <div className="h-11 animate-pulse rounded-lg bg-muted" />
                </div>
              ))}
            >
              <LocationPicker value={loc} onChange={setLoc} />
            </Suspense>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Input id="category" placeholder="Restaurants" {...register('category')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input id="website" placeholder="https://example.com" {...register('website')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} placeholder="Anything worth remembering…" {...register('notes')} />
          </div>

          <p className="flex items-start gap-1.5 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            Manual leads don&apos;t use lead credits and are marked{' '}
            <span className="font-medium text-foreground">Selected</span> so you can call them right
            away. Only call numbers you have permission to contact.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Add lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
