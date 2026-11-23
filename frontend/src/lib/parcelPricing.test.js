import { describe, it, expect } from 'vitest';
import {
  PARCEL_SIZE_OPTIONS,
  PARCEL_SIZE_PRICES,
  PARCEL_QUANTITY_MIN,
  PARCEL_QUANTITY_MAX,
  clampParcelQuantity,
  parcelUnitPrice,
  parcelTotalPrice,
  formatNaira
} from './parcelPricing';

describe('parcelPricing', () => {
  it('keeps quantity within the allowed parcel range', () => {
    expect(clampParcelQuantity(0)).toBe(PARCEL_QUANTITY_MIN);
    expect(clampParcelQuantity(-4)).toBe(PARCEL_QUANTITY_MIN);
    expect(clampParcelQuantity(1)).toBe(1);
    expect(clampParcelQuantity(12)).toBe(12);
    expect(clampParcelQuantity(PARCEL_QUANTITY_MAX + 1)).toBe(PARCEL_QUANTITY_MAX);
    expect(clampParcelQuantity('abc')).toBe(PARCEL_QUANTITY_MIN);
  });

  it('floors fractional quantities', () => {
    expect(clampParcelQuantity(2.9)).toBe(2);
  });

  it('prices every parcel size at the flat rate', () => {
    for (const option of PARCEL_SIZE_OPTIONS) {
      expect(parcelUnitPrice(option.id)).toBe(PARCEL_SIZE_PRICES[option.id]);
    }
    expect(parcelUnitPrice('unknown')).toBe(PARCEL_SIZE_PRICES.medium);
  });

  it('multiplies the unit rate by the quantity', () => {
    expect(parcelTotalPrice('small', 1)).toBe(1200);
    expect(parcelTotalPrice('medium', 3)).toBe(4800);
    expect(parcelTotalPrice('large', 10)).toBe(24000);
    expect(parcelTotalPrice('medium', 0)).toBe(1600);
  });

  it('formats Naira with two decimals', () => {
    expect(formatNaira(1600)).toBe('\u20A61,600.00');
    expect(formatNaira(2500000)).toBe('\u20A62,500,000.00');
  });
});