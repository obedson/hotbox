import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../lib/api';

export default function useExceptionManagement() {
  const [exceptions, setExceptions] = useState([]);
  const [counts, setCounts] = useState({
    total_open: 0,
    stalled_transit: 0,
    overdue_holding: 0,
    open_claims: 0,
    resolved_count: 0,
    total_financial_exposure_ngn: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Investigation Dossier Modal
  const [selectedException, setSelectedException] = useState(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [dossierData, setDossierData] = useState(null);

  // Resolution Form States
  const [activeActionTab, setActiveActionTab] = useState('claim'); // 'claim' | 'reassign' | 'rts'
  const [claimDecision, setClaimDecision] = useState('SETTLE'); // 'SETTLE' | 'APPROVE' | 'REJECT'
  const [settlementAmount, setSettlementAmount] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [selectedRiderId, setSelectedRiderId] = useState('');
  const [reassignReason, setReassignReason] = useState('Stalled delivery reassignment by operations desk');
  const [rtsReason, setRtsReason] = useState('Customer requested Return-to-Sender / Recipient unavailable');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchExceptions = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (activeTab !== 'ALL') params.append('tab', activeTab);
      if (severityFilter !== 'ALL') params.append('severity', severityFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await apiFetch(`/api/v1/operations/exceptions?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();

      setExceptions(data.exceptions || []);
      if (data.counts) setCounts(data.counts);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error fetching exceptions:', err);
      setError('Unable to load delivery issues. Click Refresh to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, [activeTab, severityFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchExceptions();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auto-dismiss notification
  useEffect(() => {
    if (actionNotice) {
      const timer = setTimeout(() => setActionNotice(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionNotice]);

  // Copy tracking code with checkmark feedback
  const handleCopyCode = (code, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Seed / Reset Database
  const handleSeedExceptions = async () => {
    if (!window.confirm('Reset/Seed the authoritative 17 operational exceptions and claims dataset?')) return;
    setSeeding(true);
    try {
      const res = await apiFetch('/api/v1/operations/exceptions/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionNotice({
          type: 'success',
          message: 'Authoritative exception incidents successfully refreshed in database.'
        });
        fetchExceptions();
      } else {
        throw new Error(data.error || 'Seed failed');
      }
    } catch (err) {
      console.error('Seed exceptions error:', err);
      setActionNotice({ type: 'error', message: err.message });
    } finally {
      setSeeding(false);
    }
  };

  // Open Investigation Dossier
  const handleOpenDossier = async (exc) => {
    setSelectedException(exc);
    setIsDossierOpen(true);
    setLoadingDetails(true);
    setDossierData(null);
    setSettlementAmount(exc.amount_ngn ? String(exc.amount_ngn) : '');
    setResolutionNotes('');

    if (exc.type === 'CLAIM' || exc.incident_type?.includes('CLAIM') || exc.incident_type?.includes('DISPUTE')) {
      setActiveActionTab('claim');
    } else if (exc.incident_type === 'STALLED_IN_TRANSIT' || exc.status === 'IN_TRANSIT_TO_HUB') {
      setActiveActionTab('reassign');
    } else {
      setActiveActionTab('rts');
    }

    try {
      const res = await apiFetch(`/api/v1/operations/exceptions/${exc.id}/details`);
      if (res.ok) {
        const data = await res.json();
        setDossierData(data);
        if (data.available_riders?.length > 0) {
          setSelectedRiderId(data.available_riders[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load dossier details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Settle / Approve / Reject Claim
  const handleResolveClaim = async () => {
    if (!selectedException) return;
    setSubmittingAction(true);
    try {
      const res = await apiFetch(`/api/v1/operations/exceptions/${selectedException.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: claimDecision,
          resolutionAmountNgn: parseFloat(settlementAmount) || 0,
          resolutionNotes: resolutionNotes || `Claim ${claimDecision} by Operations Officer`
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', message: data.message });
        setIsDossierOpen(false);
        fetchExceptions();
      } else {
        throw new Error(data.error || 'Resolution failed');
      }
    } catch (err) {
      console.error('Claim resolution error:', err);
      setActionNotice({ type: 'error', message: err.message });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Reassign Courier for Stalled Delivery
  const handleReassignCourier = async () => {
    if (!selectedException || !selectedRiderId) return;
    setSubmittingAction(true);
    try {
      const res = await apiFetch('/api/v1/operations/exceptions/reassign-courier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentId: selectedException.shipment_id,
          newRiderId: selectedRiderId,
          reason: reassignReason
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', message: data.message });
        setIsDossierOpen(false);
        fetchExceptions();
      } else {
        throw new Error(data.error || 'Reassignment failed');
      }
    } catch (err) {
      console.error('Courier reassignment error:', err);
      setActionNotice({ type: 'error', message: err.message });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Authorize Return to Sender
  const handleAuthorizeRTS = async () => {
    if (!selectedException) return;
    setSubmittingAction(true);
    try {
      const res = await apiFetch('/api/v1/operations/exceptions/authorize-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentId: selectedException.shipment_id,
          reason: rtsReason
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', message: data.message });
        setIsDossierOpen(false);
        fetchExceptions();
      } else {
        throw new Error(data.error || 'Return authorization failed');
      }
    } catch (err) {
      console.error('Authorize return error:', err);
      setActionNotice({ type: 'error', message: err.message });
    } finally {
      setSubmittingAction(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (exceptions.length === 0) return;
    const headers = [
      'Tracking Code', 'Category', 'Incident Type', 'Severity', 'Service Type',
      'Customer', 'Recipient', 'Route', 'Custodian', 'Declared Value (NGN)',
      'Late Storage Fee (NGN)', 'Status', 'Date Logged'
    ];
    const rows = exceptions.map(e => [
      `"${e.tracking_code || ''}"`,
      `"${e.category || ''}"`,
      `"${e.incident_type || ''}"`,
      `"${e.severity || ''}"`,
      `"${e.service_type || ''}"`,
      `"${e.customer_name || ''}"`,
      `"${e.recipient_name || ''}"`,
      `"${e.route || ''}"`,
      `"${e.current_custodian || ''}"`,
      e.amount_ngn || 0,
      e.holding_fee_ngn || 0,
      `"${e.status || ''}"`,
      `"${new Date(e.created_at).toLocaleDateString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hotbox_exceptions_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format Helper for Layman Incident Types
  const formatIncidentType = (type) => {
    switch (type) {
      case 'STALLED_IN_TRANSIT':
        return 'Stalled Delivery (>24h Inactive)';
      case 'OVERDUE_HUB_HOLDING':
        return 'Overdue at Hub (>3 Days)';
      case 'EXPIRED_COLLECTION_DEADLINE':
        return 'Collection Code Expired';
      case 'DAMAGED_PARCEL':
        return 'Damaged Parcel Claim';
      case 'LOST_PARCEL':
        return 'Lost Parcel Claim';
      case 'WRONG_HANDOVER':
        return 'Unauthorized Handover';
      case 'EXCESS_HOLDING_FEE':
        return 'Late Storage Fee Dispute';
      case 'RETURN_REQUESTED':
        return 'Return to Sender Requested';
      case 'RETURNED_TO_SENDER':
        return 'Returned to Sender';
      case 'DISPUTED_INTAKE':
        return 'Disputed Parcel at Intake';
      case 'DELAYED_DELIVERY':
        return 'Extended Delivery Delay';
      default:
        return (type || 'Delivery Exception').replace(/_/g, ' ');
    }
  };

  // Paginated slice
  const paginatedExceptions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return exceptions.slice(start, start + pageSize);
  }, [exceptions, currentPage, pageSize]);


  return {
    actionNotice,
    activeActionTab,
    activeTab,
    claimDecision,
    copiedCode,
    counts,
    currentPage,
    dossierData,
    error,
    exceptions,
    fetchExceptions,
    formatIncidentType,
    handleAuthorizeRTS,
    handleCopyCode,
    handleExportCSV,
    handleOpenDossier,
    handleReassignCourier,
    handleResolveClaim,
    handleSeedExceptions,
    isDossierOpen,
    loading,
    loadingDetails,
    pageSize,
    paginatedExceptions,
    reassignReason,
    refreshing,
    resolutionNotes,
    rtsReason,
    searchQuery,
    seeding,
    selectedException,
    selectedRiderId,
    setActionNotice,
    setActiveActionTab,
    setActiveTab,
    setClaimDecision,
    setCopiedCode,
    setCounts,
    setCurrentPage,
    setDossierData,
    setError,
    setExceptions,
    setIsDossierOpen,
    setLoading,
    setLoadingDetails,
    setPageSize,
    setReassignReason,
    setRefreshing,
    setResolutionNotes,
    setRtsReason,
    setSearchQuery,
    setSeeding,
    setSelectedException,
    setSelectedRiderId,
    setSettlementAmount,
    setSeverityFilter,
    setSubmittingAction,
    settlementAmount,
    severityFilter,
    submittingAction,
  };
}
