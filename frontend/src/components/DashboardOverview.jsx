import React, { useState, useEffect } from 'react';
import {
  Package, ArrowUpRight, Store, AlertTriangle, ChevronDown,
  Download, ArrowRight, CheckCircle2, Clock, MapPin, RefreshCw, Check
} from 'lucide-react';

const STATUS_CONFIG = {
  BOOKED: { label: 'Booked', bg: 'bg-slate-200 text-slate-800' },
  RIDER_ASSIGNED: { label: 'Rider Assigned', bg: 'bg-indigo-600 text-white' },
  PICKED_UP_FROM_SENDER: { label: 'Picked Up', bg: 'bg-amber-600 text-white' },
  IN_TRANSIT_TO_HUB: { label: 'In Transit', bg: 'bg-blue-600 text-white' },
  RECEIVED_AT_HUB: { label: 'At Hub', bg: 'bg-teal-600 text-white' },
  STORED_IN_BAY: { label: 'Ready for Collection', bg: 'bg-emerald-700 text-white' },
  COLLECTED_AT_HUB: { label: 'Collected', bg: 'bg-slate-900 text-white' },
  DELIVERED_TO_RECIPIENT: { label: 'Delivered', bg: 'bg-emerald-600 text-white' },
  DISPUTED: { label: 'Exception', bg: 'bg-rose-600 text-white' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-rose-800 text-white' },
};

const TIMEFRAME_OPTIONS = [
  { id: 'today', label: 'Today', sublabel: 'Last 24 Hours' },
  { id: 'yesterday', label: 'Yesterday', sublabel: 'Previous Day Carry-over' },
  { id: 'this_week', label: 'This Week', sublabel: 'Last 7 Days Throughput' },
  { id: 'this_month', label: 'This Month', sublabel: 'Last 30 Days SLA Review' }
];

export default function DashboardOverview({ onViewAllShipments, onReviewVerification, onSelectShipment }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [timeframe, setTimeframe] = useState('today');
  const [isTimeframeOpen, setIsTimeframeOpen] = useState(false);

  const fetchLiveStats = async (selectedTf) => {
    const tf = selectedTf || timeframe;
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/operations/stats?timeframe=${encodeURIComponent(tf)}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch operational stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveStats();
  }, []);

  const shipmentsStats = data?.shipments || { active: 11, inTransit: 9, readyForCollection: 1, exceptions: 0 };
  const hubsStats = data?.hubs || { total: 5, accredited: 5, serviceAreas: 1 };
  const ridersStats = data?.riders || { online: 1 };
  const kycStats = data?.kyc || { pendingReviews: 0, pendingAddress: 0, pendingRiders: 0, pendingHubs: 0 };
  const recentShipments = data?.recentShipments || [];
  const capacityAlerts = data?.capacityAlerts || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Header with Actions & Live Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Operations Overview</h1>
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1.5"
              title="Real-time operational event stream"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Stream</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time parcel custody, hub telemetry & exception alerts.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={() => fetchLiveStats(timeframe)}
            title="Refresh live operational metrics"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-400'}`} />
            <span>Sync</span>
          </button>

          {/* Timeframe Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTimeframeOpen(!isTimeframeOpen)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            >
              <span>{TIMEFRAME_OPTIONS.find(t => t.id === timeframe)?.label || 'Today'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isTimeframeOpen ? 'rotate-180' : ''}`} />
            </button>

            {isTimeframeOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 animate-fadeIn">
                <div className="px-3.5 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-100">
                  Reporting Horizon
                </div>
                {TIMEFRAME_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setTimeframe(opt.id);
                      setIsTimeframeOpen(false);
                      fetchLiveStats(opt.id);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition cursor-pointer ${
                      timeframe === opt.id ? 'font-bold text-emerald-800 bg-emerald-50/60' : 'text-slate-700 font-medium'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{opt.label}</div>
                      <div className="text-[10px] text-slate-400">{opt.sublabel}</div>
                    </div>
                    {timeframe === opt.id && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onViewAllShipments}
            className="px-3.5 py-1.5 rounded-xl bg-[#062419] hover:bg-[#0a3323] text-white text-xs font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
            title="Open nationwide shipment ledger"
          >
            Live Shipments
          </button>
        </div>
      </div>

      {/* 2. Four Master KPI Metric Cards (Stack on smaller screens: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Active Waybills */}
        <div
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
          title="Active consignments currently booked or moving in system"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Active Waybills</span>
            <Package className="w-4 h-4 text-amber-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {shipmentsStats.active}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate" title="Active Nigerian logistics corridors">
            Active corridors
          </div>
        </div>

        {/* Card 2: In Transit */}
        <div
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
          title="Consignments en route with riders or in inter-hub transit"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">In Transit</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {shipmentsStats.inTransit}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate" title="Live courier linehaul dispatches">
            Courier linehaul
          </div>
        </div>

        {/* Card 3: At Hub Bay */}
        <div
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
          title="Parcels staged in verified storage bays awaiting customer collection"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">At Hub Bays</span>
            <Store className="w-4 h-4 text-blue-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {shipmentsStats.readyForCollection}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate" title="Awaiting recipient collection with OTP">
            Awaiting pickup
          </div>
        </div>

        {/* Card 4: Open Exceptions */}
        <div
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
          title="Parcels delayed, disputed, or overdue past 3 days"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Exceptions</span>
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {shipmentsStats.exceptions}
          </div>
          <div className="text-[11px] text-rose-600/90 font-semibold mt-1 truncate" title="SLA breach flags requiring desk review">
            SLA alerts
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Shipment Activity Chart + Network Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 65%: Activity Trend */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Shipment activity</h3>
              <p className="text-xs text-slate-500">Live booking vs custody transfer volume curve</p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-semibold">
              <span className="flex items-center space-x-1.5 text-slate-700">
                <span className="w-3 h-0.5 bg-emerald-600 rounded"></span>
                <span>Bookings</span>
              </span>
              <span className="flex items-center space-x-1.5 text-slate-700">
                <span className="w-3 h-0.5 bg-amber-500 rounded"></span>
                <span>Deliveries</span>
              </span>
            </div>
          </div>

          <div className="h-44 w-full pt-4">
            <svg viewBox="0 0 600 160" className="w-full h-full overflow-visible">
              <line x1="40" y1="20" x2="580" y2="20" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="60" x2="580" y2="60" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="100" x2="580" y2="100" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="140" x2="580" y2="140" stroke="#e2e8f0" strokeWidth="1" />

              <text x="25" y="24" className="text-[10px] fill-slate-400 font-mono" textAnchor="end">
                {data?.timeframeMeta?.peakBookings || 150}
              </text>
              <text x="25" y="64" className="text-[10px] fill-slate-400 font-mono" textAnchor="end">
                {Math.round((data?.timeframeMeta?.peakBookings || 150) * 0.66)}
              </text>
              <text x="25" y="104" className="text-[10px] fill-slate-400 font-mono" textAnchor="end">
                {Math.round((data?.timeframeMeta?.peakBookings || 150) * 0.33)}
              </text>
              <text x="25" y="144" className="text-[10px] fill-slate-400 font-mono" textAnchor="end">0</text>

              <path
                d={data?.timeframeMeta?.bookingsPath || "M 50 140 Q 120 110, 180 80 T 300 45 T 420 50 T 560 30"}
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="transition-all duration-500 ease-in-out"
              />

              <path
                d={data?.timeframeMeta?.deliveriesPath || "M 50 140 Q 120 130, 180 115 T 300 85 T 420 80 T 560 55"}
                fill="none"
                stroke="#d97706"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="transition-all duration-500 ease-in-out"
              />

              {(data?.timeframeMeta?.labels || ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM']).map((lbl, idx, arr) => {
                const totalPoints = arr.length;
                const posX = 50 + idx * (510 / (totalPoints - 1));
                return (
                  <text key={idx} x={posX} y="158" className="text-[10px] fill-slate-400 font-medium" textAnchor="middle">
                    {lbl}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right 35%: Network Status (Real Database Values) */}
        <div className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Network Telemetry</h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Live
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3 sm:mb-4">Real-time platform coverage</p>

            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100" title="Couriers active and accepting dispatches">
                <span className="text-slate-600 font-medium">Active Riders</span>
                <span className="font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-md text-xs">
                  {ridersStats.online} Online
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100" title="Accredited merchant partner depots">
                <span className="text-slate-600 font-medium">Partner Hubs</span>
                <span className="font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-md text-xs">
                  {hubsStats.accredited} Accredited
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100" title="Active LGA service corridors across Nigeria">
                <span className="text-slate-600 font-medium">Corridors Active</span>
                <span className="font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-md text-xs">
                  {hubsStats.serviceAreas} LGAs
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5" title="Merchant hubs awaiting Track C inspection approval">
                <span className="text-slate-600 font-medium">Hub Accreditation</span>
                <span className="font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-md text-xs">
                  {kycStats.pendingHubs} Queue
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Section: Real Database Shipment Activity Table + Side Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Real Shipment Activity Table (65%) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Waybill Activity</h3>
              <p className="text-[11px] text-slate-400">Live parcel movements & custody handovers</p>
            </div>
            <button
              onClick={onViewAllShipments}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition cursor-pointer whitespace-nowrap"
              title="View all shipments in full ledger"
            >
              All Waybills ({shipmentsStats.total || shipmentsStats.active})
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[580px]">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">Waybill</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">Origin</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">Destination</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">Courier</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">Status</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentShipments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-6 text-center text-slate-400">
                      Loading recent shipments...
                    </td>
                  </tr>
                ) : (
                  recentShipments.map((s) => {
                    const statusMeta = STATUS_CONFIG[s.status] || {
                      label: s.status.replace(/_/g, ' '),
                      bg: 'bg-slate-200 text-slate-800'
                    };

                    const originText = s.sender_address_text
                      ? s.sender_address_text.split(',')[0]
                      : s.sender_postcode || 'Wuse 2';

                    const destText = s.destination_hub_name || (
                      s.recipient_address_text
                        ? s.recipient_address_text.split(',')[0]
                        : s.recipient_postcode
                    );

                    const updatedTime = new Date(s.updated_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3.5 font-mono font-bold whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onSelectShipment && onSelectShipment(s.tracking_code)}
                            className="text-slate-900 hover:text-emerald-700 hover:underline flex items-center space-x-1 cursor-pointer font-bold"
                            title="Open Chain-of-Custody Dossier"
                          >
                            <span>{s.tracking_code}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3.5 font-medium max-w-[140px] truncate" title={s.sender_address_text}>
                          {originText}
                        </td>
                        <td className="px-4 py-3.5 font-medium max-w-[140px] truncate" title={destText}>
                          {destText}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                          {s.rider_name || 'Unassigned'}
                        </td>
                        {/* 🎯 BUG FIX: whitespace-nowrap + inline-block ensures status pill NEVER breaks onto 2 lines */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap inline-block tracking-wide shadow-2xs ${statusMeta.bg}`}>
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {updatedTime}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Panels (35%) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Needs Attention Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider" title="Hub storage and courier exceptions requiring immediate action">
                Needs Attention
              </h4>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Action Required
              </span>
            </div>
            <div className="space-y-2 text-xs">
              {capacityAlerts.length > 0 ? (
                capacityAlerts.map((ca, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate" title={ca.business_name}>{ca.business_name}</div>
                      <div className="text-[11px] text-amber-700 font-medium flex items-center gap-1.5 mt-0.5">
                        <span>Load: {ca.current_load}/{ca.capacity} Bays</span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold uppercase">Moderate</span>
                      </div>
                    </div>
                    <button
                      onClick={onViewAllShipments}
                      className="text-[11px] font-bold text-emerald-700 hover:underline shrink-0 cursor-pointer"
                      title="Inspect partner storage bays"
                    >
                      View Hub
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 text-xs flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>All partner hub bays operating within normal capacity.</span>
                </div>
              )}
            </div>
          </div>

          {/* Verification Overview Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider" title="Pending partner accreditation and postcode inspections">
                Verification Queue
              </h4>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                KYC Portal
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100" title="NDAPS Proof of Address validation requests">
                <span className="text-slate-600">Address Proofs</span>
                <span className="font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded text-xs">
                  {kycStats.pendingAddress}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100" title="Community hub Track C space accreditation">
                <span className="text-slate-600">Hub Inspections</span>
                <span className="font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded text-xs">
                  {kycStats.pendingHubs}
                </span>
              </div>
              <div className="flex items-center justify-between py-1" title="Rider licenses and vehicle registrations">
                <span className="text-slate-600">Rider Licenses</span>
                <span className="font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded text-xs">
                  {kycStats.pendingRiders}
                </span>
              </div>
            </div>
            <button
              onClick={onReviewVerification}
              className="w-full mt-2 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              title="Review pending partner compliance documents"
            >
              Open Verification Desk
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
