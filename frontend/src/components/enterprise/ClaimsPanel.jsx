import { Package, CheckCircle2, ShieldCheck, Plus, LifeBuoy, ExternalLink, Clock, AlertTriangle, FileText, Filter, RefreshCw, Eye, X, Phone } from 'lucide-react';

export default function ClaimsPanel({ claimFilter, claimSubmitError, claimSubmitSuccess, claims, claimsLoading, claimsSummary, eligibleLoading, eligibleShipments, fetchClaimsAndSummary, handleOpenSubmitClaim, handleSelectEligibleShipment, handleSubmitClaim, handleViewClaimInvestigation, isSubmitClaimOpen, newClaimForm, selectedClaimModal, setClaimFilter, setIsSubmitClaimOpen, setNewClaimForm, setSelectedClaimModal, submittingClaim }) {
  return (
      <div className="space-y-6">
        {/* Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">B2B Claims & Dispute Escalation</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  NIPOST NDAPS Arbitration
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Track parcel damage reports, transit loss indemnities, SLA breach claims, and custodial audit findings in real time.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchClaimsAndSummary}
                disabled={claimsLoading}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${claimsLoading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={handleOpenSubmitClaim}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Submit B2B Claim</span>
              </button>
            </div>
          </div>

          {/* Live KPI Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {/* Total Claims */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Claims</span>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <LifeBuoy className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                {claimsLoading ? '...' : (claimsSummary?.total_claims ?? claims.length)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Historical incident cases</div>
            </div>

            {/* Under Investigation */}
            <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Under Review</span>
                <div className="w-7 h-7 rounded-lg bg-amber-100/70 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-900 mt-2 font-mono">
                {claimsLoading ? '...' : (claimsSummary?.under_review_count ?? 0)}
              </div>
              <div className="text-[10px] text-amber-700/80 mt-0.5">Triage & hub inspection</div>
            </div>

            {/* Resolved / Approved */}
            <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Resolved / Approved</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-100/70 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-900 mt-2 font-mono">
                {claimsLoading ? '...' : (claimsSummary?.resolved_count ?? 0)}
              </div>
              <div className="text-[10px] text-emerald-700/80 mt-0.5">
                {claimsSummary?.settled_count || 0} credited to remittance
              </div>
            </div>

            {/* Recovered Indemnity */}
            <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider">Indemnity Recovered</span>
                <div className="w-7 h-7 rounded-lg bg-indigo-100/70 border border-indigo-200 flex items-center justify-center text-indigo-700">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-indigo-900 mt-2 font-mono">
                {claimsLoading ? '...' : `₦${Number(claimsSummary?.total_recovered_ngn || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`}
              </div>
              <div className="text-[10px] text-indigo-600 mt-0.5">
                Of ₦{Number(claimsSummary?.total_claimed_ngn || 0).toLocaleString('en-NG')} claimed
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 overflow-x-auto">
            <button
              type="button"
              onClick={() => setClaimFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                claimFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <span>All Claims</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded ${claimFilter === 'ALL' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                {claims.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setClaimFilter('UNDER_REVIEW')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                claimFilter === 'UNDER_REVIEW'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
              }`}
            >
              <span>Under Review / Triage</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded ${claimFilter === 'UNDER_REVIEW' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-700'}`}>
                {claims.filter(c => ['SUBMITTED', 'UNDER_REVIEW'].includes(c.status)).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setClaimFilter('APPROVED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                claimFilter === 'APPROVED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
              }`}
            >
              <span>Approved & Settled</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded ${claimFilter === 'APPROVED' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                {claims.filter(c => ['APPROVED', 'SETTLED'].includes(c.status)).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setClaimFilter('REJECTED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                claimFilter === 'REJECTED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-800'
              }`}
            >
              <span>Declined</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded ${claimFilter === 'REJECTED' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-700'}`}>
                {claims.filter(c => c.status === 'REJECTED').length}
              </span>
            </button>
          </div>
        </div>

        {/* Claims Ledger Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                PostgreSQL B2B Claims Audit Ledger
              </h4>
            </div>
            <span className="text-[11px] text-slate-400">
              Displaying {claims.filter(c => {
                if (claimFilter === 'ALL') return true;
                if (claimFilter === 'UNDER_REVIEW') return ['SUBMITTED', 'UNDER_REVIEW'].includes(c.status);
                if (claimFilter === 'APPROVED') return ['APPROVED', 'SETTLED'].includes(c.status);
                if (claimFilter === 'REJECTED') return c.status === 'REJECTED';
                return true;
              }).length} of {claims.length} claims
            </span>
          </div>

          {claimsLoading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              <p className="text-xs">Querying PostgreSQL claims repository...</p>
            </div>
          ) : claims.length === 0 ? (
            <div className="text-xs text-slate-500 p-12 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <div className="font-bold text-slate-800 text-sm">No Active Disputes Filed</div>
              <p className="mt-1 text-slate-400">All enterprise consignments have clean proof-of-delivery with zero open claims.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Claim ID & Date</th>
                    <th className="p-3.5">Consignment / Recipient</th>
                    <th className="p-3.5">Incident Type</th>
                    <th className="p-3.5 text-right">Claim Amount</th>
                    <th className="p-3.5 text-right">Settled Amount</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5">Assigned Auditor</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {claims
                    .filter(c => {
                      if (claimFilter === 'ALL') return true;
                      if (claimFilter === 'UNDER_REVIEW') return ['SUBMITTED', 'UNDER_REVIEW'].includes(c.status);
                      if (claimFilter === 'APPROVED') return ['APPROVED', 'SETTLED'].includes(c.status);
                      if (claimFilter === 'REJECTED') return c.status === 'REJECTED';
                      return true;
                    })
                    .map(claim => {
                      const typeInfo = {
                        DAMAGED_PARCEL: { label: 'Damaged Parcel', color: 'bg-rose-50 text-rose-700 border-rose-200' },
                        LOST_PARCEL: { label: 'Lost in Transit', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                        DELAYED_DELIVERY: { label: 'Transit SLA Breach', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                        WRONG_HANDOVER: { label: 'Wrong Handover', color: 'bg-orange-50 text-orange-700 border-orange-200' },
                        EXCESS_HOLDING_FEE: { label: 'Holding Fee Dispute', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
                      }[claim.claim_type] || { label: claim.claim_type, color: 'bg-slate-100 text-slate-700 border-slate-200' };

                      const statusBadge = {
                        SUBMITTED: <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">Submitted</span>,
                        UNDER_REVIEW: <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Under Review</span>,
                        APPROVED: <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Approved</span>,
                        SETTLED: <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 mx-auto w-fit"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Settled</span>,
                        REJECTED: <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Declined</span>
                      }[claim.status] || <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">{claim.status}</span>;

                      return (
                        <tr key={claim.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3.5">
                            <div className="font-mono font-bold text-slate-900">
                              CLM-{claim.id.slice(0, 8).toUpperCase()}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(claim.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 font-mono font-bold text-indigo-600">
                              <Package className="w-3.5 h-3.5 text-indigo-500" />
                              <span>{claim.tracking_code}</span>
                            </div>
                            <div className="text-[11px] text-slate-600 mt-0.5">
                              {claim.recipient_name} • <span className="text-slate-400">{claim.destination_hub || 'Hub'}</span>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                            <div className="text-[11px] text-slate-500 line-clamp-1 max-w-xs mt-1">
                              {claim.description}
                            </div>
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                            ₦{Number(claim.claim_amount_ngn).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold">
                            {Number(claim.resolution_amount_ngn) > 0 ? (
                              <span className="text-emerald-700">
                                ₦{Number(claim.resolution_amount_ngn).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">—</span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            {statusBadge}
                          </td>
                          <td className="p-3.5 text-slate-600">
                            {claim.assigned_to_name ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                                  {claim.assigned_to_name[0]}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-800 text-[11px]">{claim.assigned_to_name}</div>
                                  <div className="text-[10px] text-slate-400">Hub Claims Inspector</div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Pending Assignment</span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleViewClaimInvestigation(claim.id)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-slate-700 font-bold text-[11px] transition inline-flex items-center gap-1 shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspect</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SUBMIT B2B CLAIM MODAL */}
        {isSubmitClaimOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                    <LifeBuoy className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Submit B2B Cargo Insurance Claim
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Arbitrated under NDAPS carrier liability rules and transit SLA terms.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSubmitClaimOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitClaim} className="p-5 space-y-4 overflow-y-auto text-xs">
                {claimSubmitError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{claimSubmitError}</span>
                  </div>
                )}

                {claimSubmitSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{claimSubmitSuccess}</span>
                  </div>
                )}

                {/* Shipment Selection */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Disputed Consignment / Shipment <span className="text-rose-500">*</span>
                  </label>
                  {eligibleLoading ? (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-center">
                      Loading eligible shipments from database...
                    </div>
                  ) : eligibleShipments.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                      No active disputed consignments available for filing.
                    </div>
                  ) : (
                    <select
                      value={newClaimForm.shipmentId}
                      onChange={(e) => handleSelectEligibleShipment(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      {eligibleShipments.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.tracking_code} • {s.recipient_name} ({s.status}) • {s.destination_hub || 'Hub'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Selected Shipment Summary Card */}
                {newClaimForm.shipmentId && (
                  (() => {
                    const sel = eligibleShipments.find(s => s.id === newClaimForm.shipmentId);
                    if (!sel) return null;
                    return (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 block">Recipient Postcode:</span>
                          <span className="font-mono font-bold text-slate-800">{sel.recipient_postcode || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Destination Hub:</span>
                          <span className="font-bold text-slate-800">{sel.destination_hub || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Dispatched Rate:</span>
                          <span className="font-mono font-bold text-indigo-600">₦{Number(sel.pricing_total_ngn || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Dispatch Date:</span>
                          <span className="text-slate-700">{new Date(sel.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* Claim Category */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Discrepancy Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newClaimForm.claimType}
                    onChange={(e) => setNewClaimForm({ ...newClaimForm, claimType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="DAMAGED_PARCEL">DAMAGED_PARCEL — Physical Impact / Wetness / Broken Seals</option>
                    <option value="LOST_PARCEL">LOST_PARCEL — Complete Transit Loss / Unaccounted Custody</option>
                    <option value="DELAYED_DELIVERY">DELAYED_DELIVERY — SLA Breach / Guaranteed Window Exceeded</option>
                    <option value="WRONG_HANDOVER">WRONG_HANDOVER — Misdirected Consignment / Unauthorized Handover</option>
                    <option value="EXCESS_HOLDING_FEE">EXCESS_HOLDING_FEE — Demurrage Discrepancy / Inaccurate Holding Surcharge</option>
                  </select>
                </div>

                {/* Declared Indemnity Demand */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Claimed Indemnity Demand (₦ NGN) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold">₦</span>
                    <input
                      type="number"
                      min="100"
                      step="100"
                      value={newClaimForm.claimAmountNgn}
                      onChange={(e) => setNewClaimForm({ ...newClaimForm, claimAmountNgn: e.target.value })}
                      placeholder="e.g. 25000"
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Include wholesale cargo valuation and applicable courier transit surcharge.
                  </span>
                </div>

                {/* Description / Statement */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Incident Statement & Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={newClaimForm.description}
                    onChange={(e) => setNewClaimForm({ ...newClaimForm, description: e.target.value })}
                    placeholder="Detailed statement explaining condition of goods, courier handover timestamp, and observed discrepancies..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Evidence URLs */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Photographic / Document Evidence URLs (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={newClaimForm.evidenceUrls}
                    onChange={(e) => setNewClaimForm({ ...newClaimForm, evidenceUrls: e.target.value })}
                    placeholder="https://images.example.com/damage-1.jpg (One link per line)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSubmitClaimOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingClaim || eligibleLoading}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold transition text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    {submittingClaim && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Submit Claim to Arbitration</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* VIEW INVESTIGATION CASE MODAL */}
        {selectedClaimModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 font-mono">
                      Dispute Investigation: CLM-{selectedClaimModal.id.slice(0, 8).toUpperCase()}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-sans">
                      Consignment: {selectedClaimModal.tracking_code} • Filed {new Date(selectedClaimModal.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClaimModal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto text-xs">
                {/* Financial & Status Summary Header */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Claim Type</span>
                    <span className="font-bold text-slate-900">{selectedClaimModal.claim_type}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Claimed Loss</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₦{Number(selectedClaimModal.claim_amount_ngn).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Settled Indemnity</span>
                    <span className="font-mono font-bold text-emerald-700">
                      ₦{Number(selectedClaimModal.resolution_amount_ngn || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Current Status</span>
                    <span className="font-bold text-indigo-700 uppercase">{selectedClaimModal.status}</span>
                  </div>
                </div>

                {/* 2-Column Detail Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Consignment & Recipient Detail */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                      <Package className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-slate-900">Consignment Data</span>
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tracking Code:</span>
                        <span className="font-mono font-bold text-indigo-600">{selectedClaimModal.tracking_code}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Service Category:</span>
                        <span className="font-semibold text-slate-800">{selectedClaimModal.service_type || 'DOOR_TO_HUB'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Recipient Name:</span>
                        <span className="font-bold text-slate-800">{selectedClaimModal.recipient_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Recipient Phone:</span>
                        <span className="font-mono text-slate-700">{selectedClaimModal.recipient_phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">NDAPS Postcode:</span>
                        <span className="font-mono font-bold text-slate-800">{selectedClaimModal.recipient_postcode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Destination Hub:</span>
                        <span className="font-semibold text-slate-800">{selectedClaimModal.destination_hub || '—'}</span>
                      </div>
                      {selectedClaimModal.recipient_address_text && (
                        <div className="pt-2 border-t border-slate-100 text-[11px]">
                          <span className="text-slate-400 block mb-0.5">Physical Delivery Address:</span>
                          <span className="text-slate-700">{selectedClaimModal.recipient_address_text}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Investigation & Audit Notes */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-slate-900">Arbitration & Findings</span>
                    </div>
                    <div className="space-y-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">Assigned Custody Auditor:</span>
                        <span className="font-bold text-slate-800">
                          {selectedClaimModal.investigator_name || selectedClaimModal.assigned_to_name || 'System Super Admin (NDAPS Lead)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-1">Official Findings & Notes:</span>
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 italic">
                          {selectedClaimModal.resolution_notes || 'Case currently under preliminary evidence evaluation.'}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Created:</span>
                          <span className="text-slate-600 font-mono text-[10px]">
                            {new Date(selectedClaimModal.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Settled / Resolved:</span>
                          <span className="text-slate-600 font-mono text-[10px]">
                            {selectedClaimModal.resolved_at ? new Date(selectedClaimModal.resolved_at).toLocaleString() : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Claimant Statement */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-700 block mb-1">Merchant Incident Statement:</span>
                  <p className="text-slate-600 leading-relaxed">{selectedClaimModal.description}</p>
                </div>

                {/* Evidence Attachments */}
                {selectedClaimModal.evidence_urls && selectedClaimModal.evidence_urls.length > 0 && (
                  <div>
                    <span className="font-bold text-slate-700 block mb-2">Attached Proof & Photographic Evidence:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedClaimModal.evidence_urls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-indigo-600 font-bold transition text-[11px]"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Evidence #{i + 1}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedClaimModal(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold transition text-xs hover:bg-slate-800"
                >
                  Close Investigation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
