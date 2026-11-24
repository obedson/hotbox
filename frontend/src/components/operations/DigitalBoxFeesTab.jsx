import { InfoTooltip } from './SettingsUi';

export default function DigitalBoxFeesTab({ digitalBoxVal, updateField }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
      <div>
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          Digital P.O. Box &amp; Proof of Address Fees
          <InfoTooltip text="Two separately charged services: the annual Digital P.O. Box subscription and the Proof of Address certificate validation cycle." />
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          These amounts are charged from the customer's prepaid Hotbox wallet. The Digital P.O. Box and the Proof of Address
          certificate are independent services and are billed separately.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
          <span className="text-[11px] font-bold text-slate-700 block">
            Annual Subscription Fee (Per Year)
            <InfoTooltip text="Charged when a customer activates a Digital P.O. Box and on each annual renewal." />
          </span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">&#8358;</span>
            <input
              type="number"
              step="100"
              min="0"
              value={digitalBoxVal.annual_subscription_fee_ngn ?? 3500}
              onChange={(e) => updateField('digital_box_fees', 'annual_subscription_fee_ngn', parseFloat(e.target.value) || 0)}
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
            />
          </div>
          <span className="text-[10px] text-slate-500 block">Annual charge for the Digital P.O. Box mail reception and rerouting service.</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
          <span className="text-[11px] font-bold text-slate-700 block">
            Doorway Inspection Fee (One-Time)
            <InfoTooltip text="Charged the first time a customer requests physical ground-truthing for their Proof of Address." />
          </span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">&#8358;</span>
            <input
              type="number"
              step="100"
              min="0"
              value={digitalBoxVal.doorway_inspection_fee_ngn ?? 2500}
              onChange={(e) => updateField('digital_box_fees', 'doorway_inspection_fee_ngn', parseFloat(e.target.value) || 0)}
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
            />
          </div>
          <span className="text-[10px] text-slate-500 block">One-time charge for the initial postcode inspection and certificate issuance.</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
          <span className="text-[11px] font-bold text-slate-700 block">
            Certificate Revalidation Fee
            <InfoTooltip text="Charged when a customer revalidates an existing Proof of Address certificate." />
          </span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">&#8358;</span>
            <input
              type="number"
              step="100"
              min="0"
              value={digitalBoxVal.poa_revalidation_fee_ngn ?? 2500}
              onChange={(e) => updateField('digital_box_fees', 'poa_revalidation_fee_ngn', parseFloat(e.target.value) || 0)}
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
            />
          </div>
          <span className="text-[10px] text-slate-500 block">Charged per validation cycle to keep the Proof of Address certificate current.</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
          <span className="text-[11px] font-bold text-slate-700 block">
            Certificate Revalidation Interval (Months)
            <InfoTooltip text="How often NIPOST or an accredited agent must re-validate the postcode for the certificate to stay valid." />
          </span>
          <input
            type="number"
            step="1"
            min="1"
            value={digitalBoxVal.poa_revalidation_months ?? 12}
            onChange={(e) => updateField('digital_box_fees', 'poa_revalidation_months', parseInt(e.target.value, 10) || 0)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
          />
          <span className="text-[10px] text-slate-500 block">Typical values are 6 or 12 months.</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
          <span className="text-[11px] font-bold text-slate-700 block">
            Post-Expiry Grace Period (Days)
            <InfoTooltip text="How long a lapsed Digital P.O. Box keeps resolving and forwarding before it stops routing mail." />
          </span>
          <input
            type="number"
            step="1"
            min="0"
            value={digitalBoxVal.grace_period_days ?? 30}
            onChange={(e) => updateField('digital_box_fees', 'grace_period_days', parseInt(e.target.value, 10) || 0)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
          />
          <span className="text-[10px] text-slate-500 block">During grace, mail still reaches the holder and couriers see an explicit grace marker.</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
          <span className="text-[11px] font-bold text-slate-700 block">
            Free Trial Length (Days)
            <InfoTooltip text="Optional trial service time granted on activation. Set to 0 to charge from the first payment." />
          </span>
          <input
            type="number"
            step="1"
            min="0"
            value={digitalBoxVal.free_trial_days ?? 0}
            onChange={(e) => updateField('digital_box_fees', 'free_trial_days', parseInt(e.target.value, 10) || 0)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
          />
          <span className="text-[10px] text-slate-500 block">Zero means no trial. A trial grants service time; the box number itself is never recycled.</span>
        </div>
      </div>
    </div>
  );
}
