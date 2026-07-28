import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { Sparkles, Plus, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAgentMutations } from '@/hooks/queries';
import { getErrorMessage } from '@/lib/api';
import { VOICES, LANGUAGES, DEFAULT_VOICE } from '@/lib/constants';

const EMPTY = {
  name: '',
  companyName: '',
  serviceName: '',
  businessLocation: '',
  language: 'en-US',
  voiceId: DEFAULT_VOICE,
  callGoal: '',
  targetCustomer: '',
  introduction: '',
  offerDescription: '',
  openingMessage: '',
  qualificationQuestions: [{ value: 'Are you currently looking for more customers?' }],
  objectionInstructions: '',
  closingMessage: '',
};

function toForm(source) {
  if (!source) return EMPTY;
  return {
    ...EMPTY,
    ...source,
    qualificationQuestions: (source.qualificationQuestions?.length
      ? source.qualificationQuestions
      : ['']
    ).map((v) => ({ value: typeof v === 'string' ? v : v.value })),
  };
}

export function AgentFormDialog({ open, onOpenChange, agent, prefill }) {
  const isEdit = Boolean(agent);
  const { create, update, generateScript } = useAgentMutations();
  const [tab, setTab] = useState('basic');

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({ defaultValues: toForm(agent || prefill) });

  const { fields, append, remove } = useFieldArray({ control, name: 'qualificationQuestions' });

  useEffect(() => {
    if (open) {
      reset(toForm(agent || prefill));
      setTab('basic');
    }
  }, [open, agent, prefill, reset]);

  const onGenerate = async () => {
    // Pull current objective fields to feed Gemini.
    const payload = {
      companyName: getValues('companyName'),
      serviceName: getValues('serviceName'),
      callGoal: getValues('callGoal'),
      targetCustomer: getValues('targetCustomer'),
      offerDescription: getValues('offerDescription'),
      language: getValues('language'),
    };
    generateScript.mutate(payload, {
      onSuccess: (script) => {
        setValue('openingMessage', script.openingMessage || '');
        setValue('introduction', script.introduction || '');
        setValue('objectionInstructions', script.objectionInstructions || '');
        setValue('closingMessage', script.closingMessage || '');
        if (script.qualificationQuestions?.length) {
          setValue(
            'qualificationQuestions',
            script.qualificationQuestions.map((v) => ({ value: v })),
          );
        }
        setTab('conversation');
        toast.success(
          script.source === 'gemini' ? 'Script generated with Gemini' : 'Script generated (demo)',
        );
      },
      onError: (e) => toast.error(getErrorMessage(e, 'Could not generate script')),
    });
  };

  const onSubmit = (values) => {
    const payload = {
      ...values,
      qualificationQuestions: values.qualificationQuestions
        .map((q) => q.value?.trim())
        .filter(Boolean),
    };
    const mutation = isEdit ? update : create;
    const arg = isEdit ? { id: agent._id, ...payload } : payload;
    mutation.mutate(arg, {
      onSuccess: () => {
        toast.success(isEdit ? 'Agent updated' : 'Agent created');
        onOpenChange(false);
      },
      onError: (e) => toast.error(getErrorMessage(e, 'Agent could not be saved')),
    });
  };

  const saving = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit agent' : 'Create AI calling agent'}</DialogTitle>
          <DialogDescription>
            Configure the voice, objective and conversation. You can generate a script with AI.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="objective">Objective</TabsTrigger>
              <TabsTrigger value="conversation">Conversation</TabsTrigger>
            </TabsList>

            {/* Basic */}
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Agent name</Label>
                <Input id="name" placeholder="Riley — Web Redesign" {...register('name', { required: true })} />
                {errors.name ? <p className="text-xs text-destructive">Agent name is required</p> : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="companyName">Company name</Label>
                  <Input id="companyName" placeholder="BrightPixel Studio" {...register('companyName')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="serviceName">Service / business type</Label>
                  <Input id="serviceName" placeholder="Website redesign" {...register('serviceName')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="businessLocation">Business location</Label>
                <Input id="businessLocation" placeholder="Bandra, Mumbai" {...register('businessLocation')} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Language</Label>
                  <Controller
                    control={control}
                    name="language"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Language" /></SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((l) => (
                            <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Voice</Label>
                  <Controller
                    control={control}
                    name="voiceId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Voice" /></SelectTrigger>
                        <SelectContent>
                          {VOICES.map((v) => (
                            <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Objective */}
            <TabsContent value="objective" className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="callGoal">Call goal</Label>
                <Input id="callGoal" placeholder="Book a 15-minute consultation" {...register('callGoal')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="targetCustomer">Target customer</Label>
                <Input id="targetCustomer" placeholder="Local restaurants and cafes" {...register('targetCustomer')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="introduction">Short company introduction</Label>
                <Textarea id="introduction" rows={2} placeholder="We build modern websites for local businesses…" {...register('introduction')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="offerDescription">Offer description</Label>
                <Textarea id="offerDescription" rows={2} placeholder="A mobile-friendly website that brings in more customers." {...register('offerDescription')} />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={onGenerate}
                disabled={generateScript.isPending}
              >
                {generateScript.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate Script with Gemini
              </Button>
            </TabsContent>

            {/* Conversation */}
            <TabsContent value="conversation" className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="openingMessage">Opening message</Label>
                <Textarea id="openingMessage" rows={2} placeholder="Hi, this is Riley from BrightPixel…" {...register('openingMessage')} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Qualification questions</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => append({ value: '' })}>
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {fields.map((f, i) => (
                    <div key={f.id} className="flex items-center gap-2">
                      <Input
                        placeholder={`Question ${i + 1}`}
                        {...register(`qualificationQuestions.${i}.value`)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => remove(i)}
                        disabled={fields.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="objectionInstructions">Objection-handling instructions</Label>
                <Textarea id="objectionInstructions" rows={2} placeholder="If they say they're busy, offer to call back…" {...register('objectionInstructions')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="closingMessage">Closing message</Label>
                <Textarea id="closingMessage" rows={2} placeholder="Thanks so much for your time!" {...register('closingMessage')} />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? 'Save changes' : 'Create agent'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
