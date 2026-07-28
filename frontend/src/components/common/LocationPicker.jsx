import { useEffect, useMemo, useRef } from 'react';
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
export function LocationPicker({ value, onChange, labels = true, cityListId = 'lp-cities' }) {
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
        <Input
          list={cityListId}
          value={city}
          onChange={(e) => emit({ countryCode, stateCode, city: e.target.value })}
          placeholder={cities.length ? 'Select or type a city' : 'Type a city'}
          autoComplete="off"
        />
        <datalist id={cityListId}>
          {cities.map((c) => (
            <option key={`${c.name}-${c.latitude}-${c.longitude}`} value={c.name} />
          ))}
        </datalist>
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
