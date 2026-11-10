import { MapPin, RefreshCw, X, Store, Bike, Navigation } from 'lucide-react';

export default function PostcodeDossierModal({ isDossierOpen, catchmentData, loadingCatchment, selectedPostcode, setIsDossierOpen }) {
  if (!isDossierOpen || !selectedPostcode) return null;
  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white">
                      {selectedPostcode.canonical_postcode || selectedPostcode.postcode}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-700">
                      Verified Digital Address
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedPostcode.neighbourhood || selectedPostcode.district}, {selectedPostcode.lga}, {selectedPostcode.state}
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
              {loadingCatchment ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                  <p className="text-xs text-slate-500 font-semibold">Loading delivery coverage and partner hubs...</p>
                </div>
              ) : (
                <>
                  {/* Top Stats Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Legacy Postcode</div>
                      <div className="text-sm font-mono font-black text-slate-900 mt-1">
                        {selectedPostcode.legacy_code || 'N/A (NDAPS Direct)'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Pre-NDAPS 6-digit reference</div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Geopolitical Zone</div>
                      <div className="text-sm font-black text-slate-900 mt-1">{selectedPostcode.zone || 'North Central'}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{selectedPostcode.state}</div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Partner Hubs Nearby</div>
                      <div className="text-sm font-black text-purple-700 mt-1 flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-purple-600" />
                        <span>{catchmentData?.nearby_hubs?.length || 0} Hubs in Area</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Within 15km delivery range</div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Delivery Riders</div>
                      <div className="text-sm font-black text-blue-700 mt-1 flex items-center gap-1.5">
                        <Bike className="w-4 h-4 text-blue-600" />
                        <span>{catchmentData?.assigned_riders?.length || 0} Fleet Couriers</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Covering this delivery area</div>
                    </div>
                  </div>

                  {/* Address Structure Breakdown (State, LGA, District, Area, Building) */}
                  {catchmentData?.segments && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                      <div className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                        NDAPS Address Structure Breakdown
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                          <div className="text-[10px] font-bold text-slate-500">State</div>
                          <div className="text-lg font-mono font-black text-emerald-700 mt-0.5">{catchmentData.segments.state}</div>
                          <div className="text-[10px] text-slate-600 font-semibold mt-0.5">{selectedPostcode.state}</div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                          <div className="text-[10px] font-bold text-slate-500">LGA</div>
                          <div className="text-lg font-mono font-black text-emerald-700 mt-0.5">{catchmentData.segments.lga}</div>
                          <div className="text-[10px] text-slate-600 font-semibold mt-0.5">{selectedPostcode.lga}</div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                          <div className="text-[10px] font-bold text-slate-500">District</div>
                          <div className="text-lg font-mono font-black text-emerald-700 mt-0.5">{catchmentData.segments.district}</div>
                          <div className="text-[10px] text-slate-600 font-semibold mt-0.5">{selectedPostcode.district || 'District'}</div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                          <div className="text-[10px] font-bold text-slate-500">Area</div>
                          <div className="text-lg font-mono font-black text-emerald-700 mt-0.5">{catchmentData.segments.area}</div>
                          <div className="text-[10px] text-slate-600 font-semibold mt-0.5">{selectedPostcode.neighbourhood || 'Urban Area'}</div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                          <div className="text-[10px] font-bold text-slate-500">Building</div>
                          <div className="text-lg font-mono font-black text-emerald-700 mt-0.5">{catchmentData.segments.unit}</div>
                          <div className="text-[10px] text-slate-600 font-semibold mt-0.5">Building Unit</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Nearby Hubs Table */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-purple-600" />
                      Nearby Partner Hubs & Collection Points ({catchmentData?.nearby_hubs?.length || 0})
                    </h3>
                    {catchmentData?.nearby_hubs?.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No partner hubs established within 15km of this area.</p>
                    ) : (
                      <div className="divide-y divide-slate-100 text-xs">
                        {catchmentData?.nearby_hubs?.map(hub => (
                          <div key={hub.id} className="py-2.5 flex items-center justify-between">
                            <div>
                              <div className="font-bold text-slate-800">{hub.business_name}</div>
                              <div className="text-[11px] text-slate-500">{hub.address_text}</div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                {hub.distance_km} km away
                              </span>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Load: {hub.current_load} / {hub.capacity} pkgs
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Assigned Fleet Couriers */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Bike className="w-3.5 h-3.5 text-blue-600" />
                      Verified Couriers & Riders Serving This Area ({catchmentData?.assigned_riders?.length || 0})
                    </h3>
                    {catchmentData?.assigned_riders?.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No delivery riders currently assigned to this area.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {catchmentData?.assigned_riders?.map(rider => (
                          <div key={rider.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                            <div>
                              <div className="font-bold text-slate-900">{rider.name}</div>
                              <div className="text-[10px] text-slate-500">Plate: {rider.plate_number} • {rider.vehicle_type}</div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ⭐ {rider.rating || '5.0'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsDossierOpen(false)}
                className="px-5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
  );
}
