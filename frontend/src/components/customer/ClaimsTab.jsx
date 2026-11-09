import { LifeBuoy, Pencil, Shield, X } from 'lucide-react';

export default function ClaimsTab({
  claims, tickets, setIsClaimModalOpen, setIsTicketModalOpen,
  handleCancelClaim, handleOpenEditClaim
}) {
  return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Insurance Claims & Support Tickets</h2>
              <p className="text-xs text-slate-500">File damage or loss claims and track resolution status.</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsClaimModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
              >
                + File Claim
              </button>
              <button
                onClick={() => setIsTicketModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#062419] hover:bg-[#0a3323] text-white text-xs font-bold transition"
              >
                + New Support Ticket
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Claims Column */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Active Claims ({claims.length})</h3>
                <span className="text-[10px] text-slate-400">Resolution SLA: 24-48h</span>
              </div>

              {claims.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-1">
                  <Shield className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <div className="text-xs font-bold text-slate-700">No active claims submitted</div>
                  <p className="text-[11px] text-slate-400">File a claim if your parcel was delayed, damaged, or lost.</p>
                </div>
              ) : (
                claims.map(c => {
                  const isSubmitted = c.status === 'SUBMITTED';
                  const isCancelled = c.status === 'CANCELLED';
                  const isApproved = c.status === 'APPROVED' || c.status === 'SETTLED';
                  const isRejected = c.status === 'REJECTED';

                  return (
                    <div key={c.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{c.claim_type.replace(/_/g, ' ')}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isApproved ? 'bg-emerald-100 text-emerald-800' :
                          isSubmitted ? 'bg-amber-100 text-amber-800' :
                          isCancelled ? 'bg-slate-200 text-slate-700' :
                          isRejected ? 'bg-rose-100 text-rose-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {c.status}
                        </span>
                      </div>

                      <p className="text-slate-600 leading-relaxed">{c.description}</p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/70">
                        <div>
                          <div className="text-[11px] font-mono font-bold text-slate-900">
                            Claim: ₦{parseFloat(c.claim_amount_ngn || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                          </div>
                          {c.tracking_code && (
                            <div className="text-[10px] text-slate-400 font-mono">Shipment: {c.tracking_code}</div>
                          )}
                        </div>

                        {/* Update or Cancel Provision (for SUBMITTED claims) */}
                        {isSubmitted && (
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditClaim(c)}
                              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center space-x-1 transition shadow-2xs"
                              title="Update claim description or amount"
                            >
                              <Pencil className="w-3 h-3 text-slate-600" />
                              <span>Update</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelClaim(c.id)}
                              className="px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center space-x-1 transition shadow-2xs"
                              title="Cancel this claim submission"
                            >
                              <X className="w-3 h-3 text-rose-600" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Support Tickets Column */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Support Tickets ({tickets.length})</h3>
                <span className="text-[10px] text-slate-400">Response SLA: 2-4h</span>
              </div>

              {tickets.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-1">
                  <LifeBuoy className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <div className="text-xs font-bold text-slate-700">No open support tickets</div>
                  <p className="text-[11px] text-slate-400">Click '+ New Support Ticket' above if you need help with your deliveries.</p>
                </div>
              ) : (
                tickets.map(t => (
                  <div key={t.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{t.subject}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        t.status === 'RESOLVED' || t.status === 'CLOSED' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{t.message}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1.5 border-t border-slate-200/70">
                      <span>Category: {t.category ? t.category.replace(/_/g, ' ') : 'General Enquiry'}</span>
                      <span className="font-bold uppercase text-slate-500">{t.priority || 'MEDIUM'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
  );
}
