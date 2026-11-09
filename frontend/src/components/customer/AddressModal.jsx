import { RefreshCw, Save, X } from 'lucide-react';

export default function AddressModal({
  isOpen, newAddress, setNewAddress, isResolvingAddressPostcode,
  handleAddressPostcodeChange, handleAddAddress, setIsAddAddressOpen
}) {
  if (!isOpen) return null;

  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">Save New Address</h3>
              <button onClick={() => setIsAddAddressOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddAddress} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={newAddress.streetAddress}
                  onChange={e => setNewAddress({ ...newAddress, streetAddress: e.target.value })}
                  placeholder="e.g. Plot 112 Aminu Kano Crescent"
                  className="w-full border rounded-lg p-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold block">NIPOST Postcode</label>
                    {isResolvingAddressPostcode && (
                      <RefreshCw className="w-3 h-3 text-emerald-600 animate-spin" />
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={newAddress.postcode}
                    onChange={e => handleAddressPostcodeChange(e.target.value)}
                    placeholder="e.g. FC-01-A03-FK-01"
                    className="w-full border rounded-lg p-2 font-mono uppercase"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold block">Neighborhood / Area</label>
                    <span className="text-[10px] text-emerald-600 font-semibold">Auto-detected</span>
                  </div>
                  <input
                    type="text"
                    value={newAddress.areaNeighbourhood}
                    onChange={e => setNewAddress({ ...newAddress, areaNeighbourhood: e.target.value })}
                    placeholder="Auto-detected from postcode"
                    className="w-full border rounded-lg p-2 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>
              <button type="submit" className="w-full py-2 bg-emerald-600 text-white font-bold rounded-xl mt-2">
                Save Address
              </button>
            </form>
          </div>
        </div>
  );
}
