import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../lib/api';

export default function useHubDirectory() {
  const [hubs, setHubs] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    accredited: 0,
    pending: 0,
    suspended: 0,
    near_capacity: 0,
    avg_utilization_pct: '0.0',
    total_parcels_stored: 0,
    reviews_due: 0
  });
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('ALL');
  const [capacityFilter, setCapacityFilter] = useState('ALL');
  const [intakeFilter, setIntakeFilter] = useState('ALL');
  const [copiedKey, setCopiedKey] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal & Inspector states
  const [selectedHub, setSelectedHub] = useState(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [hubDetails, setHubDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  const fetchHubs = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (activeTab !== 'ALL') params.append('status', activeTab);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedState !== 'ALL') params.append('state', selectedState);
      if (capacityFilter !== 'ALL') params.append('capacity', capacityFilter);

      const res = await apiFetch(`/api/v1/operations/hubs?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();

      let filtered = data.hubs || [];
      if (intakeFilter === 'ACCEPTING') {
        filtered = filtered.filter(h => h.is_accepting_parcels === true);
      } else if (intakeFilter === 'PAUSED') {
        filtered = filtered.filter(h => h.is_accepting_parcels === false);
      }

      setHubs(filtered);
      if (data.counts) setCounts(data.counts);
      if (data.states) setStates(data.states);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error fetching hubs:', err);
      setError('Failed to retrieve partner hub records. Check backend connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHubs();
  }, [activeTab, selectedState, capacityFilter, intakeFilter]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHubs();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Copy to clipboard helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Inspect Hub Dossier & Bays
  const openHubDossier = async (hub) => {
    setSelectedHub(hub);
    setIsDossierOpen(true);
    setLoadingDetails(true);
    try {
      const res = await apiFetch(`/api/v1/operations/hubs/${hub.id}/details`);
      if (!res.ok) throw new Error('Failed to fetch hub details');
      const data = await res.json();
      setHubDetails(data);
    } catch (err) {
      console.error('Failed to load hub details:', err);
      setHubDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Toggle Ingestion Intake
  const handleToggleIntake = async (hubId, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await apiFetch(`/api/v1/operations/hubs/${hubId}/toggle-intake`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle intake');

      setActionNotice({
        type: 'success',
        message: data.message || `Hub intake updated to ${data.is_accepting_parcels ? 'Active' : 'Suspended'}`
      });

      // Update in place
      setHubs(prev => prev.map(h => h.id === hubId ? { ...h, is_accepting_parcels: data.is_accepting_parcels } : h));
      if (selectedHub && selectedHub.id === hubId) {
        setSelectedHub(prev => ({ ...prev, is_accepting_parcels: data.is_accepting_parcels }));
      }
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      alert(`Error toggling intake: ${err.message}`);
    }
  };

  // Toggle Hub Status (Accreditation / Suspend)
  const handleToggleStatus = async (hubId, targetStatus, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to mark this hub as ${targetStatus.toUpperCase()}?`)) return;

    try {
      const res = await apiFetch(`/api/v1/operations/hubs/${hubId}/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update hub status');

      setActionNotice({
        type: 'success',
        message: data.message || `Hub status updated to ${targetStatus}`
      });

      // Update in place
      setHubs(prev => prev.map(h => h.id === hubId ? { ...h, status: targetStatus } : h));
      if (selectedHub && selectedHub.id === hubId) {
        setSelectedHub(prev => ({ ...prev, status: targetStatus }));
      }
      fetchHubs(true);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      alert(`Error updating hub status: ${err.message}`);
    }
  };

  // CSV Export
  const exportToCsv = () => {
    if (!hubs.length) return;
    const headers = [
      'Hub Name', 'Owner / Operator', 'CAC Number', 'Phone', 'Email',
      'NDAPS Postcode', 'Street Address', 'LGA', 'State',
      'Capacity', 'Current Load', 'Utilization %', 'Intake Active',
      'Track C Status', 'Rating'
    ];
    const rows = hubs.map(h => [
      `"${h.business_name || ''}"`,
      `"${h.owner_name || ''}"`,
      `"${h.cac_number || ''}"`,
      `"${h.phone || ''}"`,
      `"${h.email || ''}"`,
      `"${h.postcode || ''}"`,
      `"${(h.address_text || '').replace(/"/g, '""')}"`,
      `"${h.lga || ''}"`,
      `"${h.state || ''}"`,
      `"${h.capacity || 0}"`,
      `"${h.current_load || 0}"`,
      `"${h.utilization_pct || 0}%"`,
      `"${h.is_accepting_parcels ? 'Yes' : 'No'}"`,
      `"${h.status || ''}"`,
      `"${h.rating || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `hotbox_partner_hubs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination calculation
  const totalRecords = hubs.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const paginatedHubs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return hubs.slice(start, start + pageSize);
  }, [hubs, currentPage, pageSize]);

  // Color helper for capacity utilization
  const getCapacityColor = (pct) => {
    const val = parseFloat(pct) || 0;
    if (val >= 85) return { bar: 'bg-rose-500', text: 'text-rose-700', badge: 'bg-rose-50 border-rose-200' };
    if (val >= 65) return { bar: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-50 border-amber-200' };
    return { bar: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-50 border-emerald-200' };
  };


  return {
    actionNotice,
    activeTab,
    capacityFilter,
    copiedKey,
    counts,
    currentPage,
    error,
    exportToCsv,
    fetchHubs,
    getCapacityColor,
    handleCopy,
    handleToggleIntake,
    handleToggleStatus,
    hubDetails,
    hubs,
    intakeFilter,
    isDossierOpen,
    loading,
    loadingDetails,
    openHubDossier,
    pageSize,
    paginatedHubs,
    refreshing,
    searchQuery,
    selectedHub,
    selectedState,
    setActionNotice,
    setActiveTab,
    setCapacityFilter,
    setCopiedKey,
    setCounts,
    setCurrentPage,
    setError,
    setHubDetails,
    setHubs,
    setIntakeFilter,
    setIsDossierOpen,
    setLoading,
    setLoadingDetails,
    setPageSize,
    setRefreshing,
    setSearchQuery,
    setSelectedHub,
    setSelectedState,
    setStates,
    states,
    totalPages,
    totalRecords,
  };
}
