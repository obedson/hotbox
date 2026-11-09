import { apiFetch } from '../../lib/api';
import { useState } from 'react';

export default function useCompanySettings({ account, setAccount }) {
  // Live Enterprise Company Settings & Governance State (PostgreSQL enterprise_accounts & addresses)
  const [companySettings, setCompanySettings] = useState(null);
  const [settingsWarehouses, setSettingsWarehouses] = useState([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState(null);
  const [settingsEditForm, setSettingsEditForm] = useState({
    company_name: '',
    cac_rc_number: '',
    tax_id: '',
    billing_email: '',
    support_phone: '',
    headquarters_address: '',
    headquarters_postcode: ''
  });
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [submittingStaff, setSubmittingStaff] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState({
    name: '',
    email: '',
    phone: '+234 ',
    role: 'Operations Lead',
    access_level: 'OPERATIONS'
  });

  const fetchCompanySettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await apiFetch('/api/v1/enterprise/settings', {
        headers: {}
      });
      const data = await res.json();
      if (data.settings) {
        setCompanySettings(data.settings);
        setSettingsEditForm({
          company_name: data.settings.company_name || '',
          cac_rc_number: data.settings.cac_rc_number || '',
          tax_id: data.settings.tax_id || '',
          billing_email: data.settings.billing_email || '',
          support_phone: data.settings.support_phone || '',
          headquarters_address: data.settings.headquarters_address || '',
          headquarters_postcode: data.settings.headquarters_postcode || ''
        });
      }
      if (data.warehouses) {
        setSettingsWarehouses(data.warehouses);
      }
    } catch (err) {
      console.error('Failed to load enterprise company settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    setSettingsFeedback(null);
    try {
      const res = await apiFetch('/api/v1/enterprise/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsEditForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update company settings');

      setCompanySettings(data.settings);
      setSettingsFeedback({ type: 'success', message: 'Company settings updated and saved to PostgreSQL successfully.' });
      if (account) {
        setAccount(prev => ({ ...prev, company_name: data.settings.company_name }));
      }
      setTimeout(() => setSettingsFeedback(null), 4000);
    } catch (err) {
      setSettingsFeedback({ type: 'error', message: err.message });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!newStaffForm.name || !newStaffForm.email || !newStaffForm.role) {
      alert('Please fill out name, email, and role.');
      return;
    }
    setSubmittingStaff(true);
    try {
      const res = await apiFetch('/api/v1/enterprise/settings/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newStaffForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add staff seat');

      setCompanySettings(prev => ({ ...prev, staff_seats: data.staff_seats }));
      setIsAddStaffOpen(false);
      setNewStaffForm({
        name: '',
        email: '',
        phone: '+234 ',
        role: 'Operations Lead',
        access_level: 'OPERATIONS'
      });
    } catch (err) {
      alert('Error adding staff: ' + err.message);
    } finally {
      setSubmittingStaff(false);
    }
  };

  const handleRemoveStaff = async (staffId, staffName) => {
    if (!window.confirm(`Revoke staff seat access for ${staffName}?`)) return;
    try {
      const res = await apiFetch(`/api/v1/enterprise/settings/staff/${staffId}`, {
        method: 'DELETE',
        headers: {}
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke staff seat');

      setCompanySettings(prev => ({ ...prev, staff_seats: data.staff_seats }));
    } catch (err) {
      alert('Error revoking staff seat: ' + err.message);
    }
  };

  return {
    companySettings,
    settingsWarehouses,
    settingsLoading,
    savingSettings,
    settingsFeedback,
    settingsEditForm,
    isAddStaffOpen,
    submittingStaff,
    newStaffForm,
    setSettingsEditForm,
    setIsAddStaffOpen,
    setNewStaffForm,
    fetchCompanySettings,
    handleSaveSettings,
    handleAddStaff,
    handleRemoveStaff
  };
}
