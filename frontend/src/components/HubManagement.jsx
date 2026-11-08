import React, { useState, useEffect, useMemo } from 'react';
import {
  Store, Warehouse, MapPin, Shield, ShieldCheck, ShieldAlert, AlertTriangle,
  CheckCircle2, Clock, Search, Filter, RefreshCw, Download, ChevronRight,
  ChevronLeft, Copy, Check, X, ExternalLink, Star, Phone, Mail, Lock, Unlock,
  Eye, Package, Layers, Flame, Camera, SlidersHorizontal, UserCheck, AlertCircle
} from 'lucide-react';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Hubs' },
  { id: 'ACCREDITED', label: 'Accredited / Active' },
  { id: 'NEAR_CAPACITY', label: 'Near Capacity (>70%)' },
  { id: 'PENDING', label: 'Pending Accreditation' },
  { id: 'SUSPENDED', label: 'Suspended' },
];

export default function HubManagement({ onSelectShipment }) {
  const [hubs, setHubs] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    accredited: 0,
    pending: 0,
    suspended: 0,
    near_capacity: 0,
    avg_utilization_pct: '0.0',
    total_parcels_stored: 0,
    reviews_due: 0
  });
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('ALL');
  const [capacityFilter, setCapacityFilter] = useState('ALL');
  const [intakeFilter, setIntakeFilter] = useState('ALL');
  const [copiedKey, setCopiedKey] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal & Inspector states
  const [selectedHub, setSelectedHub] = useState(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [hubDetails, setHubDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  const fetchHubs = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (activeTab !== 'ALL') params.append('status', activeTab);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedState !== 'ALL') params.append('state', selectedState);
      if (capacityFilter !== 'ALL') params.append('capacity', capacityFilter);

      const res = await fetch(`/api/v1/operations/hubs?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();

      let filtered = data.hubs || [];
      if (intakeFilter === 'ACCEPTING') {
        filtered = filtered.filter(h => h.is_accepting_parcels === true);
      } else if (intakeFilter === 'PAUSED') {
        filtered = filtered.filter(h => h.is_accepting_parcels === false);
      }

      setHubs(filtered);
      if (data.counts) setCounts(data.counts);
      if (data.states) setStates(data.states);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error fetching hubs:', err);
      setError('Failed to retrieve partner hub records. Check backend connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHubs();
  }, [activeTab, selectedState, capacityFilter, intakeFilter]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHubs();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Copy to clipboard helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Inspect Hub Dossier & Bays
  const openHubDossier = async (hub) => {
    setSelectedHub(hub);
    setIsDossierOpen(true);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/v1/operations/hubs/${hub.id}/details`);
      if (!res.ok) throw new Error('Failed to fetch hub details');
      const data = await res.json();
      setHubDetails(data);
    } catch (err) {
      console.error('Failed to load hub details:', err);
      setHubDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Toggle Ingestion Intake
  const handleToggleIntake = async (hubId, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/v1/operations/hubs/${hubId}/toggle-intake`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle intake');

      setActionNotice({
        type: 'success',
        message: data.message || `Hub intake updated to ${data.is_accepting_parcels ? 'Active' : 'Suspended'}`
      });

      // Update in place
      setHubs(prev => prev.map(h => h.id === hubId ? { ...h, is_accepting_parcels: data.is_accepting_parcels } : h));
      if (selectedHub && selectedHub.id === hubId) {
        setSelectedHub(prev => ({ ...prev, is_accepting_parcels: data.is_accepting_parcels }));
      }
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      alert(`Error toggling intake: ${err.message}`);
    }
  };

  // Toggle Hub Status (Accreditation / Suspend)
  const handleToggleStatus = async (hubId, targetStatus, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to mark this hub as ${targetStatus.toUpperCase()}?`)) return;

    try {
      const res = await fetch(`/api/v1/operations/hubs/${hubId}/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update hub status');

      setActionNotice({
        type: 'success',
        message: data.message || `Hub status updated to ${targetStatus}`
      });

      // Update in place
      setHubs(prev => prev.map(h => h.id === hubId ? { ...h, status: targetStatus } : h));
      if (selectedHub && selectedHub.id === hubId) {
        setSelectedHub(prev => ({ ...prev, status: targetStatus }));
      }
      fetchHubs(true);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      alert(`Error updating hub status: ${err.message}`);
    }
  };

  // CSV Export
  const exportToCsv = () => {
    if (!hubs.length) return;
    const headers = [
      'Hub Name', 'Owner / Operator', 'CAC Number', 'Phone', 'Email',
      'NDAPS Postcode', 'Street Address', 'LGA', 'State',
      'Capacity', 'Current Load', 'Utilization %', 'Intake Active',
      'Track C Status', 'Rating'
    ];
    const rows = hubs.map(h => [
      `"${h.business_name || ''}"`,
      `"${h.owner_name || ''}"`,
      `"${h.cac_number || ''}"`,
      `"${h.phone || ''}"`,
      `"${h.email || ''}"`,
      `"${h.postcode || ''}"`,
      `"${(h.address_text || '').replace(/"/g, '""')}"`,
      `"${h.lga || ''}"`,
      `"${h.state || ''}"`,
      `"${h.capacity || 0}"`,
      `"${h.current_load || 0}"`,
      `"${h.utilization_pct || 0}%"`,
      `"${h.is_accepting_parcels ? 'Yes' : 'No'}"`,
      `"${h.status || ''}"`,
      `"${h.rating || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `hotbox_partner_hubs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination calculation
  const totalRecords = hubs.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const paginatedHubs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return hubs.slice(start, start + pageSize);
  }, [hubs, currentPage, pageSize]);

  // Color helper for capacity utilization
  const getCapacityColor = (pct) => {
    const val = parseFloat(pct) || 0;
    if (val >= 85) return { bar: 'bg-rose-500', text: 'text-rose-700', badge: 'bg-rose-50 border-rose-200' };
    if (val >= 65) return { bar: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-50 border-amber-200' };
    return { bar: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-50 border-emerald-200' };
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
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Partner Hub Network
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">NDAPS Logistics Depots</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight" title="Monitor partner storage bay capacity, manage Track C security accreditation, and regulate real-time intake ingestion across Nigeria's NDAPS digital postcode network.">
            Partner Hub Desk
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Storage bay capacity, Track C security accreditation & parcel intake.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={() => fetchHubs(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl transition"
            title="Refresh hub network records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportToCsv}
            disabled={!hubs.length}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition disabled:opacity-50"
            title="Export partner hubs to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Hubs</span>
          </button>
        </div>
      </div>

      {/* 2. Four Capacity & Network KPI Cards (Stack on small screens: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Hubs */}
        <div
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
          title="Total accredited and staged community partner hubs across Nigeria"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Partner Hubs</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="text-2xl font-black text-slate-900">{counts.total || 0}</div>
            <div className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1 truncate" title="Accredited and active for drop-off and collection">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{counts.accredited || 0} Accredited</span>
            </div>
          </div>
        </div>

        {/* Card 2: Average Utilization */}
        <div
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
          title="Overall compartment storage load across all active hubs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Capacity Load</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="text-2xl font-black text-slate-900">{counts.avg_utilization_pct || '0.0'}%</div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(parseFloat(counts.avg_utilization_pct) || 0, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Stored Parcels Awaiting Collection */}
        <div
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
          title="Parcels currently stored in bays waiting for recipient pickup or courier transfer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">In-Bay Custody</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="text-2xl font-black text-slate-900">{counts.total_parcels_stored || 0}</div>
            <div className="text-[11px] text-amber-600 font-bold mt-1 flex items-center gap-1 truncate" title="Parcels staged awaiting customer OTP handover">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Awaiting pickup</span>
            </div>
          </div>
        </div>

        {/* Card 4: Track C Reviews Due */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Track C Reviews Due</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{counts.reviews_due || 0}</div>
            <div className="text-[11px] text-purple-600 font-bold mt-1 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              <span>Safety & Premises Audits Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Segment Filter Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-200 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          let badgeCount = null;
          if (tab.id === 'ALL') badgeCount = counts.total;
          else if (tab.id === 'ACCREDITED') badgeCount = counts.accredited;
          else if (tab.id === 'NEAR_CAPACITY') badgeCount = counts.near_capacity;
          else if (tab.id === 'PENDING') badgeCount = counts.pending;
          else if (tab.id === 'SUSPENDED') badgeCount = counts.suspended;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition whitespace-nowrap border-b-2 ${
                isActive
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              {badgeCount !== null && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Hub Name, NDAPS Postcode, Address, CAC..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
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

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* State Filter */}
          <div className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All States</option>
              {states.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Capacity Filter */}
          <div className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={capacityFilter}
              onChange={(e) => setCapacityFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Utilization</option>
              <option value="LOW">Low (&lt;50%)</option>
              <option value="MEDIUM">Medium (50% - 80%)</option>
              <option value="HIGH">Critical (&gt;80%)</option>
            </select>
          </div>

          {/* Intake Filter */}
          <div className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={intakeFilter}
              onChange={(e) => setIntakeFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Intake Status</option>
              <option value="ACCEPTING">Accepting Parcels</option>
              <option value="PAUSED">Intake Suspended</option>
            </select>
          </div>

          {(selectedState !== 'ALL' || capacityFilter !== 'ALL' || intakeFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedState('ALL');
                setCapacityFilter('ALL');
                setIntakeFilter('ALL');
                setSearchQuery('');
                setActiveTab('ALL');
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 px-2 py-1 transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 5. Ten-Column Data Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Loading partner hub directory...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-xs text-rose-600 font-bold">{error}</p>
            <button
              onClick={() => fetchHubs(true)}
              className="px-4 py-2 text-xs font-bold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
            >
              Retry Connection
            </button>
          </div>
        ) : paginatedHubs.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Store className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No partner hubs found</p>
            <p className="text-xs text-slate-400">Try adjusting your search criteria or filter tags.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Hub Name & Operator</th>
                  <th className="py-3.5 px-4">NDAPS Postcode</th>
                  <th className="py-3.5 px-4">Address & LGA</th>
                  <th className="py-3.5 px-4">Hours & Contact</th>
                  <th className="py-3.5 px-4">Capacity Load</th>
                  <th className="py-3.5 px-4">Bay Allocation</th>
                  <th className="py-3.5 px-4">Security Amenities</th>
                  <th className="py-3.5 px-4">Intake Status</th>
                  <th className="py-3.5 px-4">Track C Accreditation</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedHubs.map((hub) => {
                  const capStyle = getCapacityColor(hub.utilization_pct);
                  const isAccredited = hub.status === 'accredited';
                  const isPending = hub.status === 'pending';
                  const isSuspended = hub.status === 'suspended';

                  return (
                    <tr
                      key={hub.id}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                      onClick={() => openHubDossier(hub)}
                    >
                      {/* Col 1: Hub Name & Operator */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Store className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span className="truncate max-w-[180px]">{hub.business_name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>{hub.owner_name}</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-[10px] text-slate-400">{hub.cac_number}</span>
                        </div>
                      </td>

                      {/* Col 2: NDAPS Digital Postcode Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(hub.postcode, `postcode-${hub.id}`);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[11px] font-bold hover:bg-emerald-100 transition cursor-pointer"
                          title="Click to copy NDAPS postcode"
                        >
                          <MapPin className="w-3 h-3 text-emerald-600" />
                          <span>{hub.postcode}</span>
                          {copiedKey === `postcode-${hub.id}` ? (
                            <Check className="w-3 h-3 text-emerald-700" />
                          ) : (
                            <Copy className="w-3 h-3 text-emerald-400 opacity-60 hover:opacity-100" />
                          )}
                        </div>
                      </td>

                      {/* Col 3: Address & LGA */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium truncate max-w-[200px]" title={hub.address_text}>
                          {hub.address_text}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {hub.lga}, {hub.state}
                        </div>
                      </td>

                      {/* Col 4: Hours & Contact */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{hub.opening_hours || '08:00 - 20:00'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />
                          <span>{hub.phone}</span>
                        </div>
                      </td>

                      {/* Col 5: Capacity Load */}
                      <td className="py-3.5 px-4 whitespace-nowrap min-w-[140px]">
                        <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                          <span className={capStyle.text}>{hub.current_load} / {hub.capacity} pkgs</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${capStyle.badge} ${capStyle.text}`}>
                            {hub.utilization_pct}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${capStyle.bar} transition-all duration-300`}
                            style={{ width: `${Math.min(parseFloat(hub.utilization_pct) || 0, 100)}%` }}
                          />
                        </div>
                      </td>

                      {/* Col 6: Bay Allocation */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold">
                          <Warehouse className="w-3 h-3 text-slate-500" />
                          <span>{hub.occupied_bays || 0} / {hub.total_bays || 5} Bays</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {hub.available_slots || 0} slots available
                        </div>
                      </td>

                      {/* Col 7: Security Amenities */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1 max-w-[160px]">
                          {(hub.security_features || []).map((sec, idx) => {
                            let icon = <Shield className="w-2.5 h-2.5" />;
                            let label = sec;
                            if (sec === 'cctv') {
                              icon = <Camera className="w-2.5 h-2.5 text-blue-600" />;
                              label = 'CCTV';
                            } else if (sec === 'fire_extinguisher') {
                              icon = <Flame className="w-2.5 h-2.5 text-rose-600" />;
                              label = 'Fire Ext';
                            } else if (sec === 'locked_storage') {
                              icon = <Lock className="w-2.5 h-2.5 text-emerald-600" />;
                              label = 'Lock Vault';
                            } else if (sec === 'biometric_access') {
                              icon = <UserCheck className="w-2.5 h-2.5 text-indigo-600" />;
                              label = 'Biometrics';
                            }
                            return (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-[9px] font-bold text-slate-600"
                              >
                                {icon}
                                {label}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Col 8: Intake Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={(e) => handleToggleIntake(hub.id, e)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
                            hub.is_accepting_parcels
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                          }`}
                          title="Click to toggle intake"
                        >
                          {hub.is_accepting_parcels ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Accepting Intake
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Intake Paused
                            </>
                          )}
                        </button>
                      </td>

                      {/* Col 9: Track C Accreditation */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          isAccredited
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isPending
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {isAccredited ? (
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          ) : isPending ? (
                            <Clock className="w-3 h-3 text-amber-600" />
                          ) : (
                            <ShieldAlert className="w-3 h-3 text-rose-600" />
                          )}
                          {isAccredited ? 'Accredited' : isPending ? 'Pending Audit' : 'Suspended'}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                          <span>{hub.rating || '5.0'} ({hub.total_ratings || 0})</span>
                        </div>
                      </td>

                      {/* Col 10: Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openHubDossier(hub)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition"
                            title="Inspect Hub & Bays"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isAccredited ? (
                            <button
                              onClick={(e) => handleToggleStatus(hub.id, 'suspended', e)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Suspend Hub"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleToggleStatus(hub.id, 'accredited', e)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                              title="Reinstate / Accredit Hub"
                            >
                              <Unlock className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        {!loading && paginatedHubs.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Showing</span>
              <span className="font-bold text-slate-900">
                {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalRecords)}
              </span>
              <span>of</span>
              <span className="font-bold text-slate-900">{totalRecords}</span>
              <span>partner hubs</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-bold text-slate-800 px-2">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Hub Dossier & Storage Bays Inspector Modal */}
      {isDossierOpen && selectedHub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white">{selectedHub.business_name}</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-700">
                      Track C Accredited
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Operator: {selectedHub.owner_name} • CAC: {selectedHub.cac_number}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsDossierOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
              {loadingDetails ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                  <p className="text-xs text-slate-500 font-semibold">Loading storage bays and security logs...</p>
                </div>
              ) : (
                <>
                  {/* Top Stats Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">NDAPS Postcode</div>
                      <div className="text-xs font-mono font-black text-emerald-700 mt-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{selectedHub.postcode}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">{selectedHub.neighbourhood}, {selectedHub.state}</div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Capacity & Load</div>
                      <div className="text-base font-black text-slate-900 mt-1">
                        {selectedHub.current_load} / {selectedHub.capacity}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {selectedHub.utilization_pct}% utilized ({selectedHub.available_slots || 0} slots free)
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Intake Status</div>
                      <div className="text-xs font-bold mt-1 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${selectedHub.is_accepting_parcels ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className={selectedHub.is_accepting_parcels ? 'text-emerald-700' : 'text-amber-700'}>
                          {selectedHub.is_accepting_parcels ? 'Accepting Parcels' : 'Intake Suspended'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Hours: {selectedHub.opening_hours}</div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reputation & SLA</div>
                      <div className="text-base font-black text-slate-900 mt-1 flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span>{selectedHub.rating || '5.0'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">{selectedHub.total_ratings || 0} verified customer reviews</div>
                    </div>
                  </div>

                  {/* Storage Bays Visual Grid */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Warehouse className="w-4 h-4 text-emerald-600" />
                          Compartmentalized Storage Bays ({hubDetails?.bays?.length || 0} Total)
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Physical locker units and secure shelf compartments assigned to active shipments.
                        </p>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          Available
                        </span>
                        <span className="flex items-center gap-1.5 text-blue-700 font-semibold">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          Occupied
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {(hubDetails?.bays || []).map((bay) => (
                        <div
                          key={bay.id}
                          className={`p-3.5 rounded-2xl border text-center transition ${
                            bay.is_occupied
                              ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                              : 'bg-emerald-50/40 border-emerald-200 text-emerald-900 border-dashed'
                          }`}
                        >
                          <div className="text-xs font-black tracking-tight">{bay.bay_code}</div>
                          <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                            Tier: {bay.size_tier}
                          </div>

                          <div className="mt-2.5">
                            {bay.is_occupied ? (
                              <div className="space-y-1">
                                <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-black bg-blue-100 text-blue-800">
                                  OCCUPIED
                                </span>
                                {bay.tracking_code ? (
                                  <div
                                    onClick={() => onSelectShipment && onSelectShipment(bay.tracking_code)}
                                    className="text-[10px] font-mono text-blue-700 underline cursor-pointer truncate mt-1"
                                    title={bay.tracking_code}
                                  >
                                    {bay.tracking_code}
                                  </div>
                                ) : (
                                  <div className="text-[9px] text-slate-400 italic">Parcel In Custody</div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                VACANT
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Security Features & Track C Compliance */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Facility Amenities */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-emerald-600" />
                        Facility Amenities & Security Hardware
                      </h3>
                      <div className="space-y-2">
                        {(selectedHub.security_features || []).map((sec, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="font-semibold text-slate-700 capitalize">
                              {sec.replace(/_/g, ' ')}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                              <CheckCircle2 className="w-3 h-3" />
                              Hardware Verified
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Operational Details */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-blue-600" />
                        Dropzone Geographic & Contact Coordinates
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-500">Contact Telephone:</span>
                          <span className="font-bold text-slate-800">{selectedHub.phone}</span>
                        </div>
                        <div className="flex justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-500">Operational Email:</span>
                          <span className="font-bold text-slate-800">{selectedHub.email}</span>
                        </div>
                        <div className="flex justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-500">GPS Coordinates:</span>
                          <span className="font-mono text-slate-700">{selectedHub.lat}, {selectedHub.lng}</span>
                        </div>
                        <div className="flex justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-500">Assigned LGA:</span>
                          <span className="font-bold text-slate-800">{selectedHub.lga}, {selectedHub.state}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleIntake(selectedHub.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition border ${
                    selectedHub.is_accepting_parcels
                      ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  }`}
                >
                  {selectedHub.is_accepting_parcels ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      Pause Parcel Intake
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      Resume Parcel Intake
                    </>
                  )}
                </button>

                {selectedHub.status === 'accredited' ? (
                  <button
                    onClick={() => handleToggleStatus(selectedHub.id, 'suspended')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-300 hover:bg-rose-100 transition"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Suspend Hub Accreditation
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleStatus(selectedHub.id, 'accredited')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve Accreditation
                  </button>
                )}
              </div>

              <button
                onClick={() => setIsDossierOpen(false)}
                className="px-5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
