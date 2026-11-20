import { InfoTooltip } from './SettingsUi';

export default function RiderRegistrationFeeTab({ riderRegistrationVal, updateField }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
      <div>
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          Rider Registration Fee
          <InfoTooltip text="Charged from the rider wallet before Operations can clear a rider for dispatch." />
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          A rider must evidence their NIN, driver's licence and home postcode, then settle this fee, before dispatch clearance can be granted.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
          <span className="text-[11px] font-bold text-slate-700 block">
            Registration Fee
            <InfoTooltip text="Set to zero to onboard riders free of charge. A positive amount is charged from the rider's prepaid wallet before clearance." />
          </span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
            <input
              type="number"
              step="100"
              min="0"
              value={riderRegistrationVal.registration_fee_ngn || 0}
              onChange={(e) => updateField('rider_registration_fees', 'registration_fee_ngn', parseFloat(e.target.value) || 0)}
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
            />
          </div>
          <span className="text-[10px] text-slate-500 block">
            One-time charge settled from the rider's prepaid wallet before dispatch clearance.
          </span>
        </div>
      </div>
    </div>
  );
}