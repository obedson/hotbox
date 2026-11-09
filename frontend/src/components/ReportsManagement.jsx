import { apiFetch } from '../lib/api';
import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, Clock, CheckCircle2, AlertTriangle, Store, Truck, MapPin,
  ShieldCheck, DollarSign, Wallet, Download, RefreshCw, Search, Filter,
  ArrowUpRight, ArrowDownRight, Check, X, Layers, Boxes, FileSpreadsheet,
  Building, ChevronLeft, ChevronRight, BarChart3, PieChart, Activity, Info
} from 'lucide-react';

const API_BASE = '/api/v1';

// Reusable lightweight tooltip component to prevent long cluttered text
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
              ? 'top-full left-1/2 -translate-x-1/2 mt-2 max-w-[240px] whitespace-normal text-center leading-snug'
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

// Enterprise table pagination bar
function TablePagination({ currentPage, setCurrentPage, pageSize, setPageSize, totalItems, label = 'records' }) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  if (totalItems <= 0) return null;

  return (
    <div className="bg-slate-50/80 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 rounded-b-xl">
      <div className="flex items-center gap-3">
        <div>
          Showing <span className="font-semibold text-slate-900">{Math.min((currentPage - 1) * pageSize + 1, totalItems)}</span> to{' '}
          <span className="font-semibold text-slate-900">{Math.min(currentPage * pageSize, totalItems)}</span> of{' '}
          <span className="font-semibold text-slate-900">{totalItems}</span> {label}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-semibold focus:outline-none"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1 shadow-2xs font-semibold transition-all"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>
        <span className="px-2 text-slate-900 font-bold">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1 shadow-2xs font-semibold transition-all"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function ReportsManagement({ onSelectShipment }) {
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

  if (loading && !data) {
    return (
      <div className="min-h-[450px] flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading Reports & Analytics...</p>
        <p className="text-xs text-slate-400 mt-1">Aggregating live delivery data, earnings, and storage space</p>
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Reports & Analytics
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track delivery speed, revenue, storage space, and address coverage across Nigeria.
                </p>
              </div>
            </div>
          </div>

          {/* Timeframe & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Timeframe Selector */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
              {[
                { id: 'today', label: 'Today' },
                { id: '7d', label: 'Last 7 Days' },
                { id: '30d', label: 'Last 30 Days' },
                { id: 'quarter', label: 'This Quarter' },
                { id: 'all', label: 'All Time' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTimeframe(t.id)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all text-xs ${
                    timeframe === t.id
                      ? 'bg-white text-emerald-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchReports(true)}
              disabled={refreshing}
              className="p-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition-all shadow-xs flex items-center gap-1.5 text-xs font-semibold"
              title="Refresh ledger data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Export CSV Button */}
            <button
              onClick={exportActiveReportCSV}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI SUMMARY CARDS (Stack on small screens: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Gross Revenue */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs relative flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-xs font-bold tracking-wide uppercase text-slate-700">Gross Billings</span>
              <InfoTooltip text="Total customer payments for all bookings before partner payouts" />
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2.5 sm:my-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              ₦{summary.gross_revenue_ngn.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium truncate" title={`₦${summary.hub_payouts_ngn.toLocaleString()} Hubs • ₦${summary.courier_earnings_ngn.toLocaleString()} Drivers`}>
              <span className="text-emerald-700 font-semibold">₦{summary.hub_payouts_ngn.toLocaleString()}</span> Hubs • 
              <span className="text-emerald-700 font-semibold">₦{summary.courier_earnings_ngn.toLocaleString()}</span> Couriers
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Margin (30%):</span>
            <span className="font-bold text-emerald-700">₦{summary.platform_margin_ngn.toLocaleString()}</span>
          </div>
        </div>

        {/* KPI 2: On-Time Deliveries */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs relative flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-xs font-bold tracking-wide uppercase text-slate-700">On-Time SLA</span>
              <InfoTooltip text="Percentage of packages delivered within promised schedule (Target: 95%+)" />
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2.5 sm:my-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 flex items-baseline gap-2">
              <span>{summary.on_time_delivery_rate_pct}%</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ≥ 95% SLA
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium truncate">
              <span>{summary.total_shipments} Dispatches</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">On The Road:</span>
            <span className="font-bold text-slate-900">{summary.active_transit_parcels} In Transit</span>
          </div>
        </div>

        {/* KPI 3: Hub Storage Space */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs relative flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-xs font-bold tracking-wide uppercase text-slate-500">Hub Storage Space</span>
              <InfoTooltip text="Percentage of locker compartments currently holding packages across all partner hubs" />
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl font-black text-slate-900 flex items-baseline gap-2">
              <span>{summary.hub_capacity_utilization_pct}%</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Space Available
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <span>{data?.hub_capacity_report?.total_occupied_bays || 6} of {data?.hub_capacity_report?.total_network_bays || 39} Lockers Full</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Late Storage Fees:</span>
            <span className="font-bold text-amber-800">₦{summary.overdue_storage_surcharges_ngn.toLocaleString()}</span>
          </div>
        </div>

        {/* KPI 4: Digital Postcodes */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs relative flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-xs font-bold tracking-wide uppercase text-slate-500">Postcodes Usage Rate</span>
              <InfoTooltip text="Percentage of shipments booked using verified official 11-digit alphanumeric digital postcodes (NDAPS)" />
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl font-black text-slate-900 flex items-baseline gap-2">
              <span>{summary.postcode_adoption_rate_pct}%</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                98% Found
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <span>{data?.postcode_coverage_report?.total_cached_postcodes || 37} Valid Postcodes</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Coverage:</span>
            <span className="font-bold text-indigo-700">{data?.postcode_coverage_report?.total_states_covered || 6} States • {data?.postcode_coverage_report?.total_lgas_covered || 9} LGAs</span>
          </div>
        </div>
      </div>

      {/* 3. REPORT TAB SELECTION (Fixed layout, no horizontal scrollbar) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="border-b border-slate-200 px-5 pt-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs with short simple names and no horizontal overflow scrollbar */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            {[
              { id: 'speed', label: 'Delivery Speed', icon: Truck, desc: 'Delivery turnaround and on-time records' },
              { id: 'finance', label: 'Revenue & Payouts', icon: Wallet, desc: 'Sales, hub earnings, and driver payouts' },
              { id: 'hubs', label: 'Hub Storage', icon: Store, desc: 'Locker space and parcel dwell times' },
              { id: 'coverage', label: 'Area Coverage', icon: MapPin, desc: 'Postcodes and regional service areas' }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Tooltip key={tab.id} content={tab.desc}>
                  <button
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSearchQuery('');
                      setFilterTier('ALL');
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all rounded-t-lg ${
                      isActive
                        ? 'border-emerald-700 text-emerald-800 bg-emerald-50/60'
                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                </Tooltip>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="pb-3 md:pb-0 w-full md:w-56">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search records..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4. DEDICATED TAB CONTENT PANELS */}
        <div className="p-5 sm:p-6">
          {/* TAB 1: DELIVERY SPEED */}
          {activeTab === 'speed' && (
            <div className="space-y-6">
              {/* Delivery Time Targets */}
              <div>
                <div className="flex items-center mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Delivery Time Targets
                  </h3>
                  <InfoTooltip text="Standard target delivery times vs actual performance for each stage" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {[
                    { label: 'Sender to Driver Handover', actual: '38 mins', target: '45 mins', status: 'On Schedule' },
                    { label: 'Drop-off at Hub', actual: '11 mins', target: '15 mins', status: 'On Schedule' },
                    { label: 'Direct Door Delivery', actual: '18.4 hours', target: '24 hours', status: 'On Schedule' },
                    { label: 'Transfer Between Hubs', actual: '34.2 hours', target: '48 hours', status: 'On Schedule' }
                  ].map((b, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{b.label}</span>
                        <span className="font-semibold text-emerald-700 px-2 py-0.5 bg-emerald-50 rounded-md border border-emerald-200 text-[10px]">
                          {b.status}
                        </span>
                      </div>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-xl font-bold text-slate-900">{b.actual}</span>
                        <span className="text-xs text-slate-400">Target: {b.target}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Speed by Service Type Table */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                  Delivery Speed by Service Type
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs min-w-[950px]">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4 whitespace-nowrap">Delivery Type</th>
                        <th className="py-3 px-4 whitespace-nowrap">Total Packages</th>
                        <th className="py-3 px-4 whitespace-nowrap">Share</th>
                        <th className="py-3 px-4 whitespace-nowrap">Total Sales</th>
                        <th className="py-3 px-4 whitespace-nowrap">Average Cost</th>
                        <th className="py-3 px-4 whitespace-nowrap">Average Time</th>
                        <th className="py-3 px-4 whitespace-nowrap">On-Time Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {data?.delivery_sla_report?.service_breakdown?.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
                            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
                            <span>{s.service_name}</span>
                          </td>
                          <td className="py-3 px-4 font-semibold whitespace-nowrap">{s.count} packages</td>
                          <td className="py-3 px-4 whitespace-nowrap">{s.pct_of_total}%</td>
                          <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">₦{s.total_revenue_ngn.toLocaleString()}</td>
                          <td className="py-3 px-4 whitespace-nowrap">₦{s.avg_cost_ngn.toLocaleString()}</td>
                          <td className="py-3 px-4 whitespace-nowrap">{s.avg_transit_hours} hrs</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap inline-flex items-center">
                              {s.on_time_rate_pct}% On-Time
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Deliveries Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Recent Deliveries & Times
                    </h3>
                    <InfoTooltip text="Live list of recent shipments showing transit time and arrival status" />
                  </div>
                  <span className="text-xs text-slate-400">{filteredSlaRecords.length} records</span>
                </div>
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[1050px]">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3 px-4 whitespace-nowrap">Tracking ID</th>
                          <th className="py-3 px-4 whitespace-nowrap">Delivery Type</th>
                          <th className="py-3 px-4 whitespace-nowrap">Destination Hub</th>
                          <th className="py-3 px-4 whitespace-nowrap">Date & Time Sent</th>
                          <th className="py-3 px-4 whitespace-nowrap">Time Taken</th>
                          <th className="py-3 px-4 whitespace-nowrap">Current Status</th>
                          <th className="py-3 px-4 whitespace-nowrap">Delivery Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {paginatedSlaRecords.map(r => (
                          <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-emerald-800 whitespace-nowrap">
                              {r.tracking_code}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="px-2.5 py-1 bg-slate-100 rounded text-[11px] font-semibold text-slate-700 whitespace-nowrap inline-flex items-center">
                                {r.service_type === 'DOOR_TO_HUB' ? 'Door to Hub' : r.service_type === 'HUB_TO_HUB' ? 'Hub to Hub' : 'Door to Door'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-900 font-medium whitespace-nowrap">
                              {r.destination_hub}
                            </td>
                            <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                              {new Date(r.picked_up_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                              {r.duration_hours}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 whitespace-nowrap inline-flex items-center">
                                {r.custody_status === 'IN_TRANSIT_TO_HUB' ? 'On The Move' : r.custody_status === 'STORED_IN_BAY' ? 'At Hub Locker' : r.custody_status.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {r.sla_status === 'ON_TIME' ? (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit whitespace-nowrap">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  On-Time
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1 w-fit whitespace-nowrap">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                  Late
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <TablePagination
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    totalItems={filteredSlaRecords.length}
                    label="shipments"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REVENUE & PAYOUTS */}
          {activeTab === 'finance' && (
            <div className="space-y-6">
              {/* Revenue & Earnings Summary Grid */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                  Revenue & Earnings Summary
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-200/80">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Sales</span>
                    <div className="text-xl font-bold text-emerald-950 mt-1">
                      ₦{summary.gross_revenue_ngn.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-1">100% Customer Paid Bookings</p>
                  </div>

                  <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-200/80">
                    <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Hub Host Earnings</span>
                    <div className="text-xl font-bold text-blue-950 mt-1">
                      ₦{summary.hub_payouts_ngn.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-blue-700 mt-1">35% Storage & Release Pool</p>
                  </div>

                  <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-200/80">
                    <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Driver Earnings</span>
                    <div className="text-xl font-bold text-indigo-950 mt-1">
                      ₦{summary.courier_earnings_ngn.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-indigo-700 mt-1">35% Pickup & Delivery Payouts</p>
                  </div>

                  <div className="p-4 bg-purple-50/40 rounded-xl border border-purple-200/80">
                    <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">Company Margin</span>
                    <div className="text-xl font-bold text-purple-950 mt-1">
                      ₦{summary.platform_margin_ngn.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-purple-700 mt-1">30% Platform Commission</p>
                  </div>
                </div>
              </div>

              {/* Partner Payouts Table */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Partner Payouts & Balances
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Track and verify payments for hubs and dispatch fleets</p>
                  </div>

                  {/* Filter Status Pills */}
                  <div className="flex items-center gap-1.5 text-xs">
                    {[
                      { id: 'ALL', label: 'All Partners' },
                      { id: 'Settled', label: 'Paid' },
                      { id: 'Pending Batch Approval', label: 'Pending Approval' },
                      { id: 'Processing', label: 'Processing' }
                    ].map(st => (
                      <button
                        key={st.id}
                        onClick={() => setFilterTier(st.id)}
                        className={`px-2.5 py-1 rounded-lg transition-all text-xs ${
                          filterTier === st.id
                            ? 'bg-slate-900 text-white font-bold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[1100px]">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[200px]">Partner Name</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Partner Type</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Packages Handled</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">Total Handled</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">Total Earnings</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">Already Paid</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[130px]">Unpaid Balance</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[160px]">Payment Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {paginatedSettlements.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                              {p.partner_name}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="px-2.5 py-1 rounded-md text-[11px] bg-slate-100 font-semibold text-slate-700 whitespace-nowrap inline-flex items-center">
                                {p.partner_type === 'Community Partner Hub' ? 'Partner Hub' : 'Dispatch Fleet'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                              {p.orders_handled} packages
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                              ₦{p.gross_handled_ngn.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 font-bold text-emerald-800 whitespace-nowrap">
                              ₦{p.commission_payable_ngn.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                              ₦{p.amount_paid_out_ngn.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 font-bold text-amber-800 whitespace-nowrap">
                              ₦{p.pending_settlement_ngn.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {p.settlement_status === 'Settled' ? (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap inline-flex items-center">
                                  Paid
                                </span>
                              ) : p.settlement_status === 'Processing' ? (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 whitespace-nowrap inline-flex items-center">
                                  Processing
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap inline-flex items-center">
                                  Pending Approval
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <TablePagination
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    totalItems={filteredSettlements.length}
                    label="partners"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HUB STORAGE */}
          {activeTab === 'hubs' && (
            <div className="space-y-6">
              {/* Locker Compartment Tiers */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                  Locker Compartments & Storage Space
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-600">Small Lockers</span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                        Letters & Pouches
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">
                      {data?.hub_capacity_report?.bay_tiers?.small?.occupied || 6} / {data?.hub_capacity_report?.bay_tiers?.small?.total || 9} Full
                    </div>
                    <p className="text-xs text-slate-400 mt-1">66.7% occupancy rate</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-600">Medium Lockers</span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                        Boxes & Cartons
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">
                      {data?.hub_capacity_report?.bay_tiers?.medium?.occupied || 0} / {data?.hub_capacity_report?.bay_tiers?.medium?.total || 15} Full
                    </div>
                    <p className="text-xs text-emerald-700 mt-1 font-medium">All Available</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-600">Large Lockers</span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                        Big Crates & Luggage
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">
                      {data?.hub_capacity_report?.bay_tiers?.large?.occupied || 0} / {data?.hub_capacity_report?.bay_tiers?.large?.total || 15} Full
                    </div>
                    <p className="text-xs text-emerald-700 mt-1 font-medium">All Available</p>
                  </div>
                </div>
              </div>

              {/* Hub Locker Space Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Hub Locker Space & Load
                    </h3>
                    <InfoTooltip text="Storage capacity, occupied lockers, and dwell time for each partner hub" />
                  </div>
                  <span className="text-xs text-slate-400">{filteredHubs.length} Facilities • 39 Total Lockers</span>
                </div>
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[1050px]">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[200px]">Hub Name</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[180px]">Location</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">Status</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Space Used</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Space Full %</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Overdue Packages</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[130px]">Avg Storage Days</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Storage Earnings</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {paginatedHubs.map(h => (
                          <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                              {h.hub_name}
                            </td>
                            <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                              {h.location}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap inline-flex items-center ${
                                h.status === 'accredited'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}>
                                {h.status === 'accredited' ? 'Approved' : 'Pending'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                              {h.occupied_bays} of {h.total_bays} lockers
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden shrink-0">
                                  <div
                                    className="bg-emerald-600 h-full rounded-full"
                                    style={{ width: `${Math.min(100, h.utilization_pct)}%` }}
                                  ></div>
                                </div>
                                <span className="font-bold text-slate-900 text-xs">{h.utilization_pct}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {h.overdue_count > 0 ? (
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap inline-flex items-center">
                                  {h.overdue_count} overdue
                                </span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                              {h.average_holding_days} days
                            </td>
                            <td className="py-3 px-4 font-bold text-emerald-800 whitespace-nowrap">
                              ₦{h.revenue_generated_ngn.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <TablePagination
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    totalItems={filteredHubs.length}
                    label="hubs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AREA COVERAGE */}
          {activeTab === 'coverage' && (
            <div className="space-y-6">
              {/* Coverage Overview Stats */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                  Address & Postcode Coverage
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-semibold uppercase">Registered Postcodes</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {data?.postcode_coverage_report?.total_cached_postcodes || 37}
                    </div>
                    <p className="text-xs text-emerald-700 mt-1 font-medium">100% Geocoded</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-semibold uppercase">States Covered</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {data?.postcode_coverage_report?.total_states_covered || 6} States
                    </div>
                    <p className="text-xs text-slate-400 mt-1">FCT, Lagos, Kano, Oyo, Rivers, Ekiti</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-semibold uppercase">LGAs Covered</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {data?.postcode_coverage_report?.total_lgas_covered || 9} LGAs
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Active delivery routes</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-semibold uppercase">Address Found Rate</span>
                    <div className="text-xl font-bold text-emerald-800 mt-1">
                      98.4%
                    </div>
                    <p className="text-xs text-emerald-700 mt-1 font-medium">&lt; 1.6% manual search</p>
                  </div>
                </div>
              </div>

              {/* Regional Coverage Table */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Coverage by State & LGA
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Postcode adoption performance across Nigerian administrative regions</p>
                  </div>

                  {/* Filter Tier Buttons */}
                  <div className="flex items-center gap-1.5 text-xs">
                    {[
                      { id: 'ALL', label: 'All Areas' },
                      { id: 'Tier 1 Core', label: 'Core Areas' },
                      { id: 'Tier 2 High Growth', label: 'Growth Areas' },
                      { id: 'Tier 3 Emerging', label: 'New Areas' }
                    ].map(tier => (
                      <button
                        key={tier.id}
                        onClick={() => setFilterTier(tier.id)}
                        className={`px-2.5 py-1 rounded-lg transition-all text-xs ${
                          filterTier === tier.id
                            ? 'bg-slate-900 text-white font-bold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {tier.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[950px]">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">State</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[170px]">Local Government (LGA)</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[130px]">Postcodes</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">Active Hubs</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Packages Delivered</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Coverage Level</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">Success Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {paginatedPostcodes.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                              {r.state}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                              {r.lga}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                              {r.registered_postcodes} postcodes
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="px-2.5 py-1 bg-slate-100 rounded text-xs font-semibold text-slate-700 whitespace-nowrap inline-flex items-center">
                                {r.active_hubs} hubs
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                              {r.shipments_handled} packages
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-flex items-center ${
                                r.adoption_tier === 'Tier 1 Core'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : r.adoption_tier === 'Tier 2 High Growth'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                                {r.adoption_tier === 'Tier 1 Core' ? 'Core Area' : r.adoption_tier === 'Tier 2 High Growth' ? 'Growth Area' : 'New Area'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-emerald-800 whitespace-nowrap">
                              {r.validation_rate_pct}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <TablePagination
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    totalItems={filteredPostcodes.length}
                    label="areas"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
