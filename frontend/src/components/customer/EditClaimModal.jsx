import { Pencil, Save, X } from 'lucide-react';

export default function EditClaimModal({
  isOpen, editingClaim, setEditingClaim, setIsEditClaimModalOpen, handleUpdateClaim
}) {
  if (!isOpen) return null;

  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Update Claim Submission</h3>
                  <p className="text-[11px] text-slate-500">Modify claim amount or description before review</p>
                </div>
              </div>
              <button onClick={() => setIsEditClaimModalOpen(false)}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
            </div>
            <form onSubmit={handleUpdateClaim} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Claim Type</label>
                <select
                  value={editingClaim.claimType}
                  onChange={e => setEditingClaim({ ...editingClaim, claimType: e.target.value })}
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
                  value={editingClaim.claimAmountNgn}
                  onChange={e => setEditingClaim({ ...editingClaim, claimAmountNgn: parseFloat(e.target.value) || 0 })}
                  className="w-full border rounded-lg p-2"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Incident Description</label>
                <textarea
                  required
                  rows="3"
                  value={editingClaim.description}
                  onChange={e => setEditingClaim({ ...editingClaim, description: e.target.value })}
                  placeholder="Describe damage, condition, or custody dispute..."
                  className="w-full border rounded-lg p-2"
                />
              </div>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditClaimModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-xs">
                  Save Claim Updates
                </button>
              </div>
            </form>
          </div>
        </div>
  );
}
