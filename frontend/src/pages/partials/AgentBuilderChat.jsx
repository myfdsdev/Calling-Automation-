import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Sparkles,
  ArrowUp,
  Bot,
  Check,
  Loader2,
  Headset,
  TrendingUp,
  CalendarClock,
  Building2,
  PhoneCall,
  Pencil,
  MapPin,
  Briefcase,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAgentMutations } from '@/hooks/queries';
import { getErrorMessage } from '@/lib/api';
import { DEFAULT_VOICE } from '@/lib/constants';
import { cn } from '@/lib/utils';

/* Templates seed the use case + call goal, then the same questions personalize it. */
const TEMPLATES = [
  {
    id: 'support',
    label: 'Customer Support',
    Icon: Headset,
    color: '#E58A00',
    text: 'Handle customer support calls — answer questions, resolve issues, and keep customers happy.',
    goal: "resolve the customer's question and make sure they're satisfied",
  },
  {
    id: 'sales',
    label: 'Sales Associate',
    Icon: TrendingUp,
    color: '#0E9F6E',
    text: 'Outbound sales — qualify leads and book product demos.',
    goal: 'qualify the lead and book a product demo',
  },
  {
    id: 'scheduler',
    label: 'Appointment Scheduler',
    Icon: CalendarClock,
    color: '#E58A00',
    text: 'Call leads to schedule and confirm appointments.',
    goal: 'schedule an appointment for the customer',
  },
  {
    id: 'reception',
    label: 'Receptionist',
    Icon: Building2,
    color: '#1683C7',
    text: 'A virtual receptionist — greet callers, answer basics, and route or schedule requests.',
    goal: 'greet the caller and route or schedule their request',
  },
];

const EMPTY_DATA = {
  name: '',
  companyName: '',
  serviceName: '',
  offerDescription: '',
  businessLocation: '',
  callGoal: '',
  openingMessage: '',
  closingMessage: '',
};

/* Ordered conversation flow. */
const FLOW = ['usecase', 'name', 'companyName', 'serviceName', 'offerDescription', 'businessLocation', 'opening', 'closing', 'review'];

const PLACEHOLDERS = {
  usecase: "Describe your agent's use case…",
  name: 'e.g. Riley, Priya, Alex…',
  companyName: 'e.g. BrightPixel Studio',
  serviceName: 'e.g. Restaurant, Dental clinic, Real estate',
  offerDescription: 'e.g. Table bookings, catering, private events',
  businessLocation: 'e.g. Bandra, Mumbai',
  opening: 'Type your own greeting…',
  closing: 'Type your own closing…',
};

/* The bot's question for a given step. */
function botQuestion(step, draft) {
  switch (step) {
    case 'usecase':
      return "Hey! 👋 I'll help you set up a voice agent in a couple of minutes. What's the use case you're building for? Describe it in your own words, or tap a template below.";
    case 'name':
      return 'Great choice! What should we name this agent?';
    case 'companyName':
      return "And what's the name of your business or company?";
    case 'serviceName':
      return 'What type of business is it? (e.g. Restaurant, Dental clinic, Real estate)';
    case 'offerDescription':
      return 'Which services or offers should the agent mention on the call?';
    case 'businessLocation':
      return "Where's the business located? (city or area) — you can skip this.";
    case 'opening':
      return `Here's an opening line I wrote:\n\n“${draft?.openingMessage || ''}”\n\nKeep it, or type your own greeting.`;
    case 'closing':
      return `And here's how it'll wrap up the call:\n\n“${draft?.closingMessage || ''}”\n\nKeep it, or type your own closing.`;
    case 'review':
      return "All set! Here's your agent 👇  Review it and hit Create — you can fine-tune anything later.";
    default:
      return '';
  }
}

export function AgentBuilderChat({ open, onOpenChange, onSwitchToManual, onCreated }) {
  const { create, generateScript } = useAgentMutations();

  const [messages, setMessages] = useState([]);
  const [step, setStep] = useState('usecase');
  const [data, setData] = useState(EMPTY_DATA);
  const [draft, setDraft] = useState(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false); // Gemini writing / creating

  const idRef = useRef(0);
  const scrollRef = useRef(null);
  const nextId = () => (idRef.current += 1);

  const pushBot = (text) => setMessages((m) => [...m, { id: nextId(), role: 'bot', text }]);
  const pushUser = (text) => setMessages((m) => [...m, { id: nextId(), role: 'user', text }]);

  // (Re)start the conversation each time the dialog opens.
  useEffect(() => {
    if (open) {
      idRef.current = 0;
      setMessages([{ id: nextId(), role: 'bot', text: botQuestion('usecase') }]);
      setStep('usecase');
      setData(EMPTY_DATA);
      setDraft(null);
      setInput('');
      setBusy(false);
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const goTo = (nextStep, nextDraft) => {
    setStep(nextStep);
    pushBot(botQuestion(nextStep, nextDraft ?? draft));
  };

  /* Write the script with Gemini, then move on to review the opening line. */
  const generateAndContinue = async (collected) => {
    setBusy(true);
    pushBot('Perfect — give me a second to write the script for you… ✨');
    try {
      const script = await generateScript.mutateAsync({
        companyName: collected.companyName,
        serviceName: collected.serviceName,
        businessLocation: collected.businessLocation,
        callGoal: collected.callGoal,
        offerDescription: collected.offerDescription,
      });
      setDraft(script);
      setData((d) => ({
        ...d,
        openingMessage: script.openingMessage || '',
        closingMessage: script.closingMessage || '',
      }));
      setBusy(false);
      goTo('opening', script);
    } catch (e) {
      setBusy(false);
      toast.error(getErrorMessage(e, 'Could not write the script'));
      goTo('opening', { openingMessage: '', closingMessage: '' });
    }
  };

  /* Handle a typed answer or a quick-reply for the current step. */
  const answer = async (value) => {
    const text = (value ?? '').trim();

    switch (step) {
      case 'usecase': {
        if (!text) return;
        pushUser(text);
        setData((d) => ({ ...d, callGoal: d.callGoal || text }));
        setInput('');
        goTo('name');
        return;
      }
      case 'name': {
        if (text.length < 2) return toast.info('Give the agent a name (2+ characters)');
        pushUser(text);
        setData((d) => ({ ...d, name: text }));
        setInput('');
        goTo('companyName');
        return;
      }
      case 'companyName': {
        if (!text) return;
        pushUser(text);
        setData((d) => ({ ...d, companyName: text }));
        setInput('');
        goTo('serviceName');
        return;
      }
      case 'serviceName': {
        if (!text) return;
        pushUser(text);
        setData((d) => ({ ...d, serviceName: text }));
        setInput('');
        goTo('offerDescription');
        return;
      }
      case 'offerDescription': {
        if (!text) return;
        pushUser(text);
        setData((d) => ({ ...d, offerDescription: text }));
        setInput('');
        goTo('businessLocation');
        return;
      }
      case 'businessLocation': {
        // Optional — the Skip quick-reply calls this with an empty value.
        pushUser(text || 'Skip');
        const collected = { ...data, businessLocation: text };
        setData(collected);
        setInput('');
        await generateAndContinue(collected);
        return;
      }
      case 'opening': {
        const opening = text || draft?.openingMessage || '';
        pushUser(text || 'Keep it');
        setData((d) => ({ ...d, openingMessage: opening }));
        setInput('');
        goTo('closing');
        return;
      }
      case 'closing': {
        const closing = text || draft?.closingMessage || '';
        pushUser(text || 'Keep it');
        setData((d) => ({ ...d, closingMessage: closing }));
        setInput('');
        goTo('review');
        return;
      }
      default:
        return;
    }
  };

  const pickTemplate = (t) => {
    pushUser(t.label);
    setData((d) => ({ ...d, callGoal: t.goal, usecase: t.text }));
    setInput('');
    goTo('name');
  };

  const handleCreate = () => {
    setBusy(true);
    create.mutate(
      {
        name: data.name,
        companyName: data.companyName,
        serviceName: data.serviceName,
        businessLocation: data.businessLocation,
        callGoal: data.callGoal,
        offerDescription: data.offerDescription,
        openingMessage: data.openingMessage,
        closingMessage: data.closingMessage,
        introduction: draft?.introduction || '',
        qualificationQuestions: draft?.qualificationQuestions || [],
        objectionInstructions: draft?.objectionInstructions || '',
        voiceId: DEFAULT_VOICE,
        language: 'en-US',
        status: 'active',
      },
      {
        onSuccess: () => {
          toast.success(`${data.name} is ready to call`);
          setBusy(false);
          onCreated?.();
          onOpenChange(false);
        },
        onError: (e) => {
          setBusy(false);
          toast.error(getErrorMessage(e, 'Agent could not be created'));
        },
      },
    );
  };

  const editInForm = () => {
    onSwitchToManual?.({
      name: data.name,
      companyName: data.companyName,
      serviceName: data.serviceName,
      businessLocation: data.businessLocation,
      callGoal: data.callGoal,
      offerDescription: data.offerDescription,
      openingMessage: data.openingMessage,
      closingMessage: data.closingMessage,
      introduction: draft?.introduction || '',
      qualificationQuestions: draft?.qualificationQuestions || [],
      objectionInstructions: draft?.objectionInstructions || '',
    });
  };

  const showInput = !busy && step !== 'review';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[86vh] max-h-[720px] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 pr-12">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-base">Build a voice agent</DialogTitle>
              <DialogDescription className="text-xs">AI-guided setup — answer a few questions</DialogDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => onSwitchToManual?.()}>
            Skip
          </Button>
        </div>

        {/* Conversation */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.map((m) => (
            <Bubble key={m.id} role={m.role} text={m.text} />
          ))}
          {busy ? <TypingBubble /> : null}
          {step === 'review' && !busy ? <SummaryCard data={data} /> : null}
        </div>

        {/* Composer */}
        <div className="border-t border-border p-4">
          {step === 'review' ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={editInForm} disabled={create.isPending}>
                <Pencil className="h-4 w-4" /> Edit in form
              </Button>
              <Button onClick={handleCreate} disabled={create.isPending}>
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
                Create agent
              </Button>
            </div>
          ) : (
            <>
              {/* Quick replies */}
              {step === 'usecase' ? (
                <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => pickTemplate(t)}
                      disabled={busy}
                      className="inline-flex flex-shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-graphite-300 hover:bg-accent/40 disabled:opacity-50"
                    >
                      <t.Icon className="h-4 w-4" style={{ color: t.color }} />
                      {t.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {(step === 'opening' || step === 'closing') && !busy ? (
                <div className="mb-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => answer('')}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-100 px-3.5 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-200"
                  >
                    <Check className="h-4 w-4" /> Keep it
                  </button>
                </div>
              ) : null}

              {step === 'businessLocation' && !busy ? (
                <div className="mb-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => answer('')}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/40"
                  >
                    Skip
                  </button>
                </div>
              ) : null}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  answer(input);
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      answer(input);
                    }
                  }}
                  rows={1}
                  disabled={!showInput}
                  placeholder={PLACEHOLDERS[step] || 'Type your answer…'}
                  className="max-h-32 min-h-[46px] flex-1 resize-none rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-graphite-400 hover:border-graphite-300 focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500/15 disabled:opacity-50"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!showInput || !input.trim()}
                  className="h-[46px] w-[46px] flex-shrink-0 rounded-xl"
                  aria-label="Send"
                >
                  <ArrowUp className="h-5 w-5" />
                </Button>
              </form>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Bubble({ role, text }) {
  const isBot = role === 'bot';
  return (
    <div className={cn('flex items-end gap-2.5', isBot ? 'justify-start' : 'justify-end')}>
      {isBot ? (
        <span className="mb-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <Bot className="h-4 w-4" />
        </span>
      ) : null}
      <div
        className={cn(
          'max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isBot
            ? 'rounded-bl-sm bg-secondary text-foreground'
            : 'rounded-br-sm bg-brand-600 text-white',
        )}
      >
        {text}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-end gap-2.5">
      <span className="mb-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
        <Bot className="h-4 w-4" />
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-secondary px-4 py-3">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-graphite-400"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 px-4 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function SummaryCard({ data }) {
  return (
    <div className="ml-9 max-w-[80%] overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-accent/30 px-4 py-3">
        <Bot className="h-4 w-4 text-brand-600" />
        <p className="font-semibold text-foreground">{data.name || 'Your agent'}</p>
      </div>
      <div className="divide-y divide-border">
        <SummaryRow icon={Building2} label="Business" value={data.companyName} />
        <SummaryRow icon={Briefcase} label="Type" value={data.serviceName} />
        <SummaryRow icon={Sparkles} label="Services" value={data.offerDescription} />
        <SummaryRow icon={MapPin} label="Location" value={data.businessLocation} />
        <SummaryRow icon={PhoneCall} label="Opens with" value={data.openingMessage} />
      </div>
    </div>
  );
}
