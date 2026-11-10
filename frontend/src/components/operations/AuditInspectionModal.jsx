import { MapPin, ShieldCheck, X, ExternalLink, Activity } from 'lucide-react';

export default function AuditInspectionModal({ formatDateTime, inspectModal, setInspectModal, onSelectShipment }) {
  if (!inspectModal || !inspectModal.open || !inspectModal.record) return null;

  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-slate-900 text-white">
                  {inspectModal.type === 'custody' ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Activity className="w-4 h-4 text-indigo-400" />
                  )}
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {inspectModal.type === 'custody'
                      ? 'Physical Custody Handover Certificate'
                      : 'Administrative Security Event Record'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Immutable event ID: <span className="font-mono text-slate-700">{inspectModal.record.id}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectModal({ open: false, record: null, type: null })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Highlight summary card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Timestamp</span>
                    <p className="font-semibold text-slate-900">{formatDateTime(inspectModal.record.created_at)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Cryptographic Seal</span>
                    <p className="font-mono text-[11px] font-semibold text-emerald-700">
                      {inspectModal.record.verification_hash || inspectModal.record.correlation_id || 'UNALTERED_CHAIN_SEAL'}
                    </p>
                  </div>
                </div>

                {inspectModal.type === 'custody' && inspectModal.record.tracking_code && (
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Associated Parcel</span>
                      <p className="font-mono font-bold text-blue-600 text-xs">{inspectModal.record.tracking_code}</p>
                    </div>
                    {onSelectShipment && (
                      <button
                        onClick={() => {
                          const code = inspectModal.record.tracking_code;
                          setInspectModal({ open: false, record: null, type: null });
                          onSelectShipment(code);
                        }}
                        className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-semibold hover:bg-blue-100 transition-all flex items-center gap-1"
                      >
                        <span>Open Shipment Dossier</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Coordinates & Location if available */}
              {inspectModal.record.lat && inspectModal.record.lng && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">GPS Handoff Location</span>
                      <p className="font-mono text-slate-800">
                        {inspectModal.record.lat}, {inspectModal.record.lng}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Geotagged
                  </span>
                </div>
              )}

              {/* Detailed JSON Payload */}
              <div>
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Full Audit Record Payload
                </span>
                <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                  {JSON.stringify(inspectModal.record, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setInspectModal({ open: false, record: null, type: null })}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
  );
}
