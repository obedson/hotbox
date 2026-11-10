import { InfoTooltip } from './SettingsUi';

export default function DeliveryTargetsTab({ slaVal, updateField }) {
  return (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Delivery Targets & Security Rules
              <InfoTooltip text="Speed targets for drivers and hubs, plus platform security requirements." />
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Operational speed targets and security controls for nationwide parcel operations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card 1 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">
                Recipient OTP Validity Window
                <InfoTooltip text="How long the 6-digit pickup OTP remains valid for the recipient." />
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="12"
                  max="168"
                  value={slaVal.collection_otp_validity_hours || 72}
                  onChange={(e) => updateField('sla_benchmarks', 'collection_otp_validity_hours', parseInt(e.target.value) || 72)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
                <span className="text-xs font-semibold text-slate-500">Hours</span>
              </div>
              <span className="text-[10px] text-slate-400 block">Lifetime of 6-digit collection OTP code</span>
            </div>

            {/* Card 2 (User specifically noted) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">
                Driver Pickup Time
                <InfoTooltip text="Target time for a driver to arrive at the sender's location after accepting a pickup order." />
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="15"
                  max="180"
                  value={slaVal.courier_pickup_sla_mins || 45}
                  onChange={(e) => updateField('sla_benchmarks', 'courier_pickup_sla_mins', parseInt(e.target.value) || 45)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
                <span className="text-xs font-semibold text-slate-500">Mins</span>
              </div>
              <span className="text-[10px] text-slate-400 block">Target arrival at sender doorstep after dispatch</span>
            </div>

            {/* Card 3 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">
                Stalled Parcel Alert
                <InfoTooltip text="Flags a package if it has not moved or been scanned within this timeframe." />
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="6"
                  max="72"
                  value={slaVal.stalled_shipment_alert_hours || 24}
                  onChange={(e) => updateField('sla_benchmarks', 'stalled_shipment_alert_hours', parseInt(e.target.value) || 24)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
                <span className="text-xs font-semibold text-slate-500">Hours</span>
              </div>
              <span className="text-[10px] text-slate-400 block">Flags shipment as exception if no scan occurs</span>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Security & Verification Safeguards */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Security & Verification Safeguards
            </h3>
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Two-Person Approval for Administrative Override
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Requires a second manager's review for sensitive overrides like driver reassignment or forced returns.
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                  Enforced
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Strict 11-Digit Postcode Verification
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Ensures all delivery addresses have a verified 11-digit Nigerian digital postcode before dispatch.
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 whitespace-nowrap">
                  Active
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Low-Bandwidth Mode for Remote LGAs
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Optimizes data usage for mobile devices and hubs on 2G/3G connections in remote areas.
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                  Standard Mode
                </span>
              </div>
            </div>
          </div>
        </div>
  );
}
