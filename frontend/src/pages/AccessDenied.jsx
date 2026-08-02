import { Link } from 'react-router-dom';
import { ShieldX, LogOut, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

export default function AccessDenied() {
  const { user, logout, pendingInviteToken } = useAuth();
  const firstName = user?.name ? user.name.split(' ')[0] : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-panel border border-border bg-card p-8 text-center shadow-card">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-danger-50 text-danger-500">
            <ShieldX className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-bold tracking-[-0.02em] text-foreground">Access denied</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            This app is invite-only. {firstName ? `Hi ${firstName}, your` : 'Your'} account
            doesn&apos;t have access yet — ask a workspace admin to invite you.
          </p>

          {pendingInviteToken ? (
            <div className="mt-6 space-y-2">
              <div className="rounded-lg border border-success-500/30 bg-success-50 p-3 text-sm text-success-700">
                Good news — you have a pending invitation.
              </div>
              <Button asChild className="w-full">
                <Link to={`/join/${pendingInviteToken}`}>
                  <Mail className="h-4 w-4" /> Accept your invitation
                </Link>
              </Button>
            </div>
          ) : null}

          <div className="mt-6">
            <Button variant="outline" className="w-full" onClick={logout}>
              <LogOut className="h-4 w-4" /> Log out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
