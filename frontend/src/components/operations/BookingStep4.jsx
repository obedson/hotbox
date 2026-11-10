import { ArrowLeft, RefreshCw, Check } from 'lucide-react';
export default function BookingStep4({ booking }) {
  const {
    handleBooking, loading, priceMap, selectedHubObj, senderAddress, senderName, senderPostcode, serviceType, setStep, size
  } = booking;

  return (
                <div className="space-y-5 animate-fadeIn">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">4. Review & Confirm Booking</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Verify route corridor and delivery charge before dispatch.</p>
                  </div>

                  {/* Corridor Summary Card */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                      <span className="font-bold text-slate-700">Dispatch Corridor</span>
                      <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {serviceType === 'DOOR_TO_HUB' ? 'Doorstep Pickup' : 'Hub Drop-Off'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Origin</span>
                        <p className="font-bold text-slate-900">{senderName}</p>
                        <p className="text-slate-600 text-[11px] truncate">{senderAddress}</p>
                        <span className="font-mono text-[10px] font-bold text-emerald-700">{senderPostcode}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Destination Hub</span>
                        <p className="font-bold text-slate-900">{selectedHubObj?.business_name}</p>
                        <p className="text-slate-600 text-[11px] truncate">{selectedHubObj?.address_text}</p>
                        <span className="font-mono text-[10px] font-bold text-emerald-700">{selectedHubObj?.postcode}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price Calculation */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Delivery Fee ({size.toUpperCase()} package):</span>
                      <span className="font-bold text-slate-900">₦{priceMap[size].toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Hotbox Cargo Protection:</span>
                      <span className="font-bold text-emerald-700">₦0.00 (Free)</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Dual-Party In-App/Email Alerts:</span>
                      <span className="font-bold text-emerald-700">₦0.00 (Free)</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">Total Delivery Amount:</span>
                      <span className="text-lg font-black text-emerald-800">
                        ₦{priceMap[size].toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleBooking}
                      className="px-6 py-2.5 bg-[#062419] hover:bg-[#0b3827] disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Confirming Dispatch...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirm & Book Dispatch</span>
                          <Check className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
  );
}
