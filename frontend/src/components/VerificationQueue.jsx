import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck, ShieldAlert, Shield, Check, X, FileText, AlertCircle, Clock,
  MapPin, Store, Truck, Search, Filter, RefreshCw, Download, ExternalLink,
  Eye, CheckCircle2, AlertTriangle, RotateCcw, ChevronLeft, ChevronRight,
  FileCheck, Camera, Layers, BadgeCheck, Phone, Mail, Building, UserCheck
} from 'lucide-react';

const CATEGORY_TABS = [
  { id: 'ALL', label: 'All Categories' },
  { id: 'TRACK_A_ADDRESS', label: 'Address Proofs' },
  { id: 'TRACK_B_REGULATORY', label: 'ID & Licenses' },
  { id: 'TRACK_C_ACCREDITATION', label: 'Hub Inspections' }
];

const REJECTION_REASONS = [
  'Address on utility bill does not match registered digital postcode',
  'Expired government identity card or driver license expired',
  'Document photo is blurry, cropped, or unreadable',
  'Business registration number could not be confirmed on registry',
  'Premises lacks required secure locker compartments or signage',
  'Neighborhood guarantor reference or bond document incomplete',
  'Name on document does not match applicant profile name',
  'Other compliance requirement not met'
];

export default function VerificationQueue({ onSelectShipment }) {
  const [records, setRecords] = useState([]);
  const [counts, setCounts] = useState({
    total: '0',
    pending: '0',
    pending_track_a: '0',
    pending_track_b: '0',
    pending_track_c: '0',
    approved: '0',
    rejected: '0'
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('PENDING'); // 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Inspection Dossier Modal
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [selectedRejectionReason, setSelectedRejectionReason] = useState(REJECTION_REASONS[0]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  const fetchQueue = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (selectedCategory !== 'ALL') params.append('track', selectedCategory);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/v1/verification/queue?${params.toString()}`, {
        headers: {
        }
      });
      const data = await res.json();
      setRecords(data.records || []);
      if (data.counts) setCounts(data.counts);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to load verification queue:', err);
      setActionNotice({ type: 'error', message: 'Failed to connect to verification queue service.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [statusFilter, selectedCategory]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQueue();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Dismiss notice
  useEffect(() => {
    if (actionNotice) {
      const timer = setTimeout(() => setActionNotice(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionNotice]);

  // Seed / Reset 9 Sample Pending Reviews
  const handleSeedQueue = async () => {
    if (!window.confirm('Reset/Seed the 9 sample partner verification reviews?')) return;
    setSeeding(true);
    try {
      const res = await fetch('/api/v1/verification/seed', {
        method: 'POST',
        headers: {
        }
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({
          type: 'success',
          message: 'Verification queue reset: 9 pending partner reviews are now ready for inspection.'
        });
        fetchQueue();
      } else {
        throw new Error(data.error || 'Seed failed');
      }
    } catch (err) {
      console.error('Seed verification error:', err);
      setActionNotice({ type: 'error', message: err.message });
    } finally {
      setSeeding(false);
    }
  };

  // Open Inspection Dossier
  const handleOpenDossier = (rec) => {
    setSelectedRecord(rec);
    setIsDossierOpen(true);
    setDecisionNotes('');
    setShowRejectForm(false);
    setSelectedRejectionReason(REJECTION_REASONS[0]);
  };

  // Commit Review Decision
  const handleReview = async (id, status, reason = null) => {
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/v1/verification/review/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          rejectionReason: status === 'REJECTED' ? (reason || selectedRejectionReason) : null,
          notes: decisionNotes || (status === 'APPROVED' ? 'Approved by verification staff.' : 'Document rejected.')
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Review failed');

      setActionNotice({
        type: 'success',
        message: status === 'APPROVED' ? 'Partner document approved and verified.' : 'Document rejected.'
      });
      setIsDossierOpen(false);
      fetchQueue();
    } catch (err) {
      console.error('Review error:', err);
      setActionNotice({ type: 'error', message: err.message });
    } finally {
      setSubmittingReview(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = [
      'Record ID', 'Category', 'Applicant', 'Partner Type', 'Identifier',
      'Document Type', 'Document Number', 'Postcode', 'Status', 'Submitted Date'
    ];
    const rows = records.map(r => [
      `"${r.id}"`,
      `"${r.track}"`,
      `"${r.applicant_name || ''}"`,
      `"${r.entity_type}"`,
      `"${r.entity_identifier || ''}"`,
      `"${r.document_type}"`,
      `"${r.document_number || ''}"`,
      `"${r.hub_postcode || ''}"`,
      `"${r.status}"`,
      `"${new Date(r.submitted_at).toLocaleDateString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `partner_verification_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Layman helper formatting functions
  const formatCategory = (track) => {
    switch (track) {
      case 'TRACK_A_ADDRESS':
        return {
          label: 'Address Proof',
          badge: 'bg-sky-50 text-sky-700 border-sky-200',
          icon: <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
        };
      case 'TRACK_B_REGULATORY':
        return {
          label: 'ID & License',
          badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
        };
      case 'TRACK_C_ACCREDITATION':
        return {
          label: 'Hub Inspection',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <Store className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        };
      default:
        return {
          label: 'General Document',
          badge: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        };
    }
  };

  const formatDocType = (type) => {
    switch (type) {
      case 'PROOF_OF_ADDRESS':
        return 'Proof of Address (Utility Bill)';
      case 'DRIVERS_LICENSE':
        return "Driver's License (FRSC)";
      case 'CAC_CERTIFICATE':
        return 'Business Registration (CAC)';
      case 'NIN':
        return 'National Identity Card (NIN)';
      case 'PHYSICAL_INSPECTION_REPORT':
        return 'Shop & Locker Inspection';
      case 'HUB_SPACE_PHOTOS':
        return 'Shop & Parcel Bay Photos';
      case 'SECURITY_DEPOSIT':
        return 'Guarantor Bond & Security Deposit';
      case 'COURIER_LICENCE':
        return 'Courier Operating License';
      default:
        return (type || 'Document').replace(/_/g, ' ');
    }
  };

  // Pagination calculation
  const totalPages = Math.ceil(records.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return records.slice(start, start + pageSize);
  }, [records, currentPage, pageSize]);

  return (
    <div className="space-y-6 bg-[#f8fafc]">
      {/* Toast Alert */}
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

      {/* Page Header (Clean White Card on #F8FAFC) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                KYC Accreditation
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {counts.pending} In Queue
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1" title="Review and verify partner applications: address proofs, government-issued IDs (NIN, CAC, Driver's License), and drop-off hub inspections.">
              Partner Verification Desk
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
              Accreditation for address proofs, rider credentials & hub premises.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleSeedQueue}
              disabled={seeding}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Reset sample reviews for demonstration"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
              <span>{seeding ? 'Resetting...' : 'Reset Samples'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={records.length === 0}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Export KYC queue records to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => fetchQueue(true)}
              disabled={refreshing}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              title="Refresh verification queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Operational Metrics Cards (Stack on small screens: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Pending Reviews */}
        <div
          className="bg-white border border-slate-200/80 p-4 sm:p-5 rounded-2xl shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
          title="Total partner KYC applications awaiting compliance officer review"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Awaiting Review</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{counts.pending}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1 truncate" title="Under compliance review (<24h turnaround target)">
              In compliance queue
            </div>
          </div>
        </div>

        {/* Address Proofs */}
        <div
          className="bg-white border border-slate-200/80 p-4 sm:p-5 rounded-2xl shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
          title="Utility bills, NDAPS digital postcodes, and CBN ground-truth proofs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Address Proofs</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200/60 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-sky-600" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{counts.pending_track_a}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1 truncate" title="Utility bills and digital postcodes">
              Utility & postcodes
            </div>
          </div>
        </div>

        {/* ID & Licenses */}
        <div
          className="bg-white border border-slate-200/80 p-4 sm:p-5 rounded-2xl shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
          title="Government IDs, NIN cards, FRSC driver licenses & CAC company certificates"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">IDs & Licenses</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{counts.pending_track_b}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1 truncate" title="NIN, FRSC licenses and CAC records">
              Rider & fleet IDs
            </div>
          </div>
        </div>

        {/* Hub Inspections */}
        <div
          className="bg-white border border-slate-200/80 p-4 sm:p-5 rounded-2xl shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
          title="Track C on-site physical premises, storage locker compartments and photo inspections"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Hub Inspections</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center">
              <Store className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{counts.pending_track_c}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1 truncate" title="Shop premises & parcel bay photo verification">
              Bay verification
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Tab Navigation (Clean White Container) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-4 shadow-xs">
        {/* Status Tabs (Pending, Approved, Rejected, All) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            {[
              { id: 'PENDING', label: 'Pending Review', count: counts.pending },
              { id: 'APPROVED', label: 'Approved', count: counts.approved },
              { id: 'REJECTED', label: 'Rejected', count: counts.rejected },
              { id: 'ALL', label: 'All Documents', count: counts.total }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  statusFilter === tab.id
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                  statusFilter === tab.id ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Category Selector (Simple, Layman terms without Track A, B, C) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            {CATEGORY_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedCategory(t.id)}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  selectedCategory === t.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Applicant Name, Document Number, Phone, Postcode..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
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

          {(searchQuery || selectedCategory !== 'ALL' || statusFilter !== 'PENDING') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
                setStatusFilter('PENDING');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline underline-offset-4"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Verification Records Table (Clean White Card on #F8FAFC) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading Verification Queue...</p>
            <p className="text-xs text-slate-500 mt-1">Retrieving address proofs, government IDs, and hub inspection records.</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600 mb-3" />
            <p className="text-sm font-semibold text-slate-900">No Documents Found</p>
            <p className="text-xs text-slate-500 mt-1">All partner applications processed under current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1150px] w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">
                  <th className="py-3.5 px-5">Category</th>
                  <th className="py-3.5 px-5">Applicant & Business</th>
                  <th className="py-3.5 px-5">Document Type</th>
                  <th className="py-3.5 px-5">Document Number</th>
                  <th className="py-3.5 px-5">Postcode & Location</th>
                  <th className="py-3.5 px-5">Submitted Date</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRecords.map((rec) => {
                  const catInfo = formatCategory(rec.track);
                  const isPending = rec.status === 'PENDING';

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Category Pill (Never wrapped) */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${catInfo.badge}`}>
                          {catInfo.icon}
                          <span>{catInfo.label}</span>
                        </span>
                      </td>

                      {/* Applicant & Business */}
                      <td className="py-4 px-5 min-w-[210px]">
                        <div className="font-bold text-slate-900 text-sm whitespace-nowrap">
                          {rec.applicant_name || 'Applicant'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-1 whitespace-nowrap">
                          <span className="capitalize px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold text-[10px] whitespace-nowrap">
                            {rec.entity_type === 'hub' ? 'Drop-off Hub' : rec.entity_type === 'rider' ? 'Courier Rider' : 'Merchant'}
                          </span>
                          {rec.entity_type === 'rider' && rec.rider_plate && (
                            <span className="font-mono text-slate-500 text-[11px]">Plate: {rec.rider_plate}</span>
                          )}
                          {rec.applicant_phone && (
                            <span className="text-slate-400 text-[11px]">{rec.applicant_phone}</span>
                          )}
                        </div>
                      </td>

                      {/* Document Type */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 text-xs whitespace-nowrap">
                          {formatDocType(rec.document_type)}
                        </div>
                      </td>

                      {/* Document Number (Never wrapped across hyphens) */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className="inline-block font-mono text-slate-800 bg-slate-100/90 border border-slate-200/80 px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap">
                          {rec.document_number || 'N/A'}
                        </span>
                      </td>

                      {/* Digital Postcode (Never wrapped across hyphens) */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className="inline-block font-mono text-emerald-900 bg-emerald-50 border border-emerald-200/90 px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap">
                          {rec.hub_postcode || 'NDAPS Assigned'}
                        </span>
                      </td>

                      {/* Submitted Date */}
                      <td className="py-4 px-5 whitespace-nowrap text-slate-600">
                        <div className="font-medium text-xs whitespace-nowrap">{new Date(rec.submitted_at).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(rec.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${
                          rec.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : rec.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            rec.status === 'PENDING' ? 'bg-amber-500' : rec.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}></span>
                          {rec.status === 'PENDING' ? 'Pending' : rec.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-5 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDossier(rec)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition border border-slate-200 shadow-2xs flex items-center gap-1.5"
                            title="Inspect document and applicant details"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Inspect</span>
                          </button>

                          {isPending && (
                            <>
                              <button
                                onClick={() => handleReview(rec.id, 'APPROVED')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                                title="Approve Document"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRecord(rec);
                                  setIsDossierOpen(true);
                                  setShowRejectForm(true);
                                }}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition"
                                title="Reject Document"
                              >
                                Reject
                              </button>
                            </>
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

        {/* Pagination Bar */}
        {!loading && records.length > 0 && (
          <div className="bg-slate-50/70 border-t border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-slate-900">
                {Math.min(currentPage * pageSize, records.length)}
              </span>{' '}
              of <span className="font-semibold text-slate-900">{records.length}</span> documents
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1 shadow-2xs font-semibold"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              <span className="px-2 text-slate-900 font-bold">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1 shadow-2xs font-semibold"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Document Inspection Modal (Clean White Modal) */}
      {isDossierOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/80">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${formatCategory(selectedRecord.track).badge}`}>
                    {formatCategory(selectedRecord.track).label}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    ID: {selectedRecord.id.slice(0, 8)}
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 mt-1.5 flex items-center gap-2">
                  <span>Review Document: {formatDocType(selectedRecord.document_type)}</span>
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Applicant: <strong className="text-slate-900">{selectedRecord.applicant_name}</strong> • Document Number: <span className="font-mono text-emerald-700 font-bold">{selectedRecord.document_number || 'N/A'}</span>
                </p>
              </div>

              <button
                onClick={() => setIsDossierOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Applicant Profile Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Applicant Details</div>
                  <div className="font-bold text-slate-900 text-sm mt-1">{selectedRecord.applicant_name}</div>
                  <div className="text-slate-500 mt-0.5 capitalize">{selectedRecord.entity_type === 'hub' ? 'Drop-off Hub Partner' : 'Courier Rider'}</div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Contact Info</div>
                  <div className="font-bold text-slate-900 text-sm mt-1">{selectedRecord.applicant_phone || 'Phone on file'}</div>
                  <div className="text-slate-500 mt-0.5">{selectedRecord.applicant_email || selectedRecord.entity_identifier || '—'}</div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Location & Postcode</div>
                  <div className="font-bold text-emerald-800 text-sm mt-1 font-mono">{selectedRecord.hub_postcode || 'NDAPS Assigned'}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5 truncate">{selectedRecord.hub_address || 'Abuja / Lagos Network'}</div>
                </div>
              </div>

              {/* Document Overview & Notes */}
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>Document Notes & Details</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    selectedRecord.status === 'PENDING'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : selectedRecord.status === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    Status: {selectedRecord.status === 'PENDING' ? 'Pending Review' : selectedRecord.status}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl text-slate-700 leading-relaxed border border-slate-200 shadow-2xs font-medium">
                  {selectedRecord.reviewer_notes || 'Partner document submitted for verification and onboarding into active network.'}
                </div>
              </div>

              {/* Visual Evidence / Document Preview */}
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-sky-600" />
                    <span>Uploaded Document Preview</span>
                  </div>
                  {selectedRecord.document_url && (
                    <a
                      href={selectedRecord.document_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open High-Resolution File</span>
                    </a>
                  )}
                </div>

                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center p-2 min-h-[220px]">
                  {selectedRecord.document_url ? (
                    <img
                      src={selectedRecord.document_url}
                      alt={selectedRecord.document_type}
                      className="max-h-72 w-auto object-contain rounded-lg shadow-sm"
                    />
                  ) : (
                    <div className="text-center p-8 text-slate-400">
                      <FileText className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                      <p className="font-semibold text-slate-700">Digital Record</p>
                      <p className="text-xs mt-1 text-slate-500">Verified electronically against issuing agency (Doc: {selectedRecord.document_number}).</p>
                    </div>
                  )}
                  {/* Digital authenticity watermark */}
                  <div className="absolute bottom-3 right-3 bg-white/95 border border-slate-200 shadow-xs px-2.5 py-1 rounded-md text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified Document Asset</span>
                  </div>
                </div>
              </div>

              {/* Review Decision Console */}
              {selectedRecord.status === 'PENDING' ? (
                <div className="border-t border-slate-200 pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Verification Decision
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRejectForm(false)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                          !showRejectForm ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Approve Document
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRejectForm(true)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                          showRejectForm ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Reject Document
                      </button>
                    </div>
                  </div>

                  {!showRejectForm ? (
                    /* Approval Form */
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                      <div className="text-xs font-bold text-emerald-900">
                        Approve and Activate Partner
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Approving this document verifies the partner and enables them for active courier routing or parcel drop-off holding.
                      </p>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Reviewer notes (optional)
                        </label>
                        <input
                          type="text"
                          value={decisionNotes}
                          onChange={(e) => setDecisionNotes(e.target.value)}
                          placeholder="e.g. Verified against official records; passed inspection."
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleReview(selectedRecord.id, 'APPROVED')}
                        disabled={submittingReview}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {submittingReview ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        <span>Approve & Activate Partner</span>
                      </button>
                    </div>
                  ) : (
                    /* Rejection Form */
                    <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-3">
                      <div className="text-xs font-bold text-rose-900">
                        Reject Document
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Reason for rejection
                        </label>
                        <select
                          value={selectedRejectionReason}
                          onChange={(e) => setSelectedRejectionReason(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-rose-500"
                        >
                          {REJECTION_REASONS.map((reason, idx) => (
                            <option key={idx} value={reason}>{reason}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Instructions for applicant to fix & resubmit
                        </label>
                        <textarea
                          rows={2}
                          value={decisionNotes}
                          onChange={(e) => setDecisionNotes(e.target.value)}
                          placeholder="Explain what the partner needs to fix before resubmitting..."
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleReview(selectedRecord.id, 'REJECTED', selectedRejectionReason)}
                        disabled={submittingReview}
                        className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {submittingReview ? <RefreshCw className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        <span>Reject Document</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-600">
                  <div className="font-bold text-slate-900">Review Completed</div>
                  <div className="mt-1">
                    This document was reviewed by <strong className="text-slate-800">{selectedRecord.reviewer_name || 'Staff Reviewer'}</strong> on{' '}
                    {new Date(selectedRecord.reviewed_at || selectedRecord.submitted_at).toLocaleDateString()} with status:{' '}
                    <span className="font-bold text-slate-900 capitalize">{selectedRecord.status.toLowerCase()}</span>.
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsDossierOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
