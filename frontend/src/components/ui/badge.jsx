import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        neutral: 'border-transparent bg-graphite-100 text-graphite-600',
        primary: 'border-transparent bg-brand-100 text-brand-700',
        info: 'border-transparent bg-info-50 text-info-700',
        success: 'border-transparent bg-success-50 text-success-700',
        warning: 'border-transparent bg-brand-100 text-brand-700',
        destructive: 'border-transparent bg-danger-50 text-danger-700',
        outline: 'border-border text-foreground',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
