import React, { useState, useEffect, useMemo } from 'react';
import {
  Package, Search, Filter, RefreshCw, Download, Plus, ChevronRight, ChevronLeft,
  MapPin, CheckCircle2, Clock, AlertTriangle, User, Bike, Warehouse, ShieldAlert,
  ArrowRight, Copy, Check, X, ShieldCheck, ExternalLink, Info
} from 'lucide-react';
import { STATUS_STYLES } from '../styles/designTokens';

// Reusable tooltip component to keep UI clean and layman-friendly
function Tooltip({ children, content, position = 'top' }) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className={`absolute z-50 px-2.5 py-1.5 bg-slate-900 text-white text-[11px] font-normal rounded-lg shadow-xl pointer-events-none border border-slate-700 transition-all ${
            position === 'bottom'
              ? 'top-full left-1/2 -translate-x-1/2 mt-2 max-w-[260px] whitespace-normal text-center leading-snug'
              : 'bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap'
          }`}
        >
          {content}
          {position === 'bottom' ? (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900"></div>
          ) : (
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoTooltip({ text, position = 'bottom' }) {
  return (
    <Tooltip content={text} position={position}>
      <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-pointer ml-1 inline-block shrink-0" />
    </Tooltip>
  );
}

// Enterprise table pagination bar
function TablePagination({ currentPage, setCurrentPage, pageSize, setPageSize, totalItems, label = 'shipments' }) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  if (totalItems <= 0) return null;

  return (
    <div className="bg-slate-50/80 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 rounded-b-xl">
      <div className="flex items-center gap-3">
        <div>
          Showing <span className="font-semibold text-slate-900">{Math.min((currentPage - 1) * pageSize + 1, totalItems)}</span> to{' '}
          <span className="font-semibold text-slate-900">{Math.min(currentPage * pageSize, totalItems)}</span> of{' '}
          <span className="font-semibold text-slate-900">{totalItems}</span> {label}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-semibold focus:outline-none"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1 shadow-2xs font-semibold transition-all"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>
        <span className="px-2 text-slate-900 font-bold">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1 shadow-2xs font-semibold transition-all"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

const STATUS_FILTERS = [
  { id: 'ALL', label: 'All Shipments', tooltip: 'All shipments regardless of status' },
  { id: 'IN_TRANSIT', label: 'In Transit', tooltip: 'Parcels currently en route with couriers' },
  { id: 'AWAITING_HANDOFF', label: 'Awaiting Pickup', tooltip: 'Confirmed orders waiting for courier collection' },
  { id: 'READY_FOR_COLLECTION', label: 'Ready for Pickup', tooltip: 'Stored at neighborhood hub awaiting recipient collection' },
  { id: 'DELIVERED', label: 'Delivered', tooltip: 'Successfully collected by recipient or doorstep delivered' },
  { id: 'EXCEPTIONS', label: 'Exceptions', tooltip: 'Parcels requiring administrative intervention or dispute review' },
];

export default function ShipmentManagement({ onSelectShipment, onNewShipment }) {
  const [shipments, setShipments] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    in_transit: 0,
    awaiting_handoff: 0,
    ready_for_collection: 0,
    delivered: 0,
    exceptions: 0
  });
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filter and search state
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHub, setSelectedHub] = useState('ALL');
  const [selectedService, setSelectedService] = useState('ALL');
  const [copiedCode, setCopiedCode] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch all hubs for dropdown filter
  const fetchHubs = async () => {
    try {
      const res = await fetch('/api/v1/hubs');
      if (res.ok) {
        const json = await res.json();
        setHubs(json.hubs || []);
      }
    } catch (err) {
      console.warn('Failed to load hubs list:', err.message);
    }
  };

  // Fetch active shipments with backend query parameters
  const fetchShipments = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (activeTab !== 'ALL') params.append('status', activeTab);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedHub !== 'ALL') params.append('hub_id', selectedHub);

      const res = await fetch(`/api/v1/operations/active-shipments?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to fetch shipment ledger');
      }
      const data = await res.json();
      setShipments(data.shipments || []);
      if (data.counts) {
        setCounts(data.counts);
      }
    } catch (err) {
      console.error('Shipment ledger fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHubs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchShipments();
  }, [activeTab, selectedHub]);

  // Debounced live search
  useEffect(() => {
    const handler = setTimeout(() => {
      setCurrentPage(1);
      fetchShipments();
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Copy tracking code
  const handleCopyCode = (code, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Format currency
  const formatNaira = (val) => {
    const num = parseFloat(val) || 0;
    return `₦${num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format compact date
  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return isoString;
    }
  };

  // Service Type label and styling
  const renderServiceBadge = (type) => {
    switch (type) {
      case 'DOOR_TO_HUB':
        return (
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80 whitespace-nowrap">
            Door to Hub
          </span>
        );
      case 'HUB_TO_DOOR':
        return (
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200/80 whitespace-nowrap">
            Hub to Door
          </span>
        );
      case 'DOOR_TO_DOOR':
        return (
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 whitespace-nowrap">
            Door to Door
          </span>
        );
      case 'HUB_TO_HUB':
      default:
        return (
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80 whitespace-nowrap">
            Hub to Hub
          </span>
        );
    }
  };

  // Filtered by service type if selected
  const filteredShipments = useMemo(() => {
    if (selectedService === 'ALL') return shipments;
    return shipments.filter(s => s.service_type === selectedService);
  }, [shipments, selectedService]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredShipments.length === 0) return;

    const headers = [
      'Tracking Code', 'Service Type', 'Status', 'Sender Name', 'Sender Phone',
      'Sender Postcode', 'Sender Address', 'Recipient Name', 'Recipient Phone',
      'Recipient Postcode', 'Recipient Address', 'Destination Hub', 'Assigned Bay',
      'Assigned Rider', 'Size', 'Weight (kg)', 'Total Fee (NGN)', 'Created At'
    ];

    const rows = filteredShipments.map(s => [
      `"${s.tracking_code || ''}"`,
      `"${s.service_type || ''}"`,
      `"${s.status || ''}"`,
      `"${s.sender_name || ''}"`,
      `"${s.sender_phone || ''}"`,
      `"${s.sender_postcode || ''}"`,
      `"${(s.sender_address_text || '').replace(/"/g, '""')}"`,
      `"${s.recipient_name || ''}"`,
      `"${s.recipient_phone || ''}"`,
      `"${s.recipient_postcode || ''}"`,
      `"${(s.recipient_address_text || '').replace(/"/g, '""')}"`,
      `"${(s.destination_hub_name || '').replace(/"/g, '""')}"`,
      `"${s.assigned_bay_code || ''}"`,
      `"${s.rider_name || ''}"`,
      `"${s.size || ''}"`,
      `"${s.weight_kg || ''}"`,
      `"${s.pricing_total_ngn || ''}"`,
      `"${s.created_at || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Hotbox-Shipments-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination calculation
  const totalRecords = filteredShipments.length;
  const paginatedShipments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredShipments.slice(start, start + pageSize);
  }, [filteredShipments, currentPage, pageSize]);

  return (
    <div className="space-y-5">
      {/* 1. Compact Header Panel */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Network Desk
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1" title="Real-time custody tracking, route dispatch, and digital postcode verification across all Nigerian courier corridors.">
              Shipment Operations
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live custody tracking, dispatch manifests & NDAPS routing across corridors.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={handleExportCSV}
              disabled={filteredShipments.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition-all disabled:opacity-50"
              title="Export filtered shipments to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => fetchShipments(true)}
              disabled={refreshing}
              className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl shadow-2xs transition-all disabled:opacity-50"
              title="Refresh shipment feed"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {onNewShipment && (
              <button
                onClick={onNewShipment}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
                title="Book a new consignment"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>New Shipment</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Top 4 Courier KPI Cards (Stack on small screens: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 mt-4 sm:mt-5">
          {/* Total Active */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center font-bold text-slate-700">
                Active Waybills
                <InfoTooltip text="Total parcels currently booked or moving across the logistics network." />
              </span>
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {counts.total || shipments.length || 0}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-blue-700 font-medium mt-0.5 truncate" title="Verified nationwide parcel volume">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Verified volume
            </div>
          </div>

          {/* In Transit */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center font-bold text-slate-700">
                In Transit
                <InfoTooltip text="Parcels collected and currently moving between senders, hubs, or recipients." />
              </span>
              <Bike className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl font-bold text-indigo-950 mt-1">
              {counts.in_transit || 0}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-indigo-700 font-medium mt-0.5 truncate" title="Active courier linehaul dispatches">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Dispatched en route
            </div>
          </div>

          {/* Awaiting Pickup */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center font-bold text-slate-700">
                Awaiting Pickup
                <InfoTooltip text="Confirmed orders pending driver arrival at sender doorstep or hub drop-off." />
              </span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-amber-950 mt-1">
              {counts.awaiting_handoff || 0}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-amber-800 font-medium mt-0.5 truncate" title="Orders pending courier collection">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Pending pickup
            </div>
          </div>

          {/* Exceptions */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center font-bold text-slate-700">
                Exceptions
                <InfoTooltip text="Parcels flagged for delivery delays, address issues, or customer claims." />
              </span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-xl font-bold text-rose-950 mt-1">
              {counts.exceptions || 0}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-rose-700 font-medium mt-0.5 truncate" title="Cases requiring manager review">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              Action needed
            </div>
          </div>
        </div>
      </div>

      {/* 3. Compact Filter Tab Bar (No unnecessary horizontal scroll) */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
        {STATUS_FILTERS.map(tab => {
          const isActive = activeTab === tab.id;
          let countBadge = null;
          if (tab.id === 'ALL') countBadge = counts.total;
          else if (tab.id === 'IN_TRANSIT') countBadge = counts.in_transit;
          else if (tab.id === 'AWAITING_HANDOFF') countBadge = counts.awaiting_handoff;
          else if (tab.id === 'READY_FOR_COLLECTION') countBadge = counts.ready_for_collection;
          else if (tab.id === 'DELIVERED') countBadge = counts.delivered;
          else if (tab.id === 'EXCEPTIONS') countBadge = counts.exceptions;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              <span>{tab.label}</span>
              {countBadge !== undefined && countBadge !== null && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                  isActive ? 'bg-slate-800 text-emerald-400' : 'bg-slate-100 text-slate-600'
                }`}>
                  {countBadge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Search & Filter Controls Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-lg">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Tracking ID, Postcode, Sender, Recipient, Hub, or Courier..."
            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Service Selector */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">Service:</span>
            <select
              value={selectedService}
              onChange={(e) => {
                setSelectedService(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none"
            >
              <option value="ALL">All Services</option>
              <option value="DOOR_TO_HUB">Door to Hub</option>
              <option value="HUB_TO_DOOR">Hub to Door</option>
              <option value="DOOR_TO_DOOR">Door to Door</option>
              <option value="HUB_TO_HUB">Hub to Hub</option>
            </select>
          </div>

          {/* Hub Selector */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">Hub:</span>
            <select
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none max-w-[200px] truncate"
            >
              <option value="ALL">All Hubs ({hubs.length})</option>
              {hubs.map(hub => (
                <option key={hub.id} value={hub.id}>
                  {hub.business_name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {(searchQuery || selectedHub !== 'ALL' || selectedService !== 'ALL' || activeTab !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedHub('ALL');
                setSelectedService('ALL');
                setActiveTab('ALL');
              }}
              className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 5. Comprehensive Clean Shipment Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-600">Loading shipment ledger...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-rose-600 mx-auto" />
            <p className="text-xs font-bold text-slate-800">Failed to load shipments</p>
            <p className="text-[11px] text-rose-600 font-mono">{error}</p>
            <button
              onClick={() => fetchShipments()}
              className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg mt-2"
            >
              Retry
            </button>
          </div>
        ) : paginatedShipments.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Package className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">No shipments found</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              {searchQuery || selectedHub !== 'ALL' || selectedService !== 'ALL' || activeTab !== 'ALL'
                ? 'Try adjusting your search criteria or resetting filters.'
                : 'No shipments booked in the network yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3.5 min-w-[175px] whitespace-nowrap">
                    <span className="flex items-center">
                      Tracking ID
                      <InfoTooltip text="Unique scannable parcel reference with size and weight tier." />
                    </span>
                  </th>
                  <th className="py-3 px-3 min-w-[110px]">
                    <span className="flex items-center">
                      Service
                      <InfoTooltip text="Delivery corridor (Door-to-Hub, Hub-to-Door, etc.)." />
                    </span>
                  </th>
                  <th className="py-3 px-3 min-w-[150px] max-w-[170px]">
                    <span className="flex items-center">
                      Origin (Sender)
                      <InfoTooltip text="Sender contact and verified 11-digit pickup digital postcode." />
                    </span>
                  </th>
                  <th className="py-3 px-3 min-w-[150px] max-w-[170px]">
                    <span className="flex items-center">
                      Destination
                      <InfoTooltip text="Recipient contact and verified 11-digit delivery digital postcode." />
                    </span>
                  </th>
                  <th className="py-3 px-3 min-w-[150px] max-w-[170px]">
                    <span className="flex items-center">
                      Current Custody
                      <InfoTooltip text="Authoritative physical holding location and storage bay." />
                    </span>
                  </th>
                  <th className="py-3 px-3 min-w-[130px]">
                    <span className="flex items-center">
                      Courier / Driver
                      <InfoTooltip text="Assigned dispatch courier and vehicle type." />
                    </span>
                  </th>
                  <th className="py-3 px-3 min-w-[130px]">
                    <span className="flex items-center">
                      Status
                      <InfoTooltip text="Current milestone in the parcel lifecycle state machine." />
                    </span>
                  </th>
                  <th className="py-3 px-3 text-right min-w-[90px]">
                    <span className="flex items-center justify-end">
                      Fee
                      <InfoTooltip text="Total logistics fee including distance and insurance surcharges." />
                    </span>
                  </th>
                  <th className="py-3 px-3 min-w-[100px]">Booked</th>
                  <th className="py-3 px-3 text-center min-w-[80px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paginatedShipments.map((s) => {
                  const style = STATUS_STYLES[s.status] || {
                    bg: 'bg-slate-100',
                    text: 'text-slate-700',
                    border: 'border-slate-200',
                    label: s.status?.replace(/_/g, ' ') || 'Unknown'
                  };

                  return (
                    <tr
                      key={s.id}
                      onClick={() => onSelectShipment && onSelectShipment(s.tracking_code)}
                      className="hover:bg-slate-50/70 cursor-pointer transition-colors group"
                    >
                      {/* 1. Tracking ID */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors whitespace-nowrap">
                            {s.tracking_code}
                          </span>
                          <button
                            onClick={(e) => handleCopyCode(s.tracking_code, e)}
                            className="text-slate-400 hover:text-slate-600 p-0.5 shrink-0"
                            title="Copy Tracking ID"
                          >
                            {copiedCode === s.tracking_code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 shrink-0" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="uppercase text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 whitespace-nowrap">
                            {s.size || 'medium'}
                          </span>
                          {s.weight_kg && (
                            <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                              {s.weight_kg}kg
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Service Type */}
                      <td className="py-2.5 px-3">
                        {renderServiceBadge(s.service_type)}
                      </td>

                      {/* 3. Origin */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 truncate max-w-[150px]" title={s.sender_name}>
                          {s.sender_name}
                        </div>
                        <Tooltip content={s.sender_address_text || s.sender_postcode} position="top">
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5 cursor-help">
                            <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate max-w-[130px]">{s.sender_postcode}</span>
                          </div>
                        </Tooltip>
                      </td>

                      {/* 4. Destination */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 truncate max-w-[150px]" title={s.recipient_name}>
                          {s.recipient_name}
                        </div>
                        <Tooltip content={s.recipient_address_text || s.recipient_postcode} position="top">
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5 cursor-help">
                            <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                            <span className="truncate max-w-[130px]">{s.recipient_postcode}</span>
                          </div>
                        </Tooltip>
                      </td>

                      {/* 5. Custody Location */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800 truncate max-w-[150px]" title={s.destination_hub_name || 'In Courier Custody'}>
                          {s.destination_hub_name || 'In Courier Custody'}
                        </div>
                        {s.assigned_bay_code ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 mt-0.5 whitespace-nowrap">
                            <Warehouse className="w-2.5 h-2.5" />
                            {s.assigned_bay_code}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">Bay unassigned</span>
                        )}
                      </td>

                      {/* 6. Assigned Courier */}
                      <td className="py-2.5 px-3">
                        {s.rider_name ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[9px] shrink-0">
                              {s.rider_name.charAt(0)}
                            </div>
                            <div className="truncate max-w-[110px]">
                              <div className="font-semibold text-slate-800 leading-tight truncate" title={s.rider_name}>
                                {s.rider_name}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {s.rider_vehicle || 'Courier'}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px] whitespace-nowrap">Unassigned</span>
                        )}
                      </td>

                      {/* 7. Status */}
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${style.bg} ${style.text} ${style.border} whitespace-nowrap`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {style.label}
                        </span>
                      </td>

                      {/* 8. Fee */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatNaira(s.pricing_total_ngn)}
                      </td>

                      {/* 9. Booked Date */}
                      <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                        {formatDate(s.created_at)}
                      </td>

                      {/* 10. Actions */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectShipment) onSelectShipment(s.tracking_code);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 font-semibold text-[11px] transition-all shadow-2xs"
                          title="Open full shipment dossier"
                        >
                          <span>Dossier</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. Standardized Table Pagination */}
        {!loading && filteredShipments.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
            totalItems={totalRecords}
            label="shipments"
          />
        )}
      </div>
    </div>
  );
}
