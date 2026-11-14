import { apiFetch } from '../../lib/api';
import { useState } from 'react';
import {
  ArrowRight, ArrowUpDown, BadgeCheck, Calendar, Check, CheckCircle2, Copy,
  Crosshair, FileText, Mail, Navigation, Phone, RefreshCw, Search,
  ShieldCheck, Sparkles, User, Wallet, Link2
} from 'lucide-react';
import CertificateModal from './CertificateModal';

export default function DigitalBoxTab({
  digitalBox, profile, wallet, currentUser, senderLocation, showToast,
  handleTestRerouteAlert, handleToggleNotification, testRerouteLoading,
  testRerouteResult, isCertificateModalOpen, setIsCertificateModalOpen,
  getAuthHeaders, fetchCustomerData
}) {
  const [isRenewingBox, setIsRenewingBox] = useState(false);
  const [isRequestingGroundTruth, setIsRequestingGroundTruth] = useState(false);
  const [occupantSearchCode, setOccupantSearchCode] = useState('FC-01-A03-FK-01');
  const [occupantSearchResults, setOccupantSearchResults] = useState(null);
  const [isSearchingOccupants, setIsSearchingOccupants] = useState(false);
  const [legacyBoxInput, setLegacyBoxInput] = useState('');
  const [isLinkingLegacyBox, setIsLinkingLegacyBox] = useState(false);
  const [legacyLinkMessage, setLegacyLinkMessage] = useState(null);

  // Link a legacy P.O. Box number to this Digital P.O. Box
  const handleLinkLegacyBox = async (e) => {
    if (e) e.preventDefault();
    const clean = legacyBoxInput.trim();
    if (!clean) {
      setLegacyLinkMessage({ type: 'error', text: 'Enter your old P.O. Box number first.' });
      return;
    }
    setIsLinkingLegacyBox(true);
    setLegacyLinkMessage(null);
    try {
      const res = await apiFetch('/api/v1/customer/link-legacy-box', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ legacyBoxNumber: clean })
      });
      const data = await res.json();
      if (res.ok) {
        setLegacyLinkMessage({ type: 'success', text: data.message });
        setLegacyBoxInput('');
        fetchCustomerData();
      } else {
        setLegacyLinkMessage({ type: 'error', text: data.error || 'Could not link that box number.' });
      }
    } catch (err) {
      setLegacyLinkMessage({ type: 'error', text: 'Network error while linking your old box number.' });
    } finally {
      setIsLinkingLegacyBox(false);
    }
  };

  const handleRenewDigitalBox = async () => {
    setIsRenewingBox(true);
    try {
      const res = await apiFetch('/api/v1/customer/renew-digital-box', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Digital P.O. Box renewed successfully!');
        fetchCustomerData();
      } else {
        showToast(data.error || 'Failed to renew Digital P.O. Box', 'error');
      }
    } catch (err) {
      showToast('Network error during renewal', 'error');
    } finally {
      setIsRenewingBox(false);
    }
  };

  // Request NIPOST Ground-Truthing Physical Inspection
  const handleRequestGroundTruth = async () => {
    setIsRequestingGroundTruth(true);
    try {
      const res = await apiFetch('/api/v1/customer/request-ground-truthing', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Ground-Truthing physical inspection ordered!');
        fetchCustomerData();
      } else {
        showToast(data.error || 'Failed to request ground-truthing', 'error');
      }
    } catch (err) {
      showToast('Network error requesting ground-truthing', 'error');
    } finally {
      setIsRequestingGroundTruth(false);
    }
  };

  // Search Building Occupants / Mail Postcode
  const handleSearchOccupants = async (e) => {
    if (e) e.preventDefault();
    if (!occupantSearchCode || !occupantSearchCode.trim()) return;
    setIsSearchingOccupants(true);
    try {
      const res = await apiFetch(`/api/v1/operations/postcode-occupants?postcode=${encodeURIComponent(occupantSearchCode.trim())}`);
      const data = await res.json();
      if (res.ok) {
        setOccupantSearchResults(data);
      } else {
        showToast(data.error || 'Occupant search failed', 'error');
      }
    } catch (err) {
      showToast('Network error searching occupants', 'error');
    } finally {
      setIsSearchingOccupants(false);
    }
  };


  return (
    <>
        <div className="space-y-6">
          {/* Main Hero Card: Digital P.O. Box & Proof of Address Anchor */}
          <div className="bg-gradient-to-br from-[#041a12] via-[#062419] to-[#0a3526] text-white p-6 rounded-3xl border border-emerald-800 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 inline-flex items-center gap-1.5 shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>NIPOST Digital Post Office Box</span>
                  </span>
                  <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-400 text-slate-950 font-mono shadow-xs">
                    {digitalBox?.subscriptionStatus || 'ACTIVE'}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Your Digital P.O.Box and Ground-Truth, NIPOST Verified Proof of Address
                </h1>

                <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
                  Replacing the traditional physical P.O. Box with a verified digital anchor. Enjoy guaranteed mail delivery, dynamic parcel rerouting upon relocation, and bank-grade NIPOST Ground-Truth Verified Proof of Address.
                </p>
              </div>

              {/* Digital P.O. Box Pass Badge */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl flex flex-col items-center justify-center text-center min-w-[260px] shadow-lg">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                  Digital P.O. Box Number
                </span>
                <span className="text-xl font-mono font-black text-white my-1 tracking-wider">
                  {digitalBox?.boxNumber || 'HBX-0005'}
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(digitalBox?.boxNumber || 'HBX-0005');
                      showToast('Digital P.O. Box ID copied!');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-[10px] font-bold border border-emerald-400/30 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    Copy Box ID
                  </button>
                  <button
                    onClick={() => setIsCertificateModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold border border-white/30 flex items-center gap-1 transition cursor-pointer"
                  >
                    <FileText className="w-3 h-3" />
                    Certificate
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-emerald-800/60 relative z-10">
              <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] text-emerald-300 font-medium">Postcode</p>
                <p className="text-sm font-mono font-black text-white mt-0.5">
                  {digitalBox?.activePostcode || profile?.postcode || 'FC-01-A03-FK-01'}
                </p>
              </div>

              <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] text-emerald-300 font-medium">Certification Level</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <p className="text-xs font-bold text-white truncate">
                    {digitalBox?.isGroundTruthVerified ? 'Ground-Truth Certified' : 'NIPOST Verified'}
                  </p>
                </div>
              </div>

              <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] text-emerald-300 font-medium">Annual Subscription</p>
                <p className="text-sm font-bold text-white mt-0.5">
                  {digitalBox?.daysRemaining || 365} Days Remaining
                </p>
              </div>

              <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] text-emerald-300 font-medium">Relocation Rerouting</p>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Active (Free ₦0)
                </span>
              </div>
            </div>
          </div>

          {/* Address Verification & Mailbox Settings Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card 1: Official Proof of Address (Doorstep Verification) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Official NIPOST Certification
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    Proof of Address Certificate
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Doorway ground-truth verification certified by NIPOST. Includes cryptographic QR code accepted by banks, embassies, and regulatory KYC.
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Inspection Fee:</span>
                    <span className="font-bold text-slate-900">₦2,500.00 (One-time)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Status:</span>
                    <span className={`font-bold ${digitalBox?.isGroundTruthVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {digitalBox?.proofOfAddressStatus || 'Verified by NIPOST (Ground-Truth Certified)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">District / LGA:</span>
                    <span className="font-semibold text-slate-700">
                      {digitalBox?.hierarchy?.district || 'Wuse 2'}, {digitalBox?.hierarchy?.lga || 'Abuja Municipal'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                {digitalBox?.isGroundTruthVerified ? (
                  <button
                    onClick={() => setIsCertificateModalOpen(true)}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Download NIPOST POA Certificate (PDF)</span>
                  </button>
                ) : (
                  <button
                    onClick={handleRequestGroundTruth}
                    disabled={isRequestingGroundTruth}
                    className="w-full py-2.5 px-4 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isRequestingGroundTruth ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        <span>Dispatching Inspector...</span>
                      </>
                    ) : (
                      <>
                        <Crosshair className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {digitalBox?.subscriptionStatus === 'ACTIVE' ? 'Renew your POA Certificate' : 'Request Doorway Verification (₦2,500)'}
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Card 2: Digital Mailbox Subscription */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    Annual Mailbox Plan
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    Digital P.O. Box Subscription
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Your active digital post office box. Ensures unhindered mail delivery, and dynamic parcel rerouting.
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Annual Subscription:</span>
                    <span className="font-bold text-slate-900">₦3,500.00 / Year</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Subscription Status:</span>
                    <span className="font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                      {digitalBox?.subscriptionStatus || 'ACTIVE'} ({digitalBox?.daysRemaining || 365} Days Remaining)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Wallet Balance:</span>
                    <span className="font-bold text-slate-900">
                      ₦{parseFloat(wallet?.balance_ngn || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={handleRenewDigitalBox}
                  disabled={isRenewingBox}
                  className="w-full py-2.5 px-4 bg-[#062419] hover:bg-[#0b3827] disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isRenewingBox ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Extending 365 Days...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Renew Subscription (₦3,500 / Yr)</span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center text-slate-400">
                  Debited directly from your prepaid logistics wallet.
                </p>
              </div>
            </div>

            {/* Card 3: Relocation & Automatic Forwarding */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    Auto-Rerouting Active
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    Mail & Parcel Forwarding
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    When you change address, couriers searching your previous postcode instantly resolve your active location, preventing lost parcels and return loops.
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Auto-Reroute Fee:</span>
                    <span className="font-bold text-emerald-700">₦0.00 (100% Free)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">In-Flight Protection:</span>
                    <span className="font-bold text-slate-900">Live Auto-Update</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Recorded Moves:</span>
                    <span className="font-semibold text-slate-700">
                      {(digitalBox?.relocations || []).length} Address Update(s)
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => {
                    const el = document.getElementById('occupancy-directory-card');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Inspect Building Directory</span>
                </button>
                <p className="text-[10px] text-center text-slate-400">
                  Preview how couriers verify your building occupants and forwarding.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Link a legacy P.O. Box number */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-emerald-600" />
                  <span>Link Your Old P.O. Box Number</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Have a previous Hotbox P.O. Box number such as HBX-PBOX-FC01A03F-0005? Link it to your Digital P.O. Box so mail sent to the old number still reaches you.
                </p>
              </div>
              {digitalBox?.legacyBoxNumber && (
                <span className="text-[11px] font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 shrink-0">
                  Linked: {digitalBox.legacyBoxNumber}
                </span>
              )}
            </div>

            {digitalBox?.legacyBoxNumber && (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong className="font-mono">{digitalBox.legacyBoxNumber}</strong> is linked and forwards to {digitalBox.boxNumber}.
                  {digitalBox.legacyLinkedAt && ` Linked on ${new Date(digitalBox.legacyLinkedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.`}
                </span>
              </div>
            )}

            <form onSubmit={handleLinkLegacyBox} className="flex flex-col sm:flex-row gap-2 max-w-xl">
              <input
                type="text"
                value={legacyBoxInput}
                onChange={(e) => setLegacyBoxInput(e.target.value.toUpperCase())}
                placeholder="Old P.O. Box number e.g. HBX-PBOX-FC01A03F-0005"
                className="w-full sm:flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:border-emerald-600 focus:outline-none bg-slate-50"
              />
              <button
                type="submit"
                disabled={isLinkingLegacyBox}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#062419] hover:bg-[#0b3827] disabled:opacity-50 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shrink-0 shadow-xs cursor-pointer"
              >
                {isLinkingLegacyBox ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Link2 className="w-3.5 h-3.5" />
                )}
                <span>{digitalBox?.legacyBoxNumber ? 'Update Linked Number' : 'Link Old Box Number'}</span>
              </button>
            </form>

            {legacyLinkMessage && (
              <p className={`text-[11px] font-semibold ${legacyLinkMessage.type === 'error' ? 'text-rose-600' : 'text-emerald-700'}`}>
                {legacyLinkMessage.text}
              </p>
            )}
          </div>

          {/* Section: Relocation & Instant Mail Forwarding Ledger */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-emerald-600" />
                  <span>Address Relocation & Automatic Mail Forwarding Ledger</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Any mail, bank statements, or parcels addressed to previous postcodes automatically route to your active address without loss.
                </p>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 shrink-0">
                Guaranteed Delivery Active
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Relocation Date</th>
                    <th className="py-2.5 px-3">Previous Postcode & Address</th>
                    <th className="py-2.5 px-3">New Destination Postcode & Address</th>
                    <th className="py-2.5 px-3">Registered Phone</th>
                    <th className="py-2.5 px-3 text-right">Forwarding Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(digitalBox?.relocations && digitalBox.relocations.length > 0) ? (
                    digitalBox.relocations.map((rel, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                          {new Date(rel.changedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-slate-900 block">{rel.oldPostcode}</span>
                          <span className="text-[11px] text-slate-500">{rel.oldAddress || 'Previous Residence'}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-emerald-700 block">{rel.newPostcode}</span>
                          <span className="text-[11px] text-slate-500">{rel.newAddress || 'Current Residence'}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-mono">
                          {rel.phone || profile?.phone || '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Auto-Forwarding Active (₦0)
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                        No historical relocations recorded yet. When you update your address in profile, your forwarding trail will be automatically indexed here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Dual-Party Reroute Alert Preferences & Testing Engine */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  <span>Automated Dual-Party Reroute Notification Engine</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  When a parcel or letter is rerouted due to address relocation, both the sender (e.g. bank) and recipient receive an instant alert confirming the mail is redirected safely.
                </p>
              </div>
              <button
                onClick={handleTestRerouteAlert}
                disabled={testRerouteLoading}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shrink-0 shadow-xs cursor-pointer"
              >
                {testRerouteLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching Dual-Party Test...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Simulate Dual-Party Reroute Alert</span>
                  </>
                )}
              </button>
            </div>

            {/* Notification Channel Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* In-App Alerts */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">In-App Notification</span>
                    <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      Free (₦0.00)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Instant notification banner in your Hotbox customer portal inbox.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold">Status: Always Active</span>
                  <input
                    type="checkbox"
                    checked={profile?.notification_preferences?.inapp !== false}
                    onChange={(e) => handleToggleNotification('inapp', e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Email Alerts */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Email Alerts</span>
                    <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      Free (₦0.00)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    HTML notification letter to registered citizen and sender email.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold">Status: Always Active</span>
                  <input
                    type="checkbox"
                    checked={profile?.notification_preferences?.email !== false}
                    onChange={(e) => handleToggleNotification('email', e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* SMS Alerts */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">SMS Notice</span>
                    <span className="text-[10px] font-black uppercase text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                      ₦20.00 / SMS
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Direct telecom SMS dispatched via Twilio to verified mobile numbers.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold">User Configurable</span>
                  <input
                    type="checkbox"
                    checked={Boolean(profile?.notification_preferences?.sms)}
                    onChange={(e) => handleToggleNotification('sms', e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* WhatsApp Alerts */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">WhatsApp Notice</span>
                    <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      ₦35.00 / WhatsApp
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Rich messaging alerts dispatched via Meta WhatsApp Business Cloud.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold">User Configurable</span>
                  <input
                    type="checkbox"
                    checked={Boolean(profile?.notification_preferences?.whatsapp)}
                    onChange={(e) => handleToggleNotification('whatsapp', e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Test Simulation Results Card */}
            {testRerouteResult && (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Live Dual-Party Reroute Simulation Completed</span>
                  </span>
                  <span className="text-[11px] font-bold text-emerald-800">
                    Total Alert Fees Debited: ₦{parseFloat(testRerouteResult.results?.totalFeeDebitedNgn || 0).toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-1">
                    <p className="font-bold text-slate-900">Recipient Dispatches (Citizen):</p>
                    <p className="text-slate-600 text-[11px]">In-App: <span className="font-semibold text-emerald-700">{testRerouteResult.results?.recipient?.inapp ? 'Delivered (Free)' : 'Skipped'}</span></p>
                    <p className="text-slate-600 text-[11px]">Email: <span className="font-semibold text-emerald-700">{testRerouteResult.results?.recipient?.email ? 'Delivered (Free)' : 'Skipped'}</span></p>
                    <p className="text-slate-600 text-[11px]">SMS: <span className="font-semibold text-slate-800">{testRerouteResult.results?.recipient?.sms ? 'Dispatched (₦20.00)' : 'Deactivated'}</span></p>
                    <p className="text-slate-600 text-[11px]">WhatsApp: <span className="font-semibold text-slate-800">{testRerouteResult.results?.recipient?.whatsapp ? 'Dispatched (₦35.00)' : 'Deactivated'}</span></p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-1">
                    <p className="font-bold text-slate-900">Sender Dispatches (e.g. Bank / Merchant):</p>
                    <p className="text-slate-600 text-[11px]">In-App: <span className="font-semibold text-emerald-700">{testRerouteResult.results?.sender?.inapp ? 'Delivered (Free)' : 'Skipped'}</span></p>
                    <p className="text-slate-600 text-[11px]">Email: <span className="font-semibold text-emerald-700">{testRerouteResult.results?.sender?.email ? 'Delivered (Free)' : 'Skipped'}</span></p>
                    <p className="text-slate-600 text-[11px]">SMS: <span className="font-semibold text-slate-800">{testRerouteResult.results?.sender?.sms ? 'Dispatched (₦20.00)' : 'Deactivated'}</span></p>
                    <p className="text-slate-600 text-[11px]">WhatsApp: <span className="font-semibold text-slate-800">{testRerouteResult.results?.sender?.whatsapp ? 'Dispatched (₦35.00)' : 'Deactivated'}</span></p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section: Courier Mail Postcode Search & Building Occupancy Directory (Pillar 3) */}
          <div id="occupancy-directory-card" className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Search className="w-4 h-4 text-emerald-600" />
                  <span>Courier Postcode Search & Building Occupancy Directory</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  How couriers, postal inspectors, and delivery personnel query a postcode written on mail to resolve active building residents and auto-forwarding rules.
                </p>
              </div>
            </div>

            <form onSubmit={handleSearchOccupants} className="flex flex-col sm:flex-row gap-2 max-w-xl">
              <input
                type="text"
                value={occupantSearchCode}
                onChange={(e) => setOccupantSearchCode(e.target.value.toUpperCase())}
                placeholder="Enter NDAPS Postcode e.g. FC-01-A03-FK-01"
                className="w-full sm:flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:border-emerald-600 focus:outline-none bg-slate-50"
              />
              <button
                type="submit"
                disabled={isSearchingOccupants}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#062419] hover:bg-[#0b3827] disabled:opacity-50 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shrink-0 shadow-xs cursor-pointer"
              >
                {isSearchingOccupants ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Search Occupants</span>
              </button>
            </form>

            {occupantSearchResults && (
              <div className="space-y-4 pt-2 animate-fadeIn">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      NDAPS Verified Premise
                    </span>
                    <h4 className="text-sm font-black text-slate-900 mt-1">
                      {occupantSearchResults.building?.address || 'Plot 112 Aminu Kano Crescent, Wuse 2, Abuja'}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono">
                      Postcode: {occupantSearchResults.postcode} · {occupantSearchResults.building?.district}, {occupantSearchResults.building?.state}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900 block">
                      {occupantSearchResults.occupants?.length || 0} Registered Resident(s)
                    </span>
                    <span className="text-[11px] text-emerald-600 font-semibold">
                      Forwarding Engine Active
                    </span>
                  </div>
                </div>

                {/* Occupants List */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Building Residents & Forwarding Directives
                  </h5>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                    {occupantSearchResults.occupants && occupantSearchResults.occupants.length > 0 ? (
                      occupantSearchResults.occupants.map((occ, i) => (
                        <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">{occ.name}</span>
                              <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {occ.digitalBoxNumber}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Phone: <span className="font-mono text-slate-700">{occ.phone}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {occ.residentialStatus === 'RELOCATED' ? (
                              <div className="text-right">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                                  <ArrowRight className="w-3 h-3" />
                                  Relocated to: {occ.forwardingPostcode}
                                </span>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Moved: {new Date(occ.relocationDate).toLocaleDateString()} · Instant Forwarding Active
                                </p>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3" />
                                Active Resident (Verified)
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No residents indexed for this postcode query.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      <CertificateModal
        isOpen={isCertificateModalOpen}
        onClose={() => setIsCertificateModalOpen(false)}
        digitalBox={digitalBox}
        profile={profile}
        currentUser={currentUser}
        senderLocation={senderLocation}
      />
    </>
  );
}
