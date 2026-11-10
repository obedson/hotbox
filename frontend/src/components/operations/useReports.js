import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../lib/api';

const API_BASE = '/api/v1';

export default function useReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('30d');
  const [activeTab, setActiveTab] = useState('speed'); // 'speed', 'finance', 'hubs', 'coverage'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const fetchReports = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await apiFetch(`${API_BASE}/operations/reports/analytics?timeframe=${timeframe}`, {
        headers: {
          'x-user-role': 'ops_admin'
        }
      });
      if (!res.ok) throw new Error('Failed to load operational reports');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [timeframe]);

  // Export CSV generator with clean layman terms
  const exportActiveReportCSV = () => {
    if (!data) return;

    let headers = [];
    let rows = [];
    let filename = `hotbox-${activeTab}-${timeframe}-${new Date().toISOString().slice(0, 10)}.csv`;

    if (activeTab === 'speed') {
      headers = ['Delivery Type', 'Total Packages', 'Share (%)', 'Total Sales (NGN)', 'Average Cost (NGN)', 'Average Time (Hours)', 'On-Time Rate (%)'];
      rows = data.delivery_sla_report.service_breakdown.map(s => [
        `"${s.service_name}"`,
        s.count,
        `"${s.pct_of_total}%"`,
        s.total_revenue_ngn,
        s.avg_cost_ngn,
        s.avg_transit_hours,
        `"${s.on_time_rate_pct}%"`
      ]);
    } else if (activeTab === 'finance') {
      headers = ['Partner Name', 'Partner Type', 'Packages Handled', 'Total Handled (NGN)', 'Total Earnings (NGN)', 'Already Paid (NGN)', 'Unpaid Balance (NGN)', 'Payment Status'];
      rows = data.financial_settlement_report.partner_settlements.map(p => [
        `"${p.partner_name}"`,
        `"${p.partner_type}"`,
        p.orders_handled,
        p.gross_handled_ngn,
        p.commission_payable_ngn,
        p.amount_paid_out_ngn,
        p.pending_settlement_ngn,
        `"${p.settlement_status}"`
      ]);
    } else if (activeTab === 'hubs') {
      headers = ['Hub Name', 'State', 'LGA', 'Status', 'Total Lockers', 'Occupied Lockers', 'Space Full (%)', 'Overdue Packages', 'Avg Storage Days', 'Storage Earnings (NGN)'];
      rows = data.hub_capacity_report.hubs_capacity_table.map(h => [
        `"${h.hub_name}"`,
        `"${h.state}"`,
        `"${h.lga}"`,
        `"${h.status}"`,
        h.total_bays,
        h.occupied_bays,
        `"${h.utilization_pct}%"`,
        h.overdue_count,
        h.average_holding_days,
        h.revenue_generated_ngn
      ]);
    } else if (activeTab === 'coverage') {
      headers = ['State', 'LGA', 'Postcodes', 'Active Hubs', 'Packages Delivered', 'Coverage Level', 'Success Rate (%)'];
      rows = data.postcode_coverage_report.regional_coverage_table.map(r => [
        `"${r.state}"`,
        `"${r.lga}"`,
        r.registered_postcodes,
        r.active_hubs,
        r.shipments_handled,
        `"${r.adoption_tier}"`,
        `"${r.validation_rate_pct}%"`
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered views
  const filteredSlaRecords = useMemo(() => {
    if (!data?.delivery_sla_report?.recent_sla_records) return [];
    return data.delivery_sla_report.recent_sla_records.filter(r => {
      const q = searchQuery.toLowerCase();
      return (
        r.tracking_code.toLowerCase().includes(q) ||
        r.destination_hub.toLowerCase().includes(q) ||
        r.service_type.toLowerCase().includes(q) ||
        r.sla_status.toLowerCase().includes(q)
      );
    });
  }, [data, searchQuery]);

  const filteredSettlements = useMemo(() => {
    if (!data?.financial_settlement_report?.partner_settlements) return [];
    return data.financial_settlement_report.partner_settlements.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchSearch = p.partner_name.toLowerCase().includes(q) || p.partner_type.toLowerCase().includes(q);
      const matchFilter = filterTier === 'ALL' || p.settlement_status === filterTier;
      return matchSearch && matchFilter;
    });
  }, [data, searchQuery, filterTier]);

  const filteredHubs = useMemo(() => {
    if (!data?.hub_capacity_report?.hubs_capacity_table) return [];
    return data.hub_capacity_report.hubs_capacity_table.filter(h => {
      const q = searchQuery.toLowerCase();
      return (
        h.hub_name.toLowerCase().includes(q) ||
        h.lga.toLowerCase().includes(q) ||
        h.state.toLowerCase().includes(q)
      );
    });
  }, [data, searchQuery]);

  const filteredPostcodes = useMemo(() => {
    if (!data?.postcode_coverage_report?.regional_coverage_table) return [];
    return data.postcode_coverage_report.regional_coverage_table.filter(r => {
      const q = searchQuery.toLowerCase();
      const matchSearch = r.state.toLowerCase().includes(q) || r.lga.toLowerCase().includes(q);
      const matchFilter = filterTier === 'ALL' || r.adoption_tier.toLowerCase().includes(filterTier.toLowerCase());
      return matchSearch && matchFilter;
    });
  }, [data, searchQuery, filterTier]);

  // Paginated slices for each tab
  const paginatedSlaRecords = useMemo(() => {
    return filteredSlaRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredSlaRecords, currentPage, pageSize]);

  const paginatedSettlements = useMemo(() => {
    return filteredSettlements.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredSettlements, currentPage, pageSize]);

  const paginatedHubs = useMemo(() => {
    return filteredHubs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredHubs, currentPage, pageSize]);

  const paginatedPostcodes = useMemo(() => {
    return filteredPostcodes.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredPostcodes, currentPage, pageSize]);

  // Reset to page 1 on filter/tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, filterTier, timeframe]);

  

  const summary = data?.summary || {
    gross_revenue_ngn: 0,
    hub_payouts_ngn: 0,
    courier_earnings_ngn: 0,
    platform_margin_ngn: 0,
    overdue_storage_surcharges_ngn: 0,
    total_shipments: 0,
    on_time_delivery_rate_pct: 0,
    hub_capacity_utilization_pct: 0,
    postcode_adoption_rate_pct: 0,
    active_transit_parcels: 0,
    completed_parcels: 0,
    exception_parcels: 0
  };


  return {
    activeTab,
    currentPage,
    data,
    exportActiveReportCSV,
    fetchReports,
    filterTier,
    filteredHubs,
    filteredPostcodes,
    filteredSettlements,
    filteredSlaRecords,
    loading,
    pageSize,
    paginatedHubs,
    paginatedPostcodes,
    paginatedSettlements,
    paginatedSlaRecords,
    refreshing,
    searchQuery,
    setActiveTab,
    setCurrentPage,
    setData,
    setFilterTier,
    setLoading,
    setPageSize,
    setRefreshing,
    setSearchQuery,
    setTimeframe,
    summary,
    timeframe,
  };
}
