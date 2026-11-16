import { InfoTooltip } from './SettingsUi';

export default function DigitalBoxFeesTab({ digitalBoxVal, updateField }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
      <div>
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          Digital P.O. Box & Proof of Address Fees
          <InfoTooltip text="Charges applied to the customer wallet for doorway verification and annual certificate revalidation." />
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          These amounts are charged from the customer's prepaid Hotbox wallet when they request a doorway inspection or renew their Proof of Address certificate.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
          <span className="text-[11px] font-bold text-slate-700 block">
            Doorway Inspection Fee (One-Time)
            <InfoTooltip text="Charged the first time a customer requests physical ground-truthing for their Proof of Address." />
          </span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
            <input
              type="number"
              step="100"
              min="0"
              value={digitalBoxVal.doorway_inspection_fee_ngn || 2500}
              onChange={(e) => updateField('digital_box_fees', 'doorway_inspection_fee_ngn', parseFloat(e.target.value) || 0)}
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
            />
          </div>
          <span className="text-[10px] text-slate-500 block">
            One-time charge for the initial doorway inspection and certificate issuance.
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
          <span className="text-[11px] font-bold text-slate-700 block">
            Certificate Revalidation Fee (Every 12 Months)
            <InfoTooltip text="Charged when a customer renews an existing Proof of Address certificate after it expires." />
          </span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
            <input
              type="number"
              step="100"
              min="0"
              value={digitalBoxVal.poa_revalidation_fee_ngn || 2500}
              onChange={(e) => updateField('digital_box_fees', 'poa_revalidation_fee_ngn', parseFloat(e.target.value) || 0)}
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
            />
          </div>
          <span className="text-[10px] text-slate-500 block">
            Recurring charge applied every 12 months to keep the certificate valid.
          </span>
        </div>
      </div>
    </div>
  );
}