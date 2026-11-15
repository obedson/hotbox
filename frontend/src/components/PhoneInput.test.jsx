import { describe, it, expect } from 'vitest';
import { buildCanonicalPhone } from './PhoneInput';

describe('buildCanonicalPhone', () => {
  it('accepts local, trunk-prefixed and international input', () => {
    expect(buildCanonicalPhone('234', '8108525262')).toBe('+2348108525262');
    expect(buildCanonicalPhone('234', '08108525262')).toBe('+2348108525262');
    expect(buildCanonicalPhone('234', '+2348108525262')).toBe('+2348108525262');
    expect(buildCanonicalPhone('234', '2348108525262')).toBe('+2348108525262');
  });

  it('uses the selected dial code', () => {
    expect(buildCanonicalPhone('44', '07911123456')).toBe('+447911123456');
    expect(buildCanonicalPhone('1', '4155552671')).toBe('+14155552671');
  });

  it('returns an empty string when nothing is entered', () => {
    expect(buildCanonicalPhone('234', '')).toBe('');
    expect(buildCanonicalPhone('234', '   ')).toBe('');
  });
});
