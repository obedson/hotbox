import { useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import { apiFetch } from '../../lib/api';

export default function ShipmentsTab({
  shipments, setIsBookingOpen, setIsClaimModalOpen,
  setSelectedShipmentForAction, handleCancelShipment, handleRequestReturn
}) {
  const [pickupOtpById, setPickupOtpById] = useState({});
  const [resendingId, setResendingId] = useState(null);
  const [resendError, setResendError] = useState('');

  const handleResendPickupOtp = async (shipment) => {
    setResendingId(shipment.id);
    setResendError('');
    try {
      const res = await apiFetch(`/api/v1/shipments/${shipment.id}/resend-pickup-otp`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend the pickup OTP.');
      setPickupOtpById((prev) => ({ ...prev, [shipment.id]: data.pickupOtp }));
    } catch (err) {
      setResendError(err.message);
    } finally {
      setResendingId(null);
    }
  };

  return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">My Eligible Shipments</h2>
              <p className="text-xs text-slate-500">Manage dispatch, track live statuses, or request cancellations & returns.</p>
            </div>
            <button
              onClick={() => setIsBookingOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Book New Parcel</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {shipments.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                No active or historical shipments found. Click "Book New Parcel" to create one.
              </div>
            ) : (
              shipments.map((s) => (
                <div key={s.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-sm font-bold text-slate-900">{s.tracking_code}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                        {s.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-700">
                      Fee: ₦{parseFloat(s.pricing_total_ngn).toLocaleString('en-NG')} (Paid via Wallet)
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Sender Origin</span>
                      <div className="font-semibold text-slate-800">{s.sender_name}</div>
                      <div className="text-slate-500">{s.sender_address_text} ({s.sender_postcode})</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Destination</span>
                      <div className="font-semibold text-slate-800">{s.recipient_name}</div>
                      <div className="text-slate-500">{s.destination_hub_name || s.recipient_address_text} ({s.recipient_postcode})</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Collection Authorization</span>
                      <div className="font-mono text-emerald-700 font-bold">QR Pass: {s.collection_qr_token}</div>
                      <div className="text-slate-500">Delivery OTP: <strong>{s.delivery_otp}</strong></div>
                      {pickupOtpById[s.id] && (
                        <div className="text-slate-500">
                          Pickup OTP: <strong className="font-mono text-emerald-700">{pickupOtpById[s.id]}</strong>
                          <span className="text-slate-400"> (10-min, one-time)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {resendError && (
                    <div className="pt-2 text-right text-[11px] font-semibold text-rose-600">{resendError}</div>
                  )}

                  {/* Action Buttons: Cancel, Return, Dispute */}
                  <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100">
                    {['BOOKED', 'RIDER_ASSIGNED'].includes(s.status) && (
                      <button
                        onClick={() => handleResendPickupOtp(s)}
                        disabled={resendingId === s.id}
                        className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition disabled:opacity-60"
                      >
                        {resendingId === s.id ? 'Sending…' : 'Resend Pickup OTP'}
                      </button>
                    )}

                    {s.status === 'BOOKED' && (
                      <button
                        onClick={() => handleCancelShipment(s.id)}
                        className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition"
                      >
                        Cancel Shipment & Refund
                      </button>
                    )}

                    {['STORED_IN_BAY', 'RECEIVED_AT_HUB'].includes(s.status) && (
                      <button
                        onClick={() => handleRequestReturn(s.id)}
                        className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold transition"
                      >
                        Request Return to Origin
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedShipmentForAction(s);
                        setIsClaimModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                    >
                      File Insurance / Damage Claim
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
  );
}
