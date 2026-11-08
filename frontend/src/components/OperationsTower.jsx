import React, { useState, useEffect } from 'react';
import { ShieldCheck, MapPin, Package, Users, Activity, Filter, CheckCircle2, AlertTriangle } from 'lucide-react';
import { STATUS_STYLES } from '../styles/designTokens';

export default function OperationsTower() {
  const [stats, setStats] = useState(null);
  const [adoption, setAdoption] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchOperationsData = async () => {
    try {
      setLoading(true);
      const [sRes, aRes, shRes] = await Promise.all([
        fetch('/api/v1/operations/stats'),
        fetch('/api/v1/operations/postcode-adoption'),
        fetch('/api/v1/operations/active-shipments')
      ]);

      const [sData, aData, shData] = await Promise.all([
        sRes.json(),
        aRes.json(),
        shRes.json()
      ]);

      setStats(sData);
      setAdoption(aData.adoption || []);
      setShipments(shData.shipments || []);
    } catch (err) {
      console.error('Failed to load operations tower data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperationsData();
  }, []);

  const filteredShipments = filterStatus === 'ALL'
    ? shipments
    : shipments.filter(s => s.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Accredited Hubs</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats?.hubs?.accredited || 0}
            <span className="text-xs font-semibold text-slate-400 ml-1.5">/ {stats?.hubs?.total || 0} total</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            Accredited Community Hubs
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active In-Transit</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats?.shipments?.active || 0}
            <span className="text-xs font-semibold text-slate-400 ml-1.5">parcels</span>
          </div>
          <div className="text-[11px] text-blue-600 font-semibold mt-1">
            Real-time custody tracking active
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Verified Fleet Riders</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats?.riders?.online || 0}
            <span className="text-xs font-semibold text-slate-400 ml-1.5">online</span>
          </div>
          <div className="text-[11px] text-indigo-600 font-semibold mt-1">
            NIN & Driver's License Verified
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Verifications Pending</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats?.kyc?.pendingReviews || 0}
            <span className="text-xs font-semibold text-slate-400 ml-1.5">queue</span>
          </div>
          <div className="text-[11px] text-amber-600 font-semibold mt-1">
            Partner & Rider Compliance Queue
          </div>
        </div>
      </div>

      {/* Postcode Adoption Analytics Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              National Digital Postcode Adoption Index
            </h3>
            <p className="text-xs text-slate-500">
              Coverage across Nigerian States, LGAs, and active verified community hubs
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            NIPOST Registry Synced
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">State</th>
                <th className="px-5 py-3">LGA</th>
                <th className="px-5 py-3">Cached Postcodes</th>
                <th className="px-5 py-3">Active Hubs</th>
                <th className="px-5 py-3">Shipments Routed</th>
                <th className="px-5 py-3">Adoption Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {adoption.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-3 font-bold text-slate-900">{row.state}</td>
                  <td className="px-5 py-3">{row.lga}</td>
                  <td className="px-5 py-3 font-mono font-semibold text-slate-600">{row.total_postcodes}</td>
                  <td className="px-5 py-3 font-semibold text-emerald-700">{row.active_hubs}</td>
                  <td className="px-5 py-3 font-semibold text-slate-800">{row.shipments_routed}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Tier 1 Core
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Parcel Monitor */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Live Nationwide Parcel Operations Monitor
            </h3>
            <p className="text-xs text-slate-500">
              Full lifecycle tracking, destination hub assignment, and custody status
            </p>
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Statuses ({shipments.length})</option>
              <option value="BOOKED">Booked</option>
              <option value="IN_TRANSIT_TO_HUB">In Transit</option>
              <option value="STORED_IN_BAY">Stored at Hub</option>
              <option value="COLLECTED_AT_HUB">Collected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Tracking Code</th>
                <th className="px-5 py-3">Service</th>
                <th className="px-5 py-3">Sender ➔ Recipient</th>
                <th className="px-5 py-3">Destination Hub</th>
                <th className="px-5 py-3">Custody Status</th>
                <th className="px-5 py-3">OTPs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredShipments.map(s => {
                const badge = STATUS_STYLES[s.status] || { bg: 'bg-slate-100', text: 'text-slate-800', label: s.status };
                return (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                      {s.tracking_code}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-semibold">
                      {s.service_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{s.sender_name} ({s.sender_postcode})</div>
                      <div className="text-[11px] text-slate-400">➔ {s.recipient_name} ({s.recipient_postcode})</div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">
                      {s.destination_hub_name || 'Direct Door Delivery'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px]">
                      <div>Pickup: <span className="text-emerald-700 font-bold">{s.pickup_otp}</span></div>
                      <div>Delivery: <span className="text-slate-900 font-bold">{s.delivery_otp}</span></div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
