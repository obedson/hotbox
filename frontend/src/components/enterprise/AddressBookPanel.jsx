import { Plus, Building2, Search, Filter, RefreshCw, X, Star, Trash2, MapPin, Phone, Mail, Check, Save } from 'lucide-react';

export default function AddressBookPanel({ addressBook, addressLoading, addressSearch, addressTypeFilter, fetchAddressBook, handleCreateAddress, handleDeleteAddress, handleSetDefaultAddress, isAddAddressOpen, newAddressForm, savingAddress, setAddressSearch, setAddressTypeFilter, setIsAddAddressOpen, setNewAddressForm }) {
  return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Enterprise Pre-Validated Address Book</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                  {addressBook.length} Saved Locations
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Approved branch nodes, retail outlets, and customer delivery points pre-validated with NDAPS postcodes
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddAddressOpen(!isAddAddressOpen)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                {isAddAddressOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{isAddAddressOpen ? 'Close Form' : 'Add Recipient / Branch'}</span>
              </button>
            </div>
          </div>

          {/* ADD PRE-VALIDATED ADDRESS FORM */}
          {isAddAddressOpen && (
            <form onSubmit={handleCreateAddress} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Register New Enterprise Delivery / Dispatch Node</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  NDAPS Verified
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contact / Facility Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kano Central Fulfillment Depot"
                    value={newAddressForm.contactName}
                    onChange={e => setNewAddressForm({ ...newAddressForm, contactName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+234 800 000 0000"
                    value={newAddressForm.contactPhone}
                    onChange={e => setNewAddressForm({ ...newAddressForm, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contact Email</label>
                  <input
                    type="email"
                    placeholder="operations@facility.ng"
                    value={newAddressForm.contactEmail}
                    onChange={e => setNewAddressForm({ ...newAddressForm, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Node Type *</label>
                  <select
                    value={newAddressForm.addressType}
                    onChange={e => setNewAddressForm({ ...newAddressForm, addressType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="business">Business / Commercial Retail</option>
                    <option value="hub">Hub Collection Node</option>
                    <option value="dispatch">Dispatch Sorting Warehouse</option>
                    <option value="delivery">Direct Delivery Point</option>
                    <option value="residential">Residential Customer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">NDAPS Digital Postcode *</label>
                  <input
                    type="text"
                    required
                    placeholder="FC-01-A03-FK-01"
                    value={newAddressForm.postcode}
                    onChange={e => setNewAddressForm({ ...newAddressForm, postcode: e.target.value })}
                    className="w-full px-3 py-2 font-mono uppercase font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Landmark / Proximity Note</label>
                  <input
                    type="text"
                    placeholder="Opposite Central Mosque, Next to NIPOST"
                    value={newAddressForm.landmark}
                    onChange={e => setNewAddressForm({ ...newAddressForm, landmark: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-slate-700 font-semibold mb-1">Full Street Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Plot 45 Commercial Boulevard, Central District, Abuja"
                  value={newAddressForm.streetAddress}
                  onChange={e => setNewAddressForm({ ...newAddressForm, streetAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAddressForm.isDefault}
                    onChange={e => setNewAddressForm({ ...newAddressForm, isDefault: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Set as Primary Fulfillment Origin</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddAddressOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAddress}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    {savingAddress ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{savingAddress ? 'Pre-Validating...' : 'Save to Address Book'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* SEARCH & FILTER CONTROLS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs overflow-x-auto pb-1 sm:pb-0">
              {[
                { key: 'ALL', label: 'All Types' },
                { key: 'hub', label: 'Hub Nodes' },
                { key: 'business', label: 'Commercial' },
                { key: 'dispatch', label: 'Dispatch Warehouses' },
                { key: 'delivery', label: 'Delivery Drops' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setAddressTypeFilter(tab.key);
                    fetchAddressBook(addressSearch, tab.key);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                    addressTypeFilter === tab.key
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by name, address, postcode..."
                value={addressSearch}
                onChange={e => {
                  setAddressSearch(e.target.value);
                  fetchAddressBook(e.target.value, addressTypeFilter);
                }}
                className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs w-64 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* ADDRESS BOOK LIST (DIRECT DATABASE FEED) */}
          <div className="divide-y divide-slate-100 text-xs">
            {addressLoading ? (
              <div className="py-8 text-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                Loading address book from PostgreSQL...
              </div>
            ) : addressBook.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                No pre-validated addresses found matching your search.
              </div>
            ) : (
              addressBook.map((addr) => (
                <div key={addr.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{addr.contact_name}</span>
                      {addr.is_default && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          Primary Origin
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded uppercase font-bold text-[9px] bg-slate-100 text-slate-600 border border-slate-200">
                        {addr.address_type}
                      </span>
                    </div>

                    <div className="text-slate-600 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{addr.street_address}</span>
                      {addr.landmark && (
                        <span className="text-slate-400 italic">({addr.landmark})</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px]">
                      <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {addr.postcode}
                      </span>
                      <span className="text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {addr.contact_phone}
                      </span>
                      {addr.contact_email && (
                        <span className="text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {addr.contact_email}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                      NDAPS Verified
                    </span>

                    {!addr.is_default && (
                      <button
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        title="Set as Primary Fulfillment Origin"
                        className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold transition"
                      >
                        Make Primary
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteAddress(addr.id, addr.contact_name)}
                      title="Remove Address"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
  );
}
