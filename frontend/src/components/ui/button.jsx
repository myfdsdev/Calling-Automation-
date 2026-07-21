import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Primary = graphite (spec: not amber).
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-graphite-950',
        // Amber CTA — reserved for high-priority actions.
        amber: 'bg-brand-500 text-graphite-950 shadow-sm hover:bg-brand-600',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-danger-600',
        outline:
          'border border-border bg-card shadow-sm hover:border-graphite-300 hover:bg-surface-secondary',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-graphite-200',
        ghost: 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        link: 'text-brand-600 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-lg px-6',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = 'Button';

export { Button, buttonVariants };
