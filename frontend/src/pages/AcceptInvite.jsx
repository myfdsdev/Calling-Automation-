import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PhoneCall, Loader2, Users, AlertTriangle, LogIn, UserPlus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const PENDING_KEY = 'pendingInviteToken';

function Shell({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-graphite-950">
            <PhoneCall className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            LeadCall<span className="text-brand-500"> AI</span>
          </span>
        </div>
        <div className="rounded-panel border border-border bg-card p-8 shadow-card">{children}</div>
      </div>
    </div>
  );
}

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get('token') || localStorage.getItem(PENDING_KEY) || '';
  const { user, loading, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Remember the token across the login/register round-trip.
  useEffect(() => {
    if (token) localStorage.setItem(PENDING_KEY, token);
  }, [token]);

  const { data: info, isLoading } = useQuery({
    queryKey: ['invite-info', token],
    enabled: Boolean(token),
    queryFn: async () => (await api.get(`/workspace/invite-info/${token}`)).data,
  });

  const accept = useMutation({
    mutationFn: async () => (await api.post('/workspace/invites/accept', { token })).data,
    onSuccess: async (d) => {
      localStorage.removeItem(PENDING_KEY);
      await refreshUser();
      toast.success(d.message || 'You joined the workspace');
      navigate('/', { replace: true });
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not accept invite')),
  });

  if (!token) {
    return (
      <Shell>
        <Center icon={AlertTriangle} tone="danger" title="No invite token" desc="This link is missing its invite token. Ask for a fresh invite link." />
        <Button asChild variant="outline" className="mt-6 w-full">
          <Link to="/">Go home</Link>
        </Button>
      </Shell>
    );
  }

  if (loading || isLoading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Checking your invite…</p>
        </div>
      </Shell>
    );
  }

  if (!info?.valid) {
    return (
      <Shell>
        <Center icon={AlertTriangle} tone="danger" title="Invite not valid" desc="This invite may have expired, been revoked, or already been used." />
        <Button asChild variant="outline" className="mt-6 w-full">
          <Link to="/">Go home</Link>
        </Button>
      </Shell>
    );
  }

  return (
    <Shell>
      <Center
        icon={Users}
        tone="brand"
        title={`Join ${info.workspaceName}`}
        desc={
          <>
            You&apos;ve been invited as a{' '}
            <span className="font-semibold text-foreground">{info.role}</span>. This invite is for{' '}
            <span className="font-semibold text-foreground">{info.email}</span>.
          </>
        }
      />

      <div className="mt-6">
        {!user ? (
          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              Sign in (or create an account) with{' '}
              <span className="font-medium text-foreground">{info.email}</span> to accept.
            </p>
            <Button asChild className="w-full">
              <Link to="/login">
                <LogIn className="h-4 w-4" /> Log in to accept
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/register">
                <UserPlus className="h-4 w-4" /> Create an account
              </Link>
            </Button>
          </div>
        ) : user.email?.toLowerCase() !== info.email.toLowerCase() ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-100 p-3 text-sm text-brand-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              You&apos;re signed in as <span className="font-semibold">{user.email}</span>, but this
              invite is for {info.email}. Sign in with the invited email to accept.
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link to="/account">Go to my account</Link>
            </Button>
          </div>
        ) : (
          <Button className="w-full" onClick={() => accept.mutate()} disabled={accept.isPending}>
            {accept.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Accept &amp; join {info.workspaceName}
          </Button>
        )}
      </div>
    </Shell>
  );
}

function Center({ icon: Icon, title, desc, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-100 text-brand-700',
    danger: 'bg-danger-50 text-danger-500',
  };
  return (
    <div className="flex flex-col items-center text-center">
      <span className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-6 w-6" />
      </span>
      <h1 className="text-xl font-bold tracking-[-0.02em] text-foreground">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
