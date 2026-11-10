import { ShieldCheck, RefreshCw, X, Eye, FileText, RotateCcw, Truck } from 'lucide-react';

export default function ExceptionResolutionModal({ activeActionTab, claimDecision, dossierData, formatIncidentType, handleAuthorizeRTS, handleReassignCourier, handleResolveClaim, loadingDetails, reassignReason, resolutionNotes, rtsReason, selectedException, selectedRiderId, setActiveActionTab, setClaimDecision, setIsDossierOpen, setReassignReason, setResolutionNotes, setRtsReason, setSelectedRiderId, setSettlementAmount, settlementAmount, submittingAction, isDossierOpen }) {
  if (!isDossierOpen || !selectedException) return null;

  return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-scaleUp">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${
                    selectedException.severity === 'CRITICAL'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {selectedException.severity} Severity
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    ID: {selectedException.id}
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 mt-1.5 flex items-center gap-2">
                  <span className="font-mono">{selectedException.tracking_code}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                    {selectedException.service_type}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {formatIncidentType(selectedException.incident_type)} • Status: {selectedException.status}
                </p>
              </div>

              <button
                onClick={() => setIsDossierOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Primary Cards: Parties & Custody */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Shipper */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Origin Shipper</div>
                  <div className="font-bold text-slate-900 text-sm mt-1">{selectedException.customer_name}</div>
                  <div className="text-slate-500 mt-0.5">{selectedException.customer_phone}</div>
                </div>

                {/* Recipient */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Destination Recipient</div>
                  <div className="font-bold text-slate-900 text-sm mt-1">{selectedException.recipient_name}</div>
                  <div className="text-slate-500 mt-0.5">{selectedException.recipient_phone}</div>
                </div>

                {/* Current Custodian */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Current Custodian</div>
                  <div className="font-bold text-teal-700 text-sm mt-1 truncate">{selectedException.current_custodian}</div>
                  <div className="text-slate-500 font-mono text-[11px] mt-0.5">{selectedException.route}</div>
                </div>
              </div>

              {/* Financial & Incident Narrative */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-rose-600" />
                    <span>Incident Description & Particulars</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600">Declared Value: <b className="text-slate-900 font-mono">₦{Number(selectedException.amount_ngn || 0).toLocaleString()}</b></span>
                    {selectedException.holding_fee_ngn > 0 && (
                      <span className="text-orange-700">Late Fee: <b className="font-mono">₦{Number(selectedException.holding_fee_ngn).toLocaleString()}</b></span>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl text-slate-700 leading-relaxed border border-slate-200">
                  {selectedException.description}
                </div>

                {/* Evidence URLs if any */}
                {selectedException.evidence_urls && selectedException.evidence_urls.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold text-slate-600 mb-2">Photo Evidence Submitted:</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedException.evidence_urls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 flex items-center gap-1.5 hover:text-slate-900 shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-purple-600" />
                          <span>View Evidence Asset #{idx + 1}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Custody Chain Timeline */}
              {loadingDetails ? (
                <div className="p-6 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-slate-500 mb-1" />
                  <span>Loading custody ledger events...</span>
                </div>
              ) : dossierData && dossierData.timeline && dossierData.timeline.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-900">Chain-of-Custody Timeline</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {dossierData.timeline.map((event, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between text-[11px]">
                        <div>
                          <span className="font-bold text-slate-800">{event.handover_type || 'CUSTODY_SCAN'}</span>
                          <span className="text-slate-500 ml-2">Holder: {event.new_holder_type}</span>
                          {event.notes && <p className="text-slate-600 mt-0.5">{event.notes}</p>}
                        </div>
                        <span className="text-slate-400 font-mono">{new Date(event.scanned_at || event.created_at).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Resolution Action Console */}
              <div className="border-t border-slate-200 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Operational Resolution Actions
                  </div>
                  {/* Action Selector Tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setActiveActionTab('claim')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        activeActionTab === 'claim' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Claims Settlement
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveActionTab('reassign')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        activeActionTab === 'reassign' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Reassign Courier
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveActionTab('rts')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        activeActionTab === 'rts' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Authorize RTS
                    </button>
                  </div>
                </div>

                {/* Subform 1: Claims Settlement */}
                {activeActionTab === 'claim' && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-3">
                    <div className="text-xs font-bold text-purple-900">
                      Dispute & Claim Resolution Decision
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setClaimDecision('SETTLE')}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center transition ${
                          claimDecision === 'SETTLE'
                            ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                            : 'bg-white border-purple-200 text-purple-800 hover:bg-purple-100/50'
                        }`}
                      >
                        Settle & Compensate
                      </button>
                      <button
                        type="button"
                        onClick={() => setClaimDecision('APPROVE')}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center transition ${
                          claimDecision === 'APPROVE'
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                            : 'bg-white border-purple-200 text-slate-700 hover:bg-purple-100/50'
                        }`}
                      >
                        Approve Full Claim
                      </button>
                      <button
                        type="button"
                        onClick={() => setClaimDecision('REJECT')}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center transition ${
                          claimDecision === 'REJECT'
                            ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                            : 'bg-white border-purple-200 text-slate-700 hover:bg-purple-100/50'
                        }`}
                      >
                        Reject Claim
                      </button>
                    </div>

                    {claimDecision !== 'REJECT' && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Settlement Compensation Amount (₦)
                        </label>
                        <input
                          type="number"
                          value={settlementAmount}
                          onChange={(e) => setSettlementAmount(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="e.g. 45000"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Investigation Notes & Auditor Findings
                      </label>
                      <textarea
                        rows={2}
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Detail reasoning, inspection verification, or payout authorization terms..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleResolveClaim}
                      disabled={submittingAction}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submittingAction ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      <span>Commit {claimDecision} Disposition</span>
                    </button>
                  </div>
                )}

                {/* Subform 2: Reassign Courier */}
                {activeActionTab === 'reassign' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-3">
                    <div className="text-xs font-bold text-blue-900">
                      Reassign Stalled Parcel to Active Courier
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Select Verified Active Courier
                      </label>
                      <select
                        value={selectedRiderId}
                        onChange={(e) => setSelectedRiderId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {dossierData?.available_riders?.length > 0 ? (
                          dossierData.available_riders.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.plate_number || 'Motorcycle'}) • Phone: {r.phone}
                            </option>
                          ))
                        ) : (
                          <option value="">No verified active couriers found</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Dispatch Instructions / Reason
                      </label>
                      <input
                        type="text"
                        value={reassignReason}
                        onChange={(e) => setReassignReason(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Courier vehicle breakdown; transfer custody to relief rider"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleReassignCourier}
                      disabled={submittingAction || !selectedRiderId}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submittingAction ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                      <span>Commit Courier Reassignment</span>
                    </button>
                  </div>
                )}

                {/* Subform 3: Authorize RTS */}
                {activeActionTab === 'rts' && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
                    <div className="text-xs font-bold text-rose-900">
                      Authorize Return to Sender (Reverse Logistics)
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Authorizing Return-to-Sender flags the parcel for reverse dispatch back to origin sender or intake hub.
                    </p>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Official Return Reason
                      </label>
                      <textarea
                        rows={2}
                        value={rtsReason}
                        onChange={(e) => setRtsReason(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                        placeholder="Detail customer authorization, unreachable recipient, or intake refusal..."
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAuthorizeRTS}
                      disabled={submittingAction}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submittingAction ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                      <span>Authorize Return to Sender</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsDossierOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
  );
}
