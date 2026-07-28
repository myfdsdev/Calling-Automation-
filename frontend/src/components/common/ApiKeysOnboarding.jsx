import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ArrowRight, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useApiKeys, WorkspaceApiKeysList } from '@/pages/partials/WorkspaceApiKeysCard';

const REQUIRED = ['gemini', 'serpapi', 'vapi'];

/**
 * First-run gate: after signing in, an owner/admin whose workspace hasn't
 * connected its API keys is prompted to add them right away. It auto-closes once
 * all keys are connected, and can be skipped for the session (reappears on the
 * next load until set up). Members (who can't manage keys) never see it.
 */
export function ApiKeysOnboarding() {
  const navigate = useNavigate();
  const { data, isLoading } = useApiKeys();
  const [skipped, setSkipped] = useState(false);

  const status = data?.apiKeys;
  const canManage = data?.canManage;
  const connected = status ? REQUIRED.filter((k) => status[k]?.connected).length : 0;
  const allConnected = connected === REQUIRED.length;

  const open = Boolean(!isLoading && canManage && !allConnected && !skipped);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && setSkipped(true)}>
      <DialogContent
        className="max-h-[92vh] max-w-2xl overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <KeyRound className="h-6 w-6" />
          </span>
          <DialogTitle>Connect your API keys to get started</DialogTitle>
          <DialogDescription>
            LeadCall AI uses your own keys to find leads (SerpAPI), write scripts (Gemini) and place
            calls (Vapi). Add them once — they&apos;re verified, encrypted, and used only by your
            workspace.
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-foreground">
            <CheckCircle2 className={connected ? 'h-4 w-4 text-success-500' : 'h-4 w-4 text-muted-foreground'} />
            {connected} of {REQUIRED.length} connected
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-300"
              style={{ width: `${(connected / REQUIRED.length) * 100}%` }}
            />
          </div>
        </div>

        <WorkspaceApiKeysList />

        <DialogFooter className="sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={() => setSkipped(true)}>
            Skip for now
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSkipped(true);
              navigate('/api-settings');
            }}
          >
            Open full settings <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
