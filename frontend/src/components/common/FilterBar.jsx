import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const ALL = '__all__';

/**
 * A reusable filter bar.
 * - searchValue / onSearchChange for the text field
 * - filters: [{ key, placeholder, value, options: [{value,label}], onChange }]
 */
export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
  className,
  children,
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center',
        className,
      )}
    >
      {onSearchChange ? (
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
      ) : null}

      {filters.map((f) => (
        <Select
          key={f.key}
          value={f.value || ALL}
          onValueChange={(v) => f.onChange(v === ALL ? '' : v)}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={f.placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{f.placeholder || 'All'}</SelectItem>
            {f.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {children ? <div className="sm:ml-auto">{children}</div> : null}
    </div>
  );
}
