import { Link } from 'react-router-dom';
import { Timer, Building2, Mail, User as UserIcon, LogOut, Sparkles, Bot, Users, PhoneCall } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { usePlans } from '@/hooks/queries';
import { useAuth } from '@/context/AuthContext';
import { initials, formatDate } from '@/lib/utils';

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="w-32 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || '—'}</span>
    </div>
  );
}

function PlanFeature({ icon: Icon, children }) {
  return (
    <li className="flex items-center gap-2 text-sm text-foreground">
      <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" /> {children}
    </li>
  );
}

export default function Account() {
  const { user, logout } = useAuth();
  const { data: plansData } = usePlans();
  if (!user) return null;

  const currentPlan = (plansData?.plans || []).find((p) => p.id === plansData?.currentPlan);
  const agents =
    currentPlan?.maxAgents == null
      ? 'Unlimited AI agents'
      : `Up to ${currentPlan.maxAgents} AI agent${currentPlan.maxAgents > 1 ? 's' : ''}`;
  const members =
    currentPlan?.maxMembers == null
      ? 'Unlimited team members'
      : `Up to ${currentPlan.maxMembers} team member${currentPlan.maxMembers > 1 ? 's' : ''}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Account" description="Your profile and plan overview." />

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
                <CardTitle>Your plan</CardTitle>
                <CardDescription>Platform access for your workspace.</CardDescription>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700">
                <Sparkles className="h-3.5 w-3.5" /> {currentPlan?.name || 'Free'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2.5">
              <PlanFeature icon={Bot}>{agents}</PlanFeature>
              <PlanFeature icon={Users}>{members}</PlanFeature>
              <PlanFeature icon={PhoneCall}>Unlimited leads &amp; calls</PlanFeature>
            </ul>
            <p className="text-xs text-muted-foreground">
              You bring your own API keys, so leads and calls are unlimited — you only pay the flat
              platform fee.
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
