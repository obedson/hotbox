import { InfoTooltip } from './SettingsUi';

export default function DeliveryRatesTab({ pricingVal, updateField }) {
  return (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Parcel Size Base Prices
                <InfoTooltip text="Starting delivery charge based on the physical size of the parcel." />
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Standard delivery prices in Nigerian Naira (₦). Extra weight and doorstep delivery add-ons apply on top of these prices.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Small */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">Small Parcel</span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase bg-white px-2 py-0.5 rounded border border-slate-200">
                    Up to 2kg
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Documents, envelopes, lightweight cosmetics, shoe boxes.
                </p>
                <div className="pt-2">
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Base Price (₦)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
                    <input
                      type="number"
                      step="50"
                      min="100"
                      value={pricingVal.base_small_ngn || ''}
                      onChange={(e) => updateField('pricing_matrix', 'base_small_ngn', parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Medium */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">Medium Parcel</span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase bg-white px-2 py-0.5 rounded border border-slate-200">
                    2kg – 5kg
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Microwaves, standard ecommerce shipping cartons, apparel bundles.
                </p>
                <div className="pt-2">
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Base Price (₦)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
                    <input
                      type="number"
                      step="50"
                      min="100"
                      value={pricingVal.base_medium_ngn || ''}
                      onChange={(e) => updateField('pricing_matrix', 'base_medium_ngn', parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Large */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">Large Parcel</span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase bg-white px-2 py-0.5 rounded border border-slate-200">
                    5kg – 15kg
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Bulk crates, commercial merchandise, large storage sacks.
                </p>
                <div className="pt-2">
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Base Price (₦)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
                    <input
                      type="number"
                      step="50"
                      min="100"
                      value={pricingVal.base_large_ngn || ''}
                      onChange={(e) => updateField('pricing_matrix', 'base_large_ngn', parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Service Multipliers */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Service Type Pricing
                <InfoTooltip text="Pricing factors applied depending on whether pickup or delivery happens at a hub or doorstep." />
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Hub to Hub (Dropoff & Pickup)
                  </span>
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    value={pricingVal.multipliers?.HUB_TO_HUB || 1.0}
                    onChange={(e) => updateField('pricing_matrix', 'multipliers.HUB_TO_HUB', parseFloat(e.target.value) || 1.0)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Baseline counter-to-counter service</span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Door to Hub (Home Pickup)
                  </span>
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    value={pricingVal.multipliers?.DOOR_TO_HUB || 1.25}
                    onChange={(e) => updateField('pricing_matrix', 'multipliers.DOOR_TO_HUB', parseFloat(e.target.value) || 1.25)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">+Driver collects from sender home</span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Hub to Door (Home Delivery)
                  </span>
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    value={pricingVal.multipliers?.HUB_TO_DOOR || 1.35}
                    onChange={(e) => updateField('pricing_matrix', 'multipliers.HUB_TO_DOOR', parseFloat(e.target.value) || 1.35)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">+Driver delivers to recipient home</span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Door to Door (Full Courier)
                  </span>
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    value={pricingVal.multipliers?.DOOR_TO_DOOR || 1.55}
                    onChange={(e) => updateField('pricing_matrix', 'multipliers.DOOR_TO_DOOR', parseFloat(e.target.value) || 1.55)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Full doorstep courier dispatch</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Extra Weight Charge (₦/kg)
                  <InfoTooltip text="Charged for every additional kilogram above package tier limit." />
                </span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
                  <input
                    type="number"
                    step="25"
                    min="0"
                    value={pricingVal.extra_kg_rate_ngn || 250}
                    onChange={(e) => updateField('pricing_matrix', 'extra_kg_rate_ngn', parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Applied for weight beyond size tier</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Parcel Insurance Fee (%)
                  <InfoTooltip text="Optional coverage fee to protect against loss or damage during transit." />
                </span>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={pricingVal.insurance_rate_pct || 1.0}
                    onChange={(e) => updateField('pricing_matrix', 'insurance_rate_pct', parseFloat(e.target.value) || 0)}
                    className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">%</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Transit loss protection surcharge</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Rate Card Code
                  <InfoTooltip text="System version tag recorded on all receipts and invoices." />
                </span>
                <input
                  type="text"
                  value={pricingVal.rate_version || 'v2.4-2026.11'}
                  onChange={(e) => updateField('pricing_matrix', 'rate_version', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Attached to quotes for audit tracking</span>
              </div>
            </div>
          </div>
        </div>
  );
}
