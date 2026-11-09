import { useState } from 'react';

export default function useShipments({ fetchEnterpriseData, setStats }) {
  const [loading, setLoading] = useState(false);
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkResult, setBulkResult] = useState(null);

  // Live Manifests & Shipments State (No hardcoded data, no simulations)
  const [manifests, setManifests] = useState([]);
  const [manifestsLoading, setManifestsLoading] = useState(false);
  const [shipments, setShipments] = useState([]);
  const [shipmentsLoading, setShipmentsLoading] = useState(false);
  const [shipmentsTotal, setShipmentsTotal] = useState(0);
  const [shipmentsPage, setShipmentsPage] = useState(1);
  const [shipmentsTotalPages, setShipmentsTotalPages] = useState(1);
  const [shipmentsCounts, setShipmentsCounts] = useState({ all: 0, inTransit: 0, delivered: 0, disputed: 0 });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedManifestId, setSelectedManifestId] = useState('ALL');

  const fetchManifests = async () => {
    setManifestsLoading(true);
    try {
      const res = await fetch('/api/v1/enterprise/manifests', {
        headers: {}
      });
      const data = await res.json();
      if (data.manifests) {
        setManifests(data.manifests);
      }
    } catch (err) {
      console.error('Failed to load manifests:', err);
    } finally {
      setManifestsLoading(false);
    }
  };

  const fetchShipments = async (page = 1, status = statusFilter, search = searchQuery, manifestId = selectedManifestId) => {
    setShipmentsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      if (status && status !== 'ALL') params.set('status', status);
      if (search && search.trim()) params.set('search', search.trim());
      if (manifestId && manifestId !== 'ALL') params.set('manifestId', manifestId);

      const res = await fetch(`/api/v1/enterprise/shipments?${params.toString()}`, {
        headers: {}
      });
      const data = await res.json();
      if (data.shipments) {
        setShipments(data.shipments);
        setShipmentsTotal(data.total);
        setShipmentsPage(data.page);
        setShipmentsTotalPages(data.totalPages || 1);
        if (data.counts) {
          setShipmentsCounts(data.counts);
        }
      }
    } catch (err) {
      console.error('Failed to load enterprise shipments:', err);
    } finally {
      setShipmentsLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchShipments(1, statusFilter, searchQuery, selectedManifestId);
  };

  const handleDownloadManifestCsv = (manifestId, manifestCode) => {
    window.open(`/api/v1/enterprise/manifests/${manifestId}/export`, '_blank');
  };

  const handleExecuteBulk = async () => {
    setLoading(true);
    setBulkResult(null);
    try {
      const res = await fetch('/api/v1/enterprise/shipments/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count: bulkCount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch bulk batch');
      setBulkResult(data);
      if (data.stats) {
        setStats(data.stats);
      } else {
        fetchEnterpriseData();
      }
      fetchManifests();
      fetchShipments(1, statusFilter, searchQuery, selectedManifestId);
    } catch (err) {
      alert('Bulk Dispatch Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    manifests,
    manifestsLoading,
    shipments,
    shipmentsLoading,
    shipmentsTotal,
    shipmentsPage,
    shipmentsTotalPages,
    shipmentsCounts,
    statusFilter,
    searchQuery,
    selectedManifestId,
    bulkCount,
    bulkResult,
    setStatusFilter,
    setSearchQuery,
    setSelectedManifestId,
    setBulkCount,
    fetchManifests,
    fetchShipments,
    handleSearchSubmit,
    handleDownloadManifestCsv,
    handleExecuteBulk
  };
}
