import { ArrowRight, Copy, Check, Printer, CheckCircle2 } from 'lucide-react';
export default function BookingSuccess({ booking, onClose }) {
  const {
    bookedResult, copiedOtp, copiedTracking, handleCopy, recipientAddress, recipientName, recipientPostcode, selectedHubObj, senderName, senderPostcode
  } = booking;

  return (
            <div className="space-y-6 text-center animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Ready for Courier Pickup
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  Parcel Dispatch Booked Successfully!
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Registered in the Hotbox Postcode Verified Network. Give your 6-digit Pickup OTP to the dispatch rider when handing over your parcel.
                </p>
              </div>

              {/* Courier Waybill Receipt Frame */}
              <div id="printable-courier-waybill" className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 p-5 text-left space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Waybill Tracking Code</span>
                    <span className="font-mono font-black text-lg text-slate-900 tracking-wider">
                      {bookedResult.shipment?.tracking_code}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(bookedResult.shipment?.tracking_code, 'tracking')}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTracking ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Handover OTP Showcase */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                      Sender Pickup OTP (Give to Rider)
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-2xl font-black text-emerald-700 tracking-widest">
                        {bookedResult.pickupOtp}
                      </span>
                      <button
                        onClick={() => handleCopy(bookedResult.pickupOtp, 'otp')}
                        className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
                      >
                        {copiedOtp ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-[10px] text-emerald-600 leading-tight">
                      Confirms physical package handover from your doorway.
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-black uppercase text-blue-800 tracking-wider block">
                      Recipient Collection Hub
                    </span>
                    <p className="font-bold text-xs text-slate-900 truncate">
                      {selectedHubObj?.business_name || 'Accredited Hub Station'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {selectedHubObj?.address_text || recipientAddress}
                    </p>
                    <p className="text-[10px] text-blue-700 font-mono font-semibold">
                      Postcode: {selectedHubObj?.postcode || recipientPostcode}
                    </p>
                  </div>
                </div>

                {/* Route Corridor Info */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Origin (Sender)</span>
                    <p className="font-medium text-slate-900 truncate">{senderName} ({senderPostcode})</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Destination (Receiver)</span>
                    <p className="font-medium text-slate-900 truncate">{recipientName} ({recipientPostcode})</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  <span>Print Waybill Slip</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-[#062419] hover:bg-[#0b3827] text-white rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Return to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
  );
}
