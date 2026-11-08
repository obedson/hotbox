import React, { useState } from 'react';
import {
  Store, QrCode, KeyRound, Boxes, Clock, TrendingUp, Users,
  CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Phone,
  Search, Download, RefreshCw, Calendar, MapPin, DollarSign, Package
} from 'lucide-react';
import CustodyScanner from './CustodyScanner';

export default function HubStationConsole({ activeNav, setActiveNav, hubs, showToast }) {
  // Demo storage bay data
  const [bays, setBays] = useState(() => {
    const list = [];
    // Small bays A01 - A20
    for (let i = 1; i <= 20; i++) {
      const code = `BAY-A${i < 10 ? '0' + i : i}`;
      const isOccupied = [2, 5, 8, 12, 17].includes(i);
      list.push({
        code,
        tier: 'Small',
        maxWeight: '3 kg',
        status: isOccupied ? 'OCCUPIED' : 'AVAILABLE',
        trackingCode: isOccupied ? `HBX-FC01A0-${1000 + i * 43}` : null,
        recipient: isOccupied ? ['Chidi Okafor', 'Amina Yusuf', 'Tunde Bakare', 'Fatima Bello', 'Ngozi Eze'][i % 5] : null,
        daysHeld: isOccupied ? (i === 5 ? 4 : i === 12 ? 5 : 1) : 0
      });
    }
    // Medium bays B01 - B20
    for (let i = 1; i <= 20; i++) {
      const code = `BAY-B${i < 10 ? '0' + i : i}`;
      const isOccupied = [1, 4, 9, 14, 18].includes(i);
      list.push({
        code,
        tier: 'Medium',
        maxWeight: '10 kg',
        status: isOccupied ? 'OCCUPIED' : 'AVAILABLE',
        trackingCode: isOccupied ? `HBX-FC01A0-${2000 + i * 37}` : null,
        recipient: isOccupied ? ['Ibrahim Sani', 'Grace Danjuma', 'Emeka Nwosu', 'Blessing Alabi', 'Kudirat Balogun'][i % 5] : null,
        daysHeld: isOccupied ? (i === 4 ? 4 : 2) : 0
      });
    }
    // Large bays C01 - C20
    for (let i = 1; i <= 20; i++) {
      const code = `BAY-C${i < 10 ? '0' + i : i}`;
      const isOccupied = [3, 11].includes(i);
      list.push({
        code,
        tier: 'Large',
        maxWeight: '25 kg',
        status: isOccupied ? 'OCCUPIED' : 'AVAILABLE',
        trackingCode: isOccupied ? `HBX-FC01A0-${3000 + i * 51}` : null,
        recipient: isOccupied ? ['Abubakar Garba', 'Samuel Adeleke'][i % 2] : null,
        daysHeld: isOccupied ? 1 : 0
      });
    }
    return list;
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
          <h1 className="text-lg sm:text-xl font-black mt-1.5">Wuse 2 Express Mart & Hub (FC-01-A03-FK-01)</h1>
          <p className="text-xs text-teal-200/80 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>Plot 112 Aminu Kano Cres, Wuse 2 · Mallam Ibrahim (+234 803 112 3456)</span>
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
              <div className="text-2xl font-black text-slate-900">18 Parcels</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                <span>↑ 4 vs yesterday</span>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between" title="Customer collections released via 6-digit OTP code">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                <span className="font-bold text-slate-700">Collections</span>
                <KeyRound className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">14 Picked Up</div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">Verified by OTP token</div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between" title="Available storage locker bays ready for inbound parcels">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                <span className="font-bold text-slate-700">Open Bays</span>
                <Boxes className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{bays.length - occupiedCount} Open</div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">{Math.round((occupiedCount / bays.length) * 100)}% utilized</div>
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
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs font-semibold">Available for Withdrawal</div>
              <div className="text-2xl font-black text-slate-900 mt-1">₦42,000.00</div>
              <button
                onClick={() => setIsPayoutModalOpen(true)}
                className="mt-3 w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Request Bank Settlement
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs font-semibold">Pending Settlement (Next Cycle)</div>
              <div className="text-2xl font-black text-slate-900 mt-1">₦26,500.00</div>
              <div className="text-[11px] text-slate-500 mt-3">Clears automatically every Tuesday</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs font-semibold">Lifetime Commission Earned</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">₦184,500.00</div>
              <div className="text-[11px] text-slate-500 mt-3">369 successful intake & release handoffs</div>
            </div>
          </div>

          {/* Transactions Ledger */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Recent Commission Credits</h3>
              <span className="text-xs text-slate-500 font-mono">Commission: ₦250 Intake / ₦250 Release</span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {[
                { time: 'Today, 2:15 PM', desc: 'Customer Collection Release (OTP Verified)', ref: 'HBX-FC01A0-1043', credit: '₦250.00' },
                { time: 'Today, 11:30 AM', desc: 'Rider Inbound Parcel Intake (Bay BAY-A12)', ref: 'HBX-FC01A0-2037', credit: '₦250.00' },
                { time: 'Yesterday, 5:40 PM', desc: 'Customer Collection Release (OTP Verified)', ref: 'HBX-FC01A0-3151', credit: '₦250.00' },
                { time: 'Yesterday, 3:10 PM', desc: 'Overdue Late Storage Fee Split (2 days)', ref: 'HBX-FC01A0-4490', credit: '₦700.00' },
                { time: '28 Oct 2026', desc: 'Weekly Bank Settlement to GTBank (•••3490)', ref: 'PAYOUT-20261028', credit: '-₦35,000.00', isDebit: true }
              ].map((tx, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">{tx.desc}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.ref} • {tx.time}</div>
                  </div>
                  <div className={`font-mono font-bold ${tx.isDebit ? 'text-slate-900' : 'text-emerald-600'}`}>
                    {tx.credit}
                  </div>
                </div>
              ))}
            </div>
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
                  defaultValue="Wuse 2 Express Mart & Hub"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">NDAPS Digital Postcode</label>
                <input
                  type="text"
                  disabled
                  defaultValue="FC-01-A03-FK-01"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono font-bold text-teal-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Physical Street Address</label>
                <input
                  type="text"
                  disabled
                  defaultValue="Plot 112 Aminu Kano Crescent, Wuse 2, Abuja"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>
            </div>

            <div className="space-y-4">
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
                      <div className="font-bold text-slate-800">Mallam Ibrahim</div>
                      <div className="text-[10px] text-slate-500">Hub Owner / Manager</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 text-[10px] font-bold">Admin</span>
                  </div>
                  <div className="py-1.5 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-800">Zainab Aliyu</div>
                      <div className="text-[10px] text-slate-500">Intake & Handover Clerk</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">Staff PIN</span>
                  </div>
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
