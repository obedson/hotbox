import { apiFetch } from '../lib/api';
import React, { useEffect, useState } from 'react';
import { QrCode, KeyRound, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

export default function CustodyScanner({ activeRole, hubs = [], onCustodySuccess }) {
  const [shipmentId, setShipmentId] = useState('');
  const [handoverType, setHandoverType] = useState(
    activeRole === 'rider' ? 'SENDER_TO_RIDER' : 'RIDER_TO_HUB'
  );
  const [verificationMethod, setVerificationMethod] = useState('OTP');
  const [verificationToken, setVerificationToken] = useState('');
  const [bayCode, setBayCode] = useState('BAY-A01');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [availableBays, setAvailableBays] = useState([]);

  // Bay codes differ per hub, so resolve the real shelves for the shipment
  // being handed over instead of offering a hard-coded list.
  useEffect(() => {
    const id = shipmentId.trim();
    if (id.length < 20) {
      setAvailableBays([]);
      return undefined;
    }
    let cancelled = false;
    apiFetch(`/api/v1/shipments/track/${encodeURIComponent(id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const bays = Array.isArray(data.availableBays) ? data.availableBays : [];
        setAvailableBays(bays);
        if (bays.length > 0) {
          const free = bays.find((bay) => !bay.is_occupied);
          setBayCode((free || bays[0]).bay_code);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [shipmentId]);

  const bayOptions = availableBays.length > 0
    ? availableBays
    : [
        { bay_code: 'BAY-01', size_tier: 'small', is_occupied: false },
        { bay_code: 'BAY-02', size_tier: 'medium', is_occupied: false },
        { bay_code: 'BAY-03', size_tier: 'large', is_occupied: false }
      ];

  // Guards against submitting a stale bay code if the shelves were reloaded
  // after the picker was rendered.
  const effectiveBayCode = () => {
    if (availableBays.length === 0) return bayCode;
    if (availableBays.some((bay) => bay.bay_code === bayCode)) return bayCode;
    const free = availableBays.find((bay) => !bay.is_occupied);
    return (free || availableBays[0]).bay_code;
  };

  const handoverOptions = [
    { id: 'SENDER_TO_RIDER', label: 'Sender ➔ Rider (Pickup)', method: 'OTP', desc: 'Rider verifies Sender Pickup OTP' },
    { id: 'RIDER_TO_HUB', label: 'Rider ➔ Hub Host (Intake)', method: 'QR_SCAN', desc: 'Hub host scans Parcel QR pass and assigns storage bay' },
    { id: 'RELOCATION_FORWARDING', label: 'Relocation Reroute (Forwarding)', method: 'POSTCODE', desc: 'Auto-forward parcel to verified new address with dual-party alert' },
    { id: 'HUB_TO_RECIPIENT', label: 'Hub Host ➔ Recipient (Collection)', method: 'OTP', desc: 'Host verifies Recipient Delivery OTP and releases bay' },
    { id: 'RIDER_TO_RECIPIENT', label: 'Rider ➔ Recipient (Door Delivery)', method: 'OTP', desc: 'Rider confirms recipient door delivery OTP' }
  ];

  const handleTransfer = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // Pick actor user based on active role
      const actorId = activeRole === 'rider'
        ? 'a0000000-0000-0000-0000-000000000006' // Musa Danladi (rider)
        : 'a0000000-0000-0000-0000-000000000001'; // Mallam Ibrahim (hub_owner)

      if (handoverType === 'RELOCATION_FORWARDING') {
        const res = await apiFetch(`/api/v1/shipments/${encodeURIComponent(shipmentId.trim())}/reroute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            newPostcode: verificationToken.trim() || 'FC-01-A03-FK-01',
            newAddressText: notes.trim() || 'Verified relocation destination address',
            reason: 'Address relocation forward verified at custody intake'
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Reroute forwarding failed');
        setResult({
          message: data.message,
          newStatus: data.shipment?.status || 'IN_TRANSIT_TO_HUB',
          ledgerEntry: { id: 'REROUTE-DISPATCH' },
          alertResult: data.alertResult
        });
        if (onCustodySuccess) onCustodySuccess(data);
        return;
      }

      const res = await apiFetch('/api/v1/custody/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shipmentId,
          handoverType,
          verificationMethod,
          verificationToken,
          bayCode: handoverType === 'RIDER_TO_HUB' ? effectiveBayCode() : null,
          notes: notes || `Verified custody handover for ${handoverType}`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Custody transfer failed');

      setResult(data);
      if (onCustodySuccess) onCustodySuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
          <QrCode className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Chain-of-Custody Verification Console</h2>
          <p className="text-xs text-slate-500">Atomic custody handovers with cryptographic proof & tamper-evident logging</p>
        </div>
      </div>

      <form onSubmit={handleTransfer} className="mt-5 space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        {result && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Custody Transfer Committed Successfully!
            </div>
            <div>New Shipment Status: <strong className="font-mono text-emerald-900">{result.newStatus}</strong></div>
            <div className="text-[11px] text-emerald-700">Ledger Entry ID: {result.ledgerEntry?.id}</div>
          </div>
        )}

        {/* Handover Type */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Handover Transition</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {handoverOptions.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setHandoverType(opt.id);
                  setVerificationMethod(opt.method);
                }}
                className={`p-3 rounded-xl border text-left transition ${
                  handoverType === opt.id
                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 font-bold ring-1 ring-indigo-600'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="font-bold text-xs">{opt.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Target Shipment UUID or Tracking */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Shipment UUID
            </label>
            <input
              type="text"
              value={shipmentId}
              onChange={e => setShipmentId(e.target.value)}
              placeholder="e.g. d0000000-0000-0000-0000-000000000001"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>

          {/* Verification Token (OTP or QR Token or Postcode) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {handoverType === 'RELOCATION_FORWARDING'
                ? 'New Verified Destination Postcode'
                : (verificationMethod === 'OTP' ? 'Verification OTP (6-digits)' : 'QR Code Token / Barcode')}
            </label>
            <input
              type="text"
              value={verificationToken}
              onChange={e => setVerificationToken(e.target.value)}
              placeholder={handoverType === 'RELOCATION_FORWARDING'
                ? 'e.g. FC-01-A03-FK-01 or 900241'
                : (verificationMethod === 'OTP' ? 'e.g. 419201 or 882194' : 'e.g. QR-TOKEN-HBX-FC01A0-8100')}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-wider focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Hub Storage Bay Assignment (if intake) */}
        {handoverType === 'RIDER_TO_HUB' && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Assign Hub Storage Shelf Bay
            </label>
            <select
              value={bayCode}
              onChange={e => setBayCode(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            >
              {bayOptions.map((bay) => (
                <option key={bay.bay_code} value={bay.bay_code} disabled={bay.is_occupied}>
                  {bay.bay_code} ({bay.size_tier}{bay.is_occupied ? ' — occupied' : ''})
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-4 h-4" />
          {loading ? 'Verifying & Executing Handover...' : 'Verify Token & Commit Custody Transfer'}
        </button>
      </form>
    </div>
  );
}
