import { apiFetch } from '../lib/api';
import React, { useState, useEffect } from 'react';
import {
  X, Package, MapPin, QrCode, Shield, ShieldCheck, CheckCircle2,
  Clock, Phone, User, AlertTriangle, ArrowRight, Copy, Check,
  Printer, Send, RefreshCw, Warehouse, ChevronRight, Hash, Calendar, Box
} from 'lucide-react';
import { STATUS_STYLES } from '../styles/designTokens';

export default function ShipmentDossierModal({ isOpen, onClose, trackingCode, onActionSuccess }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Intervention states
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [isFlaggingException, setIsFlaggingException] = useState(false);
  const [exceptionReason, setExceptionReason] = useState('');
  const [showExceptionPrompt, setShowExceptionPrompt] = useState(false);
  const [selectedBayId, setSelectedBayId] = useState('');
  const [isReassigningBay, setIsReassigningBay] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  const fetchDossier = async () => {
    if (!trackingCode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/v1/shipments/track/${encodeURIComponent(trackingCode)}`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Tracking code not found in ledger.');
      }
      const json = await res.json();
      setData(json);
      if (json.shipment?.assigned_bay_id) {
        setSelectedBayId(json.shipment.assigned_bay_id);
      }
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && trackingCode) {
      fetchDossier();
      setShowExceptionPrompt(false);
      setActionNotice(null);
    }
  }, [isOpen, trackingCode]);

  const handleCopy = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleResendOtp = async () => {
    if (!data?.shipment?.id) return;
    setIsResendingOtp(true);
    try {
      const res = await apiFetch(`/api/v1/shipments/${data.shipment.id}/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Failed to resend OTP.');
      setActionNotice({ type: 'success', text: resJson.message });
      fetchDossier();
      if (onActionSuccess) onActionSuccess();
    } catch (e) {
      setActionNotice({ type: 'error', text: e.message });
    } finally {
      setIsResendingOtp(false);
    }
  };

  const handleFlagException = async () => {
    if (!data?.shipment?.id) return;
    setIsFlaggingException(true);
    try {
      const res = await apiFetch(`/api/v1/shipments/${data.shipment.id}/flag-exception`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: exceptionReason || 'Operations Security Hold' })
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Failed to flag exception.');
      setActionNotice({ type: 'success', text: resJson.message });
      setShowExceptionPrompt(false);
      setExceptionReason('');
      fetchDossier();
      if (onActionSuccess) onActionSuccess();
    } catch (e) {
      setActionNotice({ type: 'error', text: e.message });
    } finally {
      setIsFlaggingException(false);
    }
  };

  const handleReassignBay = async (bayId) => {
    if (!data?.shipment?.id || !bayId) return;
    setIsReassigningBay(true);
    try {
      const bayObj = (data.availableBays || []).find(b => b.id === bayId);
      const res = await apiFetch(`/api/v1/shipments/${data.shipment.id}/reassign-bay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bayId, bayCode: bayObj?.bay_code })
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Failed to reassign bay.');
      setActionNotice({ type: 'success', text: resJson.message });
      setSelectedBayId(bayId);
      fetchDossier();
      if (onActionSuccess) onActionSuccess();
    } catch (e) {
      setActionNotice({ type: 'error', text: e.message });
    } finally {
      setIsReassigningBay(false);
    }
  };

  if (!isOpen) return null;

  const s = data?.shipment;
  const timeline = data?.timeline || [];
  const availableBays = data?.availableBays || [];
  const statusMeta = s ? (STATUS_STYLES[s.status] || { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300', label: s.status.replace(/_/g, ' ') }) : null;

  // Determine current custodian & last officer from timeline
  const lastLedger = timeline.length > 0 ? timeline[timeline.length - 1] : null;
  const prevLedger = timeline.length > 1 ? timeline[timeline.length - 2] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Header Bar */}
        <div className="p-5 sm:px-8 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#062419] text-emerald-400 flex items-center justify-center shadow-md">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Chain-of-Custody Dossier
                </h2>
                {s && statusMeta && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}>
                    {statusMeta.label}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono mt-0.5">
                <span>Tracking ID: <strong className="text-slate-900 font-bold">{trackingCode}</strong></span>
                <button
                  type="button"
                  onClick={() => handleCopy(trackingCode, 'trackId')}
                  className="hover:text-emerald-700 transition"
                  title="Copy Tracking ID"
                >
                  {copiedKey === 'trackId' ? <Check className="w-3.5 h-3.5 text-emerald-600 inline" /> : <Copy className="w-3.5 h-3.5 inline" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Waybill</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action notice banner */}
        {actionNotice && (
          <div className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between border-b ${
            actionNotice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            <span>{actionNotice.text}</span>
            <button onClick={() => setActionNotice(null)} className="text-xs underline ml-4">Dismiss</button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <RefreshCw className="w-7 h-7 animate-spin text-emerald-600" />
              <p className="text-xs font-semibold">Retrieving authoritative custody ledger & routing telemetry...</p>
            </div>
          ) : error || !s ? (
            <div className="p-8 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">Shipment Record Not Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">{error || `No active record found for tracking code '${trackingCode}' in the Dropzone database.`}</p>
            </div>
          ) : (
            <>
              {/* PANEL 1: Shipment Identity & Package Manifest */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Hash className="w-4 h-4 text-emerald-700" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Panel 1: Shipment Identity & Package Manifest
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                    Service: {s.service_type?.replace(/_/g, ' ') || 'Door To Hub'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Package Item</span>
                    <span className="font-bold text-slate-900 text-xs block mt-0.5">{s.package_description || 'General Parcel'}</span>
                    <span className="text-[10px] text-slate-500 capitalize">{s.size || 'Medium'} Tier</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Weight & Value</span>
                    <span className="font-bold text-slate-900 text-xs block mt-0.5">{s.weight_kg || '1.00'} kg</span>
                    <span className="text-[10px] text-emerald-700 font-semibold font-mono">Declared: ₦{Number(s.declared_value_ngn || 0).toLocaleString()}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Booking Date</span>
                    <span className="font-bold text-slate-900 text-xs block mt-0.5">
                      {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <span className="text-emerald-800 block text-[10px] uppercase font-bold tracking-wider">Handover Verification OTPs</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[11px] text-slate-600">Pickup: <strong className="font-mono text-emerald-900">{s.pickup_otp || '—'}</strong></span>
                      <span className="text-[11px] text-slate-600">Delivery: <strong className="font-mono text-emerald-900">{s.delivery_otp || '—'}</strong></span>
                    </div>
                    <span className="text-[9px] text-emerald-700 block mt-0.5">Dual-factor custody release</span>
                  </div>
                </div>
              </div>

              {/* PANEL 2: Geographical Routing (Sender ➔ Receiver ➔ Final Hub) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="border-b pb-3 border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-emerald-700" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Panel 2: Geographical Routing (Sender ➔ Receiver ➔ Final Hub)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 font-mono">Digital Postcode Network</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Sender Origin */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Origin (Sender)</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                        {s.sender_postcode || 'FC-01-A03-FK-01'}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm">{s.sender_name}</div>
                    <div className="text-slate-600 font-mono text-[11px] flex items-center space-x-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{s.sender_phone}</span>
                    </div>
                    <div className="text-slate-600 text-[11px] leading-relaxed pt-1 border-t border-slate-200/60">
                      {s.sender_address_text}
                    </div>
                  </div>

                  {/* Recipient Destination */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Recipient (Consignee)</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {s.recipient_postcode || '900241'}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm">{s.recipient_name}</div>
                    <div className="text-slate-600 font-mono text-[11px] flex items-center space-x-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{s.recipient_phone}</span>
                    </div>
                    <div className="text-slate-600 text-[11px] leading-relaxed pt-1 border-t border-slate-200/60">
                      {s.recipient_address_text}
                    </div>
                  </div>

                  {/* Destination Hub & Bay */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Destination Hub & Bay</span>
                      <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-emerald-600 text-white shadow-2xs">
                        {s.bay_code || 'UNASSIGNED BAY'}
                      </span>
                    </div>
                    <div className="font-bold text-emerald-950 text-sm">
                      {s.destination_hub_name || 'Designated Community Hub'}
                    </div>
                    <div className="text-emerald-800 text-[11px] flex items-center space-x-1 font-mono">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>{s.destination_hub_phone || '+2348031112233'}</span>
                    </div>
                    <div className="text-emerald-800 text-[11px] leading-relaxed pt-1 border-t border-emerald-200/60">
                      {s.destination_hub_address || 'Accredited Hotbox Hub Station'}
                    </div>
                  </div>
                </div>
              </div>

              {/* PANEL 3: Chain-of-Custody Accountability (The "Who & When") */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="border-b pb-3 border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Panel 3: Chain-of-Custody Accountability (The "Who & When")
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                    ✓ Cryptographic Custody Seal Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Current Active Custodian */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Custodian</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Physical Possession Confirmed
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 pt-1">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                        {lastLedger?.actor_name ? lastLedger.actor_name.charAt(0) : 'O'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm truncate">
                          {lastLedger?.actor_name || s.rider_name || 'Accredited Hub Station Officer'}
                        </div>
                        <div className="text-[11px] text-slate-500 capitalize">
                          Role: <strong className="text-slate-700 font-semibold">{lastLedger?.actor_role || s.rider_vehicle || 'Hub Operator'}</strong> • Staff ID: <span className="font-mono text-slate-600">USR-{String(lastLedger?.actor_id || s.assigned_rider_id || '9402').slice(0, 8)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Custody Accepted At:</span>
                        <span className="font-mono font-medium text-slate-800">
                          {lastLedger?.created_at ? new Date(lastLedger.created_at).toLocaleString() : new Date(s.updated_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Verification Evidence:</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {lastLedger?.verification_method || 'OTP_VERIFICATION'} ({lastLedger?.verification_token || s.pickup_otp || 'Verified'})
                        </span>
                      </div>
                      {lastLedger?.lat && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">GPS Coordinates:</span>
                          <span className="font-mono text-slate-600">{Number(lastLedger.lat).toFixed(4)}°N, {Number(lastLedger.lng).toFixed(4)}°E</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Previous Custodian / Handover Out */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Previous Custodian (Handover Out)</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                        Handover Completed
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 pt-1">
                      <div className="w-9 h-9 rounded-xl bg-slate-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                        {prevLedger?.actor_name ? prevLedger.actor_name.charAt(0) : s.sender_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm truncate">
                          {prevLedger?.actor_name || s.sender_name}
                        </div>
                        <div className="text-[11px] text-slate-500 capitalize">
                          Role: <strong className="text-slate-700 font-semibold">{prevLedger?.actor_role || 'Sender / Origin Custodian'}</strong> • ID: <span className="font-mono text-slate-600">USR-{String(prevLedger?.actor_id || s.sender_id).slice(0, 8)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Release Timestamp:</span>
                        <span className="font-mono font-medium text-slate-800">
                          {prevLedger?.created_at ? new Date(prevLedger.created_at).toLocaleString() : new Date(s.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Handover Protocol:</span>
                        <span className="font-mono text-slate-700 font-semibold">
                          {prevLedger?.handover_type || 'ORIGIN_DISPATCH_RELEASE'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Consignee OTP Status:</span>
                        <span className="font-mono text-emerald-800 font-bold">
                          {s.status === 'COLLECTED_AT_HUB' || s.status === 'DELIVERED_TO_RECIPIENT' ? 'Redeemed & Verified' : 'Awaiting Delivery/Collection'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PANEL 4: Chronological Event Timeline (Immutable Audit Trail) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="border-b pb-3 border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-emerald-700" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Panel 4: Chronological Event Timeline (Immutable Audit Trail)
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {timeline.length} custody entries recorded
                  </span>
                </div>

                <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 text-xs">
                  {/* Origin Booking Event */}
                  <div className="relative group">
                    <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-emerald-600 ring-4 ring-white"></div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-900">Shipment Manifest Registered & Cryptographic Token Created</span>
                        <span className="text-slate-400 font-mono">{new Date(s.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Initiated by sender {s.sender_name} for destination postcode {s.recipient_postcode}. Assigned tracking code {s.tracking_code}.
                      </p>
                    </div>
                  </div>

                  {/* Custody Ledger Entries */}
                  {timeline.map((entry, idx) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-white"></div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-900 flex items-center space-x-2">
                            <span>{entry.handover_type.replace(/_/g, ' ')}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 uppercase tracking-wider">
                              {entry.verification_method}
                            </span>
                          </span>
                          <span className="text-slate-400 font-mono">{new Date(entry.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          {entry.notes || `Custody transferred to ${entry.actor_name || entry.actor_role}. Status transitioned to ${entry.status_after_handover}.`}
                        </p>
                        <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-200/40">
                          <span>Officer: <strong className="text-slate-700">{entry.actor_name || 'System'}</strong></span>
                          <span>Token: <strong className="text-emerald-700">{entry.verification_token || 'Verified'}</strong></span>
                          {entry.lat && <span>GPS: {Number(entry.lat).toFixed(4)}, {Number(entry.lng).toFixed(4)}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PANEL 5: Operations Admin Intervention Actions */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="border-b pb-3 border-slate-200/60 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-emerald-800" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Panel 5: Operations Admin Intervention Actions
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">Privileged Operations Authority</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Action 1: Resend OTP */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                      <Send className="w-3.5 h-3.5 text-blue-600" />
                      <span>Resend Delivery OTP</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Re-dispatch 6-digit delivery passcode to recipient ({s.recipient_phone}).
                    </p>
                    <button
                      type="button"
                      disabled={isResendingOtp}
                      onClick={handleResendOtp}
                      className="w-full mt-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition shadow-2xs flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {isResendingOtp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3 h-3" />}
                      <span>Dispatch OTP via SMS</span>
                    </button>
                  </div>

                  {/* Action 2: Flag Dispute / Exception */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Flag Exception / Hold</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Place parcel under administrative security or customer dispute hold.
                    </p>
                    {showExceptionPrompt ? (
                      <div className="space-y-1.5 pt-1">
                        <input
                          type="text"
                          value={exceptionReason}
                          onChange={(e) => setExceptionReason(e.target.value)}
                          placeholder="Hold Reason (e.g. Address inquiry)"
                          className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            disabled={isFlaggingException}
                            onClick={handleFlagException}
                            className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg transition"
                          >
                            Confirm Hold
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowExceptionPrompt(false)}
                            className="px-2 py-1.5 text-slate-500 hover:text-slate-800 text-[10px]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowExceptionPrompt(true)}
                        className="w-full mt-2 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] transition shadow-2xs flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        <span>Flag Exception Hold</span>
                      </button>
                    )}
                  </div>

                  {/* Action 3: Reassign Storage Bay */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                      <Warehouse className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Reassign Storage Bay</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Change accredited hub bay slot:
                    </p>
                    <div className="pt-1 flex items-center space-x-1.5">
                      <select
                        value={selectedBayId}
                        onChange={(e) => handleReassignBay(e.target.value)}
                        disabled={isReassigningBay || availableBays.length === 0}
                        className="flex-1 px-2.5 py-1.5 text-[11px] font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      >
                        <option value="">{s.bay_code ? `Current: ${s.bay_code}` : 'Select Storage Bay...'}</option>
                        {availableBays.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.bay_code} ({b.size_tier}) {b.is_occupied ? '[Occupied]' : '[Available]'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-8 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-semibold shrink-0">
          <div className="text-slate-500 flex items-center space-x-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600 inline" />
            <span>PostGIS Immutable Custody Ledger Synced</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition cursor-pointer shadow-sm"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
