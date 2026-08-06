import { Timer, Building2, Mail, User as UserIcon, LogOut } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

export default function Account() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Account" description="Your profile details." />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Details for your leaddialerai workspace.</CardDescription>
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
    </div>
  );
}
