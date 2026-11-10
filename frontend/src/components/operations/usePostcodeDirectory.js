import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../lib/api';

export default function usePostcodeDirectory() {
  const [postcodes, setPostcodes] = useState([]);
  const [counts, setCounts] = useState({
    total_registered: 0,
    serviced_postcodes: 0,
    hub_catchments: 0,
    expansion_zones: 0,
    total_shipments_routed: 0,
    adoption_rate_pct: '0.0',
    active_hubs_count: 0,
    active_riders_count: 0
  });
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('ALL');
  const [copiedKey, setCopiedKey] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Interactive Lookup Tool State
  const [testCode, setTestCode] = useState('FC-01-A05-FK-05');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);

  // Modal states
  const [selectedPostcode, setSelectedPostcode] = useState(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [catchmentData, setCatchmentData] = useState(null);
  const [loadingCatchment, setLoadingCatchment] = useState(false);

  // Official Postcode Guide / NIPOST Redirect Modal
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  const fetchDirectory = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (activeTab !== 'ALL') params.append('status', activeTab);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedState !== 'ALL') params.append('state', selectedState);

      const res = await apiFetch(`/api/v1/operations/postcodes/directory?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();

      setPostcodes(data.postcodes || []);
      if (data.counts) setCounts(data.counts);
      if (data.states) setStates(data.states);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error fetching postcodes directory:', err);
      setError('Failed to load NDAPS directory. Ensure backend server is operational.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
    if (!lookupResult) {
      runLookup('FC-01-A05-FK-05');
    }
  }, [activeTab, selectedState]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDirectory();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const runLookup = async (codeToTest = testCode) => {
    if (!codeToTest || !codeToTest.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    try {
      const clean = codeToTest.trim().toUpperCase();
      const res = await apiFetch(`/api/v1/operations/postcodes/${clean}/catchment`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resolve postcode');
      setLookupResult(data);
    } catch (err) {
      setLookupError(err.message);
      setLookupResult(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const openPostcodeDossier = async (item) => {
    setSelectedPostcode(item);
    setIsDossierOpen(true);
    setLoadingCatchment(true);
    try {
      const code = item.canonical_postcode || item.postcode;
      const res = await apiFetch(`/api/v1/operations/postcodes/${code}/catchment`);
      const data = await res.json();
      setCatchmentData(data);
    } catch (err) {
      console.error('Failed to load catchment details:', err);
      setCatchmentData(null);
    } finally {
      setLoadingCatchment(false);
    }
  };

  const exportToCsv = () => {
    if (!postcodes.length) return;
    const headers = [
      'NDAPS Postcode', 'Legacy Code', 'State', 'LGA', 'District', 'Neighbourhood',
      'Geopolitical Zone', 'Latitude', 'Longitude', 'Nearby Partner Hubs',
      'Assigned Riders', 'Shipments Routed', 'Service Status', 'Delivery Tier'
    ];
    const rows = postcodes.map(p => [
      `"${p.canonical_postcode || p.postcode}"`,
      `"${p.legacy_code || ''}"`,
      `"${p.state || ''}"`,
      `"${p.lga || ''}"`,
      `"${p.district || ''}"`,
      `"${p.neighbourhood || ''}"`,
      `"${p.zone || ''}"`,
      `"${p.lat || ''}"`,
      `"${p.lng || ''}"`,
      `"${p.hub_count || 0}"`,
      `"${p.rider_count || 0}"`,
      `"${p.shipments_routed || 0}"`,
      `"${p.service_status || ''}"`,
      `"${p.tier || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `hotbox_ndaps_directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalRecords = postcodes.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const paginatedPostcodes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return postcodes.slice(start, start + pageSize);
  }, [postcodes, currentPage, pageSize]);

  return {
    postcodes,
    paginatedPostcodes,
    totalPages,
    totalRecords,
    counts,
    states,
    loading,
    refreshing,
    error,
    activeTab,
    searchQuery,
    selectedState,
    copiedKey,
    currentPage,
    pageSize,
    testCode,
    lookupResult,
    lookupLoading,
    lookupError,
    selectedPostcode,
    isDossierOpen,
    catchmentData,
    loadingCatchment,
    isRegisterOpen,
    actionNotice,
    setActiveTab,
    setSearchQuery,
    setSelectedState,
    setCurrentPage,
    setPageSize,
    setTestCode,
    setActionNotice,
    setIsDossierOpen,
    setIsRegisterOpen,
    fetchDirectory,
    handleCopy,
    runLookup,
    openPostcodeDossier,
    exportToCsv
  };
}
