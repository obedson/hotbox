import { ShieldCheck, MapPin, ArrowRight, ArrowLeft, RefreshCw, Store, ExternalLink, Phone, Mail, User, AlertCircle } from 'lucide-react';
const RECIPIENT_COMMON_AREAS = [
  { label: 'Wuse 2, Abuja (FCT)', postcode: 'FC-01-A03-FK-01', address: 'Plot 112 Aminu Kano Crescent, Wuse 2, Abuja', lat: 9.0765, lng: 7.4985 },
  { label: 'Jabi District, Abuja (FCT)', postcode: 'FC-01-A02-FK-02', address: 'Suite B12, Jabi Lake Mall, Jabi, Abuja', lat: 9.0820, lng: 7.4410 },
  { label: 'Garki Area 1, Abuja (FCT)', postcode: 'FC-01-A01-FK-03', address: 'Block 3, Area 1 Shopping Complex, Garki, Abuja', lat: 9.0650, lng: 7.4820 },
  { label: 'Central Business District, Abuja (FCT)', postcode: 'FC-01-A04-FK-04', address: 'Churchgate Towers, Central Business District, Abuja', lat: 9.0579, lng: 7.4951 },
  { label: 'Maitama District, Abuja (FCT)', postcode: 'FC-01-A05-FK-05', address: '5 Amazon Street, Maitama, Abuja', lat: 9.0882, lng: 7.4934 },
  { label: 'Victoria Island, Lagos', postcode: 'LA-01-A01-AA-01', address: 'Adeola Odeku Street, Victoria Island, Lagos', lat: 6.4541, lng: 3.4247 },
  { label: 'Ikeja / Allen Ave, Lagos', postcode: 'LA-02-A02-BB-02', address: 'Allen Avenue, Ikeja, Lagos', lat: 6.5244, lng: 3.3792 },
  { label: 'Lekki Phase 1, Lagos', postcode: 'LA-01-A03-CC-03', address: 'Admiralty Way, Lekki Phase 1, Lagos', lat: 6.4474, lng: 3.4731 },
  { label: 'Old GRA, Port Harcourt', postcode: 'RV-01-A01-DD-01', address: 'Forces Avenue, Old GRA, Port Harcourt', lat: 4.8156, lng: 7.0128 },
  { label: 'Nassarawa GRA, Kano', postcode: 'KN-01-A01-EE-01', address: 'Bompai Road, Nassarawa GRA, Kano', lat: 12.0022, lng: 8.5920 },
  { label: 'Bodija Estate, Ibadan', postcode: 'OY-01-A01-FF-01', address: 'Bodija Estate, Ibadan North, Oyo', lat: 7.4246, lng: 3.9056 }
];

export default function BookingStep2({ booking }) {
  const {
    availableHubs, canProceedStep2, destinationHubId, handleRecipientPostcodeChange, handleSelectRecipientArea, isResolvingRecipient, recipientAddress, recipientEmail, recipientName, recipientNoPostcodeMode, recipientNoPostcodeWarning, recipientPhone, recipientPostcode, resolveRecipientCode, setDestinationHubId, setRecipientAddress, setRecipientEmail, setRecipientName, setRecipientNoPostcodeMode, setRecipientNoPostcodeWarning, setRecipientPhone, setStep
  } = booking;

  return (
                <div className="space-y-5 animate-fadeIn">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">2. Recipient & Destination Hub</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Who is receiving this parcel, and which hub will store it?</p>
                  </div>

                  {/* Recipient Contact Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Recipient Name</label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={recipientName}
                          onChange={e => setRecipientName(e.target.value)}
                          placeholder="Enter recipient full name"
                          className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Recipient Phone</label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="tel"
                          required
                          value={recipientPhone}
                          onChange={e => setRecipientPhone(e.target.value)}
                          placeholder="Enter recipient phone number"
                          className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Recipient Email (Optional)</label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="email"
                          value={recipientEmail}
                          onChange={e => setRecipientEmail(e.target.value)}
                          placeholder="ngozi@eze.ng"
                          className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Recipient Postcode vs Quick Area */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Recipient Digital Postcode</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setRecipientNoPostcodeMode(!recipientNoPostcodeMode)}
                        className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                      >
                        {recipientNoPostcodeMode ? 'Enter Digital Postcode' : 'Recipient has no postcode? Pick area'}
                      </button>
                    </div>

                    {recipientNoPostcodeMode ? (
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <p className="text-[11px] text-slate-600 font-medium">Select recipient's city or neighborhood:</p>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                          {RECIPIENT_COMMON_AREAS.map((area) => (
                            <button
                              key={area.postcode}
                              type="button"
                              onClick={() => handleSelectRecipientArea(area)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                                recipientPostcode === area.postcode
                                  ? 'bg-emerald-700 text-white border-emerald-700'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {area.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          required
                          maxLength={15}
                          value={recipientPostcode}
                          onChange={e => handleRecipientPostcodeChange(e.target.value)}
                          onBlur={() => {
                            if (recipientPostcode && !recipientAddress) {
                              resolveRecipientCode(recipientPostcode, true);
                            }
                          }}
                          placeholder="e.g. FC-01-A02-FK-02"
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 uppercase tracking-wider"
                        />
                        {isResolvingRecipient && (
                          <div className="absolute right-3 top-2.5 flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Auto-ranking hubs...</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-xs text-slate-700">
                          Recipient Destination Address
                        </label>
                        {recipientAddress && !recipientNoPostcodeWarning && (
                          <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Verified Postcode Address</span>
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        value={recipientAddress}
                        onChange={e => {
                          setRecipientAddress(e.target.value);
                          setRecipientNoPostcodeWarning(null);
                        }}
                        onBlur={() => {
                          if (recipientAddress && !recipientPostcode) {
                            resolveRecipientCode(recipientAddress, true);
                          }
                        }}
                        placeholder={isResolvingRecipient ? "Resolving address from NDAPS..." : "Enter delivery address or select area above"}
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 ${
                          recipientNoPostcodeWarning ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'
                        }`}
                      />
                      {recipientNoPostcodeWarning && (
                        <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] flex items-start gap-2 animate-fadeIn">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-semibold">{recipientNoPostcodeWarning}</p>
                            <a
                              href="https://postcode.gov.ng/find"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:text-emerald-900 underline mt-1 text-[10px]"
                            >
                              <span>Request or verify postcode on official NIPOST portal</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Destination Collection Hub */}
                  <div>
                    <label className="font-bold text-xs text-slate-700 block mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Recipient Collection Hub (Ranked by Proximity)</span>
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">Closest Hub Auto-Selected</span>
                    </label>
                    <select
                      value={destinationHubId}
                      onChange={e => setDestinationHubId(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      required
                    >
                      {availableHubs.map(h => {
                        const distStr = h.distanceKm !== undefined ? ` • ${h.distanceKm} km away` : '';
                        return (
                          <option key={h.id} value={h.id}>
                            {h.business_name} ({h.neighbourhood || h.postcode}){distStr} — ⭐ {h.rating} ({h.capacity - h.current_load} bays free)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      disabled={!canProceedStep2}
                      onClick={() => setStep(3)}
                      className="px-6 py-2.5 bg-[#062419] hover:bg-[#0b3827] disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <span>Continue to Package</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
  );
}
