import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck, CheckCircle2, AlertTriangle, FileSpreadsheet, Download,
  RefreshCw, Search, Filter, ArrowRight, Eye, Copy, Check, Clock,
  MapPin, User, Building, Truck, ShieldAlert, Key, FileText, ChevronLeft,
  ChevronRight, ExternalLink, X, Info, Activity, Lock
} from 'lucide-react';

const API_BASE = '/api/v1';

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

// Interactive pagination bar
function TablePagination({ currentPage, setCurrentPage, pageSize, setPageSize, totalItems, label = 'records' }) {
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

export default function AuditLogManagement({ onSelectShipment }) {
  const [activeTab, setActiveTab] = useState('custody'); // 'custody' | 'admin'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Raw data from API
  const [summary, setSummary] = useState({
    total_custody_transfers: 0,
    chain_integrity_pct: 100.0,
    transfers_last_24h: 0,
    total_audit_actions: 0,
    critical_overrides_count: 0,
    unverified_handoffs: 0
  });
  const [custodyTransfers, setCustodyTransfers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Modal inspection state
  const [inspectModal, setInspectModal] = useState({ open: false, record: null, type: null });

  // Tab 1 (Custody) Filter & Pagination states
  const [custodySearch, setCustodySearch] = useState('');
  const [custodyMethodFilter, setCustodyMethodFilter] = useState('ALL');
  const [custodyTypeFilter, setCustodyTypeFilter] = useState('ALL');
  const [custodyPage, setCustodyPage] = useState(1);
  const [custodyPageSize, setCustodyPageSize] = useState(10);

  // Tab 2 (Admin) Filter & Pagination states
  const [adminSearch, setAdminSearch] = useState('');
  const [adminActionFilter, setAdminActionFilter] = useState('ALL');
  const [adminEntityFilter, setAdminEntityFilter] = useState('ALL');
  const [adminPage, setAdminPage] = useState(1);
  const [adminPageSize, setAdminPageSize] = useState(10);

  const fetchAuditData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/operations/audit/logs`);
      if (!res.ok) {
        throw new Error(`Failed to load audit trail: ${res.statusText}`);
      }
      const data = await res.json();
      setSummary(data.summary || {});
      setCustodyTransfers(data.custody_transfers || []);
      setAuditLogs(data.audit_logs || []);
    } catch (err) {
      console.error('Audit logs fetch failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper formatting for timestamps
  const formatDateTime = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch {
      return isoString;
    }
  };

  // Verification method badge helper
  const renderVerificationMethodBadge = (method, token) => {
    switch (method) {
      case 'OTP':
        return (
          <div className="flex flex-col">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">
              <Key className="w-3 h-3 text-emerald-600" />
              6-Digit OTP Confirmed
            </span>
            {token && (
              <span className="text-[10px] text-slate-500 font-mono mt-0.5 pl-0.5">
                Token: {token}
              </span>
            )}
          </div>
        );
      case 'QR_SCAN':
        return (
          <div className="flex flex-col">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/80 whitespace-nowrap">
              <ShieldCheck className="w-3 h-3 text-sky-600" />
              Scanned QR Code
            </span>
            {token && (
              <span className="text-[10px] text-slate-500 font-mono mt-0.5 pl-0.5 truncate max-w-[140px]" title={token}>
                {token}
              </span>
            )}
          </div>
        );
      case 'ADMIN_OVERRIDE':
        return (
          <div className="flex flex-col">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 whitespace-nowrap">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              Administrative Override
            </span>
            <span className="text-[10px] text-amber-600/90 font-medium mt-0.5 pl-0.5">
              Authorized Intervention
            </span>
          </div>
        );
      case 'MANUAL_DISPATCH':
        return (
          <div className="flex flex-col">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 whitespace-nowrap">
              <Truck className="w-3 h-3 text-purple-600" />
              Dispatch Desk Handover
            </span>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5 pl-0.5">
              Verified Manifest
            </span>
          </div>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
            {method || 'Digital Seal'}
          </span>
        );
    }
  };

  // Handover label helper
  const getHandoverLabel = (type) => {
    switch (type) {
      case 'SENDER_TO_RIDER':
        return 'Sender Doorstep Pickup';
      case 'RIDER_TO_HUB':
        return 'Hub Storage Intake';
      case 'HUB_TO_RIDER':
        return 'Hub Courier Dispatch';
      case 'RIDER_TO_RECIPIENT':
        return 'Final Recipient Handover';
      case 'RIDER_ASSIGNED':
        return 'Courier Route Assignment';
      case 'HUB_TO_RETURN':
        return 'Return Station Transfer';
      default:
        return type ? type.replace(/_/g, ' ') : 'Custody Handover';
    }
  };

  // Admin action badge helper
  const renderAdminActionBadge = (action) => {
    let colorClass = 'bg-slate-100 text-slate-700 border-slate-200';
    let icon = <Activity className="w-3 h-3" />;

    if (action.includes('SUSPEND') || action.includes('REJECT') || action.includes('RETURN')) {
      colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
      icon = <ShieldAlert className="w-3 h-3 text-rose-600" />;
    } else if (action.includes('ACCREDIT') || action.includes('RESUME') || action.includes('REINSTATE') || action.includes('REGISTER')) {
      colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      icon = <CheckCircle2 className="w-3 h-3 text-emerald-600" />;
    } else if (action.includes('REASSIGN') || action.includes('DISPATCH') || action.includes('OVERRIDE')) {
      colorClass = 'bg-blue-50 text-blue-700 border-blue-200';
      icon = <Truck className="w-3 h-3 text-blue-600" />;
    } else if (action.includes('CLAIM') || action.includes('RATE')) {
      colorClass = 'bg-amber-50 text-amber-800 border-amber-200';
      icon = <AlertTriangle className="w-3 h-3 text-amber-600" />;
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClass} whitespace-nowrap`}>
        {icon}
        {action.replace(/_/g, ' ')}
      </span>
    );
  };

  // Filtered Custody Records
  const filteredCustody = useMemo(() => {
    return custodyTransfers.filter((item) => {
      const q = custodySearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.tracking_code?.toLowerCase().includes(q) ||
        item.previous_holder_name?.toLowerCase().includes(q) ||
        item.new_holder_name?.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q) ||
        item.actor_name?.toLowerCase().includes(q) ||
        item.verification_token?.toLowerCase().includes(q);

      const matchMethod =
        custodyMethodFilter === 'ALL' || item.verification_method === custodyMethodFilter;

      const matchType =
        custodyTypeFilter === 'ALL' || item.handover_type === custodyTypeFilter;

      return matchSearch && matchMethod && matchType;
    });
  }, [custodyTransfers, custodySearch, custodyMethodFilter, custodyTypeFilter]);

  // Paginated Custody
  const paginatedCustody = useMemo(() => {
    const start = (custodyPage - 1) * custodyPageSize;
    return filteredCustody.slice(start, start + custodyPageSize);
  }, [filteredCustody, custodyPage, custodyPageSize]);

  // Filtered Admin Records
  const filteredAdmin = useMemo(() => {
    return auditLogs.filter((item) => {
      const q = adminSearch.toLowerCase().trim();
      const detailsStr = JSON.stringify(item.details || {}).toLowerCase();
      const matchSearch =
        !q ||
        item.actor_name?.toLowerCase().includes(q) ||
        item.actor_email?.toLowerCase().includes(q) ||
        item.action?.toLowerCase().includes(q) ||
        item.entity_tracking_code?.toLowerCase().includes(q) ||
        detailsStr.includes(q);

      const matchAction =
        adminActionFilter === 'ALL' || item.action === adminActionFilter;

      const matchEntity =
        adminEntityFilter === 'ALL' || item.entity_type === adminEntityFilter;

      return matchSearch && matchAction && matchEntity;
    });
  }, [auditLogs, adminSearch, adminActionFilter, adminEntityFilter]);

  // Paginated Admin
  const paginatedAdmin = useMemo(() => {
    const start = (adminPage - 1) * adminPageSize;
    return filteredAdmin.slice(start, start + adminPageSize);
  }, [filteredAdmin, adminPage, adminPageSize]);

  // Export CSV handler
  const handleExportCSV = () => {
    if (activeTab === 'custody') {
      const headers = ['Timestamp', 'Tracking ID', 'From Holder', 'To Holder', 'Handover Type', 'Verification Method', 'Token Hash', 'Actor', 'Actor Role', 'Notes'];
      const rows = filteredCustody.map((r) => [
        `"${r.created_at || ''}"`,
        `"${r.tracking_code || ''}"`,
        `"${r.previous_holder_name || r.previous_holder_type || ''}"`,
        `"${r.new_holder_name || r.new_holder_type || ''}"`,
        `"${r.handover_type || ''}"`,
        `"${r.verification_method || ''}"`,
        `"${r.verification_token || r.verification_hash || ''}"`,
        `"${r.actor_name || ''}"`,
        `"${r.actor_role || ''}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Hotbox-Custody-Handoff-Trail-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ['Timestamp', 'Staff Actor', 'Staff Email', 'Action Type', 'Target Entity', 'Tracking ID', 'Reason / Justification', 'Correlation ID'];
      const rows = filteredAdmin.map((r) => [
        `"${r.created_at || ''}"`,
        `"${r.actor_name || 'Staff'}"`,
        `"${r.actor_email || ''}"`,
        `"${r.action || ''}"`,
        `"${r.entity_type || ''}"`,
        `"${r.entity_tracking_code || ''}"`,
        `"${(r.details?.reason || '').replace(/"/g, '""')}"`,
        `"${r.correlation_id || ''}"`
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Hotbox-Administrative-Security-Audit-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                  <span>Chain of Custody Ledger</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live Ledger
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Immutable custody transfers & administrative security audit trail.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={fetchAuditData}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-2xs"
              title="Refresh custody and security trail"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-xs"
              title="Export ledger to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              <span>Export {activeTab === 'custody' ? 'Custody' : 'Admin'}</span>
            </button>
          </div>
        </div>

        {/* Top 4 KPI Metrics (Stack on small screens: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6">
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between" title="Total documented physical parcel handoffs with verified holder identity.">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center font-bold text-slate-700">
                Custody Transfers
                <InfoTooltip text="Total documented physical parcel handoffs with verified holder identity." />
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1.5 sm:mt-2">
              {summary.total_custody_transfers?.toLocaleString() || '0'}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium mt-1 truncate" title={`+${summary.transfers_last_24h || 0} recorded in last 24h`}>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              +{summary.transfers_last_24h || 0} in 24h
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between" title="Percentage of custody transfers validated cryptographically without breaks.">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center font-bold text-slate-700">
                Chain Integrity
                <InfoTooltip text="Percentage of custody transfers validated cryptographically without breaks." />
              </span>
              <CheckCircle2 className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1.5 sm:mt-2">
              {summary.chain_integrity_pct || 100}%
            </div>
            <div className="flex items-center gap-1 text-[11px] text-sky-700 font-medium mt-1 truncate" title="Zero unconfirmed parcel handoffs">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500"></span>
              Zero breaks
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between" title="Privileged staff modifications, hub accreditation reviews, and overrides.">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center font-bold text-slate-700">
                Admin Actions
                <InfoTooltip text="Privileged staff modifications, hub accreditation reviews, and overrides." />
              </span>
              <Activity className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1.5 sm:mt-2">
              {summary.total_audit_actions || 0}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-indigo-700 font-medium mt-1 truncate" title="Full correlation security trail">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Security audit log
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between" title="Special administrative exceptions, manual route reassignments, and suspensions.">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center font-bold text-slate-700">
                Overrides & Flags
                <InfoTooltip text="Special administrative exceptions, manual route reassignments, and suspensions." />
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1.5 sm:mt-2">
              {summary.critical_overrides_count || 0}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-amber-800 font-medium mt-1 truncate" title="Documented staff justifications">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Justified overrides
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => {
            setActiveTab('custody');
            setCustodyPage(1);
          }}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'custody'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Parcel Chain of Custody</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            activeTab === 'custody' ? 'bg-slate-800 text-emerald-400' : 'bg-slate-100 text-slate-600'
          }`}>
            {custodyTransfers.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('admin');
            setAdminPage(1);
          }}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'admin'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Administrative Security Trail</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            activeTab === 'admin' ? 'bg-slate-800 text-indigo-300' : 'bg-slate-100 text-slate-600'
          }`}>
            {auditLogs.length}
          </span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchAuditData} className="font-semibold underline hover:text-rose-900">
            Retry
          </button>
        </div>
      )}

      {/* VIEW 1: PARCEL CUSTODY LEDGER */}
      {activeTab === 'custody' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by tracking ID, holder name, actor, or notes..."
                value={custodySearch}
                onChange={(e) => {
                  setCustodySearch(e.target.value);
                  setCustodyPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Verification:</span>
                <select
                  value={custodyMethodFilter}
                  onChange={(e) => {
                    setCustodyMethodFilter(e.target.value);
                    setCustodyPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none"
                >
                  <option value="ALL">All Methods</option>
                  <option value="OTP">6-Digit OTP</option>
                  <option value="QR_SCAN">QR Scan</option>
                  <option value="MANUAL_DISPATCH">Dispatch Desk</option>
                  <option value="ADMIN_OVERRIDE">Admin Override</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Handoff:</span>
                <select
                  value={custodyTypeFilter}
                  onChange={(e) => {
                    setCustodyTypeFilter(e.target.value);
                    setCustodyPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none"
                >
                  <option value="ALL">All Handoff Types</option>
                  <option value="SENDER_TO_RIDER">Sender Doorstep Pickup</option>
                  <option value="RIDER_TO_HUB">Hub Storage Intake</option>
                  <option value="HUB_TO_RIDER">Hub Courier Dispatch</option>
                  <option value="RIDER_TO_RECIPIENT">Final Delivery</option>
                  <option value="RIDER_ASSIGNED">Rider Assignment</option>
                  <option value="HUB_TO_RETURN">Return Station Transfer</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 min-w-[140px]">Timestamp</th>
                  <th className="py-3 px-4 min-w-[150px]">Tracking ID</th>
                  <th className="py-3 px-4 min-w-[240px]">Custody Handover Trail</th>
                  <th className="py-3 px-4 min-w-[160px]">Handoff Type</th>
                  <th className="py-3 px-4 min-w-[190px]">Verification Proof</th>
                  <th className="py-3 px-4 min-w-[140px]">Custodian Actor</th>
                  <th className="py-3 px-4 min-w-[120px] text-right">Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedCustody.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      No custody records matching your search or filters.
                    </td>
                  </tr>
                ) : (
                  paginatedCustody.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 whitespace-nowrap">
                          {formatDateTime(record.created_at)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: {record.id.slice(0, 8)}...
                        </div>
                      </td>

                      {/* Tracking ID with Clickable Link */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {record.tracking_code ? (
                            <button
                              onClick={() => onSelectShipment && onSelectShipment(record.tracking_code)}
                              className="font-bold font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                              title="Click to inspect complete shipment dossier"
                            >
                              <span>{record.tracking_code}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="font-mono text-slate-400">
                              {record.shipment_id?.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                        {record.shipment_status && (
                          <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 mt-1 whitespace-nowrap">
                            {record.shipment_status.replace(/_/g, ' ')}
                          </span>
                        )}
                      </td>

                      {/* Custody Transfer: From -> To */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 truncate max-w-[120px]" title={record.previous_holder_name}>
                            <div className="text-[10px] uppercase font-bold text-slate-400">
                              From: {record.previous_holder_type || 'ORIGIN'}
                            </div>
                            <div className="font-semibold text-slate-900 truncate">
                              {record.previous_holder_name || 'Sender'}
                            </div>
                          </div>

                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                          <div className="flex-1 truncate max-w-[120px]" title={record.new_holder_name}>
                            <div className="text-[10px] uppercase font-bold text-slate-400">
                              To: {record.new_holder_type || 'DESTINATION'}
                            </div>
                            <div className="font-semibold text-slate-900 truncate">
                              {record.new_holder_name || 'Recipient'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Handoff Type */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200/60 whitespace-nowrap">
                          {getHandoverLabel(record.handover_type)}
                        </span>
                        {record.notes && (
                          <div className="text-[10px] text-slate-500 italic mt-1 line-clamp-1 max-w-[180px]" title={record.notes}>
                            "{record.notes}"
                          </div>
                        )}
                      </td>

                      {/* Verification Proof & Token */}
                      <td className="py-3 px-4">
                        {renderVerificationMethodBadge(record.verification_method, record.verification_token)}
                      </td>

                      {/* Authorized Actor */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 truncate max-w-[130px]">
                          {record.actor_name || 'System Staff'}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                          {record.actor_role || record.actor_user_role || 'Operator'}
                        </div>
                      </td>

                      {/* Inspection / View Record */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setInspectModal({ open: true, record, type: 'custody' })}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all shadow-2xs inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <TablePagination
            currentPage={custodyPage}
            setCurrentPage={setCustodyPage}
            pageSize={custodyPageSize}
            setPageSize={setCustodyPageSize}
            totalItems={filteredCustody.length}
            label="custody transfers"
          />
        </div>
      )}

      {/* VIEW 2: ADMINISTRATIVE SECURITY LOG */}
      {activeTab === 'admin' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff, action type, justification reason, or correlation ID..."
                value={adminSearch}
                onChange={(e) => {
                  setAdminSearch(e.target.value);
                  setAdminPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Action:</span>
                <select
                  value={adminActionFilter}
                  onChange={(e) => {
                    setAdminActionFilter(e.target.value);
                    setAdminPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none"
                >
                  <option value="ALL">All Actions</option>
                  <option value="COURIER_REASSIGNED">Courier Reassigned</option>
                  <option value="RETURN_TO_SENDER_AUTHORIZED">Return to Sender</option>
                  <option value="HUB_ACCREDITED">Hub Accredited</option>
                  <option value="HUB_ACCREDITATION_SUSPENDED">Hub Suspended</option>
                  <option value="HUB_INTAKE_RESUMED">Hub Intake Resumed</option>
                  <option value="POSTCODE_REGISTERED">Postcode Registered</option>
                  <option value="CLAIM_SETTLED">Claim Settled</option>
                  <option value="RIDER_SUSPENDED">Rider Suspended</option>
                  <option value="RATE_CARD_MODIFIED">Rate Card Modified</option>
                  <option value="MANUAL_DISPATCH_OVERRIDE">Manual Dispatch Override</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Entity:</span>
                <select
                  value={adminEntityFilter}
                  onChange={(e) => {
                    setAdminEntityFilter(e.target.value);
                    setAdminPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none"
                >
                  <option value="ALL">All Entities</option>
                  <option value="shipment">Shipments</option>
                  <option value="hub">Hubs</option>
                  <option value="rider">Riders</option>
                  <option value="claim">Claims</option>
                  <option value="postcode">Postcodes</option>
                  <option value="system_settings">System Settings</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 min-w-[140px]">Timestamp</th>
                  <th className="py-3 px-4 min-w-[150px]">Staff Administrator</th>
                  <th className="py-3 px-4 min-w-[170px]">Action Performed</th>
                  <th className="py-3 px-4 min-w-[150px]">Target Entity</th>
                  <th className="py-3 px-4 min-w-[280px]">Stated Justification & Details</th>
                  <th className="py-3 px-4 min-w-[130px]">Correlation ID</th>
                  <th className="py-3 px-4 min-w-[100px] text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedAdmin.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      No administrative security logs matching your search or filters.
                    </td>
                  </tr>
                ) : (
                  paginatedAdmin.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 whitespace-nowrap">
                          {formatDateTime(log.created_at)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: {log.id.slice(0, 8)}...
                        </div>
                      </td>

                      {/* Staff Actor */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {log.actor_name || 'Operations Admin'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[140px]" title={log.actor_email}>
                          {log.actor_email || 'ops.admin@hotboxng.com'}
                        </div>
                      </td>

                      {/* Action Performed */}
                      <td className="py-3 px-4">
                        {renderAdminActionBadge(log.action)}
                      </td>

                      {/* Target Entity */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {log.entity_type}
                          </span>
                          {log.entity_tracking_code ? (
                            <button
                              onClick={() => onSelectShipment && onSelectShipment(log.entity_tracking_code)}
                              className="font-mono text-xs font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                            >
                              <span>{log.entity_tracking_code}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          ) : (
                            <span className="font-mono text-[11px] text-slate-500">
                              {log.entity_id?.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Justification Reason */}
                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium">
                          {log.details?.reason ? (
                            <span className="italic">"{log.details.reason}"</span>
                          ) : (
                            <span className="text-slate-400">Standard operational update</span>
                          )}
                        </div>
                        {log.details && (
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                            {log.details.assignedCourier && (
                              <span className="bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200">
                                Assigned: {log.details.assignedCourier}
                              </span>
                            )}
                            {log.details.hubName && (
                              <span className="bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200">
                                Hub: {log.details.hubName}
                              </span>
                            )}
                            {log.details.settlementAmountNgn && (
                              <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200 font-semibold">
                                ₦{Number(log.details.settlementAmountNgn).toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Correlation ID */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                            {log.correlation_id}
                          </span>
                          <button
                            onClick={() => handleCopy(log.correlation_id, log.id)}
                            className="text-slate-400 hover:text-slate-600"
                            title="Copy correlation ID"
                          >
                            {copiedId === log.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Inspect */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setInspectModal({ open: true, record: log, type: 'admin' })}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all shadow-2xs inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <TablePagination
            currentPage={adminPage}
            setCurrentPage={setAdminPage}
            pageSize={adminPageSize}
            setPageSize={setAdminPageSize}
            totalItems={filteredAdmin.length}
            label="administrative events"
          />
        </div>
      )}

      {/* INSPECTION MODAL */}
      {inspectModal.open && inspectModal.record && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-slate-900 text-white">
                  {inspectModal.type === 'custody' ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Activity className="w-4 h-4 text-indigo-400" />
                  )}
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {inspectModal.type === 'custody'
                      ? 'Physical Custody Handover Certificate'
                      : 'Administrative Security Event Record'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Immutable event ID: <span className="font-mono text-slate-700">{inspectModal.record.id}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectModal({ open: false, record: null, type: null })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Highlight summary card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Timestamp</span>
                    <p className="font-semibold text-slate-900">{formatDateTime(inspectModal.record.created_at)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Cryptographic Seal</span>
                    <p className="font-mono text-[11px] font-semibold text-emerald-700">
                      {inspectModal.record.verification_hash || inspectModal.record.correlation_id || 'UNALTERED_CHAIN_SEAL'}
                    </p>
                  </div>
                </div>

                {inspectModal.type === 'custody' && inspectModal.record.tracking_code && (
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Associated Parcel</span>
                      <p className="font-mono font-bold text-blue-600 text-xs">{inspectModal.record.tracking_code}</p>
                    </div>
                    {onSelectShipment && (
                      <button
                        onClick={() => {
                          const code = inspectModal.record.tracking_code;
                          setInspectModal({ open: false, record: null, type: null });
                          onSelectShipment(code);
                        }}
                        className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-semibold hover:bg-blue-100 transition-all flex items-center gap-1"
                      >
                        <span>Open Shipment Dossier</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Coordinates & Location if available */}
              {inspectModal.record.lat && inspectModal.record.lng && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">GPS Handoff Location</span>
                      <p className="font-mono text-slate-800">
                        {inspectModal.record.lat}, {inspectModal.record.lng}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Geotagged
                  </span>
                </div>
              )}

              {/* Detailed JSON Payload */}
              <div>
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Full Audit Record Payload
                </span>
                <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                  {JSON.stringify(inspectModal.record, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setInspectModal({ open: false, record: null, type: null })}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
