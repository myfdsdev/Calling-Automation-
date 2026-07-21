import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const TONES = {
  primary: 'bg-brand-100 text-brand-600',
  success: 'bg-success-50 text-success-500',
  info: 'bg-info-50 text-info-500',
  warning: 'bg-brand-100 text-brand-600',
  neutral: 'bg-graphite-100 text-graphite-500',
};

export function StatCard({ icon: Icon, label, value, hint, tone = 'primary', loading }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-[28px] font-bold leading-tight tracking-tight text-foreground">{value}</p>
          )}
          {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg', TONES[tone])}>
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
    </Card>
  );
}
