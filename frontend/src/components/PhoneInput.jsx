import { useMemo } from 'react';

// Country dial codes offered on the account phone field. Nigeria leads because
// Hotbox is a Nigerian service; the rest cover the common diaspora corridors.
export const COUNTRY_DIAL_CODES = [
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dial: '234' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', dial: '233' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', dial: '254' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', dial: '27' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', dial: '20' },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', dial: '225' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', dial: '221' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲', dial: '237' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', dial: '256' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', dial: '255' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', dial: '251' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', dial: '212' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dial: '44' },
  { code: 'US', name: 'United States', flag: '🇺🇸', dial: '1' },
  { code: 'IN', name: 'India', flag: '🇮🇳', dial: '91' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dial: '971' },
  { code: 'CN', name: 'China', flag: '🇨🇳', dial: '86' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', dial: '55' },
  { code: 'FR', name: 'France', flag: '🇫🇷', dial: '33' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', dial: '49' }
];

const digitsOf = (value) => String(value || '').replace(/\D/g, '');

// Mirrors the backend helper so the value sent to the API is always canonical.
export function buildCanonicalPhone(dial, input) {
  const dialDigits = digitsOf(dial) || '234';
  let digits = digitsOf(input);
  if (!digits) return '';

  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.startsWith(dialDigits)) return `+${digits}`;

  return `+${dialDigits}${digits}`;
}

export default function PhoneInput({
  id,
  value,
  onChange,
  placeholder = '8108525262',
  className = '',
  required = false
}) {
  const canonical = String(value || '');

  const dial = useMemo(() => {
    if (canonical.startsWith('+')) {
      const match = [...COUNTRY_DIAL_CODES]
        .sort((a, b) => b.dial.length - a.dial.length)
        .find((country) => canonical.slice(1).startsWith(country.dial));
      if (match) return match.dial;
    }
    return COUNTRY_DIAL_CODES[0].dial;
  }, [canonical]);

  const national = canonical ? canonical.slice(dial.length + 1).replace(/^0+/, '') : '';

  return (
    <div className={`flex items-stretch overflow-hidden border border-slate-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent ${className}`}>
      <select
        aria-label="Country dial code"
        value={dial}
        onChange={(e) => onChange(buildCanonicalPhone(e.target.value, national))}
        className="bg-slate-50 border-r border-slate-200 text-xs font-mono text-slate-700 px-2 py-2 focus:outline-none cursor-pointer"
      >
        {COUNTRY_DIAL_CODES.map((country) => (
          <option key={country.code} value={country.dial}>
            {country.flag} +{country.dial}
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        autoComplete="tel"
        required={required}
        value={national}
        onChange={(e) => onChange(buildCanonicalPhone(dial, e.target.value))}
        placeholder={placeholder}
        className="flex-1 min-w-0 px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none"
      />
    </div>
  );
}
