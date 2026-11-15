import React, { useState } from 'react';
import {
  Search, MapPin, ShieldCheck, Phone, ArrowRight, AlertTriangle,
  User, Copy, RefreshCw
} from 'lucide-react';
import { apiFetch } from '../lib/api';

export default function RiderLookup({ showToast }) {
  const [code, setCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleLookup = async (e) => {
    if (e) e.preventDefault();
    const clean = code.trim();
    if (!clean) return;
    setIsSearching(true);
    setResult(null);
    try {
      const res = await apiFetch(`/api/v1/riders/lookup?code=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setHasSearched(true);
      } else if (showToast) {
        showToast(data.error || 'Lookup failed', 'error');
      }
    } catch (err) {
      if (showToast) showToast('Network error during lookup', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const copyAddress = (text) => {
    navigator.clipboard?.writeText(text);
    if (showToast) showToast('Delivery address copied to clipboard');
  };

  const residents = (result && result.residents) || [];
  const relocatedMatches = (result && result.relocatedMatches) || [];

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-900 text-xs flex items-start gap-2">
        <Search className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <span>
          <strong>Address Resolution:</strong> enter the postcode or digital P.O. Box number written on the mail to confirm the delivery address, or the active rerouting address if the resident has relocated.
        </span>
      </div>

      <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-2 max-w-2xl">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Postcode (FC-01-A03-FK-01) or Digital P.O. Box (HBX-0005)"
          className="w-full sm:flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:border-blue-600 focus:outline-none bg-white"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shrink-0 shadow-sm cursor-pointer"
        >
          {isSearching ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
          <span>Resolve Address</span>
        </button>
      </form>

      {hasSearched && result && (
        <div className="space-y-4 animate-fadeIn">
          {residents.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                Active Resident{residents.length > 1 ? 's' : ''} at {result.input}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {residents.map((resident, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{resident.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{resident.digitalBoxNumber}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${
                        resident.isGroundTruthVerified
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        <ShieldCheck className="w-3 h-3" />
                        {resident.isGroundTruthVerified ? 'Ground-Truth Verified' : 'Registry Verified'}
                      </span>
                    </div>

                    <div className="space-y-1 pt-3 border-t border-slate-100">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-blue-600" />
                        Delivery Address
                      </p>
                      <p className="text-xs font-bold text-slate-900">{resident.deliveryAddress.fullAddress}</p>
                      <p className="text-[11px] font-mono text-blue-700">{resident.deliveryAddress.postcode}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono">{resident.phone}</span>
                        </span>
                        <button
                          onClick={() => copyAddress(`${resident.name}, ${resident.deliveryAddress.fullAddress} (${resident.digitalBoxNumber})`)}
                          className="text-slate-400 hover:text-blue-600 transition cursor-pointer"
                          title="Copy delivery address"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">No active resident found</p>
                <p className="text-xs text-slate-500 mt-0.5">{result.reason}</p>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  Searched: {result.input} ({result.inputType === 'DIGITAL_P_O_BOX' ? 'Digital P.O. Box' : 'Postcode'})
                </p>
              </div>
            </div>
          )}

          {result.hierarchy && residents.length === 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
              <span className="font-bold text-slate-800">Postcode is valid:</span> {result.hierarchy.district}, {result.hierarchy.lga}, {result.hierarchy.state}
            </div>
          )}

          {relocatedMatches.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-amber-700">
                Relocation Records — Forwarding Address(es)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {relocatedMatches.map((match, idx) => (
                  <div key={idx} className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                    <p className="text-xs font-bold text-slate-900">
                      {match.name} <span className="font-mono text-slate-500">({match.digitalBoxNumber})</span>
                    </p>
                    <p className="text-xs text-amber-800 font-semibold flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      {match.forwardingAddress || match.forwardingPostcode}
                    </p>
                    <p className="text-[11px] font-mono text-amber-700">{match.forwardingPostcode} · {match.forwardingRule}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
