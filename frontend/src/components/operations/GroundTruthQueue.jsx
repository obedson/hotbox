import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Crosshair, Search, RefreshCw, Loader2, X, MapPin, Camera, CheckCircle2,
  AlertTriangle, Clock, Phone, Mail, FileText, Navigation, ShieldCheck
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

const TABS = [
  { id: 'AWAITING', label: 'Awaiting fieldwork' },
  { id: 'REPORTED', label: 'Report submitted' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'ALL', label: 'All' }
];

const inputClass = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

function emptyForm() {
  return { inspectionReference: '', photoUrl: '', lat: '', lng: '', accuracyM: '', notes: '' };
}

export default function GroundTruthQueue({ currentUser, showToast }) {
  const [records, setRecords] = useState([]);
  const [counts, setCounts] = useState({ awaiting_fieldwork: 0, reported: 0, approved: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('AWAITING');
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('');

  const fetchQueue = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const res = await apiFetch(`/api/v1/verification/field-queue${query}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to load the ground-truth queue.');
      setRecords(data.records || []);
      setCounts(data.counts || { awaiting_fieldwork: 0, reported: 0, approved: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const filtered = useMemo(() => {
    return records.filter((record) => {
      const reported = Boolean(record.fieldReportedAt);
      if (tab === 'AWAITING' && reported) return false;
      if (tab === 'REPORTED' && (!reported || record.status !== 'PENDING')) return false;
      if (tab === 'APPROVED' && record.status !== 'APPROVED') return false;
      return true;
    });
  }, [records, tab]);

  const kpis = [
    { label: 'Awaiting fieldwork', value: counts.awaiting_fieldwork, color: 'text-amber-600' },
    { label: 'Report submitted', value: counts.reported, color: 'text-sky-600' },
    { label: 'Approved', value: counts.approved, color: 'text-emerald-600' }
  ];

  const openDossier = (record) => {
    setSelected(record);
    setNotice('');
    setGpsStatus('');
    setForm({
      inspectionReference: record.documentNumber || '',
      photoUrl: record.photoUrl || '',
      lat: record.lat ?? '',
      lng: record.lng ?? '',
      accuracyM: record.accuracyM ?? '',
      notes: record.fieldReportNotes || ''
    });
  };

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const captureGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('unsupported');
      return;
    }
    setGpsStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: position.coords.accuracy ?? ''
        }));
        setGpsStatus('captured');
      },
      () => setGpsStatus('failed'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submitReport = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setNotice('');
    try {
      const payload = {
        inspectionReference: form.inspectionReference.trim(),
        photoUrl: form.photoUrl.trim(),
        lat: form.lat === '' ? null : Number(form.lat),
        lng: form.lng === '' ? null : Number(form.lng),
        accuracyM: form.accuracyM === '' ? null : Number(form.accuracyM),
        notes: form.notes.trim(),
        capturedAt: new Date().toISOString()
      };
      const res = await apiFetch(`/api/v1/verification/field-report/${selected.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to submit the field report.');
      setSelected(null);
      await fetchQueue(true);
      if (showToast) showToast(`Field report submitted for ${selected.applicantName}.`);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Field Operations
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
            Ground-Truth Queue
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Attend the doorway, capture the evidence and submit the inspection report. The compliance desk decides the certificate.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fetchQueue(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />{error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{kpi.label}</span>
            <div className={`text-2xl font-black mt-1 ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 pt-4 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            {TABS.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  tab === item.id ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email or postcode"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading ground-truth queue…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs font-semibold">
            No inspections in this view.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-3 px-4 font-bold">Resident</th>
                  <th className="py-3 px-4 font-bold">Postcode</th>
                  <th className="py-3 px-4 font-bold">Requested</th>
                  <th className="py-3 px-4 font-bold">Field report</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => {
                  const reported = Boolean(record.fieldReportedAt);
                  return (
                    <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50 align-top">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{record.applicantName}</div>
                        <div className="text-slate-400 text-[10px]">{record.applicantEmail || '—'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-emerald-800">{record.postcode || '—'}</div>
                        <div className="text-slate-400 text-[10px] max-w-[180px] truncate">{record.postcodeDescription || '—'}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{formatDate(record.submittedAt)}</td>
                      <td className="py-3 px-4">
                        {reported ? (
                          <div>
                            <span className="px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold">Submitted</span>
                            <div className="text-slate-400 text-[10px] mt-1">{formatDate(record.fieldReportedAt)}</div>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">Awaiting</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          record.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : record.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openDossier(record)}
                          className="px-2.5 py-1.5 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-600 rounded-lg text-[11px] font-bold cursor-pointer"
                        >
                          {reported ? 'Update report' : 'Open inspection'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start md:items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto">
          <form
            onSubmit={submitReport}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl m-auto p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Doorway inspection</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Submit the field report for compliance review. Approval stays with the compliance desk.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Resident
                </div>
                <div className="font-bold text-slate-900 text-sm mt-1">{selected.applicantName}</div>
                <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {selected.applicantPhone || '—'}
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {selected.applicantEmail || '—'}
                </div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Postcode
                </div>
                <div className="font-bold text-emerald-800 text-sm mt-1 font-mono">{selected.postcode || '—'}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">{selected.postcodeDescription || '—'}</div>
                <div className="text-slate-400 text-[10px] mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Requested {formatDate(selected.submittedAt)}
                </div>
              </div>
            </div>

            {selected.fieldReportedAt && (
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-[11px] text-sky-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Report already submitted by {selected.fieldReportedBy || 'a field verifier'} on {formatDate(selected.fieldReportedAt)}. You can update it below.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Inspection reference</label>
                <input
                  type="text"
                  value={form.inspectionReference}
                  onChange={(event) => updateField('inspectionReference', event.target.value)}
                  placeholder="e.g. GT-2026-0001"
                  maxLength={80}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Doorway photo URL</label>
                <input
                  type="url"
                  value={form.photoUrl}
                  onChange={(event) => updateField('photoUrl', event.target.value)}
                  placeholder="https://…"
                  maxLength={500}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600">GPS captured on site</label>
                <button
                  type="button"
                  onClick={captureGps}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer"
                >
                  {gpsStatus === 'locating' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                  {gpsStatus === 'locating' ? 'Locating…' : 'Capture GPS'}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="number"
                  step="any"
                  value={form.lat}
                  onChange={(event) => updateField('lat', event.target.value)}
                  placeholder="Latitude"
                  className={inputClass}
                />
                <input
                  type="number"
                  step="any"
                  value={form.lng}
                  onChange={(event) => updateField('lng', event.target.value)}
                  placeholder="Longitude"
                  className={inputClass}
                />
                <input
                  type="number"
                  step="any"
                  value={form.accuracyM}
                  onChange={(event) => updateField('accuracyM', event.target.value)}
                  placeholder="Accuracy (m)"
                  className={inputClass}
                />
              </div>
              {gpsStatus === 'failed' && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">Could not get a GPS fix. Enter the coordinates manually.</p>
              )}
              {gpsStatus === 'unsupported' && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">This device does not support geolocation.</p>
              )}
              {gpsStatus === 'captured' && (
                <p className="text-[11px] text-emerald-700 font-semibold mt-1">GPS fix captured.</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Inspection report</label>
              <textarea
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Describe what you verified at the doorway: premises, signage, occupant identity, delivery access…"
                className={`${inputClass} resize-none`}
              />
              <p className="text-[10px] text-slate-400 mt-1">{form.notes.length}/2000</p>
            </div>

            {notice && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-xl text-[11px] font-semibold flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{notice}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                {busy ? 'Submitting…' : 'Submit for compliance review'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}