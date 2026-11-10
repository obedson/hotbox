import { InfoTooltip } from './SettingsUi';
import { Users, Package } from 'lucide-react';

export default function PartnerPayoutsTab({ commsVal, updateField }) {
  return (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Partner Payouts & Commissions
              <InfoTooltip text="Standard earnings paid to collection point owners and courier drivers for each service completed." />
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Fixed earnings paid per parcel handoff to guarantee fair, clear partner income across Nigeria.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Neighborhood Hub Split */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                  <Users className="w-4 h-4" />
                </span>
                <span>Collection Hub Commissions</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Package Drop-In Fee (₦)
                    <InfoTooltip text="Paid to hub owner when they receive and check in a parcel into a storage bay." />
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
                    <input
                      type="number"
                      step="10"
                      min="0"
                      value={commsVal.hub_intake_fee_ngn || 200}
                      onChange={(e) => updateField('partner_commissions', 'hub_intake_fee_ngn', parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Credited upon package check-in</span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Package Handover Fee (₦)
                    <InfoTooltip text="Paid to hub owner when the customer collects their parcel with an OTP." />
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
                    <input
                      type="number"
                      step="10"
                      min="0"
                      value={commsVal.hub_release_fee_ngn || 200}
                      onChange={(e) => updateField('partner_commissions', 'hub_release_fee_ngn', parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Credited upon verified OTP pickup</span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Overdue Fee Share (%)
                    <InfoTooltip text="Percentage of overdue holding fees kept by the hub owner for extra storage time." />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="5"
                      min="0"
                      max="100"
                      value={commsVal.hub_storage_share_pct || 50}
                      onChange={(e) => updateField('partner_commissions', 'hub_storage_share_pct', parseFloat(e.target.value) || 0)}
                      className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Percentage of overdue fee paid to hub host</span>
                </div>
              </div>
            </div>

            {/* Courier Rider Payouts */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <span className="p-1.5 rounded-lg bg-sky-50 text-sky-700">
                  <Package className="w-4 h-4" />
                </span>
                <span>Courier Driver Payouts</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Sender Pickup Payout (₦)
                    <InfoTooltip text="Paid to driver when collecting a package from a sender's doorstep." />
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
                    <input
                      type="number"
                      step="20"
                      min="0"
                      value={commsVal.courier_pickup_ngn || 500}
                      onChange={(e) => updateField('partner_commissions', 'courier_pickup_ngn', parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">First-mile doorstep pickup fee</span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Customer Delivery Payout (₦)
                    <InfoTooltip text="Paid to driver when delivering a package to the customer's home or office." />
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
                    <input
                      type="number"
                      step="20"
                      min="0"
                      value={commsVal.courier_delivery_ngn || 600}
                      onChange={(e) => updateField('partner_commissions', 'courier_delivery_ngn', parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Last-mile doorstep delivery fee</span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Platform Fee (%)
                    <InfoTooltip text="Percentage retained to cover network technology, dispatching, and customer support." />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="5"
                      max="40"
                      value={commsVal.platform_commission_pct || 18}
                      onChange={(e) => updateField('partner_commissions', 'platform_commission_pct', parseFloat(e.target.value) || 0)}
                      className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Technology & network coordination fee</span>
                </div>
              </div>
            </div>
          </div>
        </div>
  );
}
