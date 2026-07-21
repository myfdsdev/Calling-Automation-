import { Link } from 'react-router-dom';
import { Coins, Timer, Building2, Mail, User as UserIcon, LogOut, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { usePlans } from '@/hooks/queries';
import { useAuth } from '@/context/AuthContext';
import { initials, formatDate } from '@/lib/utils';

function UsageBar({ icon: Icon, label, value, max, unit }) {
  // max may be unknown for unlimited tiers — fall back to the current value.
  const pct = max ? Math.min(100, (value / max) * 100) : 100;
  return (
    <div className="space-y-2 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Icon className="h-4 w-4 text-muted-foreground" /> {label}
        </span>
        <span className="text-sm text-muted-foreground">
          {value} {unit} left
        </span>
      </div>
      <Progress value={pct} />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="w-32 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || '—'}</span>
    </div>
  );
}

export default function Account() {
  const { user, logout } = useAuth();
  const { data: plansData } = usePlans();
  if (!user) return null;

  // Use the current plan's allotment as the usage-bar maximum.
  const currentPlan = (plansData?.plans || []).find((p) => p.id === plansData?.currentPlan);
  const maxCredits = currentPlan?.leadCredits || user.leadCredits || 500;
  const maxMinutes = currentPlan?.callingMinutes || user.callingMinutes || 120;

  return (
    <div className="space-y-6">
      <PageHeader title="Account" description="Your profile and usage overview." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Details for your LeadCall AI workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-base">{initials(user.name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold text-foreground">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.companyName || 'No company set'}</p>
              </div>
            </div>
            <div className="divide-y divide-border">
              <InfoRow icon={UserIcon} label="Full name" value={user.name} />
              <InfoRow icon={Mail} label="Email" value={user.email} />
              <InfoRow icon={Building2} label="Company" value={user.companyName} />
              <InfoRow icon={Timer} label="Member since" value={formatDate(user.createdAt)} />
            </div>
            <div className="mt-6">
              <Button variant="outline" onClick={logout}>
                <LogOut className="h-4 w-4" /> Log out
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Usage</CardTitle>
                <CardDescription>Remaining credits and minutes.</CardDescription>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700">
                <Sparkles className="h-3.5 w-3.5" /> {user.plan?.name || 'Free'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsageBar icon={Coins} label="Lead credits" value={user.leadCredits} max={maxCredits} unit="credits" />
            <UsageBar icon={Timer} label="Calling minutes" value={user.callingMinutes} max={maxMinutes} unit="min" />
            <p className="text-xs text-muted-foreground">
              Lead credits are used when finding leads. Calling minutes are consumed by completed calls.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/plans">
                <Sparkles className="h-4 w-4 text-brand-500" /> Manage plan
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
