import { apiFetch } from '../lib/api';
import React, { useState } from 'react';
import { Search, Package, CheckCircle2, Clock, ShieldCheck, MapPin, QrCode, ArrowRight, UserCheck } from 'lucide-react';
import { STATUS_STYLES } from '../styles/designTokens';

export default function ShipmentTracker({ initialCode = 'HBX-FC01A0-8100' }) {
  const [trackingInput, setTrackingInput] = useState(initialCode);
  const [shipmentData, setShipmentData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleTrack = async (codeToSearch) => {
    const code = (codeToSearch || trackingInput).trim();
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/v1/shipments/track/${encodeURIComponent(code)}`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Tracking code not found.');
      }
      const data = await res.json();
      setShipmentData(data.shipment);
      setTimeline(data.timeline || []);
    } catch (err) {
      setError(err.message);
      setShipmentData(null);
      setTimeline([]);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { key: 'BOOKED', label: 'Booked' },
    { key: 'IN_TRANSIT_TO_HUB', label: 'In Transit' },
    { key: 'STORED_IN_BAY', label: 'At Hub (Ready)' },
    { key: 'COLLECTED_AT_HUB', label: 'Collected' }
  ];

  const getStepIndex = (status) => {
    switch (status) {
      case 'BOOKED':
      case 'RIDER_ASSIGNED':
        return 0;
      case 'PICKED_UP_FROM_SENDER':
      case 'IN_TRANSIT_TO_HUB':
        return 1;
      case 'RECEIVED_AT_HUB':
      case 'STORED_IN_BAY':
        return 2;
      case 'COLLECTED_AT_HUB':
      case 'DELIVERED_TO_RECIPIENT':
        return 3;
      default:
        return 1;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            Live Shipment Tracker & Chain-of-Custody
          </h2>
          <p className="text-xs text-slate-500">
            Real-time auditable tracking powered by Nigerian Digital Postcodes & OTP verification.
          </p>
        </div>

        {/* Quick seeds */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Quick Test:</span>
          <button
            onClick={() => { setTrackingInput('HBX-FC01A0-8100'); handleTrack('HBX-FC01A0-8100'); }}
            className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold transition"
          >
            HBX-FC01A0-8100
          </button>
          <button
            onClick={() => { setTrackingInput('HBX-900241-4295'); handleTrack('HBX-900241-4295'); }}
            className="px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold transition"
          >
            HBX-900241-4295
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <form
        onSubmit={e => { e.preventDefault(); handleTrack(); }}
        className="mt-6 flex items-center gap-3"
      >
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={trackingInput}
            onChange={e => setTrackingInput(e.target.value)}
            placeholder="Enter tracking code (e.g. HBX-FC01A0-8100)..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono tracking-wider uppercase font-semibold text-slate-800"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
        >
          {loading ? 'Tracking...' : 'Track Parcel'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Shipment Details & Timeline */}
      {shipmentData && (
        <div className="mt-8 space-y-6">
          {/* Status Header */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-black text-slate-900 tracking-wider">
                  {shipmentData.tracking_code}
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[shipmentData.status]?.bg || 'bg-slate-100'} ${STATUS_STYLES[shipmentData.status]?.text || 'text-slate-800'} ${STATUS_STYLES[shipmentData.status]?.border || 'border-slate-200'}`}>
                  {STATUS_STYLES[shipmentData.status]?.label || shipmentData.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Service: <strong className="text-slate-700">{shipmentData.service_type.replace(/_/g, ' ')}</strong> | Package: <strong className="text-slate-700">{shipmentData.package_description || 'Standard Parcel'} ({shipmentData.size})</strong>
              </p>
            </div>

            {/* Recipient Collection Pass Widget */}
            <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-lg flex items-center justify-center font-mono font-bold text-xs shadow-inner">
                <QrCode className="w-7 h-7" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Recipient Collection OTP</div>
                <div className="font-mono text-xl font-black text-slate-900 tracking-widest">
                  {shipmentData.delivery_otp}
                </div>
                <div className="text-[10px] text-slate-400">Present to Hub host for release</div>
              </div>
            </div>
          </div>

          {/* Progress Stepper */}
          <div className="py-4">
            <div className="grid grid-cols-4 gap-2 relative">
              {steps.map((st, i) => {
                const currentIndex = getStepIndex(shipmentData.status);
                const isComplete = i <= currentIndex;
                const isCurrent = i === currentIndex;
                return (
                  <div key={st.key} className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isComplete
                          ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-sm'
                          : 'bg-slate-200 text-slate-500'
                      }`}>
                        {isComplete ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                      </div>
                    </div>
                    <div className={`text-xs font-semibold ${isCurrent ? 'text-emerald-700 font-bold' : isComplete ? 'text-slate-800' : 'text-slate-400'}`}>
                      {st.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hub Location & Storage Bay Info */}
          {shipmentData.destination_hub_name && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Destination Hub Collection Point
                </div>
                <div className="text-sm font-bold text-slate-900">{shipmentData.destination_hub_name}</div>
                <div className="text-xs text-slate-600 mt-0.5">{shipmentData.destination_hub_address}</div>
                <div className="text-xs text-emerald-700 font-semibold mt-2">
                  Postcode: {shipmentData.destination_hub_postcode || shipmentData.recipient_postcode}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Storage Bay & Security
                </div>
                <div className="text-sm font-bold text-slate-900">
                  Assigned Bay: <span className="font-mono text-emerald-600 font-black">{shipmentData.bay_code || 'BAY-A02'}</span>
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Free Storage Holding: <strong>3 days</strong> (Expires in 2 days)
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  Verified with physical tamper-evident intake barcode.
                </div>
              </div>
            </div>
          )}

          {/* Immutable Custody Ledger Timeline */}
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">
              Auditable Chain-of-Custody Events
            </h3>
            <div className="space-y-3">
              {timeline.length === 0 ? (
                <div className="text-xs text-slate-400 p-4 rounded-xl border border-dashed border-slate-200 text-center">
                  Parcel created and awaiting initial rider pickup.
                </div>
              ) : (
                timeline.map((event, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          {event.handover_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{event.notes}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-medium">
                        <span>Proof: <strong className="text-slate-600">{event.verification_method}</strong></span>
                        <span>•</span>
                        <span>Actor Role: <strong className="text-slate-600 uppercase">{event.actor_role}</strong></span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
