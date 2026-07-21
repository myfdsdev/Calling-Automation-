import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/api';

/** Standard error panel with a retry button. Never shows raw backend errors. */
export function QueryError({ error, onRetry, message }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-danger-200 bg-danger-50/50 px-6 py-12 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-danger-50 text-danger-500">
        <AlertCircle className="h-5 w-5" />
      </span>
      <h3 className="text-sm font-semibold text-foreground">
        {message || 'We hit a snag loading this'}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {getErrorMessage(error, 'Please try again in a moment.')}
      </p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
