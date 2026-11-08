import React, { useState } from 'react';
import {
  Bike, Compass, QrCode, CheckCircle2, Wallet, ShieldCheck,
  Navigation, MapPin, Phone, ArrowRight, DollarSign, Clock,
  AlertTriangle, ExternalLink, User, Calendar, Check
} from 'lucide-react';
import CustodyScanner from './CustodyScanner';

export default function RiderRadarConsole({ activeNav, setActiveNav, hubs, showToast }) {
  // Available corridor jobs
  const [availableJobs, setAvailableJobs] = useState([
    {
      id: 'JOB-7701',
      serviceType: 'Door-to-Hub',
      pickupPostcode: 'FC-01-A03-FK-01',
      pickupAddress: 'Shop 4, Wuse 2 Shopping Plaza, Abuja',
      dropoffPostcode: 'FC-01-A03-FK-01',
      dropoffHub: 'Wuse 2 Express Mart & Hub',
      parcelTier: 'Small (1.2 kg)',
      payout: 1500,
      distanceKm: '1.4 km',
      slaMinutes: '45 mins'
    },
    {
      id: 'JOB-7702',
      serviceType: 'Hub-to-Door',
      pickupPostcode: 'FC-01-A03-FK-01',
      pickupHub: 'Wuse 2 Express Mart & Hub',
      dropoffPostcode: 'FC-01-A02-FK-02',
      dropoffAddress: 'Plot 45, Jabi Lake View Estate, Jabi, Abuja',
      parcelTier: 'Medium (4.5 kg)',
      payout: 2200,
      distanceKm: '3.8 km',
      slaMinutes: '60 mins'
    },
    {
      id: 'JOB-7703',
      serviceType: 'Corridor Transfer',
      pickupPostcode: 'FC-01-A01-FK-03',
      pickupHub: 'Garki Area 1 Hub Station',
      dropoffPostcode: 'FC-01-A03-FK-01',
      dropoffHub: 'Wuse 2 Express Mart & Hub',
      parcelTier: 'Large (12.0 kg)',
      payout: 2800,
      distanceKm: '5.2 km',
      slaMinutes: '90 mins'
    }
  ]);

  // Active route stops
  const [activeRouteStops, setActiveRouteStops] = useState([
    {
      stopNumber: 1,
      type: 'PICKUP',
      title: 'Merchant Parcel Pickup',
      address: 'Plot 112 Aminu Kano Crescent, Wuse 2, Abuja',
      postcode: 'FC-01-A03-FK-01',
      contact: 'Konga Express Merchant (+234 802 334 5566)',
      status: 'COMPLETED',
      trackingCode: 'HBX-FC01A0-4491'
    },
    {
      stopNumber: 2,
      type: 'HUB_HANDOFF',
      title: 'Drop off at Wuse 2 Hub',
      address: 'Plot 112 Aminu Kano Crescent, Wuse 2, Abuja',
      postcode: 'FC-01-A03-FK-01',
      contact: 'Mallam Ibrahim (Hub Host)',
      status: 'IN_PROGRESS',
      trackingCode: 'HBX-FC01A0-4491'
    },
    {
      stopNumber: 3,
      type: 'DOOR_DELIVERY',
      title: 'Doorstep Delivery to Recipient',
      address: 'Suite B12, Jabi Lake Mall, Jabi, Abuja',
      postcode: 'FC-01-A02-FK-02',
      contact: 'Fatima Bello (+234 809 112 9988)',
      status: 'PENDING',
      trackingCode: 'HBX-FC01A0-8912'
    }
  ]);

  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('32500');
  const [payoutLoading, setPayoutLoading] = useState(false);

  const handleClaimJob = (job) => {
    setAvailableJobs(prev => prev.filter(j => j.id !== job.id));
    setActiveRouteStops(prev => [
      ...prev,
      {
        stopNumber: prev.length + 1,
        type: 'CLAIMED_PICKUP',
        title: `Pickup for ${job.id}`,
        address: job.pickupAddress || job.pickupHub,
        postcode: job.pickupPostcode,
        contact: 'Sender Contact on Waybill',
        status: 'PENDING',
        trackingCode: `HBX-FC01A0-${Math.floor(1000 + Math.random() * 9000)}`
      }
    ]);
    if (showToast) showToast(`Claimed job ${job.id}! Added to active route manifest.`);
  };

  const handleWithdrawal = (e) => {
    e.preventDefault();
    setPayoutLoading(true);
    setTimeout(() => {
      setPayoutLoading(false);
      setIsPayoutModalOpen(false);
      if (showToast) showToast('Instant rider payout of ₦' + Number(payoutAmount).toLocaleString() + ' sent to your bank account!');
    }, 900);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Rider Header Banner */}
      <div className="bg-slate-900 text-white p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
              Track B Verified Rider
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              Active Dispatch
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-black mt-1.5">Emeka Nnamdi (Plate: ABJ-432-QA)</h1>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <Navigation className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Corridors: FC-01-A03-FK-01 (Wuse 2) ↔ FC-01-A02-FK-02 (Jabi)</span>
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="bg-slate-800 p-2.5 sm:p-3 rounded-xl border border-slate-700 text-left sm:text-right min-w-[110px]" title="Average customer rating">
            <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-semibold">Rating</div>
            <div className="text-base sm:text-lg font-black text-amber-400">⭐ 4.95 / 5</div>
          </div>
          <div className="bg-slate-800 p-2.5 sm:p-3 rounded-xl border border-slate-700 text-left sm:text-right min-w-[110px]" title="Completed and en-route deliveries today">
            <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-semibold">Today Drops</div>
            <div className="text-base sm:text-lg font-black text-emerald-400">7 Done (1 Route)</div>
          </div>
        </div>
      </div>

      {/* TAB 1: JOB RADAR */}
      {activeNav === 'radar' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Corridor Dispatch Radar</h3>
              <p className="text-xs text-slate-500">Live on-demand pickup and transfer jobs available in your corridor</p>
            </div>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold w-fit">
              {availableJobs.length} Jobs Available
            </span>
          </div>

          <div className="space-y-3">
            {availableJobs.map(job => (
              <div key={job.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-400 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900">{job.id}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {job.serviceType}
                    </span>
                    <span className="text-xs text-slate-500">• {job.distanceKm} away</span>
                    <span className="text-xs text-slate-500">• Est. time: {job.slaMinutes}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Pickup Point</span>
                      <span className="font-semibold text-slate-800">{job.pickupAddress || job.pickupHub}</span>
                      <span className="font-mono text-[10px] text-blue-600 block">{job.pickupPostcode}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Destination</span>
                      <span className="font-semibold text-slate-800">{job.dropoffAddress || job.dropoffHub}</span>
                      <span className="font-mono text-[10px] text-emerald-600 block">{job.dropoffPostcode}</span>
                    </div>
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Rider Payout</div>
                    <div className="text-lg font-black text-slate-900">₦{job.payout.toLocaleString()}</div>
                  </div>
                  <button
                    onClick={() => handleClaimJob(job)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    Claim Job
                  </button>
                </div>
              </div>
            ))}

            {availableJobs.length === 0 && (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                No unclaimed jobs right now in your active corridor. New jobs will appear automatically on the radar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE ROUTE */}
      {activeNav === 'active_route' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Current Trip Manifest & Sequence</h3>
              <p className="text-xs text-slate-500">Ordered pickup and handover stops for your active run</p>
            </div>
            <button
              onClick={() => setActiveNav('scanner')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Open Scanner</span>
            </button>
          </div>

          <div className="space-y-4">
            {activeRouteStops.map(stop => (
              <div
                key={stop.stopNumber}
                className={`p-4 rounded-xl border transition flex items-start justify-between gap-4 ${
                  stop.status === 'COMPLETED'
                    ? 'bg-slate-50 border-slate-200 opacity-60'
                    : stop.status === 'IN_PROGRESS'
                    ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    stop.status === 'COMPLETED'
                      ? 'bg-emerald-600 text-white'
                      : stop.status === 'IN_PROGRESS'
                      ? 'bg-blue-600 text-white animate-pulse'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {stop.status === 'COMPLETED' ? <Check className="w-4 h-4" /> : stop.stopNumber}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{stop.title}</span>
                      <span className="font-mono text-[10px] text-slate-500">({stop.trackingCode})</span>
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded ${
                        stop.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : stop.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {stop.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600">{stop.address}</div>
                    <div className="text-[11px] font-mono text-slate-400">{stop.postcode} • Contact: {stop.contact}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      if (showToast) showToast(`Calling ${stop.contact}`);
                    }}
                    className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600"
                    title="Call Contact"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>

                  {stop.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => setActiveNav('scanner')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      Complete Handover
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CUSTODY SCANNER */}
      {activeNav === 'scanner' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-blue-700" />
              <span><strong>Custody Handover:</strong> Scan sender package at pickup or confirm recipient OTP for doorstep delivery proof.</span>
            </div>
            <span className="font-bold text-[11px] bg-blue-200 px-2 py-0.5 rounded text-blue-900">
              GPS Geolocation Active
            </span>
          </div>

          <CustodyScanner
            activeRole="rider"
            hubs={hubs}
            onCustodySuccess={() => {
              if (showToast) showToast('Rider custody transfer committed to immutable ledger!');
            }}
          />
        </div>
      )}

      {/* TAB 4: DELIVERY TRIP HISTORY */}
      {activeNav === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Completed Delivery Trips Archive</h3>
            <span className="text-xs text-slate-500 font-semibold">342 Lifetime Runs Completed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Tracking Code</th>
                  <th className="py-2.5 px-3">Route Corridor</th>
                  <th className="py-2.5 px-3">Service Type</th>
                  <th className="py-2.5 px-3">Earned Pay</th>
                  <th className="py-2.5 px-3">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { time: 'Today, 1:40 PM', code: 'HBX-FC01A0-4491', corridor: 'Wuse 2 ➔ Jabi Lake Mall', service: 'Door-to-Door', pay: '₦2,400', rating: '5.0 ⭐' },
                  { time: 'Today, 11:15 AM', code: 'HBX-FC01A0-2104', corridor: 'Garki Area 1 ➔ Wuse 2 Hub', service: 'Corridor Transfer', pay: '₦1,800', rating: '5.0 ⭐' },
                  { time: 'Yesterday, 4:20 PM', code: 'HBX-FC01A0-8912', corridor: 'Maitama ➔ Wuse 2 Hub', service: 'Door-to-Hub', pay: '₦1,500', rating: '5.0 ⭐' },
                  { time: 'Yesterday, 2:05 PM', code: 'HBX-FC01A0-6623', corridor: 'Wuse 2 Hub ➔ Jabi Estate', service: 'Hub-to-Door', pay: '₦2,100', rating: '4.8 ⭐' },
                  { time: '29 Oct 2026', code: 'HBX-FC01A0-3319', corridor: 'Central Business ➔ Garki', service: 'Door-to-Door', pay: '₦2,600', rating: '5.0 ⭐' }
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 text-slate-500">{row.time}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{row.code}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{row.corridor}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                        {row.service}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">{row.pay}</td>
                    <td className="py-3 px-3 font-bold text-amber-500">{row.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: EARNINGS & WALLET */}
      {activeNav === 'earnings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs font-semibold">Available for Instant Payout</div>
              <div className="text-2xl font-black text-slate-900 mt-1">₦32,500.00</div>
              <button
                onClick={() => setIsPayoutModalOpen(true)}
                className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Withdraw to Bank
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs font-semibold">Pending Delivery Escrow</div>
              <div className="text-2xl font-black text-slate-900 mt-1">₦6,400.00</div>
              <div className="text-[11px] text-slate-500 mt-3">Releases upon recipient OTP confirmation</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs font-semibold">Total Courier Earnings</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">₦482,900.00</div>
              <div className="text-[11px] text-slate-500 mt-3">Paid across 342 verified deliveries</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: RIDER CREDENTIALS */}
      {activeNav === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Rider Credentials & Track B Accreditation</h3>
              <p className="text-xs text-slate-500">Government driver ID, vehicle documentation, and operational clearance</p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
              Clearance Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  disabled
                  defaultValue="Emeka Nnamdi"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Vehicle License Plate</label>
                <input
                  type="text"
                  disabled
                  defaultValue="ABJ-432-QA (Bajaj Boxer 150cc)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono font-bold text-blue-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Registered Phone Number</label>
                <input
                  type="text"
                  disabled
                  defaultValue="+234 806 112 2336"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Accreditation Checklist</label>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl p-2 bg-slate-50 space-y-1">
                  <div className="py-1.5 flex justify-between items-center">
                    <span>Driver's License (FRSC)</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Verified</span>
                  </div>
                  <div className="py-1.5 flex justify-between items-center">
                    <span>Vehicle Roadworthiness</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Passed</span>
                  </div>
                  <div className="py-1.5 flex justify-between items-center">
                    <span>Track B Courier Licensing</span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">Accredited</span>
                  </div>
                  <div className="py-1.5 flex justify-between items-center">
                    <span>NIN Identity Check</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <h3 className="text-base font-bold text-slate-900">Instant Courier Pay Withdrawal</h3>
            <p className="text-xs text-slate-500">
              Delivery payouts are disbursed instantly to your verified bank account via NIP.
            </p>

            <form onSubmit={handleWithdrawal} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Destination Bank Account</label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="font-bold text-slate-800">Access Bank Plc</div>
                  <div className="font-mono text-slate-500">0098765432 • Emeka Nnamdi</div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Amount to Transfer (₦)</label>
                <input
                  type="number"
                  max="32500"
                  min="1000"
                  value={payoutAmount}
                  onChange={e => setPayoutAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Maximum available: ₦32,500.00</span>
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  {payoutLoading ? 'Processing...' : 'Withdraw to Bank'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
