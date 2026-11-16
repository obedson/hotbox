import { InfoTooltip } from './SettingsUi';
import { Settings, DollarSign, Users, Package, Clock, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, Save, RotateCcw, Check, X, History } from 'lucide-react';
import AuditHistoryTab from './AuditHistoryTab';
import SettingsConfirmModal from './SettingsConfirmModal';
import DeliveryTargetsTab from './DeliveryTargetsTab';
import StorageFeesTab from './StorageFeesTab';
import PartnerPayoutsTab from './PartnerPayoutsTab';
import DeliveryRatesTab from './DeliveryRatesTab';
import DigitalBoxFeesTab from './DigitalBoxFeesTab';

export default function SettingsPanel({ directory }) {
  const {
    activeTab, adminReason, auditHistory, commsVal, copiedId, currentTabSettingKey, error, fetchSettings, formSettings, handleConfirmSave, handleCopy, handleRevertTab, hasChangesInTab, loading, pricingVal, reasonError, saveModalOpen, saving, secVal, setActiveTab, setAdminReason, setReasonError, setSaveModalOpen, slaVal, storageVal, successMessage, updateField
  } = directory;

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
          onClick={() => setActiveTab('digitalbox')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'digitalbox'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Digital Box Fees</span>
          {hasChangesInTab('digitalbox') && (
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
      {activeTab === 'pricing' && <DeliveryRatesTab pricingVal={directory.pricingVal} updateField={directory.updateField} />}

      {/* TAB 2: PARTNER PAYOUTS */}
      {activeTab === 'commissions' && <PartnerPayoutsTab commsVal={directory.commsVal} updateField={directory.updateField} />}

      {/* TAB 3: STORAGE & OVERDUE FEES */}
      {activeTab === 'storage' && <StorageFeesTab storageVal={directory.storageVal} updateField={directory.updateField} />}

      {/* TAB 4: DELIVERY TARGETS & RULES (Simplified Layman Terms) */}
      {activeTab === 'sla' && <DeliveryTargetsTab slaVal={directory.slaVal} updateField={directory.updateField} />}

      {/* TAB 5: DIGITAL BOX FEES */}
      {activeTab === 'digitalbox' && <DigitalBoxFeesTab digitalBoxVal={directory.digitalBoxVal} updateField={directory.updateField} />}

      {/* TAB 6: AUDIT HISTORY */}
      {activeTab === 'history' && <AuditHistoryTab auditHistory={directory.auditHistory} copiedId={directory.copiedId} handleCopy={directory.handleCopy} />}

      {/* CONFIRMATION SAVE MODAL */}
      {saveModalOpen && (
        <SettingsConfirmModal
          formSettings={formSettings}
          currentTabSettingKey={currentTabSettingKey}
          adminReason={adminReason}
          setAdminReason={setAdminReason}
          setReasonError={setReasonError}
          reasonError={reasonError}
          saving={saving}
          onConfirm={handleConfirmSave}
          onCancel={() => setSaveModalOpen(false)}
        />
      )}
    </div>
  );
}
