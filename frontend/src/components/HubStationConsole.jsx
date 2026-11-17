import React, { useState, useEffect, useCallback } from 'react';
import {
  Store, QrCode, KeyRound, Boxes, Clock, TrendingUp, Users,
  CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Phone,
  Search, Download, RefreshCw, Calendar, MapPin, DollarSign, Package, Loader2
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import CustodyScanner from './CustodyScanner';
import HubApplicationForm from './HubApplicationForm';

export default function HubStationConsole({ activeNav, setActiveNav, hubs, showToast }) {
  const [mine, setMine] = useState(null);
  const [mineLoading, setMineLoading] = useState(true);
  const [mineError, setMineError] = useState('');

  const [capacityDraft, setCapacityDraft] = useState('');
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [capacityNotice, setCapacityNotice] = useState(null);

  const loadMine = useCallback(async () => {
    setMineLoading(true);
    setMineError('');
    try {
      const res = await apiFetch('/api/v1/hubs/mine');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to load hub');
      setMine(data);
    } catch (err) {
      setMineError(err.message);
    } finally {
      setMineLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  useEffect(() => {
    if (mine?.hub) setCapacityDraft(String(mine.hub.capacity ?? ''));
  }, [mine?.hub?.id, mine?.hub?.capacity]);

  const handleUpdateCapacity = async (e) => {
    e.preventDefault();
    setCapacityNotice(null);
    const parsed = parseInt(capacityDraft, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
      setCapacityNotice({ type: 'error', text: 'Enter a valid capacity (minimum 1).' });
      return;
    }
    setSavingCapacity(true);
    try {
      const res = await apiFetch('/api/v1/hubs/mine', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capacity: parsed })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to update capacity.');
      setMine(prev => ({ ...prev, hub: data.hub }));
      setCapacityNotice({ type: 'success', text: 'Capacity updated.' });
      if (showToast) showToast('Hub capacity updated.');
    } catch (err) {
      setCapacityNotice({ type: 'error', text: err.message });
    } finally {
      setSavingCapacity(false);
    }
  };

  const hub = mine?.hub || null;
  const stats = mine?.stats || {};
  const staffList = mine?.staff || [];
  const bays = (mine?.bays || []).map((b) => {
    const storedAt = b.received_at_hub_at
      ? new Date(b.received_at_hub_at)
      : b.shipment_created_at
      ? new Date(b.shipment_created_at)
      : null;
    const daysHeld = storedAt ? Math.max(0, Math.floor((Date.now() - storedAt.getTime()) / 86400000)) : 0;
    return {
      code: b.bay_code,
      tier: b.size_tier,
      status: b.is_occupied ? 'OCCUPIED' : 'AVAILABLE',
      trackingCode: b.tracking_code,
      recipient: b.recipient_name,
      daysHeld
    };
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState('ALL');
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('42000');
  const [payoutLoading, setPayoutLoading] = useState(false);

  const occupiedCount = bays.filter(b => b.status === 'OCCUPIED').length;
  const overdueParcels = bays.filter(b => b.status === 'OCCUPIED' && b.daysHeld > 3);

  const handleRequestPayout = (e) => {
    e.preventDefault();
    setPayoutLoading(true);
    setTimeout(() => {
      setPayoutLoading(false);
      setIsPayoutModalOpen(false);
      if (showToast) showToast('Bank settlement payout request of ₦' + Number(payoutAmount).toLocaleString() + ' submitted for processing!');
    }, 900);
  };

  if (mineLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!hub && activeNav === 'hub_application') {
    return (
      <HubApplicationForm
        showToast={showToast}
        onAccredited={() => {
          loadMine();
          setActiveNav('hub_overview');
        }}
      />
    );
  }

  if (!hub) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
          <Store className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black text-slate-900">No hub linked to this account</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Every hub is accredited before it goes live. Complete the accreditation application
          and our operations team will schedule a site inspection.
        </p>
        {mineError && <p className="text-xs text-rose-600">{mineError}</p>}
        <button
          onClick={() => setActiveNav('hub_application')}
          className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
        >
          <span>Open accreditation application</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Community Hub Host Banner */}
      <div className="bg-[#042f2e] text-white p-4 sm:p-6 rounded-2xl border border-teal-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-900/80 text-teal-300 border border-teal-700">
              Community Hub Station
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700">
              Track C Verified
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-black mt-1.5">
            {hub ? `${hub.business_name} (${hub.postcode})` : 'No hub linked'}
          </h1>
          <p className="text-xs text-teal-200/80 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>{hub ? `${hub.address_text} · ${hub.phone}` : 'Link a hub to this account to see live station data.'}</span>
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="bg-[#0b3f3e] p-2.5 sm:p-3 rounded-xl border border-teal-700 text-left sm:text-right min-w-[110px]" title="Currently occupied locker compartments">
            <div className="text-[9px] sm:text-[10px] text-teal-300 uppercase font-semibold">Bay Capacity</div>
            <div className="text-base sm:text-lg font-black text-white">{occupiedCount} / {bays.length}</div>
          </div>
          <div className="bg-[#0b3f3e] p-2.5 sm:p-3 rounded-xl border border-teal-700 text-left sm:text-right min-w-[110px]" title="Parcels held in bay beyond 3 free days">
            <div className="text-[9px] sm:text-[10px] text-teal-300 uppercase font-semibold">Overdue (&gt;3d)</div>
            <div className={`text-base sm:text-lg font-black ${overdueParcels.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {overdueParcels.length} Items
            </div>
          </div>
        </div>
      </div>

      {/* ACCREDITATION APPLICATION */}
      {activeNav === 'hub_application' && (
        <HubApplicationForm
          showToast={showToast}
          onAccredited={() => {
            loadMine();
            setActiveNav('hub_overview');
          }}
        />
      )}

      {/* TAB 1: HUB OVERVIEW */}
      {activeNav === 'hub_overview' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Quick Metrics (Stack on small screens: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between" title="Parcels scanned in from courier drivers today">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                <span className="font-bold text-slate-700">Inbound Today</span>
                <Package className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{stats.inbound_today ?? 0} Parcels</div>
              <div className="text-[11px] text-slate-500 mt-1">Scanned in today</div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between" title="Customer collections released via 6-digit OTP code">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                <span className="font-bold text-slate-700">Collections</span>
                <KeyRound className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{stats.collected_total ?? 0} Picked Up</div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">Verified by OTP token</div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between" title="Available storage locker bays ready for inbound parcels">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                <span className="font-bold text-slate-700">Open Bays</span>
                <Boxes className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{stats.open_bays ?? 0} Open</div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">{bays.length ? Math.round((occupiedCount / bays.length) * 100) : 0}% utilized</div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between" title="Parcels in bays exceeding 3 days accruing late fees">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                <span className="font-bold text-slate-700">Overdue Hold</span>
                <Clock className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-black text-rose-600">{overdueParcels.length} Delayed</div>
              <div className="text-[11px] text-rose-700 font-semibold mt-1 truncate">Late storage fees</div>
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold mb-3">
                  <QrCode className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Receive Inbound Rider Delivery</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Scan courier barcode pass, verify parcel condition, and immediately assign to an available storage compartment.
                </p>
              </div>
              <button
                onClick={() => setActiveNav('parcel_intake')}
                className="mt-4 w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Open Intake Scanner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold mb-3">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Release Parcel to Customer</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Recipient presents their 6-digit Collection Code (OTP). System verifies code and clears the bay automatically.
                </p>
              </div>
              <button
                onClick={() => setActiveNav('collection')}
                className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Verify Collection Code</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PARCEL INTAKE */}
      {activeNav === 'parcel_intake' && (
        <div className="space-y-4">
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-teal-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-teal-700" />
              <span><strong>Intake Protocol:</strong> Courier must present physical parcel with scannable QR label. Check condition before accepting custody.</span>
            </div>
            <span className="font-bold text-[11px] bg-teal-200 px-2 py-0.5 rounded text-teal-900">
              Host Commission: ₦250/drop
            </span>
          </div>

          <CustodyScanner
            activeRole="hub_owner"
            hubs={hubs}
            onCustodySuccess={() => {
              if (showToast) showToast('Inbound parcel custody committed to ledger!');
            }}
          />
        </div>
      )}

      {/* TAB 3: CUSTOMER COLLECTION */}
      {activeNav === 'collection' && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-700" />
              <span><strong>Customer Release Protocol:</strong> Customer must provide the 6-digit Collection Code received via SMS. Never release without successful verification.</span>
            </div>
            <span className="font-bold text-[11px] bg-emerald-200 px-2 py-0.5 rounded text-emerald-900">
              Release Commission: ₦250/pickup
            </span>
          </div>

          <CustodyScanner
            activeRole="hub_owner"
            hubs={hubs}
            onCustodySuccess={() => {
              if (showToast) showToast('Collection verified! Parcel released to customer.');
            }}
          />
        </div>
      )}

      {/* TAB 4: STORAGE BAYS */}
      {activeNav === 'storage_bays' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Compartment Storage Matrix</h3>
              <p className="text-xs text-slate-500">60 individual shelf bays partitioned into Small, Medium, and Large size tiers</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-1 bg-slate-50 text-xs">
                {['ALL', 'Small', 'Medium', 'Large'].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setFilterTier(tier)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                      filterTier === tier ? 'bg-teal-600 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bays Visual Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-2.5">
            {bays
              .filter(b => filterTier === 'ALL' || b.tier === filterTier)
              .map(bay => {
                const isOccupied = bay.status === 'OCCUPIED';
                const isOverdue = isOccupied && bay.daysHeld > 3;

                return (
                  <div
                    key={bay.code}
                    title={isOccupied ? `${bay.code} (${bay.tier}): ${bay.trackingCode} - Recipient: ${bay.recipient} (Stored: ${bay.daysHeld} days)` : `${bay.code} (${bay.tier}): Empty & Ready for Intake`}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col justify-between h-20 ${
                      isOverdue
                        ? 'bg-rose-50 border-rose-300 text-rose-900 ring-2 ring-rose-400'
                        : isOccupied
                        ? 'bg-teal-50 border-teal-300 text-teal-900'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold">{bay.code}</span>
                      <span className="text-[9px] uppercase font-semibold text-slate-400">{bay.tier[0]}</span>
                    </div>

                    <div className="text-[10px] font-bold truncate">
                      {isOccupied ? (
                        <span className={isOverdue ? 'text-rose-700' : 'text-teal-700'}>
                          {bay.recipient ? bay.recipient.split(' ')[0] : 'In Use'}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">Available</span>
                      )}
                    </div>

                    <div className="text-[9px] flex items-center justify-center gap-1 font-mono">
                      {isOccupied ? (
                        isOverdue ? (
                          <span className="text-rose-600 font-bold">{bay.daysHeld}d late</span>
                        ) : (
                          <span className="text-teal-600">{bay.daysHeld}d stored</span>
                        )
                      ) : (
                        <span>{bay.maxWeight}</span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-slate-100 border border-slate-300" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-teal-100 border border-teal-400" />
              <span>Occupied (Within 3-Day Free Period)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-rose-100 border border-rose-400 ring-1 ring-rose-400" />
              <span>Overdue (&gt; 3 Days — Late Fee Charged)</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: OVERDUE PARCELS */}
      {activeNav === 'overdue' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Overdue Packages Awaiting Collection</h3>
              <p className="text-xs text-slate-500">
                Parcels exceeding the standard 3-day pickup grace period. Daily late fee: <strong>₦500.00 / day</strong>.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold">
              {overdueParcels.length} Overdue Consignments
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Tracking Code</th>
                  <th className="py-2.5 px-3">Storage Bay</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Days Stored</th>
                  <th className="py-2.5 px-3">Accrued Late Fee</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueParcels.map(p => {
                  const lateDays = p.daysHeld - 3;
                  const lateFee = lateDays * 500;
                  return (
                    <tr key={p.code} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{p.trackingCode}</td>
                      <td className="py-3 px-3 font-mono font-bold text-teal-700">{p.code} ({p.tier})</td>
                      <td className="py-3 px-3 font-semibold text-slate-800">{p.recipient}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[11px]">
                          {p.daysHeld} days ({lateDays}d overdue)
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">₦{lateFee.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          onClick={() => {
                            if (showToast) showToast(`SMS reminder sent to ${p.recipient}`);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                        >
                          Send Reminder
                        </button>
                        <button
                          onClick={() => {
                            if (showToast) showToast(`Marked ${p.trackingCode} for Return-to-Sender (RTS) dispatch`);
                          }}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
                        >
                          Return to Sender
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: EARNINGS & PAYOUTS */}
      {activeNav === 'earnings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center mx-auto">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Earnings &amp; payouts</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Commission tracking and bank settlement for hub stations will appear here once enabled.
              </p>
            </div>
          </div>

          {/* Transactions Ledger */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Recent Commission Credits</h3>
              <span className="text-xs text-slate-500 font-mono">Commission: ₦250 Intake / ₦250 Release</span>
            </div>

            <div className="py-6 text-center text-xs text-slate-500">No commission credits recorded yet.</div>
          </div>
        </div>
      )}

      {/* TAB 7: HUB PROFILE & STAFF */}
      {activeNav === 'hub_profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Hub Station Profile & Operating Settings</h3>
              <p className="text-xs text-slate-500">Business registration, staff access PINs, and accredited hours</p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
              Accreditation Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Trading Name</label>
                <input
                  type="text"
                  disabled
                  defaultValue={hub.business_name || ''}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">NDAPS Digital Postcode</label>
                <input
                  type="text"
                  disabled
                  defaultValue={hub.postcode || ''}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono font-bold text-teal-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Physical Street Address</label>
                <input
                  type="text"
                  disabled
                  defaultValue={hub.address_text || ''}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Storage Capacity (parcels)</label>
                <form onSubmit={handleUpdateCapacity} className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={capacityDraft}
                    onChange={e => setCapacityDraft(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold"
                  />
                  <button
                    type="submit"
                    disabled={savingCapacity}
                    className="px-3 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-[11px] font-bold shrink-0 cursor-pointer"
                  >
                    {savingCapacity ? 'Saving…' : 'Update'}
                  </button>
                </form>
                <p className="text-[10px] text-slate-500 mt-1">
                  Current load: {hub.current_load || 0} parcels. Capacity cannot be set below the current load.
                </p>
                {capacityNotice && (
                  <p className={`text-[11px] font-bold mt-1 ${capacityNotice.type === 'error' ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {capacityNotice.text}
                  </p>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Operating Hours</label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 font-semibold">
                  <div className="flex justify-between"><span>Monday – Friday:</span><span>08:00 AM – 07:00 PM</span></div>
                  <div className="flex justify-between"><span>Saturday:</span><span>09:00 AM – 06:00 PM</span></div>
                  <div className="flex justify-between text-slate-400"><span>Sunday:</span><span>Closed</span></div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Authorized Counter Staff</label>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl p-2 bg-slate-50">
                  <div className="py-1.5 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-800">{hub.owner_name || 'Hub Owner'}</div>
                      <div className="text-[10px] text-slate-500">Hub Owner / Manager</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 text-[10px] font-bold">Admin</span>
                  </div>
                  {staffList.length === 0 ? (
                    <div className="py-2 text-xs text-slate-500">No additional counter staff registered.</div>
                  ) : staffList.map((s) => (
                    <div key={s.email || s.name} className="py-1.5 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-800">{s.name}</div>
                        <div className="text-[10px] text-slate-500 capitalize">{s.role || 'Staff'}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settlement Payout Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <h3 className="text-base font-bold text-slate-900">Request Bank Settlement Payout</h3>
            <p className="text-xs text-slate-500">
              Funds will be transferred directly to your verified commercial bank account on record.
            </p>

            <form onSubmit={handleRequestPayout} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Settlement Bank Account</label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="font-bold text-slate-800">Guaranty Trust Bank (GTBank)</div>
                  <div className="font-mono text-slate-500">0123456789 • Wuse 2 Express Mart Ltd</div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Withdrawal Amount (₦)</label>
                <input
                  type="number"
                  max="42000"
                  min="5000"
                  value={payoutAmount}
                  onChange={e => setPayoutAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Maximum available: ₦42,000.00</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payoutLoading}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  {payoutLoading ? 'Submitting...' : 'Confirm Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
