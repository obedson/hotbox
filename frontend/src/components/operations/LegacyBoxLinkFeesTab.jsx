import { InfoTooltip } from './SettingsUi';

export default function LegacyBoxLinkFeesTab({ legacyBoxLinkVal, updateField }) {
  const nipostFee = Number(legacyBoxLinkVal.nipost_verification_fee_ngn) || 0;
  const platformFee = Number(legacyBoxLinkVal.hotbox_platform_fee_ngn) || 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
      <div>
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          Legacy P.O. Box Link Fees
          <InfoTooltip text="Charged to the customer wallet only when NIPOST approves a link request. A rejected claim is never charged." />
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Two separate charges, never blended: the NIPOST verification fee covers the archive search and paper processing, and the Hotbox platform fee covers storage, support and misdelivery liability.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
          <span className="text-[11px] font-bold text-slate-700 block">
            NIPOST Verification Fee
            <InfoTooltip text="Set by NIPOST. Payable to NIPOST because they perform the archive search and paper processing." />
          </span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
            <input
              type="number"
              step="100"
              min="0"
              value={legacyBoxLinkVal.nipost_verification_fee_ngn || 0}
              onChange={(e) => updateField('legacy_box_link_fees', 'nipost_verification_fee_ngn', parseFloat(e.target.value) || 0)}
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
            />
          </div>
          <span className="text-[10px] text-slate-500 block">
            Charged on approval. Set to 0 while the service is free.
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
          <span className="text-[11px] font-bold text-slate-700 block">
            Hotbox Platform Fee
            <InfoTooltip text="Set by Hotbox. Covers document storage, customer support and misdelivery liability." />
          </span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
            <input
              type="number"
              step="100"
              min="0"
              value={legacyBoxLinkVal.hotbox_platform_fee_ngn || 0}
              onChange={(e) => updateField('legacy_box_link_fees', 'hotbox_platform_fee_ngn', parseFloat(e.target.value) || 0)}
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
            />
          </div>
          <span className="text-[10px] text-slate-500 block">
            Charged on approval. Remitted to Hotbox operations.
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
        <span className="text-[11px] font-bold text-emerald-800">Total charged to the customer on approval</span>
        <span className="font-mono text-sm font-black text-emerald-900">
          ₦{(nipostFee + platformFee).toLocaleString('en-NG')}
        </span>
      </div>
    </div>
  );
}