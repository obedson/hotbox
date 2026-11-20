import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bike, Search, RefreshCw, Loader2, X, ShieldCheck, ShieldAlert, CheckCircle2,
  AlertTriangle, Clock, Phone, Mail, MapPin, FileText, User, XCircle, Info,
  Check, ChevronRight, BadgeCheck
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

const TABS = [
  { id: 'AWAITING', label: 'Awaiting review' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'VERIFIED', label: 'Verified' },
  { id: 'SUSPENDED', label: 'Suspended' },
  { id: 'ALL', label: 'All riders' }
];

const STATUS_BADGE = {
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  suspended: 'bg-rose-50 text-rose-700 border-rose-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200'
};

const DOCUMENT_LABELS = {
  NIN: 'NIN slip',
  DRIVERS_LICENSE: "Driver's licence",
  COURIER_LICENCE: 'Courier licence',
  PROOF_OF_ADDRESS: 'Proof of address'
};

const REJECTION_REASONS = [
  'NIN does not match the name on the rider profile',
  "Driver's licence is expired or illegible",
  'Driver licence number does not match the submitted document',
  'Home postcode is missing or outside the operating corridor',
  'Phone number is missing or unreachable',
  'Registration fee has not been settled',
  'Document photo is blurry, cropped, or unreadable',
  'Other compliance requirement not met'
];

const inputClass = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

function checklistFor(rider, registrationFeeNgn) {
  const items = [
    { label: 'NIN', provided: Boolean(rider.nin) },
    { label: "Driver's licence", provided: Boolean(rider.drivers_license_no && rider.drivers_license_no !== 'DL-PENDING') },
    { label: 'Home postcode', provided: Boolean(rider.user_postcode) },
    { label: 'Phone number', provided: Boolean(rider.phone) }
  ];
  if (Number(registrationFeeNgn) > 0) {
    items.push({ label: 'Registration fee', provided: Boolean(rider.registration_fee_paid_at) });
  }
  return items;
}

function RiderApplicationDossier({
  rider, registrationFeeNgn, canReview, onClose, onReview, busy, actionError
}) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState(REJECTION_REASONS[0]);
  const [decisionNotes, setDecisionNotes] = useState('');

  const checklist = checklistFor(rider, registrationFeeNgn);
  const providedCount = checklist.filter((item) => item.provided).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Bike className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-900 truncate">{rider.name}</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {rider.plate_number && rider.plate_number !== 'ABJ-000-XX' ? rider.plate_number : 'No plate number'}
                {rider.vehicle_type ? ` - ${rider.vehicle_type}` : ''}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`px-2.5 py-1 rounded-xl border font-bold text-xs ${STATUS_BADGE[rider.status] || STATUS_BADGE.pending}`}>
                  {rider.status}
                </span>
                <span className={`px-2.5 py-1 rounded-xl border font-bold text-xs ${rider.readyForApproval ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {providedCount}/{checklist.length} clearance items
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-700 truncate">{rider.phone || 'No phone'}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-700 truncate">{rider.email || 'No email'}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-700 truncate">{rider.user_postcode || 'No postcode'}</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Clearance checklist</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {checklist.map((item) => (
                <div key={item.label} className={`flex items-center gap-2 border rounded-xl px-3 py-2 text-xs font-semibold ${item.provided ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800' : 'bg-rose-50/60 border-rose-200 text-rose-700'}`}>
                  {item.provided ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                  {item.label}
                </div>
              ))}
            </div>
            {rider.missingClearance.length > 0 && (
              <p className="text-[11px] text-rose-600 font-semibold mt-2">
                Missing: {rider.missingClearance.join(', ')}
              </p>
            )}
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Submitted documents ({rider.documents.length})
            </h4>
            {rider.documents.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-xl p-4 text-xs text-slate-500">
                No documents uploaded yet. The rider can submit NIN, driver's licence, courier licence and proof of address from the Rider Radar portal.
              </div>
            ) : (
              <div className="space-y-2">
                {rider.documents.map((doc) => (
                  <div key={doc.id} className="border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800">{DOCUMENT_LABELS[doc.document_type] || doc.document_type}</div>
                        <div className="text-slate-500 font-mono truncate">{doc.document_number || 'No document number'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${doc.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : doc.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {doc.status}
                      </span>
                      <span className="text-slate-400">{formatDate(doc.submitted_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {actionError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {canReview ? (
            rider.status === 'pending' ? (
              <div className="space-y-3">
                {rider.readyForApproval ? (
                  <button
                    type="button"
                    onClick={() => onReview('approve')}
                    disabled={busy}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Approve rider & grant dispatch clearance
                  </button>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-xs font-semibold">
                    Approval is disabled until every clearance item above is provided.
                  </div>
                )}

                {!showRejectForm ? (
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(true)}
                    disabled={busy}
                    className="w-full py-2.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject application
                  </button>
                ) : (
                  <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-3">
                    <div className="text-xs font-bold text-rose-900">Reject rider application</div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Reason for rejection</label>
                      <select value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className={inputClass}>
                        {REJECTION_REASONS.map((reason) => (
                          <option key={reason} value={reason}>{reason}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Instructions to the rider</label>
                      <textarea
                        rows={2}
                        value={decisionNotes}
                        onChange={(e) => setDecisionNotes(e.target.value)}
                        placeholder="Explain what the rider needs to fix before resubmitting..."
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => onReview('reject', rejectionReason, decisionNotes)}
                        disabled={busy}
                        className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        Confirm rejection
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRejectForm(false)}
                        disabled={busy}
                        className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 font-semibold">
                This application was already {rider.status}. Use the fleet ledger to suspend or reinstate a rider.
              </div>
            )
          ) : (
            <div className="bg-slate-50 border border-slate-200 text-slate-600 rounded-xl p-3 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>Only a Compliance Officer or Super Admin can approve or reject rider applications.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RiderApplicationsPanel({ currentUser, showToast }) {
  const [riders, setRiders] = useState([]);
  const [counts, setCounts] = useState({ awaiting: 0, rejected: 0, verified: 0, suspended: 0, total: 0 });
  const [registrationFeeNgn, setRegistrationFeeNgn] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('AWAITING');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const canReview = ['compliance_officer', 'super_admin'].includes(currentUser?.role);

  const fetchQueue = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      const query = params.toString();
      const res = await apiFetch(`/api/v1/verification/rider-applications${query ? `?${query}` : ''}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to load rider applications.');
      setRiders(data.riders || []);
      setCounts(data.counts || { awaiting: 0, rejected: 0, verified: 0, suspended: 0, total: 0 });
      setRegistrationFeeNgn(Number(data.registrationFeeNgn) || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const filtered = useMemo(() => {
    if (tab === 'ALL') return riders;
    if (tab === 'AWAITING') return riders.filter((r) => r.status === 'pending' && r.pendingDocuments > 0);
    if (tab === 'REJECTED') return riders.filter((r) => r.status === 'pending' && r.pendingDocuments === 0 && r.rejectedDocuments > 0);
    if (tab === 'VERIFIED') return riders.filter((r) => r.status === 'verified');
    if (tab === 'SUSPENDED') return riders.filter((r) => r.status === 'suspended');
    return riders;
  }, [riders, tab]);

  const kpis = [
    { label: 'Awaiting review', value: counts.awaiting, color: 'text-amber-600', background: 'bg-amber-50 text-amber-600' },
    { label: 'Rejected', value: counts.rejected, color: 'text-rose-600', background: 'bg-rose-50 text-rose-600' },
    { label: 'Verified', value: counts.verified, color: 'text-emerald-600', background: 'bg-emerald-50 text-emerald-600' },
    { label: 'Suspended', value: counts.suspended, color: 'text-slate-600', background: 'bg-slate-100 text-slate-600' }
  ];

  const openDossier = (rider) => {
    setSelected(rider);
    setActionError('');
    setIsDossierOpen(true);
  };

  const handleReview = async (action, reason = null, notes = null) => {
    if (!selected) return;
    setBusy(true);
    setActionError('');
    try {
      const payload = { action };
      if (action === 'reject') {
        payload.reason = [reason, notes].filter(Boolean).join(' - ') || 'Application rejected by compliance.';
      }
      const res = await apiFetch(`/api/v1/verification/riders/${selected.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'The review could not be saved.');
      if (showToast) showToast(data.message, 'success');
      setIsDossierOpen(false);
      setSelected(null);
      fetchQueue(true);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Rider KYC Accreditation
            <span className="text-slate-400 font-semibold normal-case tracking-normal">{counts.total} riders</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Rider Verification Applications</h1>
          <p className="text-xs text-slate-500 mt-1">
            Identity, driving privilege, service postcode and registration fee clearance before dispatch access.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchQueue(true)}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-2 self-start lg:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${kpi.background}`}>
              {kpi.label === 'Awaiting review' ? <Clock className="w-4 h-4" /> :
               kpi.label === 'Rejected' ? <ShieldAlert className="w-4 h-4" /> :
               kpi.label === 'Verified' ? <BadgeCheck className="w-4 h-4" /> :
               <AlertTriangle className="w-4 h-4" />}
            </div>
            <div className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  tab === item.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item.label}
                {item.id !== 'ALL' && (
                  <span className="ml-1.5 opacity-70">
                    {item.id === 'AWAITING' ? counts.awaiting : item.id === 'REJECTED' ? counts.rejected : item.id === 'VERIFIED' ? counts.verified : counts.suspended}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, plate, NIN..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <div className="text-sm font-bold text-slate-900">No rider applications in this view</div>
            <p className="text-xs text-slate-500 mt-1">Riders appear here once they submit their KYC documents from the Rider Radar portal.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((rider) => {
              const checklist = checklistFor(rider, registrationFeeNgn);
              const provided = checklist.filter((item) => item.provided).length;
              return (
                <button
                  key={rider.id}
                  type="button"
                  onClick={() => openDossier(rider)}
                  className="w-full text-left px-5 py-4 hover:bg-slate-50/70 transition cursor-pointer flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                      {rider.name ? rider.name.charAt(0).toUpperCase() : 'R'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm truncate">{rider.name || 'Unnamed rider'}</span>
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${STATUS_BADGE[rider.status] || STATUS_BADGE.pending}`}>
                          {rider.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {rider.phone || 'No phone'} - {rider.user_postcode || 'No postcode'} - {rider.plate_number && rider.plate_number !== 'ABJ-000-XX' ? rider.plate_number : 'No plate'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[11px] font-bold text-slate-700">
                        {provided}/{checklist.length} clearance
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {rider.pendingDocuments} pending - {rider.documents.length} documents
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {isDossierOpen && selected && (
        <RiderApplicationDossier
          rider={selected}
          registrationFeeNgn={registrationFeeNgn}
          canReview={canReview}
          onClose={() => { setIsDossierOpen(false); setSelected(null); }}
          onReview={handleReview}
          busy={busy}
          actionError={actionError}
        />
      )}
    </div>
  );
}
