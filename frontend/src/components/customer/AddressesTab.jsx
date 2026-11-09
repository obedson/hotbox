import { Heart, Trash2 } from 'lucide-react';

export default function AddressesTab({
  savedAddresses, savedHubs, handleDeleteAddress, handleToggleSaveHub, setIsAddAddressOpen
}) {
  return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Saved Addresses Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Saved Addresses</h3>
                <p className="text-xs text-slate-500">Verified pickup & delivery locations</p>
              </div>
              <button
                onClick={() => setIsAddAddressOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
              >
                + Add Address
              </button>
            </div>

            <div className="space-y-3">
              {savedAddresses.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">No saved addresses yet.</div>
              ) : (
                savedAddresses.map((addr) => (
                  <div key={addr.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900">{addr.street_address}</span>
                        {addr.is_default && (
                          <span className="text-[9px] uppercase px-1.5 py-0.2 bg-emerald-100 text-emerald-800 font-bold rounded">Default</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Postcode: {addr.postcode} • {addr.area_neighbourhood}, {addr.state}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Preferred Neighborhood Hubs */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Preferred Neighborhood Hubs</h3>
            <p className="text-xs text-slate-500">Quick pickup points bookmarked for 1-click routing</p>

            <div className="space-y-3">
              {savedHubs.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  No preferred hubs saved. Tap the heart icon on any hub in the discovery map to bookmark it.
                </div>
              ) : (
                savedHubs.map((hub) => (
                  <div key={hub.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{hub.business_name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{hub.address_text}</div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-1">Postcode: {hub.postcode}</div>
                    </div>
                    <button
                      onClick={() => handleToggleSaveHub(hub)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Heart className="w-4 h-4 fill-rose-500" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
  );
}
