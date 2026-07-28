import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Country, State, City } from 'country-state-city';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const COUNTRIES = Country.getAllCountries();
const dialOf = (c) => (c ? `+${String(c.phonecode).replace(/^\+/, '')}` : '');

/**
 * Cascading Country → State → City picker. Controlled via a single
 * { countryCode, stateCode, city } value; onChange returns that plus the resolved
 * human-readable { country, state, dialCode }. Emitting the names here means
 * callers never import this heavy dataset module themselves — so it stays in a
 * lazily-loaded chunk (see the React.lazy usage in LeadFinder / AddLeadDialog).
 *
 * Country & state are true dropdowns. City is an input backed by a <datalist> so
 * states with thousands of cities stay searchable (and free text is still allowed
 * where the dataset is incomplete).
 */
export function LocationPicker({ value, onChange, labels = true }) {
  const countryCode = value?.countryCode || '';
  const stateCode = value?.stateCode || '';
  const city = value?.city || '';

  const states = useMemo(
    () => (countryCode ? State.getStatesOfCountry(countryCode) : []),
    [countryCode],
  );
  const cities = useMemo(
    () => (countryCode && stateCode ? City.getCitiesOfState(countryCode, stateCode) : []),
    [countryCode, stateCode],
  );

  const emit = (next) => {
    const cc = next.countryCode;
    const sc = next.stateCode;
    const country = COUNTRIES.find((c) => c.isoCode === cc);
    const state = sc ? State.getStatesOfCountry(cc).find((s) => s.isoCode === sc) : null;
    onChange({
      countryCode: cc,
      stateCode: sc,
      city: next.city,
      country: country?.name || '',
      state: state?.name || '',
      dialCode: dialOf(country),
    });
  };

  // Hydrate resolved names once for the initial value, so a submit with no
  // interaction still carries the country name / dial code.
  const hydrated = useRef(false);
  useEffect(() => {
    if (!hydrated.current && countryCode && !value?.country) {
      hydrated.current = true;
      emit({ countryCode, stateCode, city });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Cell label={labels ? 'Country' : null}>
        <Select
          value={countryCode || undefined}
          onValueChange={(cc) => emit({ countryCode: cc, stateCode: '', city: '' })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {COUNTRIES.map((c) => (
              <SelectItem key={c.isoCode} value={c.isoCode}>
                <span className="mr-1">{c.flag}</span>
                {c.name}
                <span className="ml-1 text-muted-foreground">{dialOf(c)}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Cell>

      <Cell label={labels ? 'State / region' : null}>
        <Select
          value={stateCode || undefined}
          onValueChange={(sc) => emit({ countryCode, stateCode: sc, city: '' })}
          disabled={!states.length}
        >
          <SelectTrigger>
            <SelectValue placeholder={states.length ? 'Select state' : 'No states'} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {states.map((s) => (
              <SelectItem key={s.isoCode} value={s.isoCode}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Cell>

      <Cell label={labels ? 'City' : null}>
        <CityCombobox
          cities={cities}
          value={city}
          onChange={(v) => emit({ countryCode, stateCode, city: v })}
        />
      </Cell>
    </>
  );
}

function Cell({ label, children }) {
  return (
    <div className="space-y-1.5">
      {label ? <Label>{label}</Label> : null}
      {children}
    </div>
  );
}

/**
 * A searchable city dropdown styled to match the app's Select (no ugly native
 * <datalist>). Type to filter the selected state's cities, click to pick, and
 * free text is still allowed for places not in the dataset.
 */
function CityCombobox({ cities, value, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const q = (value || '').toLowerCase().trim();
  const exact = cities.some((c) => c.name === value);
  const matches = useMemo(
    () => (q && !exact ? cities.filter((c) => c.name.toLowerCase().includes(q)) : cities),
    [cities, q, exact],
  );
  const shown = matches.slice(0, 60);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={cities.length ? 'Select or type a city' : 'Type a city'}
        autoComplete="off"
        className="pr-9"
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 opacity-60" />
      {open && shown.length > 0 ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md">
          {shown.map((c) => (
            <button
              key={`${c.name}-${c.latitude}-${c.longitude}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(c.name);
                setOpen(false);
              }}
              className={cn(
                'block w-full truncate rounded-md px-3 py-1.5 text-left text-sm text-foreground hover:bg-brand-50',
                c.name === value && 'bg-brand-100',
              )}
            >
              {c.name}
            </button>
          ))}
          {matches.length > shown.length ? (
            <p className="px-3 py-1.5 text-xs text-muted-foreground">Keep typing to narrow the list…</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Compact country dial-code selector (flag + "+NN") for phone-number inputs.
 * onChange(isoCode, dialCode).
 */
export function PhoneCountrySelect({ value, onChange }) {
  return (
    <Select
      value={value}
      onValueChange={(iso) => onChange(iso, dialOf(COUNTRIES.find((c) => c.isoCode === iso)))}
    >
      <SelectTrigger className="w-28 flex-shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {COUNTRIES.map((c) => (
          <SelectItem key={c.isoCode} value={c.isoCode}>
            <span className="mr-1">{c.flag}</span>
            {dialOf(c)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
