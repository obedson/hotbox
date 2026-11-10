import { InfoTooltip } from './SettingsUi';

export default function StorageFeesTab({ storageVal, updateField }) {
  return (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Storage Duration & Late Pickup Fees
              <InfoTooltip text="Rules on how long customers can leave packages at a hub before extra daily charges apply." />
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Keep neighborhood hub shelves moving by preventing uncollected packages from taking up space.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">
                Free Storage Window
                <InfoTooltip text="Days a parcel can stay at the hub for free after arrival notification." />
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={storageVal.free_storage_days || 3}
                  onChange={(e) => updateField('hub_storage_policy', 'free_storage_days', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
                <span className="text-xs font-semibold text-slate-500">Days</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                Standard holding window included at zero extra cost.
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">
                Daily Overdue Storage Fee
                <InfoTooltip text="Extra charge per day added to recipient bill if collected after free days." />
              </span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
                <input
                  type="number"
                  step="50"
                  min="0"
                  value={storageVal.daily_overdue_fee_ngn || 300}
                  onChange={(e) => updateField('hub_storage_policy', 'daily_overdue_fee_ngn', parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
              </div>
              <span className="text-[10px] text-slate-500 block">
                Charged to recipient upon late collection.
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">
                Return to Sender Deadline
                <InfoTooltip text="After this many days without collection, the package is sent back to the sender." />
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="3"
                  max="30"
                  value={storageVal.max_storage_days_before_rts || 7}
                  onChange={(e) => updateField('hub_storage_policy', 'max_storage_days_before_rts', parseInt(e.target.value) || 7)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
                <span className="text-xs font-semibold text-slate-500">Days</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                Parcels exceeding this threshold escalate to return queue.
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">
                SMS Warning Alert
                <InfoTooltip text="Hours before the free storage window ends when an automatic reminder SMS is sent." />
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="6"
                  max="48"
                  value={storageVal.reminder_window_hours || 24}
                  onChange={(e) => updateField('hub_storage_policy', 'reminder_window_hours', parseInt(e.target.value) || 24)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
                <span className="text-xs font-semibold text-slate-500">Hours</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                Automated SMS sent to recipient before fee starts.
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/30 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Auto-Return Uncollected Packages
              </span>
              <span className="text-[11px] text-slate-500">
                Automatically flags packages for return to the sender once they exceed the deadline.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={storageVal.auto_rts_enabled ?? true}
                onChange={(e) => updateField('hub_storage_policy', 'auto_rts_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>
  );
}
