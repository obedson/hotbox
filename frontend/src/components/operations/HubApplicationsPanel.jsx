import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ClipboardList, Search, RefreshCw, Loader2, X, AlertTriangle, CheckCircle2,
  CalendarClock, ShieldCheck, MapPin, Phone, User, Clock, XCircle,
  Info, Building2, Store
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

const STATUS_TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'SUBMITTED', label: 'Submitted' },
  { id: 'INSPECTION_SCHEDULED', label: 'Inspection scheduled' },
  { id: 'INSPECTED', label: 'Inspected' },
  { id: 'ADDITIONAL_INFORMATION_REQUIRED', label: 'Info required' },
  { id: 'APPROVED', label: 'Accredited' },
  { id: 'REJECTED', label: 'Rejected' }
];

const STATUS_BADGE = {
  DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
  SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
  INSPECTION_SCHEDULED: 'bg-amber-50 text-amber-700 border-amber-200',
  INSPECTED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  ADDITIONAL_INFORMATION_REQUIRED: 'bg-amber-50 text-amber-700 border-amber-200'
};

const FORM_SECTIONS = [
  { title: 'Business identity', keys: ['businessName', 'cacNumber', 'category', 'yearRegistered'] },
  { title: 'Premises & location', keys: ['postcode', 'addressText', 'neighbourhood', 'lga', 'state', 'lat', 'lng', 'premisesType', 'floorAreaSqm'] },
  { title: 'Operations', keys: ['capacity', 'openingHours', 'operatingDays', 'storageTiers', 'staffCount', 'loadingAccess'] },
  { title: 'Security & compliance', keys: ['securityFeatures', 'taxId', 'insurancePolicy', 'securityDepositPaid', 'priorExperience'] },
  { title: 'Contacts', keys: ['managerName', 'managerPhone', 'managerEmail', 'emergencyPhone', 'alternatePhone', 'authorizedRepName', 'authorizedRepIdType', 'authorizedRepIdNumber', 'authorizedRepRelationship', 'notes'] }
];

const LABELS = {
  businessName: 'Legal / trading name', cacNumber: 'CAC / RC number', category: 'Category',
  yearRegistered: 'Year registered', postcode: 'NDAPS postcode', addressText: 'Street address',
  neighbourhood: 'Neighbourhood', lga: 'LGA', state: 'State', lat: 'Latitude', lng: 'Longitude',
  premisesType: 'Premises type', floorAreaSqm: 'Floor area (sqm)', capacity: 'Storage capacity',
  openingHours: 'Opening hours', operatingDays: 'Operating days', storageTiers: 'Storage tiers',
  staffCount: 'Staff count', loadingAccess: 'Loading access', securityFeatures: 'Security features',
  taxId: 'Tax ID', insurancePolicy: 'Insurance policy', securityDepositPaid: 'Security deposit paid',
  priorExperience: 'Prior experience', managerName: 'Manager', managerPhone: 'Manager phone',
  managerEmail: 'Manager email', emergencyPhone: 'Emergency phone', alternatePhone: 'Alternate phone',
  authorizedRepName: 'Authorised representative', authorizedRepIdType: 'Rep ID type',
  authorizedRepIdNumber: 'Rep ID number', authorizedRepRelationship: 'Relationship', notes: 'Notes'
};

const inputClass = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500';

function displayValue(value) {
  if (value === undefined || value === null || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function ApplicationDetail({
  detail, loading, onClose, onAction, actionError, actionNotice, inspectors,
  scheduleForm, setScheduleForm, inspectionForm, setInspectionForm, reviewForm, setReviewForm
}) {
  if (loading || !detail) {
    return (
      <div className="p-10 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  const { application, inspections, hub } = detail;
  const canSchedule = ['SUBMITTED', 'INSPECTION_SCHEDULED'].includes(application.status);
  const canRecord = ['INSPECTION_SCHEDULED', 'INSPECTED'].includes(application.status);
  const canReview = ['SUBMITTED', 'INSPECTION_SCHEDULED', 'INSPECTED', 'ADDITIONAL_INFORMATION_REQUIRED'].includes(application.status);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900">{application.businessName}</h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{application.reference}</p>
        </div>
        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`px-2.5 py-1 rounded-xl border font-bold ${STATUS_BADGE[application.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
          {application.status.replace(/_/g, ' ')}
        </span>
        {hub && (
          <span className="px-2.5 py-1 rounded-xl border bg-slate-50 text-slate-600 border-slate-200 font-semibold">
            Hub: {hub.status}
          </span>
        )}
        {application.submittedAt && (
          <span className="text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />{new Date(application.submittedAt).toLocaleString()}
          </span>
        )}
      </div>

      {application.reviewNote && (
        <div className={`border rounded-xl p-3 text-xs flex items-start gap-2 ${
          application.status === 'REJECTED' ? 'bg-rose-50 border-rose-200 text-rose-800'
            : application.status === 'ADDITIONAL_INFORMATION_REQUIRED' ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          {application.status === 'REJECTED' ? <XCircle className="w-4 h-4 shrink-0" /> : <Info className="w-4 h-4 shrink-0" />}
          <div>
            <div className="font-bold">{application.reviewedByName ? `By ${application.reviewedByName}` : 'Review note'}</div>
            <p className="mt-0.5">{application.reviewNote}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-700"><User className="w-3.5 h-3.5 text-slate-400" />Applicant</div>
          <div className="font-semibold text-slate-800">{application.applicant?.name || '—'}</div>
          <div className="text-slate-500">{application.applicant?.email || '—'}</div>
          <div className="text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{application.applicant?.phone || '—'}</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-700"><MapPin className="w-3.5 h-3.5 text-slate-400" />Premises</div>
          <div className="font-mono font-bold text-slate-800">{application.postcode}</div>
          <div className="text-slate-500">{application.formData?.addressText || '—'}</div>
          <div className="text-slate-500">{application.formData?.neighbourhood || '—'}{application.formData?.state ? `, ${application.formData.state}` : ''}</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-700"><Store className="w-3.5 h-3.5 text-slate-400" />Operations</div>
          <div className="font-semibold text-slate-800">Capacity: {displayValue(application.formData?.capacity)} parcels</div>
          <div className="text-slate-500">{displayValue(application.formData?.openingHours)}</div>
          <div className="text-slate-500">{displayValue(application.formData?.operatingDays)}</div>
        </div>
      </div>

      <div className="space-y-3">
        {FORM_SECTIONS.map((section) => (
          <details key={section.title} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <summary className="px-4 py-2.5 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50">
              {section.title}
            </summary>
            <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              {section.keys.map((key) => (
                <div key={key} className="text-xs">
                  <div className="text-slate-400">{LABELS[key] || key}</div>
                  <div className="font-semibold text-slate-800 break-words">{displayValue(application.formData?.[key])}</div>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>

      {inspections.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5 text-slate-400" /> Inspections
          </h4>
          {inspections.map((inspection) => (
            <div key={inspection.id} className="border border-slate-200 rounded-xl p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">
                  {inspection.result === 'ELIGIBLE' ? 'Eligible' : inspection.result === 'NOT_ELIGIBLE' ? 'Not eligible' : 'Scheduled'}
                </span>
                <span className="text-slate-400 font-mono">{new Date(inspection.scheduled_at).toLocaleString()}</span>
              </div>
              {inspection.inspector_name && <div className="text-slate-500">Inspector: {inspection.inspector_name}</div>}
              {inspection.findings && <div className="text-slate-600">{inspection.findings}</div>}
              {inspection.lat != null && inspection.lng != null && (
                <div className="text-slate-400 font-mono">{Number(inspection.lat).toFixed(5)}, {Number(inspection.lng).toFixed(5)}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {canSchedule && (
        <form
          onSubmit={(event) => { event.preventDefault(); onAction('schedule'); }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3"
        >
          <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5" /> Schedule inspection
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-amber-800 mb-1">Inspection date & time</label>
              <input
                type="datetime-local"
                required
                value={scheduleForm.scheduledAt}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, scheduledAt: event.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-amber-800 mb-1">Inspector</label>
              <select
                value={scheduleForm.inspectorId}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, inspectorId: event.target.value }))}
                className={inputClass}
              >
                <option value="">Assign later</option>
                {inspectors.map((inspector) => (
                  <option key={inspector.id} value={inspector.id}>{inspector.name} ({inspector.role.replace(/_/g, ' ')})</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer">
            Schedule inspection
          </button>
        </form>
      )}

      {canRecord && (
        <form
          onSubmit={(event) => { event.preventDefault(); onAction('record'); }}
          className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3"
        >
          <h4 className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Record inspection result
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-indigo-800 mb-1">Result</label>
              <select
                required
                value={inspectionForm.result}
                onChange={(event) => setInspectionForm((prev) => ({ ...prev, result: event.target.value }))}
                className={inputClass}
              >
                <option value="">Select result...</option>
                <option value="ELIGIBLE">Eligible for accreditation</option>
                <option value="NOT_ELIGIBLE">Not eligible</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-indigo-800 mb-1">Photo URL (optional)</label>
              <input
                type="text"
                value={inspectionForm.photoUrl}
                onChange={(event) => setInspectionForm((prev) => ({ ...prev, photoUrl: event.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-indigo-800 mb-1">Latitude (optional)</label>
              <input
                type="number"
                step="any"
                value={inspectionForm.lat}
                onChange={(event) => setInspectionForm((prev) => ({ ...prev, lat: event.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-indigo-800 mb-1">Longitude (optional)</label>
              <input
                type="number"
                step="any"
                value={inspectionForm.lng}
                onChange={(event) => setInspectionForm((prev) => ({ ...prev, lng: event.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-indigo-800 mb-1">Findings</label>
            <textarea
              rows={3}
              value={inspectionForm.findings}
              onChange={(event) => setInspectionForm((prev) => ({ ...prev, findings: event.target.value }))}
              placeholder="What the inspector verified on site"
              className={inputClass}
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer">
            Record result
          </button>
        </form>
      )}

      {canReview && (
        <form
          onSubmit={(event) => { event.preventDefault(); onAction('review'); }}
          className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3"
        >
          <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Compliance decision
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-emerald-800 mb-1">Decision</label>
              <select
                required
                value={reviewForm.decision}
                onChange={(event) => setReviewForm((prev) => ({ ...prev, decision: event.target.value }))}
                className={inputClass}
              >
                <option value="">Select decision...</option>
                <option value="APPROVED">Approve & accredit</option>
                <option value="ADDITIONAL_INFORMATION_REQUIRED">Request more information</option>
                <option value="REJECTED">Reject</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-emerald-800 mb-1">Note</label>
              <input
                type="text"
                value={reviewForm.note}
                onChange={(event) => setReviewForm((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="Reason for the decision"
                className={inputClass}
              />
            </div>
          </div>
          {application.status !== 'INSPECTED' && reviewForm.decision === 'APPROVED' && (
            <p className="text-[11px] text-amber-700 font-semibold">
              An inspection must be recorded as eligible before approval.
            </p>
          )}
          <button
            type="submit"
            disabled={reviewForm.decision === 'APPROVED' && application.status !== 'INSPECTED'}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Submit decision
          </button>
        </form>
      )}

      {actionError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />{actionError}
        </div>
      )}
      {actionNotice && !actionError && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />{actionNotice}
        </div>
      )}
    </div>
  );
}

export default function HubApplicationsPanel() {
  const [applications, setApplications] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [inspectors, setInspectors] = useState([]);
  const [scheduleForm, setScheduleForm] = useState({ scheduledAt: '', inspectorId: '' });
  const [inspectionForm, setInspectionForm] = useState({ result: '', findings: '', photoUrl: '', lat: '', lng: '' });
  const [reviewForm, setReviewForm] = useState({ decision: '', note: '' });

  const fetchApplications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search.trim()) params.set('q', search.trim());
      const query = params.toString();
      const res = await apiFetch(`/api/v1/hub-applications${query ? `?${query}` : ''}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to load applications.');
      setApplications(data.applications || []);
      setCounts(data.counts || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  useEffect(() => {
    const loadInspectors = async () => {
      try {
        const res = await apiFetch('/api/v1/operations/users');
        const data = await res.json();
        if (!res.ok) return;
        const staff = (data.users || []).filter((user) =>
          ['ops_admin', 'compliance_officer', 'super_admin'].includes(user.role)
        );
        setInspectors(staff);
      } catch (err) {
        // Inspector assignment is optional; the queue still works without it.
      }
    };
    loadInspectors();
  }, []);

  const openDetail = useCallback(async (id) => {
    setSelectedId(id);
    setDetail(null);
    setDetailLoading(true);
    setActionError('');
    setActionNotice('');
    setScheduleForm({ scheduledAt: '', inspectorId: '' });
    setInspectionForm({ result: '', findings: '', photoUrl: '', lat: '', lng: '' });
    setReviewForm({ decision: '', note: '' });
    try {
      const res = await apiFetch(`/api/v1/hub-applications/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to load the application.');
      setDetail(data);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
    setActionError('');
    setActionNotice('');
  };

  const handleAction = async (action) => {
    if (!selectedId) return;
    setActionBusy(true);
    setActionError('');
    setActionNotice('');
    try {
      let url = `/api/v1/hub-applications/${selectedId}`;
      let body = {};
      if (action === 'schedule') {
        url += '/schedule-inspection';
        body = { scheduledAt: scheduleForm.scheduledAt, inspectorId: scheduleForm.inspectorId || undefined };
      } else if (action === 'record') {
        url += '/record-inspection';
        body = inspectionForm;
      } else if (action === 'review') {
        url += '/review';
        body = reviewForm;
      }

      const res = await apiFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed.');

      setActionNotice(
        action === 'schedule' ? 'Inspection scheduled.'
          : action === 'record' ? 'Inspection result recorded.'
          : 'Decision recorded.'
      );
      await openDetail(selectedId);
      await fetchApplications(true);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const kpis = useMemo(() => ([
    { label: 'Submitted', value: counts?.submitted ?? 0, color: 'text-blue-600' },
    { label: 'Inspections scheduled', value: counts?.inspection_scheduled ?? 0, color: 'text-amber-600' },
    { label: 'Inspected', value: counts?.inspected ?? 0, color: 'text-indigo-600' },
    { label: 'Information required', value: counts?.info_required ?? 0, color: 'text-rose-600' }
  ]), [counts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Accreditation
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Application → Inspection → Decision</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
            Hub Accreditation Applications
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Review hub applications, schedule site inspections and record the compliance decision.
          </p>
        </div>
        <button
          onClick={() => fetchApplications()}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl transition cursor-pointer self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{kpi.label}</div>
            <div className={`text-2xl font-black mt-1 ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 pt-4 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-1 bg-slate-50 overflow-x-auto">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition cursor-pointer ${
                  statusFilter === tab.id ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reference, business, postcode or applicant"
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Loading accreditation applications...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-xs text-rose-600 font-bold">{error}</p>
            <button onClick={() => fetchApplications()} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold cursor-pointer">
              Retry
            </button>
          </div>
        ) : applications.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">No applications in this queue yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-left text-slate-500">
                  <th className="py-2.5 px-4 font-bold">Reference</th>
                  <th className="py-2.5 px-4 font-bold">Business</th>
                  <th className="py-2.5 px-4 font-bold">Postcode</th>
                  <th className="py-2.5 px-4 font-bold">Applicant</th>
                  <th className="py-2.5 px-4 font-bold">Submitted</th>
                  <th className="py-2.5 px-4 font-bold">Status</th>
                  <th className="py-2.5 px-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.id} className="border-b border-slate-100 hover:bg-slate-50 align-top">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">{application.reference}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div>{application.businessName}</div>
                      {application.formData?.premisesType && (
                        <div className="text-[10px] text-slate-400 font-normal">{application.formData.premisesType}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-teal-700 font-bold whitespace-nowrap">{application.postcode}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{application.applicant?.name || '—'}</div>
                      <div className="text-[10px] text-slate-400">{application.applicant?.email || '—'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {application.submittedAt ? new Date(application.submittedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${STATUS_BADGE[application.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {application.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => openDetail(application.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start md:items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-50 rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl my-auto">
            <div className="p-4 sm:p-6">
              {actionBusy && (
                <div className="mb-3 flex items-center gap-2 text-xs font-bold text-emerald-700">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Working...
                </div>
              )}
              <ApplicationDetail
                detail={detail}
                loading={detailLoading}
                onClose={closeDetail}
                onAction={handleAction}
                actionError={actionError}
                actionNotice={actionNotice}
                inspectors={inspectors}
                scheduleForm={scheduleForm}
                setScheduleForm={setScheduleForm}
                inspectionForm={inspectionForm}
                setInspectionForm={setInspectionForm}
                reviewForm={reviewForm}
                setReviewForm={setReviewForm}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}