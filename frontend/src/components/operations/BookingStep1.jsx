import { ShieldCheck, MapPin, ArrowRight, RefreshCw, Store, ExternalLink, Truck, Phone, User, AlertCircle } from 'lucide-react';
export default function BookingStep1({ booking }) {
  const {
    canProceedStep1, handleSenderPostcodeChange, isResolvingSender, resolveSenderCode, senderAddress, senderName, senderNoPostcodeWarning, senderPhone, senderPostcode, serviceType, setSenderAddress, setSenderName, setSenderNoPostcodeWarning, setSenderPhone, setServiceType, setStep
  } = booking;

  return (
                <div className="space-y-5 animate-fadeIn">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">1. Service Type & Origin (Sender)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Where is the courier picking up this parcel?</p>
                  </div>

                  {/* Service Tier Switcher */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setServiceType('DOOR_TO_HUB')}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer relative ${
                        serviceType === 'DOOR_TO_HUB'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/30 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-emerald-600" />
                          <span>Door-to-Hub Express</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                        A dispatch courier comes directly to your doorway to verify and collect the parcel.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setServiceType('HUB_TO_HUB')}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer relative ${
                        serviceType === 'HUB_TO_HUB'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/30 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                          <Store className="w-4 h-4 text-emerald-600" />
                          <span>Hub-to-Hub Drop-Off</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          Drop at Shop / Hub / Post office
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                        Drop off the parcel at your nearest community hub station at your convenience.
                      </p>
                    </button>
                  </div>

                  {/* Sender Contact Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Sender Full Name</label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={senderName}
                          onChange={e => setSenderName(e.target.value)}
                          placeholder="Enter sender full name"
                          className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Sender Phone Number</label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="tel"
                          required
                          value={senderPhone}
                          onChange={e => setSenderPhone(e.target.value)}
                          placeholder="Enter sender phone number"
                          className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sender Postcode & Address */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Sender Digital Postcode</span>
                      </label>
                      <a
                        href="https://postcode.gov.ng/find"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center gap-1 underline"
                      >
                        <span>No postcode? Get your postcode from NIPOST</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        required
                        maxLength={15}
                        value={senderPostcode}
                        onChange={e => handleSenderPostcodeChange(e.target.value)}
                        onBlur={() => {
                          if (senderPostcode && !senderAddress) {
                            resolveSenderCode(senderPostcode, true);
                          }
                        }}
                        placeholder="e.g. FC-01-A03-FK-01"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 uppercase tracking-wider"
                      />
                      {isResolvingSender && (
                        <div className="absolute right-3 top-2.5 flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Resolving...</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-xs text-slate-700">
                          Pickup Address (Auto-Populated from hotbox verified postcode)
                        </label>
                        {senderAddress && !senderNoPostcodeWarning && (
                          <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Verified Postcode Address</span>
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        value={senderAddress}
                        onChange={e => {
                          setSenderAddress(e.target.value);
                          setSenderNoPostcodeWarning(null);
                        }}
                        onBlur={() => {
                          if (senderAddress && !senderPostcode) {
                            resolveSenderCode(senderAddress, true);
                          }
                        }}
                        placeholder={isResolvingSender ? "Resolving address from NDAPS..." : "Enter pickup address or verify postcode above"}
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 ${
                          senderNoPostcodeWarning ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'
                        }`}
                      />
                      {senderNoPostcodeWarning && (
                        <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] flex items-start gap-2 animate-fadeIn">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-semibold">{senderNoPostcodeWarning}</p>
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

                  <div className="flex justify-end pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={!canProceedStep1}
                      onClick={() => setStep(2)}
                      className="px-6 py-2.5 bg-[#062419] hover:bg-[#0b3827] disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <span>Continue to Destination</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
  );
}
