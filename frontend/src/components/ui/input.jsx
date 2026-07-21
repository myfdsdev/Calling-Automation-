import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'flex h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-graphite-400 hover:border-graphite-300 focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500/15 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger-500 aria-[invalid=true]:ring-danger-500/15',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
