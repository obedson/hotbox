import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Store, Loader2, Save, Send, CheckCircle2, AlertTriangle, Clock,
  MapPin, ShieldCheck, ClipboardList, ChevronRight, Building2, Phone,
  UserCheck, FileText, XCircle, Info
} from 'lucide-react';
import { apiFetch } from '../lib/api';

const OPEN_STATUSES = ['DRAFT', 'ADDITIONAL_INFORMATION_REQUIRED'];

const STATUS_STEPS = [
  { id: 'DRAFT', label: 'Draft' },
  { id: 'SUBMITTED', label: 'Submitted' },
  { id: 'INSPECTION_SCHEDULED', label: 'Inspection scheduled' },
  { id: 'INSPECTED', label: 'Inspected' },
  { id: 'APPROVED', label: 'Accredited' }
];

const CATEGORIES = ['Retail / Store', 'Pharmacy', 'Logistics / Courier', 'Restaurant / Food', 'Office / Professional', 'Kiosk / Stall', 'Other'];
const PREMISES_TYPES = ['Shop', 'Office', 'Warehouse', 'Kiosk', 'Mixed use'];
const STORAGE_TIERS = ['small', 'medium', 'large'];
const SECURITY_FEATURES = [
  { key: 'cctv', label: 'CCTV cameras' },
  { key: 'burglar_proof', label: 'Burglar proofing' },
  { key: 'fire_extinguisher', label: 'Fire extinguisher' },
  { key: 'locked_storage', label: 'Locked storage' },
  { key: 'biometric', label: 'Biometric access' },
  { key: 'alarm', label: 'Intruder alarm' }
];
const ID_TYPES = ['NIN', 'International passport', 'Drivers licence', 'Voters card', 'CAC certificate'];

const SECTIONS = [
  {
    title: 'Business identity',
    hint: 'How the business is registered with the authorities.',
    fields: [
      { key: 'businessName', label: 'Legal / trading name', required: true, placeholder: 'Wuse 2 Express Mart Ltd' },
      { key: 'cacNumber', label: 'CAC / RC number', placeholder: 'CAC-BN-2918402' },
      { key: 'category', label: 'Business category', type: 'select', options: CATEGORIES },
      { key: 'yearRegistered', label: 'Year registered', placeholder: '2019', inputMode: 'numeric' }
    ]
  },
  {
    title: 'Premises & location',
    hint: 'Where parcels will be received and stored.',
    fields: [
      { key: 'postcode', label: 'NDAPS postcode', required: true, placeholder: 'FC-01-A03-FK-01' },
      { key: 'addressText', label: 'Physical street address', required: true, placeholder: 'Plot 10 Emeka Anyaoku Street' },
      { key: 'neighbourhood', label: 'Neighbourhood', placeholder: 'Wuse 2' },
      { key: 'lga', label: 'Local government area', placeholder: 'Abuja Municipal' },
      { key: 'state', label: 'State', placeholder: 'Federal Capital Territory' },
      { key: 'lat', label: 'Latitude', type: 'number', placeholder: '9.0765' },
      { key: 'lng', label: 'Longitude', type: 'number', placeholder: '7.4985' },
      { key: 'premisesType', label: 'Premises type', type: 'select', options: PREMISES_TYPES },
      { key: 'floorAreaSqm', label: 'Floor area (sqm)', inputMode: 'numeric', placeholder: '120' }
    ]
  },
  {
    title: 'Operations & capacity',
    hint: 'How much you can hold and when you are open.',
    fields: [
      { key: 'capacity', label: 'Storage capacity (parcels)', type: 'number', required: true, placeholder: '60' },
      { key: 'openingHours', label: 'Opening hours', placeholder: '08:00 - 20:00' },
      { key: 'operatingDays', label: 'Operating days', placeholder: 'Mon - Sat' },
      { key: 'staffCount', label: 'Number of staff', type: 'number', inputMode: 'numeric', placeholder: '4' },
      { key: 'loadingAccess', label: 'Loading / vehicle access', placeholder: 'Direct street access' }
    ]
  },
  {
    title: 'Security & compliance',
    hint: 'The controls an inspector will verify on site.',
    fields: [
      { key: 'taxId', label: 'Tax identification number', placeholder: 'TIN' },
      { key: 'insurancePolicy', label: 'Insurance policy number', placeholder: 'Policy / insurer' },
      { key: 'securityDepositPaid', label: 'Security deposit paid', type: 'checkbox' },
      { key: 'priorExperience', label: 'Prior logistics / retail experience', type: 'textarea', placeholder: 'Briefly describe relevant experience' }
    ]
  },
  {
    title: 'Contacts & authorised representative',
    hint: 'Who the inspector and our operations team should contact.',
    fields: [
      { key: 'managerName', label: 'Manager / owner name' },
      { key: 'managerPhone', label: 'Manager phone', placeholder: '+234 803 000 0000' },
      { key: 'managerEmail', label: 'Manager email', type: 'email', placeholder: 'hub@example.com' },
      { key: 'emergencyPhone', label: 'Emergency contact', placeholder: '+234 803 000 0000' },
      { key: 'alternatePhone', label: 'Alternate phone', placeholder: '+234 803 000 0000' },
      { key: 'authorizedRepName', label: 'Authorised representative' },
      { key: 'authorizedRepIdType', label: 'Representative ID type', type: 'select', options: ID_TYPES },
      { key: 'authorizedRepIdNumber', label: 'Representative ID number' },
      { key: 'authorizedRepRelationship', label: 'Relationship to business', placeholder: 'Director / Manager' },
      { key: 'notes', label: 'Anything else we should know', type: 'textarea' }
    ]
  }
];

const EMPTY_FORM = {
  businessName: '', cacNumber: '', category: '', yearRegistered: '',
  postcode: '', addressText: '', neighbourhood: '', lga: '', state: '',
  lat: '', lng: '', premisesType: '', floorAreaSqm: '',
  capacity: '50', openingHours: '08:00 - 20:00', operatingDays: 'Mon - Sat',
  storageTiers: [], staffCount: '', loadingAccess: '',
  securityFeatures: [], managerName: '', managerPhone: '', managerEmail: '',
  emergencyPhone: '', alternatePhone: '',
  taxId: '', insurancePolicy: '', securityDepositPaid: false, priorExperience: '',
  authorizedRepName: '', authorizedRepIdType: '', authorizedRepIdNumber: '',
  authorizedRepRelationship: '', notes: ''
};

function statusIndex(status) {
  const idx = STATUS_STEPS.findIndex((step) => step.id === status);
  return idx === -1 ? 0 : idx;
}

function Timeline({ application }) {
  const current = statusIndex(application.status);
  const rejected = application.status === 'REJECTED';
  const infoRequired = application.status === 'ADDITIONAL_INFORMATION_REQUIRED';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Accreditation progress</h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{application.reference}</p>
        </div>
        <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${
          rejected ? 'bg-rose-50 text-rose-700 border-rose-200'
          : infoRequired ? 'bg-amber-50 text-amber-700 border-amber-200'
          : application.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-slate-100 text-slate-700 border-slate-200'
        }`}>
          {application.status.replace(/_/g, ' ')}
        </span>
      </div>

      <ol className="space-y-0">
        {STATUS_STEPS.map((step, index) => {
          const done = !rejected && index <= current;
          const isCurrent = !rejected && index === current;
          return (
            <li key={step.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                  done ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-300 text-slate-400'
                }`}>
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : index + 1}
                </div>
                {index < STATUS_STEPS.length - 1 && (
                  <div className={`w-px h-5 ${index < current && !rejected ? 'bg-teal-500' : 'bg-slate-200'}`} />
                )}
              </div>
              <span className={`text-xs font-semibold pt-1 ${isCurrent ? 'text-teal-700' : done ? 'text-slate-700' : 'text-slate-400'}`}>
                {step.label}
                {isCurrent && <span className="ml-2 text-[10px] font-bold text-teal-600">current</span>}
              </span>
            </li>
          );
        })}
      </ol>

      {rejected && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-start gap-2">
          <XCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <div>
            <div className="font-bold">Application rejected</div>
            <p className="mt-0.5">{application.reviewNote || 'The compliance desk declined this application.'}</p>
          </div>
        </div>
      )}

      {infoRequired && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
          <div>
            <div className="font-bold">More information required</div>
            <p className="mt-0.5">{application.reviewNote || 'The compliance desk has asked for additional details.'}</p>
            <p className="mt-1 text-amber-700">Edit the form and submit again.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ field, value, onChange, disabled }) {
  const base = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-50 disabled:text-slate-500';

  if (field.type === 'textarea') {
    return (
      <textarea
        value={value || ''}
        disabled={disabled}
        onChange={(event) => onChange(field.key, event.target.value)}
        placeholder={field.placeholder}
        rows={3}
        className={base}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <select
        value={value || ''}
        disabled={disabled}
        onChange={(event) => onChange(field.key, event.target.value)}
        className={base}
      >
        <option value="">Select...</option>
        {field.options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'checkbox') {
    const checked = Boolean(value);
    return (
      <label className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-sm cursor-pointer ${checked ? 'border-teal-300 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600'}`}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(field.key, event.target.checked)}
          className="accent-teal-600"
        />
        {field.label}
      </label>
    );
  }

  return (
    <input
      type={field.type || 'text'}
      inputMode={field.inputMode}
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => onChange(field.key, event.target.value)}
      placeholder={field.placeholder}
      className={base}
    />
  );
}

export default function HubApplicationForm({ showToast, onAccredited }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [application, setApplication] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/v1/hub-applications/mine');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to load the application.');
      setApplication(data.application);
      setInspections(data.inspections || []);
      setForm({ ...EMPTY_FORM, ...(data.application?.formData || {}) });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const editable = application ? OPEN_STATUSES.includes(application.status) : true;

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setNotice('');
  };

  const toggleArrayValue = (key, value) => {
    setForm((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
    setNotice('');
  };

  const saveDraft = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await apiFetch(
        application ? `/api/v1/hub-applications/${application.id}` : '/api/v1/hub-applications',
        {
          method: application ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to save the application.');
      setApplication(data.application);
      if (showToast) showToast('Draft saved.');
      setNotice('Draft saved. You can keep editing until you submit.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!application) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await apiFetch(`/api/v1/hub-applications/${application.id}/submit`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to submit the application.');
      await load();
      if (showToast) showToast('Application submitted for inspection.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const missing = useMemo(() => {
    if (!editable) return [];
    return [
      { key: 'businessName', label: 'Legal / trading name' },
      { key: 'postcode', label: 'NDAPS postcode' },
      { key: 'addressText', label: 'Physical street address' }
    ].filter((field) => !String(form[field.key] || '').trim());
  }, [form, editable]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
          <ClipboardList className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Apply to host a Hotbox hub</h2>
        <p className="text-xs text-slate-500 max-w-lg mx-auto">
          Every hub is accredited. Complete the application with your business, premises,
          capacity and security details, then our operations team will schedule a site
          inspection before your hub goes live.
        </p>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <button
          onClick={saveDraft}
          disabled={busy}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
          Start application
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900">Hub accreditation application</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {editable
              ? 'Complete every section, save your draft, then submit for inspection.'
              : 'Your application is with the Hotbox operations team.'}
          </p>
        </div>
        {editable && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={saveDraft}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition disabled:opacity-50 cursor-pointer"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save draft
            </button>
            <button
              onClick={submit}
              disabled={busy || missing.length > 0}
              title={missing.length ? `Missing: ${missing.map((m) => m.label).join(', ')}` : 'Submit for inspection'}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Submit for inspection
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          {error}
        </div>
      )}
      {notice && !error && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
          {notice}
        </div>
      )}
      {editable && missing.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-2xl text-xs font-semibold">
          Required before submission: {missing.map((m) => m.label).join(', ')}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {SECTIONS.map((section) => (
            <section key={section.title} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">{section.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{section.hint}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {section.fields.map((field) => (
                  <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      {field.label}
                      {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                    </label>
                    <Field
                      field={field}
                      value={form[field.key]}
                      disabled={!editable}
                      onChange={updateField}
                    />
                  </div>
                ))}
              </div>

              {section.title === 'Operations & capacity' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Storage tiers offered</label>
                  <div className="flex flex-wrap gap-2">
                    {STORAGE_TIERS.map((tier) => {
                      const active = (form.storageTiers || []).includes(tier);
                      return (
                        <button
                          key={tier}
                          type="button"
                          disabled={!editable}
                          onClick={() => toggleArrayValue('storageTiers', tier)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold capitalize transition cursor-pointer disabled:cursor-not-allowed ${
                            active ? 'border-teal-400 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {tier}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {section.title === 'Security & compliance' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Security features on site</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SECURITY_FEATURES.map((feature) => {
                      const active = (form.securityFeatures || []).includes(feature.key);
                      return (
                        <button
                          key={feature.key}
                          type="button"
                          disabled={!editable}
                          onClick={() => toggleArrayValue('securityFeatures', feature.key)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold text-left transition cursor-pointer disabled:cursor-not-allowed ${
                            active ? 'border-teal-400 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <ShieldCheck className={`w-3.5 h-3.5 ${active ? 'text-teal-600' : 'text-slate-300'}`} />
                          {feature.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>

        <div className="space-y-4">
          <Timeline application={application} />

          {inspections.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Inspections</h3>
              {inspections.map((inspection) => (
                <div key={inspection.id} className="border border-slate-100 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-teal-600" />
                      {inspection.result === 'ELIGIBLE' ? 'Eligible' : inspection.result === 'NOT_ELIGIBLE' ? 'Not eligible' : 'Scheduled'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(inspection.scheduled_at).toLocaleString()}
                    </span>
                  </div>
                  {inspection.findings && (
                    <p className="text-[11px] text-slate-500">{inspection.findings}</p>
                  )}
                  {inspection.inspector_name && (
                    <p className="text-[10px] text-slate-400">Inspector: {inspection.inspector_name}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-xs text-teal-900 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <FileText className="w-4 h-4 text-teal-700" />
              What happens next
            </div>
            <ol className="space-y-1.5 text-teal-800">
              <li>1. Operations reviews your application.</li>
              <li>2. An inspector visits and verifies the premises.</li>
              <li>3. Compliance accredits the hub and storage bays go live.</li>
            </ol>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Building2 className="w-4 h-4 text-slate-400" />
              Application details
            </div>
            <div className="flex items-start gap-2"><Store className="w-3.5 h-3.5 text-slate-400 mt-0.5" /><span>{application.businessName}</span></div>
            <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" /><span className="font-mono">{application.postcode}</span></div>
            {application.submittedAt && (
              <div className="flex items-start gap-2"><Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5" /><span>Submitted {new Date(application.submittedAt).toLocaleString()}</span></div>
            )}
            {application.reviewedByName && (
              <div className="flex items-start gap-2"><UserCheck className="w-3.5 h-3.5 text-slate-400 mt-0.5" /><span>Reviewed by {application.reviewedByName}</span></div>
            )}
            <div className="flex items-start gap-2"><Phone className="w-3.5 h-3.5 text-slate-400 mt-0.5" /><span>{application.applicant?.phone || '—'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}