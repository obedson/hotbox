import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../lib/api';

const API_BASE = '/api/v1';

export default function useSettings() {
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
      const res = await apiFetch(`${API_BASE}/operations/settings`);
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
      security: 'security_governance',
      digitalbox: 'digital_box_fees',
      legacylink: 'legacy_box_link_fees',
      registry: 'nipost_registry'
    };
    const key = settingMap[tabKey];
    if (!key || !serverSettings[key] || !formSettings[key]) return false;
    return JSON.stringify(serverSettings[key].value) !== JSON.stringify(formSettings[key].value);
  };

  const currentTabSettingKey = {
    pricing: 'pricing_matrix',
    commissions: 'partner_commissions',
    storage: 'hub_storage_policy',
    sla: 'sla_benchmarks',
    digitalbox: 'digital_box_fees',
    legacylink: 'legacy_box_link_fees',
    registry: 'nipost_registry'
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

      const res = await apiFetch(`${API_BASE}/operations/settings`, {
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
  const digitalBoxVal = formSettings.digital_box_fees?.value || {};
  const legacyBoxLinkVal = formSettings.legacy_box_link_fees?.value || {};
  const nipostRegistryVal = formSettings.nipost_registry?.value || {};


  return {
    activeTab,
    adminReason,
    auditHistory,
    commsVal,
    copiedId,
    currentTabSettingKey,
    digitalBoxVal,
    error,
    fetchSettings,
    formSettings,
    handleConfirmSave,
    legacyBoxLinkVal,
    nipostRegistryVal,
    handleCopy,
    handleRevertTab,
    hasChangesInTab,
    loading,
    pricingVal,
    reasonError,
    saveModalOpen,
    saving,
    secVal,
    serverSettings,
    setActiveTab,
    setAdminReason,
    setAuditHistory,
    setCopiedId,
    setError,
    setFormSettings,
    setLoading,
    setReasonError,
    setSaveModalOpen,
    setSaving,
    setServerSettings,
    setSuccessMessage,
    slaVal,
    storageVal,
    successMessage,
    updateField,
  };
}
