export const PARCEL_SIZE_OPTIONS = [
  { id: 'small', label: 'Small Pouch', weight: 'Up to 1 kg', desc: 'Documents, flyers, phones, cards' },
  { id: 'medium', label: 'Standard Box', weight: '1 kg \u2013 5 kg', desc: 'Shoebox, apparel, electronics' },
  { id: 'large', label: 'Heavy Carton', weight: '5 kg \u2013 15 kg', desc: 'Bulk goods, hampers, appliances' }
];

export const PARCEL_SIZE_PRICES = { small: 1200, medium: 1600, large: 2400 };

export const PARCEL_QUANTITY_MIN = 1;
export const PARCEL_QUANTITY_MAX = 50;

export const clampParcelQuantity = (value) => {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) return PARCEL_QUANTITY_MIN;
  return Math.min(PARCEL_QUANTITY_MAX, Math.max(PARCEL_QUANTITY_MIN, parsed));
};

export const parcelUnitPrice = (size) => PARCEL_SIZE_PRICES[size] || PARCEL_SIZE_PRICES.medium;

export const parcelTotalPrice = (size, quantity) => parcelUnitPrice(size) * clampParcelQuantity(quantity);

export const formatNaira = (amount) =>
  `\u20A6${Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;