import React from 'react';
import { X, Truck, Check, AlertCircle } from 'lucide-react';
import BookingSuccess from './operations/BookingSuccess';
import BookingStep1 from './operations/BookingStep1';
import BookingStep2 from './operations/BookingStep2';
import BookingStep3 from './operations/BookingStep3';
import BookingStep4 from './operations/BookingStep4';
import useBookingModal from './operations/useBookingModal';

export default function BookingModal({
  isOpen,
  onClose,
  hubs = [],
  currentUser = null,
  prefilledSender = null,
  prefilledRecipient = null,
  onBookSuccess
}) {
  if (!isOpen) return null;
  const booking = useBookingModal({ isOpen, hubs, currentUser, prefilledSender, prefilledRecipient, onBookSuccess });
  const { step, bookedResult, error } = booking;

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-950/70 backdrop-blur-md overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-fadeIn">
        
        {/* Header Bar */}
        <div className="bg-[#062419] text-white p-5 sm:p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-white">Send a Parcel</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-300 border border-emerald-700/60">
                    Hotbox Express
                  </span>
                </div>
                <p className="text-xs text-emerald-200/80 mt-0.5">
                  Postcode Verified pickup & secure custody delivery network
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-emerald-200/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Progress Bar (Only visible while booking) */}
          {!bookedResult && (
            <div className="grid grid-cols-4 gap-2 mt-6 pt-5 border-t border-emerald-800/60 text-xs">
              {[
                { num: 1, label: 'Origin' },
                { num: 2, label: 'Destination' },
                { num: 3, label: 'Package' },
                { num: 4, label: 'Confirm' }
              ].map(s => {
                const isActive = step === s.num;
                const isPassed = step > s.num;
                return (
                  <div key={s.num} className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 transition ${
                      isPassed
                        ? 'bg-emerald-400 text-slate-950 font-bold'
                        : isActive
                        ? 'bg-white text-emerald-950 ring-2 ring-emerald-400 font-bold'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    }`}>
                      {isPassed ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.num}
                    </div>
                    <span className={`text-[11px] font-bold hidden sm:inline truncate ${
                      isActive ? 'text-white' : isPassed ? 'text-emerald-300' : 'text-emerald-600'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {bookedResult ? (
            <BookingSuccess booking={booking} onClose={onClose} />
          ) : (
            <div>
              {step === 1 && <BookingStep1 booking={booking} />}
              {step === 2 && <BookingStep2 booking={booking} />}
              {step === 3 && <BookingStep3 booking={booking} />}
              {step === 4 && <BookingStep4 booking={booking} />}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
