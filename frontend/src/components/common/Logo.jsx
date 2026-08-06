import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * App logo. Renders the PNG at `frontend/public/LeadDialer.png`. Use a transparent
 * PNG so it looks right on both the dark navbar and the light auth pages.
 *
 * If the file is missing, it falls back to the built-in icon + wordmark so the
 * header never shows a broken image.
 *
 * - `className` sizes the image, e.g. `h-8` (width scales automatically).
 * - `light` tints the FALLBACK wordmark white (for dark backgrounds).
 */
export function Logo({ className, light = false }) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <img
        src="/LeadDialer-original.png"
        alt="leaddialerai"
        onError={() => setFailed(true)}
        className={cn('h-9 w-auto object-contain', className)}
      />
    );
  }

  // Fallback: the original icon + wordmark.
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-500 text-graphite-950">
         <img
        src="/LeadDialer-original.png"
        alt="leaddialerai"
        onError={() => setFailed(true)}
        className={cn('h-9 w-auto object-contain', className)}
      />
      </span>
      <span
        className={cn(
          'whitespace-nowrap text-base font-semibold tracking-tight',
          light ? 'text-white' : 'text-foreground',
        )}
      >
        LeadDialer<span className="text-brand-500"> AI</span>
      </span>
    </span>
  );
}
