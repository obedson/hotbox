import { Store, Warehouse, MapPin, Shield, CheckCircle2, RefreshCw, X, Star, Lock, Unlock, AlertCircle } from 'lucide-react';

export default function HubDossierModal({ handleToggleIntake, handleToggleStatus, hubDetails, loadingDetails, selectedHub, setIsDossierOpen, isDossierOpen, onSelectShipment }) {
  if (!isDossierOpen || !selectedHub) return null;

  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white">{selectedHub.business_name}</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-700">
                      Track C Accredited
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Operator: {selectedHub.owner_name} • CAC: {selectedHub.cac_number}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsDossierOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
              {loadingDetails ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                  <p className="text-xs text-slate-500 font-semibold">Loading storage bays and security logs...</p>
                </div>
              ) : (
                <>
                  {/* Top Stats Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">NDAPS Postcode</div>
                      <div className="text-xs font-mono font-black text-emerald-700 mt-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{selectedHub.postcode}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">{selectedHub.neighbourhood}, {selectedHub.state}</div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Capacity & Load</div>
                      <div className="text-base font-black text-slate-900 mt-1">
                        {selectedHub.current_load} / {selectedHub.capacity}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {selectedHub.utilization_pct}% utilized ({selectedHub.available_slots || 0} slots free)
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Intake Status</div>
                      <div className="text-xs font-bold mt-1 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${selectedHub.is_accepting_parcels ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className={selectedHub.is_accepting_parcels ? 'text-emerald-700' : 'text-amber-700'}>
                          {selectedHub.is_accepting_parcels ? 'Accepting Parcels' : 'Intake Suspended'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Hours: {selectedHub.opening_hours}</div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reputation & SLA</div>
                      <div className="text-base font-black text-slate-900 mt-1 flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span>{selectedHub.rating || '5.0'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">{selectedHub.total_ratings || 0} verified customer reviews</div>
                    </div>
                  </div>

                  {/* Storage Bays Visual Grid */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Warehouse className="w-4 h-4 text-emerald-600" />
                          Compartmentalized Storage Bays ({hubDetails?.bays?.length || 0} Total)
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Physical locker units and secure shelf compartments assigned to active shipments.
                        </p>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          Available
                        </span>
                        <span className="flex items-center gap-1.5 text-blue-700 font-semibold">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          Occupied
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {(hubDetails?.bays || []).map((bay) => (
                        <div
                          key={bay.id}
                          className={`p-3.5 rounded-2xl border text-center transition ${
                            bay.is_occupied
                              ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                              : 'bg-emerald-50/40 border-emerald-200 text-emerald-900 border-dashed'
                          }`}
                        >
                          <div className="text-xs font-black tracking-tight">{bay.bay_code}</div>
                          <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                            Tier: {bay.size_tier}
                          </div>

                          <div className="mt-2.5">
                            {bay.is_occupied ? (
                              <div className="space-y-1">
                                <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-black bg-blue-100 text-blue-800">
                                  OCCUPIED
                                </span>
                                {bay.tracking_code ? (
                                  <div
                                    onClick={() => onSelectShipment && onSelectShipment(bay.tracking_code)}
                                    className="text-[10px] font-mono text-blue-700 underline cursor-pointer truncate mt-1"
                                    title={bay.tracking_code}
                                  >
                                    {bay.tracking_code}
                                  </div>
                                ) : (
                                  <div className="text-[9px] text-slate-400 italic">Parcel In Custody</div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                VACANT
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Security Features & Track C Compliance */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Facility Amenities */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-emerald-600" />
                        Facility Amenities & Security Hardware
                      </h3>
                      <div className="space-y-2">
                        {(selectedHub.security_features || []).map((sec, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="font-semibold text-slate-700 capitalize">
                              {sec.replace(/_/g, ' ')}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                              <CheckCircle2 className="w-3 h-3" />
                              Hardware Verified
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Operational Details */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-blue-600" />
                        Dropzone Geographic & Contact Coordinates
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-500">Contact Telephone:</span>
                          <span className="font-bold text-slate-800">{selectedHub.phone}</span>
                        </div>
                        <div className="flex justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-500">Operational Email:</span>
                          <span className="font-bold text-slate-800">{selectedHub.email}</span>
                        </div>
                        <div className="flex justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-500">GPS Coordinates:</span>
                          <span className="font-mono text-slate-700">{selectedHub.lat}, {selectedHub.lng}</span>
                        </div>
                        <div className="flex justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-500">Assigned LGA:</span>
                          <span className="font-bold text-slate-800">{selectedHub.lga}, {selectedHub.state}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleIntake(selectedHub.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition border ${
                    selectedHub.is_accepting_parcels
                      ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  }`}
                >
                  {selectedHub.is_accepting_parcels ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      Pause Parcel Intake
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      Resume Parcel Intake
                    </>
                  )}
                </button>

                {selectedHub.status === 'accredited' ? (
                  <button
                    onClick={() => handleToggleStatus(selectedHub.id, 'suspended')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-300 hover:bg-rose-100 transition"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Suspend Hub Accreditation
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleStatus(selectedHub.id, 'accredited')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve Accreditation
                  </button>
                )}
              </div>

              <button
                onClick={() => setIsDossierOpen(false)}
                className="px-5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
  );
}
