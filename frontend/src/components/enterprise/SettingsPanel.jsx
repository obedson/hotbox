import { CheckCircle2, ShieldCheck, Plus, Building2, AlertTriangle, RefreshCw, X, Trash2, MapPin, Store, Phone, Users, Save, CreditCard } from 'lucide-react';

export default function SettingsPanel({ companySettings, fetchCompanySettings, handleAddStaff, handleRemoveStaff, handleSaveSettings, isAddStaffOpen, newStaffForm, savingSettings, setIsAddStaffOpen, setNewStaffForm, setSettingsEditForm, settingsEditForm, settingsFeedback, settingsLoading, settingsWarehouses, submittingStaff, setActiveNav }) {
  return (
      <div className="space-y-6">
        {/* Main Card Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Enterprise Merchant Settings & Governance</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  B2B Contract Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Corporate legal registration, negotiated contract rate cards, regional fulfillment centers, and authorized operator seats.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchCompanySettings}
                disabled={settingsLoading}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${settingsLoading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingSettings ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </div>

          {/* Feedback Alerts */}
          {settingsFeedback && (
            <div className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
              settingsFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {settingsFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{settingsFeedback.message}</span>
            </div>
          )}

          {/* Section 1: Company Profile & Legal Registration */}
          <form onSubmit={handleSaveSettings} className="mt-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Corporate Registration & Contact Dossier</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Company Registered Name</label>
                <input
                  type="text"
                  value={settingsEditForm.company_name}
                  onChange={(e) => setSettingsEditForm({ ...settingsEditForm, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Corporate CAC Registration Number</label>
                <input
                  type="text"
                  value={settingsEditForm.cac_rc_number}
                  onChange={(e) => setSettingsEditForm({ ...settingsEditForm, cac_rc_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Federal Tax Identification Number (TIN)</label>
                <input
                  type="text"
                  value={settingsEditForm.tax_id}
                  onChange={(e) => setSettingsEditForm({ ...settingsEditForm, tax_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Corporate Billing Email</label>
                <input
                  type="email"
                  value={settingsEditForm.billing_email}
                  onChange={(e) => setSettingsEditForm({ ...settingsEditForm, billing_email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Operations / Dispatch Hotline</label>
                <input
                  type="tel"
                  value={settingsEditForm.support_phone}
                  onChange={(e) => setSettingsEditForm({ ...settingsEditForm, support_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Registered HQ Postcode</label>
                <input
                  type="text"
                  value={settingsEditForm.headquarters_postcode}
                  onChange={(e) => setSettingsEditForm({ ...settingsEditForm, headquarters_postcode: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="md:col-span-3">
                <label className="font-bold text-slate-700 block mb-1">Corporate Headquarters Address</label>
                <input
                  type="text"
                  value={settingsEditForm.headquarters_address}
                  onChange={(e) => setSettingsEditForm({ ...settingsEditForm, headquarters_address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingSettings ? 'Saving Changes...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Section 2: Negotiated Contract Rate Card & Terms */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Negotiated Enterprise Contract Rate Card & SLAs
              </h4>
            </div>
            <span className="text-[11px] font-mono text-indigo-600 font-bold bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
              {companySettings?.negotiated_rates?.rate_card_version || 'v2.4-B2B-CONTRACT'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Hub-to-Hub Delivery</span>
              <div className="text-xl font-black text-slate-900 font-mono mt-1">
                ₦{Number(companySettings?.negotiated_rates?.hub_to_hub_ngn || 1300).toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Flat inter-hub freight</span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Door-to-Hub Express</span>
              <div className="text-xl font-black text-slate-900 font-mono mt-1">
                ₦{Number(companySettings?.negotiated_rates?.door_to_hub_ngn || 1500).toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Direct warehouse pickup</span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Door-to-Door Delivery</span>
              <div className="text-xl font-black text-slate-900 font-mono mt-1">
                ₦{Number(companySettings?.negotiated_rates?.door_to_door_ngn || 2200).toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Direct courier transit</span>
            </div>

            <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl">
              <span className="text-[10px] text-emerald-800 font-bold uppercase block">Free Storage Window</span>
              <div className="text-xl font-black text-emerald-900 font-mono mt-1">
                {companySettings?.negotiated_rates?.free_holding_days || 3} Days
              </div>
              <span className="text-[10px] text-emerald-700 mt-0.5 block">
                Demurrage: ₦{Number(companySettings?.negotiated_rates?.daily_holding_fee_ngn || 300).toLocaleString()}/day
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between text-xs gap-3">
            <div className="space-y-0.5">
              <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Contract Terms: {companySettings?.billing_tier || 'PREPAID'} Settlement Tier</span>
              </div>
              <div className="text-indigo-800 text-[11px]">
                Approved monthly credit overdraft limit: <strong className="font-mono">₦{Number(companySettings?.monthly_credit_limit_ngn || 500000).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong> with a negotiated <strong className="font-mono">{companySettings?.negotiated_rates?.discount_tier_pct || 15}%</strong> bulk volume rebate.
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase tracking-wider shrink-0 w-fit">
              Active Agreement
            </span>
          </div>
        </div>

        {/* Section 3: Active Fulfillment Warehouses & Dispatch Nodes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Regional Fulfillment Centers & Sorting Nodes ({settingsWarehouses.length})
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Active fulfillment warehouses registered with NIPOST NDAPS verification.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveNav && setActiveNav('address_book')}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-indigo-600 font-bold text-xs transition flex items-center gap-1 shadow-2xs"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Manage Address Book</span>
            </button>
          </div>

          {settingsWarehouses.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No warehouse facilities configured yet. Add one in the Address Book.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {settingsWarehouses.map(wh => (
                <div key={wh.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-slate-900 leading-tight">
                      {wh.contact_name}
                    </div>
                    <div className="flex items-center gap-1">
                      {wh.is_default && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[9px] font-bold uppercase">
                          Default
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[9px] font-bold uppercase">
                        {wh.address_type}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">
                    {wh.street_address}, {wh.area_neighbourhood}, {wh.state}
                  </p>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px]">
                    <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                      {wh.postcode}
                    </span>
                    <span className="text-slate-400 font-mono">
                      {wh.contact_phone}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Authorized Staff Seats & Team Access */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Authorized Enterprise Operator Seats ({companySettings?.staff_seats?.length || 0})
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Assigned staff members with role-based access to manifests, labels, and dispatch APIs.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddStaffOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Invite Operator</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Staff Operator</th>
                  <th className="p-3">Corporate Email</th>
                  <th className="p-3">Role Designation</th>
                  <th className="p-3">Access Level</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(companySettings?.staff_seats || []).map(seat => (
                  <tr key={seat.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                          {seat.name[0]}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{seat.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{seat.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-slate-700">
                      {seat.email}
                    </td>
                    <td className="p-3 font-semibold text-slate-800">
                      {seat.role}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                        {seat.access_level}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {seat.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveStaff(seat.id, seat.name)}
                        className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                        title="Revoke Seat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* INVITE OPERATOR MODAL */}
        {isAddStaffOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Assign Enterprise Staff Seat
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Provision credentials for manifest booking and settlement access.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddStaff} className="p-5 space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Staff Member Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chinedu Okafor"
                    value={newStaffForm.name}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Corporate Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. c.okafor@konga.com"
                    value={newStaffForm.email}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile Phone Number</label>
                  <input
                    type="tel"
                    value={newStaffForm.phone}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Role Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Logistics Supervisor"
                      value={newStaffForm.role}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, role: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Access Scope</label>
                    <select
                      value={newStaffForm.access_level}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, access_level: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      <option value="OPERATIONS">OPERATIONS</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="FINANCE">FINANCE</option>
                      <option value="DISPATCH_ONLY">DISPATCH_ONLY</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddStaffOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingStaff}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold transition text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    {submittingStaff && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Assign Staff Seat</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
}
