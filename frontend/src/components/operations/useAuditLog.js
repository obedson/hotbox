import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../lib/api';

const API_BASE = '/api/v1';

export default function useAuditLog() {
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
      const res = await apiFetch(`${API_BASE}/operations/audit/logs`);
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


  return {
    activeTab,
    adminActionFilter,
    adminEntityFilter,
    adminPage,
    adminPageSize,
    adminSearch,
    auditLogs,
    copiedId,
    custodyMethodFilter,
    custodyPage,
    custodyPageSize,
    custodySearch,
    custodyTransfers,
    custodyTypeFilter,
    error,
    fetchAuditData,
    filteredAdmin,
    filteredCustody,
    formatDateTime,
    getHandoverLabel,
    handleCopy,
    handleExportCSV,
    inspectModal,
    loading,
    paginatedAdmin,
    paginatedCustody,
    setActiveTab,
    setAdminActionFilter,
    setAdminEntityFilter,
    setAdminPage,
    setAdminPageSize,
    setAdminSearch,
    setAuditLogs,
    setCopiedId,
    setCustodyMethodFilter,
    setCustodyPage,
    setCustodyPageSize,
    setCustodySearch,
    setCustodyTransfers,
    setCustodyTypeFilter,
    setError,
    setInspectModal,
    setLoading,
    setSummary,
    summary,
  };
}
