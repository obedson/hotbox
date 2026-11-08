import React, { useState, useEffect } from 'react';
import {
  Settings, DollarSign, Users, Package, Clock, ShieldCheck,
  CheckCircle2, AlertTriangle, RefreshCw, Save, RotateCcw,
  Info, Check, ShieldAlert, Key, FileText, ChevronRight, X,
  Sliders, Lock, History, Copy
} from 'lucide-react';

const API_BASE = '/api/v1';

// Reusable lightweight tooltip component to explain courier terms on hover
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

export default function SettingsManagement() {
  const [activeTab, setActiveTab] = useState('pricing'); // 'pricing' | 'commissions' | 'storage' | 'sla' | 'history'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Original settings from server
  const [serverSettings, setServerSettings] = useState({});
  // Form draft settings
  const [formSettings, setFormSettings] = useState({});
  // Audit history
  const [auditHistory, setAuditHistory] = useState([]);

  // Save Modal state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [adminReason, setAdminReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/operations/settings`);
      if (!res.ok) throw new Error(`Failed to load settings: ${res.statusText}`);
      const data = await res.json();
      setServerSettings(data.settings || {});
      setFormSettings(JSON.parse(JSON.stringify(data.settings || {})));
      setAuditHistory(data.audit_history || []);
    } catch (err) {
      console.error('Fetch settings error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Check if current tab has unsaved modifications
  const hasChangesInTab = (tabKey) => {
    const settingMap = {
      pricing: 'pricing_matrix',
      commissions: 'partner_commissions',
      storage: 'hub_storage_policy',
      sla: 'sla_benchmarks',
      security: 'security_governance'
    };
    const key = settingMap[tabKey];
    if (!key || !serverSettings[key] || !formSettings[key]) return false;
    return JSON.stringify(serverSettings[key].value) !== JSON.stringify(formSettings[key].value);
  };

  const currentTabSettingKey = {
    pricing: 'pricing_matrix',
    commissions: 'partner_commissions',
    storage: 'hub_storage_policy',
    sla: 'sla_benchmarks'
  }[activeTab];

  // Nested field updater
  const updateField = (settingKey, fieldPath, value) => {
    setFormSettings((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      if (!updated[settingKey]) return prev;
      
      const parts = fieldPath.split('.');
      let current = updated[settingKey].value;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      return updated;
    });
  };

  // Revert active tab draft to server values
  const handleRevertTab = () => {
    if (!currentTabSettingKey) return;
    setFormSettings((prev) => ({
      ...prev,
      [currentTabSettingKey]: JSON.parse(JSON.stringify(serverSettings[currentTabSettingKey]))
    }));
  };

  // Submit Save
  const handleConfirmSave = async () => {
    if (!adminReason || adminReason.trim().length < 5) {
      setReasonError('Please provide a reason for this change (at least 5 characters).');
      return;
    }

    try {
      setSaving(true);
      setReasonError('');

      const res = await fetch(`${API_BASE}/operations/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting_key: currentTabSettingKey,
          setting_value: formSettings[currentTabSettingKey].value,
          reason: adminReason.trim()
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save configuration settings');
      }

      setSuccessMessage('Settings updated successfully and logged to the audit ledger.');
      setSaveModalOpen(false);
      setAdminReason('');
      await fetchSettings();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setReasonError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Values shorthand
  const pricingVal = formSettings.pricing_matrix?.value || {};
  const commsVal = formSettings.partner_commissions?.value || {};
  const storageVal = formSettings.hub_storage_policy?.value || {};
  const slaVal = formSettings.sla_benchmarks?.value || {};
  const secVal = formSettings.security_governance?.value || {};

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Panel */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-slate-900 text-white shrink-0">
                <Settings className="w-5 h-5 text-emerald-400" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                  <span>System Rates & Settings</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active: {pricingVal.rate_version || 'v2.4'}
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tariff matrix, partner revenue splits, storage bay fees & dispatch SLA rules.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={fetchSettings}
              disabled={loading || saving}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-2xs"
              title="Refresh settings from server"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            {hasChangesInTab(activeTab) && (
              <>
                <button
                  onClick={handleRevertTab}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-all flex items-center gap-1.5"
                  title="Revert unsaved changes in this tab"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Revert</span>
                </button>
                <button
                  onClick={() => setSaveModalOpen(true)}
                  disabled={saving}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-xs"
                  title="Save configuration changes"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save Changes</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Top 4 KPI Metrics (Stack on small screens: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6">
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center">
                Standard Rates
                <InfoTooltip text="Current delivery pricing applied to standard parcel bookings." />
              </span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-2 font-mono">
              {pricingVal.rate_version || 'v2.4-2026.11'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Base: ₦{pricingVal.base_small_ngn?.toLocaleString() || 1200} · ₦{pricingVal.base_medium_ngn?.toLocaleString() || 1600} · ₦{pricingVal.base_large_ngn?.toLocaleString() || 2400}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center">
                Free Storage Window
                <InfoTooltip text="Number of free days a customer can leave a parcel at a hub before extra fees start." />
              </span>
              <Package className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-2">
              {storageVal.free_storage_days || 3} Days Free
            </div>
            <div className="text-[11px] text-sky-700 font-medium mt-1">
              ₦{storageVal.daily_overdue_fee_ngn || 300}/day daily overdue fee
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center">
                Partner Payouts
                <InfoTooltip text="Standard earnings paid to collection hubs and courier drivers per parcel." />
              </span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-2">
              ₦{(Number(commsVal.hub_intake_fee_ngn || 200) + Number(commsVal.hub_release_fee_ngn || 200)).toLocaleString()} / parcel
            </div>
            <div className="text-[11px] text-indigo-700 font-medium mt-1">
              Hub: ₦{commsVal.hub_intake_fee_ngn || 200} in / ₦{commsVal.hub_release_fee_ngn || 200} out · Driver: ₦{commsVal.courier_pickup_ngn || 500}+
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center">
                Service Targets & Security
                <InfoTooltip text="Key delivery deadlines, recipient OTP validity, and approval safeguards." />
              </span>
              <ShieldCheck className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-2">
              {slaVal.collection_otp_validity_hours || 72}h OTP Validity
            </div>
            <div className="text-[11px] text-amber-800 font-medium mt-1">
              {secVal.require_two_person_override ? '2-Person Override: Enforced' : 'Single Approval'}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchSettings} className="font-semibold underline hover:text-rose-900">
            Retry
          </button>
        </div>
      )}

      {/* Unsaved Changes Banner */}
      {hasChangesInTab(activeTab) && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/90 text-xs text-amber-900 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">
              You have unsaved changes in this tab. Click "Save Changes" to apply and record an audit log entry.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRevertTab}
              className="px-2.5 py-1 text-xs font-semibold text-amber-800 hover:underline"
            >
              Revert
            </button>
            <button
              onClick={() => setSaveModalOpen(true)}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-xs"
            >
              Save Now
            </button>
          </div>
        </div>
      )}

      {/* Tab Selector (Short, Layman, No awkward wrapping) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'pricing'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Delivery Rates</span>
          {hasChangesInTab('pricing') && (
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('commissions')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'commissions'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Partner Payouts</span>
          {hasChangesInTab('commissions') && (
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'storage'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Hub Storage & Fees</span>
          {hasChangesInTab('storage') && (
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('sla')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'sla'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Delivery Targets & Rules</span>
          {hasChangesInTab('sla') && (
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'history'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit History</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
            {auditHistory.length}
          </span>
        </button>
      </div>

      {/* TAB 1: DELIVERY RATES */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Parcel Size Base Prices
                <InfoTooltip text="Starting delivery charge based on the physical size of the parcel." />
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Standard delivery prices in Nigerian Naira (₦). Extra weight and doorstep delivery add-ons apply on top of these prices.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Small */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">Small Parcel</span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase bg-white px-2 py-0.5 rounded border border-slate-200">
                    Up to 2kg
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Documents, envelopes, lightweight cosmetics, shoe boxes.
                </p>
                <div className="pt-2">
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Base Price (₦)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
                    <input
                      type="number"
                      step="50"
                      min="100"
                      value={pricingVal.base_small_ngn || ''}
                      onChange={(e) => updateField('pricing_matrix', 'base_small_ngn', parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Medium */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">Medium Parcel</span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase bg-white px-2 py-0.5 rounded border border-slate-200">
                    2kg – 5kg
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Microwaves, standard ecommerce shipping cartons, apparel bundles.
                </p>
                <div className="pt-2">
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Base Price (₦)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
                    <input
                      type="number"
                      step="50"
                      min="100"
                      value={pricingVal.base_medium_ngn || ''}
                      onChange={(e) => updateField('pricing_matrix', 'base_medium_ngn', parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Large */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">Large Parcel</span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase bg-white px-2 py-0.5 rounded border border-slate-200">
                    5kg – 15kg
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Bulk crates, commercial merchandise, large storage sacks.
                </p>
                <div className="pt-2">
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Base Price (₦)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
                    <input
                      type="number"
                      step="50"
                      min="100"
                      value={pricingVal.base_large_ngn || ''}
                      onChange={(e) => updateField('pricing_matrix', 'base_large_ngn', parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Service Multipliers */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Service Type Pricing
                <InfoTooltip text="Pricing factors applied depending on whether pickup or delivery happens at a hub or doorstep." />
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Hub to Hub (Dropoff & Pickup)
                  </span>
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    value={pricingVal.multipliers?.HUB_TO_HUB || 1.0}
                    onChange={(e) => updateField('pricing_matrix', 'multipliers.HUB_TO_HUB', parseFloat(e.target.value) || 1.0)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Baseline counter-to-counter service</span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Door to Hub (Home Pickup)
                  </span>
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    value={pricingVal.multipliers?.DOOR_TO_HUB || 1.25}
                    onChange={(e) => updateField('pricing_matrix', 'multipliers.DOOR_TO_HUB', parseFloat(e.target.value) || 1.25)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">+Driver collects from sender home</span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Hub to Door (Home Delivery)
                  </span>
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    value={pricingVal.multipliers?.HUB_TO_DOOR || 1.35}
                    onChange={(e) => updateField('pricing_matrix', 'multipliers.HUB_TO_DOOR', parseFloat(e.target.value) || 1.35)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">+Driver delivers to recipient home</span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Door to Door (Full Courier)
                  </span>
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    value={pricingVal.multipliers?.DOOR_TO_DOOR || 1.55}
                    onChange={(e) => updateField('pricing_matrix', 'multipliers.DOOR_TO_DOOR', parseFloat(e.target.value) || 1.55)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Full doorstep courier dispatch</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Extra Weight Charge (₦/kg)
                  <InfoTooltip text="Charged for every additional kilogram above package tier limit." />
                </span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
                  <input
                    type="number"
                    step="25"
                    min="0"
                    value={pricingVal.extra_kg_rate_ngn || 250}
                    onChange={(e) => updateField('pricing_matrix', 'extra_kg_rate_ngn', parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Applied for weight beyond size tier</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Parcel Insurance Fee (%)
                  <InfoTooltip text="Optional coverage fee to protect against loss or damage during transit." />
                </span>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={pricingVal.insurance_rate_pct || 1.0}
                    onChange={(e) => updateField('pricing_matrix', 'insurance_rate_pct', parseFloat(e.target.value) || 0)}
                    className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">%</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Transit loss protection surcharge</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Rate Card Code
                  <InfoTooltip text="System version tag recorded on all receipts and invoices." />
                </span>
                <input
                  type="text"
                  value={pricingVal.rate_version || 'v2.4-2026.11'}
                  onChange={(e) => updateField('pricing_matrix', 'rate_version', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Attached to quotes for audit tracking</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PARTNER PAYOUTS */}
      {activeTab === 'commissions' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Partner Payouts & Commissions
              <InfoTooltip text="Standard earnings paid to collection point owners and courier drivers for each service completed." />
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Fixed earnings paid per parcel handoff to guarantee fair, clear partner income across Nigeria.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Neighborhood Hub Split */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                  <Users className="w-4 h-4" />
                </span>
                <span>Collection Hub Commissions</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Package Drop-In Fee (₦)
                    <InfoTooltip text="Paid to hub owner when they receive and check in a parcel into a storage bay." />
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
                    <input
                      type="number"
                      step="10"
                      min="0"
                      value={commsVal.hub_intake_fee_ngn || 200}
                      onChange={(e) => updateField('partner_commissions', 'hub_intake_fee_ngn', parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Credited upon package check-in</span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Package Handover Fee (₦)
                    <InfoTooltip text="Paid to hub owner when the customer collects their parcel with an OTP." />
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
                    <input
                      type="number"
                      step="10"
                      min="0"
                      value={commsVal.hub_release_fee_ngn || 200}
                      onChange={(e) => updateField('partner_commissions', 'hub_release_fee_ngn', parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Credited upon verified OTP pickup</span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Overdue Fee Share (%)
                    <InfoTooltip text="Percentage of overdue holding fees kept by the hub owner for extra storage time." />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="5"
                      min="0"
                      max="100"
                      value={commsVal.hub_storage_share_pct || 50}
                      onChange={(e) => updateField('partner_commissions', 'hub_storage_share_pct', parseFloat(e.target.value) || 0)}
                      className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Percentage of overdue fee paid to hub host</span>
                </div>
              </div>
            </div>

            {/* Courier Rider Payouts */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <span className="p-1.5 rounded-lg bg-sky-50 text-sky-700">
                  <Package className="w-4 h-4" />
                </span>
                <span>Courier Driver Payouts</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Sender Pickup Payout (₦)
                    <InfoTooltip text="Paid to driver when collecting a package from a sender's doorstep." />
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
                    <input
                      type="number"
                      step="20"
                      min="0"
                      value={commsVal.courier_pickup_ngn || 500}
                      onChange={(e) => updateField('partner_commissions', 'courier_pickup_ngn', parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">First-mile doorstep pickup fee</span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Customer Delivery Payout (₦)
                    <InfoTooltip text="Paid to driver when delivering a package to the customer's home or office." />
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
                    <input
                      type="number"
                      step="20"
                      min="0"
                      value={commsVal.courier_delivery_ngn || 600}
                      onChange={(e) => updateField('partner_commissions', 'courier_delivery_ngn', parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Last-mile doorstep delivery fee</span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Platform Fee (%)
                    <InfoTooltip text="Percentage retained to cover network technology, dispatching, and customer support." />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="5"
                      max="40"
                      value={commsVal.platform_commission_pct || 18}
                      onChange={(e) => updateField('partner_commissions', 'platform_commission_pct', parseFloat(e.target.value) || 0)}
                      className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Technology & network coordination fee</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STORAGE & OVERDUE FEES */}
      {activeTab === 'storage' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Storage Duration & Late Pickup Fees
              <InfoTooltip text="Rules on how long customers can leave packages at a hub before extra daily charges apply." />
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Keep neighborhood hub shelves moving by preventing uncollected packages from taking up space.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">
                Free Storage Window
                <InfoTooltip text="Days a parcel can stay at the hub for free after arrival notification." />
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={storageVal.free_storage_days || 3}
                  onChange={(e) => updateField('hub_storage_policy', 'free_storage_days', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
                <span className="text-xs font-semibold text-slate-500">Days</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                Standard holding window included at zero extra cost.
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">
                Daily Overdue Storage Fee
                <InfoTooltip text="Extra charge per day added to recipient bill if collected after free days." />
              </span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₦</span>
                <input
                  type="number"
                  step="50"
                  min="0"
                  value={storageVal.daily_overdue_fee_ngn || 300}
                  onChange={(e) => updateField('hub_storage_policy', 'daily_overdue_fee_ngn', parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
              </div>
              <span className="text-[10px] text-slate-500 block">
                Charged to recipient upon late collection.
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">
                Return to Sender Deadline
                <InfoTooltip text="After this many days without collection, the package is sent back to the sender." />
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="3"
                  max="30"
                  value={storageVal.max_storage_days_before_rts || 7}
                  onChange={(e) => updateField('hub_storage_policy', 'max_storage_days_before_rts', parseInt(e.target.value) || 7)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
                <span className="text-xs font-semibold text-slate-500">Days</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                Parcels exceeding this threshold escalate to return queue.
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">
                SMS Warning Alert
                <InfoTooltip text="Hours before the free storage window ends when an automatic reminder SMS is sent." />
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="6"
                  max="48"
                  value={storageVal.reminder_window_hours || 24}
                  onChange={(e) => updateField('hub_storage_policy', 'reminder_window_hours', parseInt(e.target.value) || 24)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
                <span className="text-xs font-semibold text-slate-500">Hours</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                Automated SMS sent to recipient before fee starts.
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/30 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Auto-Return Uncollected Packages
              </span>
              <span className="text-[11px] text-slate-500">
                Automatically flags packages for return to the sender once they exceed the deadline.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={storageVal.auto_rts_enabled ?? true}
                onChange={(e) => updateField('hub_storage_policy', 'auto_rts_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>
      )}

      {/* TAB 4: DELIVERY TARGETS & RULES (Simplified Layman Terms) */}
      {activeTab === 'sla' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Delivery Targets & Security Rules
              <InfoTooltip text="Speed targets for drivers and hubs, plus platform security requirements." />
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Operational speed targets and security controls for nationwide parcel operations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card 1 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">
                Recipient OTP Validity Window
                <InfoTooltip text="How long the 6-digit pickup OTP remains valid for the recipient." />
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="12"
                  max="168"
                  value={slaVal.collection_otp_validity_hours || 72}
                  onChange={(e) => updateField('sla_benchmarks', 'collection_otp_validity_hours', parseInt(e.target.value) || 72)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
                <span className="text-xs font-semibold text-slate-500">Hours</span>
              </div>
              <span className="text-[10px] text-slate-400 block">Lifetime of 6-digit collection OTP code</span>
            </div>

            {/* Card 2 (User specifically noted) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">
                Driver Pickup Time
                <InfoTooltip text="Target time for a driver to arrive at the sender's location after accepting a pickup order." />
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="15"
                  max="180"
                  value={slaVal.courier_pickup_sla_mins || 45}
                  onChange={(e) => updateField('sla_benchmarks', 'courier_pickup_sla_mins', parseInt(e.target.value) || 45)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
                <span className="text-xs font-semibold text-slate-500">Mins</span>
              </div>
              <span className="text-[10px] text-slate-400 block">Target arrival at sender doorstep after dispatch</span>
            </div>

            {/* Card 3 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">
                Stalled Parcel Alert
                <InfoTooltip text="Flags a package if it has not moved or been scanned within this timeframe." />
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="6"
                  max="72"
                  value={slaVal.stalled_shipment_alert_hours || 24}
                  onChange={(e) => updateField('sla_benchmarks', 'stalled_shipment_alert_hours', parseInt(e.target.value) || 24)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
                <span className="text-xs font-semibold text-slate-500">Hours</span>
              </div>
              <span className="text-[10px] text-slate-400 block">Flags shipment as exception if no scan occurs</span>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Security & Verification Safeguards */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Security & Verification Safeguards
            </h3>
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Two-Person Approval for Administrative Override
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Requires a second manager's review for sensitive overrides like driver reassignment or forced returns.
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                  Enforced
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Strict 11-Digit Postcode Verification
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Ensures all delivery addresses have a verified 11-digit Nigerian digital postcode before dispatch.
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 whitespace-nowrap">
                  Active
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Low-Bandwidth Mode for Remote LGAs
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Optimizes data usage for mobile devices and hubs on 2G/3G connections in remote areas.
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                  Standard Mode
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-xs text-slate-900">
                Settings Change Log
              </h3>
              <p className="text-[11px] text-slate-500">
                Tamper-proof record of all adjustments made to rates, payouts, and storage rules.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 min-w-[150px]">Date & Time</th>
                  <th className="py-3 px-4 min-w-[140px]">Manager / Staff</th>
                  <th className="py-3 px-4 min-w-[150px]">Changed Setting</th>
                  <th className="py-3 px-4 min-w-[260px]">Reason for Change</th>
                  <th className="py-3 px-4 min-w-[130px]">Audit Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No settings modifications logged yet.
                    </td>
                  </tr>
                ) : (
                  auditHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {item.actor_name || 'Operations Admin'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {item.actor_email || 'admin@hotboxng.com'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                          {item.details?.setting_key || 'system_settings'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="italic text-slate-800">
                          "{item.details?.reason || 'Administrative adjustment'}"
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {item.correlation_id}
                          </span>
                          <button
                            onClick={() => handleCopy(item.correlation_id, item.id)}
                            className="text-slate-400 hover:text-slate-600"
                            title="Copy correlation ID"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIRMATION SAVE MODAL */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-slate-900 text-white">
                  <Save className="w-4 h-4 text-emerald-400" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Confirm Settings Update
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Section: <span className="font-semibold text-slate-800">{formSettings[currentTabSettingKey]?.description}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSaveModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Privileged Manager Action</span>
                  <span>
                    Pursuant to platform operating regulations, all configuration modifications are permanently logged to the audit ledger.
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Reason for Change <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g., Updated fuel rate benchmark for courier deliveries..."
                  value={adminReason}
                  onChange={(e) => {
                    setAdminReason(e.target.value);
                    setReasonError('');
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                {reasonError && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{reasonError}</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-2">
              <button
                onClick={() => setSaveModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={saving}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5 shadow-xs"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-300" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Authorize & Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
