import { Shield, X } from 'lucide-react';

export default function ClaimModal({
  isOpen, newClaim, setNewClaim, selectedShipmentForAction,
  setSelectedShipmentForAction, shipments, setIsClaimModalOpen, handleSubmitClaim
}) {
  if (!isOpen) return null;

  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">File Insurance / Parcel Claim</h3>
                  <p className="text-[11px] text-slate-500">Submit a claim for damaged, lost, or delayed parcels</p>
                </div>
              </div>
              <button onClick={() => setIsClaimModalOpen(false)}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
            </div>
            <form onSubmit={handleSubmitClaim} className="space-y-3 text-xs">
              {shipments && shipments.length > 0 && (
                <div>
                  <label className="font-bold block mb-1">Related Shipment</label>
                  <select
                    value={selectedShipmentForAction?.id || shipments[0]?.id || ''}
                    onChange={e => setSelectedShipmentForAction(shipments.find(s => s.id === e.target.value))}
                    className="w-full border rounded-lg p-2 bg-white"
                  >
                    {shipments.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.tracking_code} (To: {s.recipient_name} • ₦{parseFloat(s.pricing_total_ngn || 0).toLocaleString('en-NG')})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="font-bold block mb-1">Claim Type</label>
                <select
                  value={newClaim.claimType}
                  onChange={e => setNewClaim({ ...newClaim, claimType: e.target.value })}
                  className="w-full border rounded-lg p-2 bg-white"
                >
                  <option value="DAMAGED_PARCEL">Damaged Parcel</option>
                  <option value="LOST_PARCEL">Lost Parcel</option>
                  <option value="DELAYED_DELIVERY">Delayed Delivery</option>
                  <option value="WRONG_HANDOVER">Wrong Handover</option>
                  <option value="EXCESS_HOLDING_FEE">Excess Holding Fee</option>
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Claim Amount (₦)</label>
                <input
                  type="number"
                  required
                  value={newClaim.claimAmountNgn}
                  onChange={e => setNewClaim({ ...newClaim, claimAmountNgn: parseFloat(e.target.value) || 0 })}
                  className="w-full border rounded-lg p-2"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Incident Description</label>
                <textarea
                  required
                  rows="3"
                  value={newClaim.description}
                  onChange={e => setNewClaim({ ...newClaim, description: e.target.value })}
                  placeholder="Describe damage, delay circumstances, or custody issue..."
                  className="w-full border rounded-lg p-2"
                />
              </div>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition shadow-xs">
                  Submit Claim for Support Review
                </button>
              </div>
            </form>
          </div>
        </div>
  );
}
