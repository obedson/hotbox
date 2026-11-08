import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle, ShieldAlert, AlertOctagon, CheckCircle2, Clock, Truck,
  Store, RefreshCw, Download, Search, Filter, ChevronRight, ChevronLeft,
  X, ExternalLink, ArrowRight, DollarSign, UserCheck, RotateCcw,
  Package, MapPin, Eye, FileText, Check, ShieldCheck, Copy, Info
} from 'lucide-react';

// Layman Tooltip component
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

// Standardized Table Pagination
function TablePagination({ currentPage, setCurrentPage, pageSize, setPageSize, totalItems, label = 'exceptions' }) {
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
          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1 transition"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>
        <span className="font-bold text-slate-900 px-1">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1 transition"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

const STATUS_TABS = [
  { id: 'ALL', label: 'All Issues', tooltip: 'All active delivery delays, overdue hub pickups, and customer claims' },
  { id: 'STALLED', label: 'Delayed in Transit', tooltip: 'Parcels with no courier scan or movement for over 24 hours' },
  { id: 'OVERDUE', label: 'Overdue for Pickup', tooltip: 'Parcels stored at pickup hubs past the 3-day free window' },
  { id: 'CLAIMS', label: 'Damage & Loss Claims', tooltip: 'Customer reports for damaged or lost parcels' },
  { id: 'RESOLVED', label: 'Resolved & Closed', tooltip: 'Issues resolved with approved compensation or completed delivery' },
];

export default function ExceptionManagement({ onSelectShipment }) {
  const [exceptions, setExceptions] = useState([]);
  const [counts, setCounts] = useState({
    total_open: 0,
    stalled_transit: 0,
    overdue_holding: 0,
    open_claims: 0,
    resolved_count: 0,
    total_financial_exposure_ngn: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Investigation Dossier Modal
  const [selectedException, setSelectedException] = useState(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [dossierData, setDossierData] = useState(null);

  // Resolution Form States
  const [activeActionTab, setActiveActionTab] = useState('claim'); // 'claim' | 'reassign' | 'rts'
  const [claimDecision, setClaimDecision] = useState('SETTLE'); // 'SETTLE' | 'APPROVE' | 'REJECT'
  const [settlementAmount, setSettlementAmount] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [selectedRiderId, setSelectedRiderId] = useState('');
  const [reassignReason, setReassignReason] = useState('Stalled delivery reassignment by operations desk');
  const [rtsReason, setRtsReason] = useState('Customer requested Return-to-Sender / Recipient unavailable');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchExceptions = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (activeTab !== 'ALL') params.append('tab', activeTab);
      if (severityFilter !== 'ALL') params.append('severity', severityFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/v1/operations/exceptions?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();

      setExceptions(data.exceptions || []);
      if (data.counts) setCounts(data.counts);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error fetching exceptions:', err);
      setError('Unable to load delivery issues. Click Refresh to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, [activeTab, severityFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchExceptions();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auto-dismiss notification
  useEffect(() => {
    if (actionNotice) {
      const timer = setTimeout(() => setActionNotice(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionNotice]);

  // Copy tracking code with checkmark feedback
  const handleCopyCode = (code, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Seed / Reset Database
  const handleSeedExceptions = async () => {
    if (!window.confirm('Reset/Seed the authoritative 17 operational exceptions and claims dataset?')) return;
    setSeeding(true);
    try {
      const res = await fetch('/api/v1/operations/exceptions/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionNotice({
          type: 'success',
          message: 'Authoritative exception incidents successfully refreshed in database.'
        });
        fetchExceptions();
      } else {
        throw new Error(data.error || 'Seed failed');
      }
    } catch (err) {
      console.error('Seed exceptions error:', err);
      setActionNotice({ type: 'error', message: err.message });
    } finally {
      setSeeding(false);
    }
  };

  // Open Investigation Dossier
  const handleOpenDossier = async (exc) => {
    setSelectedException(exc);
    setIsDossierOpen(true);
    setLoadingDetails(true);
    setDossierData(null);
    setSettlementAmount(exc.amount_ngn ? String(exc.amount_ngn) : '');
    setResolutionNotes('');

    if (exc.type === 'CLAIM' || exc.incident_type?.includes('CLAIM') || exc.incident_type?.includes('DISPUTE')) {
      setActiveActionTab('claim');
    } else if (exc.incident_type === 'STALLED_IN_TRANSIT' || exc.status === 'IN_TRANSIT_TO_HUB') {
      setActiveActionTab('reassign');
    } else {
      setActiveActionTab('rts');
    }

    try {
      const res = await fetch(`/api/v1/operations/exceptions/${exc.id}/details`);
      if (res.ok) {
        const data = await res.json();
        setDossierData(data);
        if (data.available_riders?.length > 0) {
          setSelectedRiderId(data.available_riders[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load dossier details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Settle / Approve / Reject Claim
  const handleResolveClaim = async () => {
    if (!selectedException) return;
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/v1/operations/exceptions/${selectedException.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: claimDecision,
          resolutionAmountNgn: parseFloat(settlementAmount) || 0,
          resolutionNotes: resolutionNotes || `Claim ${claimDecision} by Operations Officer`
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', message: data.message });
        setIsDossierOpen(false);
        fetchExceptions();
      } else {
        throw new Error(data.error || 'Resolution failed');
      }
    } catch (err) {
      console.error('Claim resolution error:', err);
      setActionNotice({ type: 'error', message: err.message });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Reassign Courier for Stalled Delivery
  const handleReassignCourier = async () => {
    if (!selectedException || !selectedRiderId) return;
    setSubmittingAction(true);
    try {
      const res = await fetch('/api/v1/operations/exceptions/reassign-courier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentId: selectedException.shipment_id,
          newRiderId: selectedRiderId,
          reason: reassignReason
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', message: data.message });
        setIsDossierOpen(false);
        fetchExceptions();
      } else {
        throw new Error(data.error || 'Reassignment failed');
      }
    } catch (err) {
      console.error('Courier reassignment error:', err);
      setActionNotice({ type: 'error', message: err.message });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Authorize Return to Sender
  const handleAuthorizeRTS = async () => {
    if (!selectedException) return;
    setSubmittingAction(true);
    try {
      const res = await fetch('/api/v1/operations/exceptions/authorize-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentId: selectedException.shipment_id,
          reason: rtsReason
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', message: data.message });
        setIsDossierOpen(false);
        fetchExceptions();
      } else {
        throw new Error(data.error || 'Return authorization failed');
      }
    } catch (err) {
      console.error('Authorize return error:', err);
      setActionNotice({ type: 'error', message: err.message });
    } finally {
      setSubmittingAction(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (exceptions.length === 0) return;
    const headers = [
      'Tracking Code', 'Category', 'Incident Type', 'Severity', 'Service Type',
      'Customer', 'Recipient', 'Route', 'Custodian', 'Declared Value (NGN)',
      'Late Storage Fee (NGN)', 'Status', 'Date Logged'
    ];
    const rows = exceptions.map(e => [
      `"${e.tracking_code || ''}"`,
      `"${e.category || ''}"`,
      `"${e.incident_type || ''}"`,
      `"${e.severity || ''}"`,
      `"${e.service_type || ''}"`,
      `"${e.customer_name || ''}"`,
      `"${e.recipient_name || ''}"`,
      `"${e.route || ''}"`,
      `"${e.current_custodian || ''}"`,
      e.amount_ngn || 0,
      e.holding_fee_ngn || 0,
      `"${e.status || ''}"`,
      `"${new Date(e.created_at).toLocaleDateString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hotbox_exceptions_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format Helper for Layman Incident Types
  const formatIncidentType = (type) => {
    switch (type) {
      case 'STALLED_IN_TRANSIT':
        return 'Stalled Delivery (>24h Inactive)';
      case 'OVERDUE_HUB_HOLDING':
        return 'Overdue at Hub (>3 Days)';
      case 'EXPIRED_COLLECTION_DEADLINE':
        return 'Collection Code Expired';
      case 'DAMAGED_PARCEL':
        return 'Damaged Parcel Claim';
      case 'LOST_PARCEL':
        return 'Lost Parcel Claim';
      case 'WRONG_HANDOVER':
        return 'Unauthorized Handover';
      case 'EXCESS_HOLDING_FEE':
        return 'Late Storage Fee Dispute';
      case 'RETURN_REQUESTED':
        return 'Return to Sender Requested';
      case 'RETURNED_TO_SENDER':
        return 'Returned to Sender';
      case 'DISPUTED_INTAKE':
        return 'Disputed Parcel at Intake';
      case 'DELAYED_DELIVERY':
        return 'Extended Delivery Delay';
      default:
        return (type || 'Delivery Exception').replace(/_/g, ' ');
    }
  };

  // Paginated slice
  const paginatedExceptions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return exceptions.slice(start, start + pageSize);
  }, [exceptions, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionNotice && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-sm transition-all ${
          actionNotice.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            {actionNotice.type === 'error' ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Page Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                Delivery Issues
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                {counts.total_open} Active Cases
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1" title="Track delayed shipments, overdue pickup parcels, and missing or damaged item claims.">
              Delivery Issues & Claims
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
              Stalled linehaul dispatches, overdue hub bays & customer claims.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleSeedExceptions}
              disabled={seeding}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Reset sample test delivery issues for demonstration"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-slate-500 ${seeding ? 'animate-spin' : ''}`} />
              <span>{seeding ? 'Resetting...' : 'Reset Demo'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={exceptions.length === 0}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Export delivery issues to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => fetchExceptions(true)}
              disabled={refreshing}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              title="Refresh delivery issues list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* 2. KPI Summary Cards (Stack on small screens: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-slate-100">
          {/* Total Active Issues */}
          <div
            className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between"
            title="Total parcels currently experiencing delivery delays, overdue holding, or active disputes."
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center font-bold text-slate-700">
                Active Issues
                <InfoTooltip text="Total parcels currently experiencing delivery delays, overdue holding, or active disputes." />
              </span>
              <AlertOctagon className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{counts.total_open}</div>
            <div className="text-[11px] text-rose-700 font-semibold mt-0.5 truncate" title={`₦${Number(counts.total_financial_exposure_ngn || 0).toLocaleString()} Claim Value at Risk`}>
              ₦{Number(counts.total_financial_exposure_ngn || 0).toLocaleString()} Exposure
            </div>
          </div>

          {/* Delayed in Transit */}
          <div
            className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between"
            title="Couriers with no handover scan or GPS progress update for over 24 hours."
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center font-bold text-slate-700">
                Delayed Linehaul
                <InfoTooltip text="Couriers with no handover scan or GPS progress update for over 24 hours." />
              </span>
              <Truck className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-950 mt-1">{counts.stalled_transit}</div>
            <div className="text-[11px] text-amber-800 font-medium mt-0.5 truncate" title="Needs driver follow-up or re-dispatch">
              Re-dispatch needed
            </div>
          </div>

          {/* Overdue for Pickup */}
          <div
            className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between"
            title="Parcels held at neighborhood collection hubs exceeding the 3-day free window."
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center font-bold text-slate-700">
                Overdue Hub Bays
                <InfoTooltip text="Parcels held at neighborhood collection hubs exceeding the 3-day free window." />
              </span>
              <Clock className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-orange-950 mt-1">{counts.overdue_holding}</div>
            <div className="text-[11px] text-orange-800 font-medium mt-0.5 truncate" title="Daily late storage fees applying past 3 days">
              Late fees applying
            </div>
          </div>

          {/* Damage & Loss Claims */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center">
                Damage & Loss Claims
                <InfoTooltip text="Formal compensation requests submitted by senders or recipients." />
              </span>
              <ShieldAlert className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-950 mt-1">{counts.open_claims}</div>
            <div className="text-[11px] text-purple-800 font-medium mt-0.5">
              Awaiting review & compensation
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar & Category Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          let badgeCount = 0;
          if (tab.id === 'ALL') badgeCount = counts.total_open;
          else if (tab.id === 'STALLED') badgeCount = counts.stalled_transit;
          else if (tab.id === 'OVERDUE') badgeCount = counts.overdue_holding;
          else if (tab.id === 'CLAIMS') badgeCount = counts.open_claims;
          else if (tab.id === 'RESOLVED') badgeCount = counts.resolved_count;

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
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                isActive ? 'bg-slate-800 text-rose-300' : 'bg-slate-100 text-slate-600'
              }`}>
                {badgeCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Search and Severity Dropdown Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Tracking Code, Customer, Recipient, Route..."
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

        <div className="flex items-center gap-3">
          {/* Severity Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-semibold focus:outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(searchQuery || severityFilter !== 'ALL' || activeTab !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSeverityFilter('ALL');
                setActiveTab('ALL');
              }}
              className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 5. Clean Exceptions Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-600">Loading operational exception ledger...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-rose-600 mx-auto" />
            <p className="text-xs font-bold text-slate-800">Failed to load exceptions</p>
            <p className="text-[11px] text-rose-600 font-mono">{error}</p>
            <button
              onClick={() => fetchExceptions(true)}
              className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg mt-2"
            >
              Retry Connection
            </button>
          </div>
        ) : exceptions.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="text-xs font-bold text-slate-800">No Exceptions Found</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              All deliveries, courier movements, and hub holding bays are currently operating normally under this criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  {/* Fixed column width & whitespace-nowrap prevents tracking ID wrapping */}
                  <th className="py-3 px-3.5 min-w-[175px] whitespace-nowrap">
                    <span className="flex items-center">
                      Waybill / Tracking No.
                      <InfoTooltip text="Unique shipment tracking code with service type." />
                    </span>
                  </th>
                  <th className="py-3 px-3 min-w-[175px]">
                    <span className="flex items-center">
                      Issue & Priority
                      <InfoTooltip text="Delivery problem description and operational priority level." />
                    </span>
                  </th>
                  <th className="py-3 px-3 min-w-[150px] max-w-[170px]">
                    <span className="flex items-center">
                      Sender & Recipient
                      <InfoTooltip text="Customer sender and destination recipient." />
                    </span>
                  </th>
                  <th className="py-3 px-3 min-w-[150px] max-w-[170px]">
                    <span className="flex items-center">
                      Current Location
                      <InfoTooltip text="Partner hub or courier currently holding the parcel." />
                    </span>
                  </th>
                  <th className="py-3 px-3 min-w-[140px]">
                    <span className="flex items-center">
                      Route / Zones
                      <InfoTooltip text="Origin postal zone to destination postal zone." />
                    </span>
                  </th>
                  <th className="py-3 px-3 min-w-[110px]">
                    <span className="flex items-center">
                      Parcel Value
                      <InfoTooltip text="Declared parcel value or customer compensation request." />
                    </span>
                  </th>
                  <th className="py-3 px-3 min-w-[110px]">
                    <span className="flex items-center">
                      Late Storage Fee
                      <InfoTooltip text="Storage fee charged when a parcel is held past the 3-day free pickup window." />
                    </span>
                  </th>
                  <th className="py-3 px-3 min-w-[120px]">
                    <span className="flex items-center">
                      Status
                      <InfoTooltip text="Current resolution or investigation status." />
                    </span>
                  </th>
                  <th className="py-3 px-3 text-right min-w-[90px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paginatedExceptions.map((exc) => {
                  const isCritical = exc.severity === 'CRITICAL';
                  const isHigh = exc.severity === 'HIGH';

                  return (
                    <tr
                      key={exc.id}
                      onClick={() => handleOpenDossier(exc)}
                      className="hover:bg-slate-50/70 cursor-pointer transition-colors group"
                    >
                      {/* 1. Tracking ID (Now strictly single-line, no wrapping!) */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors whitespace-nowrap">
                            {exc.tracking_code}
                          </span>
                          <button
                            onClick={(e) => handleCopyCode(exc.tracking_code, e)}
                            className="text-slate-400 hover:text-slate-600 p-0.5 shrink-0"
                            title="Copy Tracking ID"
                          >
                            {copiedCode === exc.tracking_code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 shrink-0" />
                            )}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono uppercase text-[9px] font-bold">
                            {exc.service_type || 'STANDARD'}
                          </span>
                        </div>
                      </td>

                      {/* 2. Incident & Severity */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border whitespace-nowrap ${
                            isCritical
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isHigh
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {exc.severity}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 mt-0.5 truncate max-w-[190px]" title={exc.description}>
                          {formatIncidentType(exc.incident_type)}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[190px]" title={exc.description}>
                          {exc.description}
                        </div>
                      </td>

                      {/* 3. Shipper & Recipient */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 truncate max-w-[150px]" title={exc.customer_name}>
                          {exc.customer_name || 'Shipper'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[150px]" title={exc.recipient_name}>
                          ➔ {exc.recipient_name || 'Recipient'}
                        </div>
                      </td>

                      {/* 4. Custodian */}
                      <td className="py-2.5 px-3">
                        <div className="text-slate-800 font-semibold flex items-center gap-1.5 truncate max-w-[160px]" title={exc.current_custodian}>
                          {exc.hub_name ? (
                            <Store className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          ) : exc.rider_name ? (
                            <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          ) : (
                            <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate">{exc.current_custodian}</span>
                        </div>
                      </td>

                      {/* 5. Route */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="text-slate-600 font-mono text-[11px] truncate max-w-[140px]" title={exc.route}>
                          {exc.route || 'Route Pending'}
                        </div>
                      </td>

                      {/* 6. Declared Value */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900 font-mono">
                          ₦{Number(exc.amount_ngn || 0).toLocaleString()}
                        </div>
                        {exc.type === 'CLAIM' && (
                          <div className="text-[9px] text-purple-700 font-bold uppercase">Claim Amount</div>
                        )}
                      </td>

                      {/* 7. Late Storage Fee */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {exc.holding_fee_ngn > 0 ? (
                          <span className="font-bold text-orange-600 font-mono">
                            ₦{Number(exc.holding_fee_ngn).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 8. Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                          exc.status === 'STORED_IN_BAY'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : exc.status === 'IN_TRANSIT_TO_HUB'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : exc.status === 'SUBMITTED' || exc.status === 'UNDER_REVIEW'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : exc.status === 'RETURN_REQUESTED' || exc.status === 'DISPUTED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {exc.status?.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* 9. Action Button */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDossier(exc);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 transition shadow-2xs inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
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
        {!loading && exceptions.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
            totalItems={exceptions.length}
            label="exceptions"
          />
        )}
      </div>

      {/* 7. Comprehensive Incident Investigation & Resolution Modal */}
      {isDossierOpen && selectedException && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-scaleUp">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${
                    selectedException.severity === 'CRITICAL'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {selectedException.severity} Severity
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    ID: {selectedException.id}
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 mt-1.5 flex items-center gap-2">
                  <span className="font-mono">{selectedException.tracking_code}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                    {selectedException.service_type}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {formatIncidentType(selectedException.incident_type)} • Status: {selectedException.status}
                </p>
              </div>

              <button
                onClick={() => setIsDossierOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Primary Cards: Parties & Custody */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Shipper */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Origin Shipper</div>
                  <div className="font-bold text-slate-900 text-sm mt-1">{selectedException.customer_name}</div>
                  <div className="text-slate-500 mt-0.5">{selectedException.customer_phone}</div>
                </div>

                {/* Recipient */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Destination Recipient</div>
                  <div className="font-bold text-slate-900 text-sm mt-1">{selectedException.recipient_name}</div>
                  <div className="text-slate-500 mt-0.5">{selectedException.recipient_phone}</div>
                </div>

                {/* Current Custodian */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Current Custodian</div>
                  <div className="font-bold text-teal-700 text-sm mt-1 truncate">{selectedException.current_custodian}</div>
                  <div className="text-slate-500 font-mono text-[11px] mt-0.5">{selectedException.route}</div>
                </div>
              </div>

              {/* Financial & Incident Narrative */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-rose-600" />
                    <span>Incident Description & Particulars</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600">Declared Value: <b className="text-slate-900 font-mono">₦{Number(selectedException.amount_ngn || 0).toLocaleString()}</b></span>
                    {selectedException.holding_fee_ngn > 0 && (
                      <span className="text-orange-700">Late Fee: <b className="font-mono">₦{Number(selectedException.holding_fee_ngn).toLocaleString()}</b></span>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl text-slate-700 leading-relaxed border border-slate-200">
                  {selectedException.description}
                </div>

                {/* Evidence URLs if any */}
                {selectedException.evidence_urls && selectedException.evidence_urls.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold text-slate-600 mb-2">Photo Evidence Submitted:</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedException.evidence_urls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 flex items-center gap-1.5 hover:text-slate-900 shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-purple-600" />
                          <span>View Evidence Asset #{idx + 1}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Custody Chain Timeline */}
              {loadingDetails ? (
                <div className="p-6 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-slate-500 mb-1" />
                  <span>Loading custody ledger events...</span>
                </div>
              ) : dossierData && dossierData.timeline && dossierData.timeline.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-900">Chain-of-Custody Timeline</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {dossierData.timeline.map((event, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between text-[11px]">
                        <div>
                          <span className="font-bold text-slate-800">{event.handover_type || 'CUSTODY_SCAN'}</span>
                          <span className="text-slate-500 ml-2">Holder: {event.new_holder_type}</span>
                          {event.notes && <p className="text-slate-600 mt-0.5">{event.notes}</p>}
                        </div>
                        <span className="text-slate-400 font-mono">{new Date(event.scanned_at || event.created_at).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Resolution Action Console */}
              <div className="border-t border-slate-200 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Operational Resolution Actions
                  </div>
                  {/* Action Selector Tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setActiveActionTab('claim')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        activeActionTab === 'claim' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Claims Settlement
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveActionTab('reassign')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        activeActionTab === 'reassign' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Reassign Courier
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveActionTab('rts')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        activeActionTab === 'rts' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Authorize RTS
                    </button>
                  </div>
                </div>

                {/* Subform 1: Claims Settlement */}
                {activeActionTab === 'claim' && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-3">
                    <div className="text-xs font-bold text-purple-900">
                      Dispute & Claim Resolution Decision
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setClaimDecision('SETTLE')}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center transition ${
                          claimDecision === 'SETTLE'
                            ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                            : 'bg-white border-purple-200 text-purple-800 hover:bg-purple-100/50'
                        }`}
                      >
                        Settle & Compensate
                      </button>
                      <button
                        type="button"
                        onClick={() => setClaimDecision('APPROVE')}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center transition ${
                          claimDecision === 'APPROVE'
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                            : 'bg-white border-purple-200 text-slate-700 hover:bg-purple-100/50'
                        }`}
                      >
                        Approve Full Claim
                      </button>
                      <button
                        type="button"
                        onClick={() => setClaimDecision('REJECT')}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center transition ${
                          claimDecision === 'REJECT'
                            ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                            : 'bg-white border-purple-200 text-slate-700 hover:bg-purple-100/50'
                        }`}
                      >
                        Reject Claim
                      </button>
                    </div>

                    {claimDecision !== 'REJECT' && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Settlement Compensation Amount (₦)
                        </label>
                        <input
                          type="number"
                          value={settlementAmount}
                          onChange={(e) => setSettlementAmount(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="e.g. 45000"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Investigation Notes & Auditor Findings
                      </label>
                      <textarea
                        rows={2}
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Detail reasoning, inspection verification, or payout authorization terms..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleResolveClaim}
                      disabled={submittingAction}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submittingAction ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      <span>Commit {claimDecision} Disposition</span>
                    </button>
                  </div>
                )}

                {/* Subform 2: Reassign Courier */}
                {activeActionTab === 'reassign' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-3">
                    <div className="text-xs font-bold text-blue-900">
                      Reassign Stalled Parcel to Active Courier
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Select Verified Active Courier
                      </label>
                      <select
                        value={selectedRiderId}
                        onChange={(e) => setSelectedRiderId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {dossierData?.available_riders?.length > 0 ? (
                          dossierData.available_riders.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.plate_number || 'Motorcycle'}) • Phone: {r.phone}
                            </option>
                          ))
                        ) : (
                          <option value="">No verified active couriers found</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Dispatch Instructions / Reason
                      </label>
                      <input
                        type="text"
                        value={reassignReason}
                        onChange={(e) => setReassignReason(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Courier vehicle breakdown; transfer custody to relief rider"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleReassignCourier}
                      disabled={submittingAction || !selectedRiderId}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submittingAction ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                      <span>Commit Courier Reassignment</span>
                    </button>
                  </div>
                )}

                {/* Subform 3: Authorize RTS */}
                {activeActionTab === 'rts' && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
                    <div className="text-xs font-bold text-rose-900">
                      Authorize Return to Sender (Reverse Logistics)
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Authorizing Return-to-Sender flags the parcel for reverse dispatch back to origin sender or intake hub.
                    </p>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Official Return Reason
                      </label>
                      <textarea
                        rows={2}
                        value={rtsReason}
                        onChange={(e) => setRtsReason(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                        placeholder="Detail customer authorization, unreachable recipient, or intake refusal..."
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAuthorizeRTS}
                      disabled={submittingAction}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submittingAction ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                      <span>Authorize Return to Sender</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsDossierOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
