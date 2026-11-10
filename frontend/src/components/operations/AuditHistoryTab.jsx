import { Check, Copy } from 'lucide-react';

export default function AuditHistoryTab({ auditHistory, copiedId, handleCopy }) {
  return (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-xs text-slate-900">
                Settings Change Log
              </h3>
              <p className="text-[11px] text-slate-500">
                Tamper-proof record of all adjustments made to rates, payouts, and storage rules.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 min-w-[150px]">Date & Time</th>
                  <th className="py-3 px-4 min-w-[140px]">Manager / Staff</th>
                  <th className="py-3 px-4 min-w-[150px]">Changed Setting</th>
                  <th className="py-3 px-4 min-w-[260px]">Reason for Change</th>
                  <th className="py-3 px-4 min-w-[130px]">Audit Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No settings modifications logged yet.
                    </td>
                  </tr>
                ) : (
                  auditHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {item.actor_name || 'Operations Admin'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {item.actor_email || 'admin@hotboxng.com'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                          {item.details?.setting_key || 'system_settings'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="italic text-slate-800">
                          "{item.details?.reason || 'Administrative adjustment'}"
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {item.correlation_id}
                          </span>
                          <button
                            onClick={() => handleCopy(item.correlation_id, item.id)}
                            className="text-slate-400 hover:text-slate-600"
                            title="Copy correlation ID"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
  );
}
