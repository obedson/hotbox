import { Save, X, AlertTriangle, RefreshCw, Check } from 'lucide-react';

export default function SettingsConfirmModal({
  formSettings,
  currentTabSettingKey,
  adminReason,
  setAdminReason,
  setReasonError,
  reasonError,
  saving,
  onConfirm,
  onCancel
}) {
  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-slate-900 text-white">
                  <Save className="w-4 h-4 text-emerald-400" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Confirm Settings Update
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Section: <span className="font-semibold text-slate-800">{formSettings[currentTabSettingKey]?.description}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Privileged Manager Action</span>
                  <span>
                    Pursuant to platform operating regulations, all configuration modifications are permanently logged to the audit ledger.
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Reason for Change <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g., Updated fuel rate benchmark for courier deliveries..."
                  value={adminReason}
                  onChange={(e) => {
                    setAdminReason(e.target.value);
                    setReasonError('');
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                {reasonError && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{reasonError}</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-2">
              <button
                onClick={onCancel}
                disabled={saving}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={saving}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5 shadow-xs"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-300" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Authorize & Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
  );
}
