import { apiFetch } from '../lib/api';
import React, { useState, useEffect, useMemo } from 'react';
import {
  User, Bike, Truck, Shield, ShieldCheck, ShieldAlert, AlertTriangle,
  CheckCircle2, Clock, MapPin, Search, Filter, RefreshCw, Download, Plus,
  ChevronRight, ChevronLeft, Copy, Check, X, ExternalLink, Star, Phone,
  Mail, Award, Lock, Unlock, Eye, Send, Warehouse, Package
} from 'lucide-react';

const STATUS_FILTERS = [
  { id: 'ALL', label: 'All Couriers' },
  { id: 'ONLINE', label: 'Online / Ready' },
  { id: 'ON_ROUTE', label: 'On Delivery' },
  { id: 'PENDING', label: 'Pending Verification' },
  { id: 'SUSPENDED', label: 'Suspended' },
];

export default function RiderManagement({ onSelectShipment }) {
  const [riders, setRiders] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    online: 0,
    on_route: 0,
    pending: 0,
    suspended: 0
  });
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('ALL');
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [copiedKey, setCopiedKey] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [selectedRider, setSelectedRider] = useState(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [dispatchRider, setDispatchRider] = useState(null);
  const [unassignedShipments, setUnassignedShipments] = useState([]);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  const fetchRiders = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (activeTab !== 'ALL') params.append('status', activeTab);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedVehicle !== 'ALL') params.append('vehicle_type', selectedVehicle);
      if (selectedCompany !== 'ALL') params.append('courier_id', selectedCompany);

      const res = await apiFetch(`/api/v1/operations/riders?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to fetch rider fleet ledger');
      }
      const data = await res.json();
      setRiders(data.riders || []);
      if (data.counts) setCounts(data.counts);
      if (data.companies) setCompanies(data.companies);
    } catch (err) {
      console.error('Rider fleet fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchRiders();
  }, [activeTab, selectedVehicle, selectedCompany]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setCurrentPage(1);
      fetchRiders();
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Copy helper
  const handleCopy = (text, key, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Format currency
  const formatNaira = (val) => {
    const num = parseFloat(val) || 0;
    return `₦${num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Toggle courier suspension
  const handleToggleStatus = async (rider, e) => {
    if (e) e.stopPropagation();
    const isCurrentlySuspended = rider.status === 'suspended' || !rider.is_active;
    const action = isCurrentlySuspended ? 'reinstate' : 'suspend';
    const confirmMsg = isCurrentlySuspended
      ? `Reinstate ${rider.name}'s dispatch privileges and restore active status?`
      : `Suspend ${rider.name} from accepting dispatches? (This will be logged in the immutable audit trail)`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await apiFetch(`/api/v1/operations/riders/${rider.id}/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: `Operations Admin manual ${action}` })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update courier status');

      setActionNotice({ type: 'success', message: data.message });
      setTimeout(() => setActionNotice(null), 4000);
      fetchRiders(true);
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    }
  };

  // Open manual dispatch modal
  const openDispatchModal = async (rider, e) => {
    if (e) e.stopPropagation();
    setDispatchRider(rider);
    setLoadingShipments(true);
    try {
      const res = await apiFetch('/api/v1/operations/active-shipments?status=AWAITING_HANDOFF');
      if (res.ok) {
        const json = await res.json();
        setUnassignedShipments(json.shipments || []);
      }
    } catch (err) {
      console.error('Failed to load pending shipments:', err);
    } finally {
      setLoadingShipments(false);
    }
  };

  // Assign shipment to courier
  const handleAssignShipment = async (shipmentId) => {
    if (!dispatchRider) return;
    try {
      const res = await apiFetch(`/api/v1/operations/riders/${dispatchRider.id}/assign-shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Assignment failed');

      setActionNotice({ type: 'success', message: data.message });
      setTimeout(() => setActionNotice(null), 4000);
      setDispatchRider(null);
      fetchRiders(true);
    } catch (err) {
      alert(`Assignment failed: ${err.message}`);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (riders.length === 0) return;
    const headers = [
      'Rider Name', 'Phone', 'Email', 'Fleet Affiliation', 'Vehicle Type',
      'Plate Number', 'Drivers License', 'NIN', 'Status', 'Availability',
      'Rating', 'Deliveries', 'Wallet Balance NGN', 'Assigned NDAPS Postcodes'
    ];
    const rows = riders.map(r => [
      `"${r.name || ''}"`,
      `"${r.phone || ''}"`,
      `"${r.email || ''}"`,
      `"${r.company_name || 'Independent'}"`,
      `"${r.vehicle_type || ''}"`,
      `"${r.plate_number || ''}"`,
      `"${r.drivers_license_no || ''}"`,
      `"${r.nin || ''}"`,
      `"${r.status || ''}"`,
      `"${r.is_available ? 'Available' : 'Unavailable'}"`,
      `"${r.rating || ''}"`,
      `"${r.total_deliveries || 0}"`,
      `"${r.wallet_balance_ngn || 0}"`,
      `"${(r.operational_postcodes || []).join('; ')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `hotbox_fleet_riders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination calculation
  const totalRecords = riders.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const paginatedRiders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return riders.slice(start, start + pageSize);
  }, [riders, currentPage, pageSize]);

  // Helper for vehicle icon
  const renderVehicleIcon = (type) => {
    switch ((type || '').toLowerCase()) {
      case 'van':
      case 'truck':
        return <Truck className="w-4 h-4 text-slate-600" />;
      case 'bicycle':
        return <Bike className="w-4 h-4 text-emerald-600" />;
      default:
        return <Bike className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center justify-between shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Fleet & Couriers
            </span>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">Track B Compliance</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1" title="Dispatch coordination, courier availability, vehicle credentials, and NDAPS route coverage across Nigeria.">
            Fleet & Courier Desk
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dispatch coordination, driver credentials & NDAPS corridor coverage.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={handleExportCSV}
            disabled={riders.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition-all disabled:opacity-50"
            title="Export courier fleet records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Fleet</span>
          </button>

          <button
            onClick={() => fetchRiders(true)}
            disabled={refreshing}
            className="p-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 rounded-xl shadow-2xs transition-all disabled:opacity-50"
            title="Refresh fleet feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Four Operational Fleet KPI Cards (Stack on small screens: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Registered Couriers */}
        <div
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
          title="Total registered courier drivers and 3PL partner fleet riders"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Fleet Couriers</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {counts.total || riders.length || 0}
          </div>
          <div className="text-xs text-blue-600 font-semibold mt-1 truncate" title="Independent riders and logistics partner fleets">
            Active roster
          </div>
        </div>

        {/* Active & Online Now */}
        <div
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
          title="Couriers currently checked in and available to claim nearby corridor jobs"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Online & Ready</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-900">
            {counts.online || 0}
          </div>
          <div className="text-xs text-emerald-600 font-semibold mt-1 truncate" title="Ready for immediate doorstep pickup or hub transfer">
            Ready on radar
          </div>
        </div>

        {/* En Route / Active Dispatches */}
        <div
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
          title="Couriers currently in transit holding parcel custody on active manifests"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">On Delivery</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Bike className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-900">
            {counts.on_route || 0}
          </div>
          <div className="text-xs text-indigo-600 font-semibold mt-1 truncate" title="Active custody transfers in progress">
            Active manifests
          </div>
        </div>

        {/* Compliance Pending / Suspended */}
        <div
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
          title="Riders awaiting NIN/FRSC license validation or under administrative review"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Pending Review</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-900">
            {(counts.pending || 0) + (counts.suspended || 0)}
          </div>
          <div className="text-xs text-amber-600 font-semibold mt-1">
            Track B verification or hold
          </div>
        </div>
      </div>

      {/* 3. Segment Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {STATUS_FILTERS.map(tab => {
          const isActive = activeTab === tab.id;
          let countBadge = null;
          if (tab.id === 'ALL') countBadge = counts.total;
          else if (tab.id === 'ONLINE') countBadge = counts.online;
          else if (tab.id === 'ON_ROUTE') countBadge = counts.on_route;
          else if (tab.id === 'PENDING') countBadge = counts.pending;
          else if (tab.id === 'SUSPENDED') countBadge = counts.suspended;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              {countBadge !== undefined && countBadge !== null && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                }`}>
                  {countBadge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Search & Filter Controls Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Courier Name, Phone, Vehicle Plate, License No, or NDAPS Postcode..."
            className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-indigo-500 transition-all font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Vehicle Category Selector */}
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-hidden focus:border-indigo-500 transition-all"
          >
            <option value="ALL">All Vehicle Classes</option>
            <option value="motorcycle">Motorcycle</option>
            <option value="van">Van</option>
            <option value="bicycle">Bicycle</option>
            <option value="truck">Truck</option>
          </select>

          {/* Affiliation / Company Selector */}
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-hidden focus:border-indigo-500 transition-all"
          >
            <option value="ALL">All Affiliations</option>
            <option value="INDEPENDENT">Independent Couriers</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>
                {c.company_name}
              </option>
            ))}
          </select>

          {/* Reset Filters */}
          {(searchQuery || selectedVehicle !== 'ALL' || selectedCompany !== 'ALL' || activeTab !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedVehicle('ALL');
                setSelectedCompany('ALL');
                setActiveTab('ALL');
              }}
              className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 5. Comprehensive 10-Column Fleet Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600">Loading courier fleet ledger...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-800">Failed to load fleet couriers</p>
            <p className="text-xs text-rose-600 font-mono">{error}</p>
            <button
              onClick={() => fetchRiders()}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
            >
              Retry
            </button>
          </div>
        ) : paginatedRiders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <User className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">No couriers match criteria</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search criteria or resetting filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-[200px]">Courier Identity</th>
                  <th className="py-3 px-3 w-[150px]">Fleet Affiliation</th>
                  <th className="py-3 px-3 w-[130px]">Vehicle Profile</th>
                  <th className="py-3 px-3 w-[150px]">Track B Credentials</th>
                  <th className="py-3 px-3 w-[170px]">NDAPS Service Zone</th>
                  <th className="py-3 px-3 w-[130px]">Availability</th>
                  <th className="py-3 px-3 w-[110px]">Performance</th>
                  <th className="py-3 px-3 w-[160px]">Active Custody</th>
                  <th className="py-3 px-3 w-[110px] text-right">Wallet Balance</th>
                  <th className="py-3 px-4 w-[110px] text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paginatedRiders.map((r) => {
                  const isOnline = r.is_available && r.is_active && r.status === 'verified';
                  const isOnRoute = Boolean(r.active_shipment_code);
                  const isSuspended = r.status === 'suspended' || !r.is_active;

                  return (
                    <tr
                      key={r.id}
                      onClick={() => {
                        setSelectedRider(r);
                        setIsDossierOpen(true);
                      }}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      {/* 1. Courier Identity */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0">
                            {r.name ? r.name.charAt(0).toUpperCase() : 'R'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5 whitespace-nowrap">
                              <span>{r.name}</span>
                              {r.status === 'verified' && (
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" title="Track B Verified" />
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5 whitespace-nowrap">
                              {r.phone}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Fleet Affiliation */}
                      <td className="py-2.5 px-3">
                        {r.company_name ? (
                          <div className="max-w-[145px]">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 truncate max-w-full whitespace-nowrap"
                              title={r.company_name}
                            >
                              <Building2Icon className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{r.company_name}</span>
                            </span>
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 whitespace-nowrap">
                            Independent Contractor
                          </span>
                        )}
                      </td>

                      {/* 3. Vehicle Profile */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          {renderVehicleIcon(r.vehicle_type)}
                          <span className="capitalize font-semibold text-slate-800 text-xs">
                            {r.vehicle_type}
                          </span>
                        </div>
                        <div className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5 inline-block whitespace-nowrap">
                          {r.plate_number || 'UNREGISTERED'}
                        </div>
                      </td>

                      {/* 4. Track B Credentials */}
                      <td className="py-2.5 px-3">
                        <div className="font-mono text-[10px] text-slate-600 truncate max-w-[140px] whitespace-nowrap" title={r.drivers_license_no}>
                          {r.drivers_license_no || 'No License Record'}
                        </div>
                        <div className="mt-0.5">
                          {r.status === 'verified' ? (
                            <span className="inline-block text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase whitespace-nowrap">
                              License Verified
                            </span>
                          ) : r.status === 'suspended' ? (
                            <span className="inline-block text-[9px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 uppercase whitespace-nowrap">
                              Expired / Suspended
                            </span>
                          ) : (
                            <span className="inline-block text-[9px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase whitespace-nowrap">
                              Verification Pending
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. NDAPS Service Zone */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col gap-1 max-w-[165px]">
                          {(r.operational_postcodes && r.operational_postcodes.length > 0) ? (
                            <>
                              {r.operational_postcodes.slice(0, 2).map((pc, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 whitespace-nowrap border border-slate-200/50"
                                  title={pc}
                                >
                                  <MapPin className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                  <span>{pc}</span>
                                </span>
                              ))}
                              {r.operational_postcodes.length > 2 && (
                                <span className="text-[10px] font-mono font-bold text-slate-500 whitespace-nowrap pl-0.5">
                                  +{r.operational_postcodes.length - 2} more zones
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic whitespace-nowrap">Unassigned</span>
                          )}
                        </div>
                      </td>

                      {/* 6. Availability Status */}
                      <td className="py-2.5 px-3">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                            <Lock className="w-2.5 h-2.5 shrink-0" />
                            Suspended
                          </span>
                        ) : isOnRoute ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                            On Delivery
                          </span>
                        ) : isOnline ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                            Online & Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                            Offline
                          </span>
                        )}
                      </td>

                      {/* 7. Performance */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 font-bold text-slate-800">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                          <span>{r.rating || '5.00'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {r.total_deliveries || 0} completed
                        </div>
                      </td>

                      {/* 8. Active Custody */}
                      <td className="py-2.5 px-3">
                        {r.active_shipment_code ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onSelectShipment) onSelectShipment(r.active_shipment_code);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-mono font-bold text-[10px] border border-indigo-200 transition whitespace-nowrap"
                              title="Inspect Active Parcel Custody"
                            >
                              <Package className="w-3 h-3 text-indigo-600 shrink-0" />
                              <span>{r.active_shipment_code}</span>
                            </button>
                            <button
                              onClick={(e) => handleCopy(r.active_shipment_code, `track-${r.id}`, e)}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded transition shrink-0"
                              title="Copy Tracking ID"
                            >
                              {copiedKey === `track-${r.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">Idle</span>
                        )}
                      </td>

                      {/* 9. Wallet Balance */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatNaira(r.wallet_balance_ngn)}
                      </td>

                      {/* 10. Actions */}
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSelectedRider(r);
                              setIsDossierOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            title="Inspect Courier Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {isOnline && !isOnRoute && (
                            <button
                              onClick={(e) => openDispatchModal(r, e)}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 transition"
                              title="Manual Dispatch Assignment"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={(e) => handleToggleStatus(r, e)}
                            className={`p-1.5 rounded-lg transition ${
                              isSuspended
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                            }`}
                            title={isSuspended ? 'Reinstate Courier' : 'Suspend Courier'}
                          >
                            {isSuspended ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. Pagination Footer */}
        {!loading && riders.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Showing</span>
              <span className="font-bold text-slate-900">
                {Math.min((currentPage - 1) * pageSize + 1, totalRecords)} - {Math.min(currentPage * pageSize, totalRecords)}
              </span>
              <span>of</span>
              <span className="font-bold text-slate-900">{totalRecords}</span>
              <span>couriers</span>

              <span className="mx-2 text-slate-300">|</span>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-semibold"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>

              <div className="px-3 py-1 text-xs font-bold text-slate-700">
                Page {currentPage} of {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 7. Modal: Courier Dossier & Statutory Inspection */}
      {isDossierOpen && selectedRider && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-lg border border-indigo-500/30">
                  {selectedRider.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black">{selectedRider.name}</h3>
                  <p className="text-xs text-indigo-300 font-mono">
                    ID: {selectedRider.id.slice(0, 13)}... • {selectedRider.company_name || 'Independent Courier'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsDossierOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Profile Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-400 font-semibold mb-1">Phone Number</div>
                  <div className="font-bold text-slate-800 font-mono">{selectedRider.phone}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-400 font-semibold mb-1">Email Address</div>
                  <div className="font-bold text-slate-800 truncate">{selectedRider.email}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-400 font-semibold mb-1">Vehicle Category & Plate</div>
                  <div className="font-bold text-slate-800 capitalize flex items-center gap-1.5">
                    {renderVehicleIcon(selectedRider.vehicle_type)}
                    <span>{selectedRider.vehicle_type} ({selectedRider.plate_number})</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-400 font-semibold mb-1">Track B Driver's License</div>
                  <div className="font-bold text-slate-800 font-mono">{selectedRider.drivers_license_no}</div>
                </div>
              </div>

              {/* National Identity & Statutory Compliance */}
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Regulatory Track B Identity Record
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
                    NIN: {selectedRider.nin || 'Verified on file'}
                  </span>
                </div>
                <p className="text-[11px] text-indigo-800/80">
                  Statutory driver licensing and national identification verified in accordance with NIPOST Courier Regulatory Guidelines and NDAPS standards.
                </p>
              </div>

              {/* NDAPS Assigned Zones */}
              <div>
                <div className="text-xs font-bold text-slate-700 mb-1.5">NDAPS Alphanumeric Postcode Service Zones</div>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedRider.operational_postcodes || []).map((pc, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
                      <MapPin className="w-3 h-3 text-indigo-600" />
                      {pc}
                    </span>
                  ))}
                </div>
              </div>

              {/* Performance & Wallet */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-semibold">Total Completed Jobs</div>
                  <div className="text-lg font-black text-slate-900">{selectedRider.total_deliveries} deliveries</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400 font-semibold">Accrued Wallet Balance</div>
                  <div className="text-lg font-black text-emerald-700 font-mono">
                    {formatNaira(selectedRider.wallet_balance_ngn)}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsDossierOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal: Manual Dispatch Assignment */}
      {dispatchRider && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp">
            <div className="p-5 bg-emerald-950 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-black">Manual Dispatch Assignment</h3>
                <p className="text-xs text-emerald-300">Assign pending parcel to {dispatchRider.name}</p>
              </div>
              <button onClick={() => setDispatchRider(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[400px] overflow-y-auto space-y-3">
              {loadingShipments ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Finding shipments awaiting dispatch...</p>
                </div>
              ) : unassignedShipments.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No shipments currently awaiting dispatch.</p>
                </div>
              ) : (
                unassignedShipments.map(s => (
                  <div
                    key={s.id}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-mono font-bold text-slate-900">{s.tracking_code}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        To: {s.recipient_name} ({s.recipient_postcode})
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                        Fee: {formatNaira(s.pricing_total_ngn)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssignShipment(s.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition"
                    >
                      Assign
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setDispatchRider(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Building2Icon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
      <path d="M10 6h4"/>
      <path d="M10 10h4"/>
      <path d="M10 14h4"/>
      <path d="M10 18h4"/>
    </svg>
  );
}
