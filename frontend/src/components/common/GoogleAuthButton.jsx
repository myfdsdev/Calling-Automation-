import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let googleScriptPromise;

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.74-.07-1.45-.19-2.12H12v4.01h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.25c1.9-1.75 2.97-4.32 2.97-7.42z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.9 6.63-2.35l-3.25-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.05v2.59A10 10 0 0 0 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.98A6 6 0 0 1 6.1 12c0-.69.11-1.36.31-1.98V7.43H3.05A10 10 0 0 0 2 12c0 1.61.38 3.14 1.05 4.57l3.36-2.59z"
      />
      <path
        fill="#EA4335"
        d="M12 5.9c1.47 0 2.78.5 3.82 1.49l2.88-2.88C16.96 2.89 14.7 2 12 2a10 10 0 0 0-8.95 5.43l3.36 2.59C7.2 7.66 9.4 5.9 12 5.9z"
      />
    </svg>
  );
}

export function GoogleAuthButton({ text = 'signin_with', disabled = false, onCredential }) {
  const containerRef = useRef(null);
  const [scriptState, setScriptState] = useState('loading');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) {
      setScriptState('missing');
      return undefined;
    }

    let active = true;
    setScriptState('loading');

    loadGoogleScript()
      .then(() => {
        if (!active || !containerRef.current) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) onCredential(response.credential);
          },
        });

        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'rectangular',
          text,
          width: containerRef.current.offsetWidth || 360,
        });
        setScriptState('ready');
      })
      .catch(() => {
        if (active) setScriptState('failed');
      });

    return () => {
      active = false;
    };
  }, [clientId, onCredential, text]);

  const unavailable = scriptState === 'missing' || scriptState === 'failed';

  return (
    <div className="relative h-11 w-full">
      <div
        className={cn(
          'flex h-11 w-full items-center justify-center overflow-hidden rounded-lg',
          scriptState !== 'ready' && 'invisible absolute inset-0',
          disabled && 'pointer-events-none opacity-60',
        )}
        ref={containerRef}
      />
      {scriptState !== 'ready' ? (
        <Button type="button" variant="outline" className="w-full" disabled>
          {unavailable ? <GoogleMark /> : <Loader2 className="h-4 w-4 animate-spin" />}
          {unavailable ? 'Google sign-in unavailable' : 'Loading Google sign-in'}
        </Button>
      ) : null}
    </div>
  );
}
