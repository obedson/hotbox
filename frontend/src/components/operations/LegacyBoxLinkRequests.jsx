import { apiFetch } from '../../lib/api';
import { isOperationsDeskRole } from '../../lib/portals';
import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock, Download, ExternalLink, Inbox,
  Link2, RefreshCw, ScanSearch, Search, ShieldCheck, Undo2, XCircle
} from 'lucide-react';

const STATUS_TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'CONTESTED', label: 'Contested' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'REVOKED', label: 'Revoked' },
  { id: 'EXPIRED', label: 'Expired' },
  { id: 'WITHDRAWN', label: 'Withdrawn' }
];

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  CONTESTED: 'bg-amber-100 text-amber-800 border-amber-200',
  APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-rose-100 text-rose-800 border-rose-200',
  EXPIRED: 'bg-slate-100 text-slate-600 border-slate-200',
  REVOKED: 'bg-slate-100 text-slate-600 border-slate-200',
  WITHDRAWN: 'bg-slate-100 text-slate-600 border-slate-200'
};

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border whitespace-nowrap ${STATUS_STYLES[status] || STATUS_STYLES.EXPIRED}`}>
      {status}
    </span>
  );
}

export default function LegacyBoxLinkRequests({ currentUser, onPendingCount }) {
  const isDesk = isOperationsDeskRole(currentUser?.role);
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [registryConfigured, setRegistryConfigured] = useState(false);

  const fetchRequests = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));

      const res = await apiFetch(`/api/v1/operations/legacy-box-links?${params.toString()}`, { headers: {} });
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests || []);
        setTotal(data.total || 0);
      } else {
        setNotice({ type: 'error', message: data.error || 'Failed to load link requests.' });
      }
    } catch (err) {
      setNotice({ type: 'error', message: 'Failed to connect to the link request service.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, search, page, pageSize]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // The Review queue tab shows the live pending total so a rejection or
  // approval is immediately visible without opening the queue.
  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/operations/legacy-box-links?status=PENDING&page=1&pageSize=1', { headers: {} });
      const data = await res.json();
      if (res.ok && onPendingCount) onPendingCount(Number(data.total) || 0);
    } catch (err) {
      // A count lookup must never block the queue itself.
    }
  }, [onPendingCount]);

  useEffect(() => { fetchPendingCount(); }, [fetchPendingCount]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/v1/operations/legacy-box-links/registry-status', { headers: {} });
        const data = await res.json();
        if (!cancelled) setRegistryConfigured(Boolean(data.configured));
      } catch (err) {
        if (!cancelled) setRegistryConfigured(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleApprove = async (request) => {
    setBusyId(request.id);
    try {
      const res = await apiFetch(`/api/v1/operations/legacy-box-links/${request.id}/approve`, {
        method: 'POST', headers: {}, body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok) {
        setNotice({ type: 'success', message: `Approved ${request.legacyBoxNumber} for ${request.boxNumber}.` });
        await fetchRequests();
        await fetchPendingCount();
      } else {
        setNotice({ type: 'error', message: data.error || 'Could not approve that request.' });
      }
    } catch (err) {
      setNotice({ type: 'error', message: 'Network error while approving the request.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setNotice({ type: 'error', message: 'A rejection reason is required.' });
      return;
    }
    setBusyId(rejectTarget.id);
    try {
      const res = await apiFetch(`/api/v1/operations/legacy-box-links/${rejectTarget.id}/reject`, {
        method: 'POST', headers: {}, body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (res.ok) {
        setNotice({ type: 'success', message: `Rejected ${rejectTarget.legacyBoxNumber}.` });
        setRejectTarget(null);
        setRejectReason('');
        await fetchRequests();
        await fetchPendingCount();
      } else {
        setNotice({ type: 'error', message: data.error || 'Could not reject that request.' });
      }
    } catch (err) {
      setNotice({ type: 'error', message: 'Network error while rejecting the request.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await apiFetch(`/api/v1/operations/legacy-box-links/export?${params.toString()}`, { headers: {} });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Export failed.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'legacy-box-link-requests.csv';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setNotice({ type: 'success', message: 'CSV export downloaded.' });
    } catch (err) {
      setNotice({ type: 'error', message: err.message });
    }
  };

  const handleAutoVerify = async (request) => {
    setBusyId(request.id);
    try {
      const res = await apiFetch(`/api/v1/operations/legacy-box-links/${request.id}/auto-verify`, {
        method: 'POST', headers: {}, body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok) {
        setNotice({ type: 'success', message: `NIPOST registry confirmed ${request.legacyBoxNumber}.` });
        await fetchRequests();
        await fetchPendingCount();
      } else {
        setNotice({ type: 'error', message: data.error || 'The NIPOST registry did not confirm this claim.' });
      }
    } catch (err) {
      setNotice({ type: 'error', message: 'Network error during registry verification.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    const reason = revokeReason.trim();
    if (!reason) {
      setNotice({ type: 'error', message: 'A revocation reason is required.' });
      return;
    }
    setBusyId(revokeTarget.id);
    try {
      const res = await apiFetch(`/api/v1/operations/legacy-box-links/${revokeTarget.id}/revoke`, {
        method: 'POST', headers: {}, body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (res.ok) {
        setNotice({ type: 'success', message: `Revoked ${revokeTarget.legacyBoxNumber}. Mail forwarding stopped.` });
        setRevokeTarget(null);
        setRevokeReason('');
        await fetchRequests();
        await fetchPendingCount();
      } else {
        setNotice({ type: 'error', message: data.error || 'Could not revoke that link.' });
      }
    } catch (err) {
      setNotice({ type: 'error', message: 'Network error while revoking the link.' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Legacy P.O. Box Linking</h1>
            <p className="text-xs text-slate-500 mt-1">
              Verify a customer's old NIPOST P.O. Box against your archives. Approval is what activates mail forwarding.
            </p>
          </div>
        </div>
        {isDesk && (
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        )}
        <button
          type="button"
          onClick={() => fetchRequests(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {notice && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-bold ${
          notice.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {notice.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {notice.message}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setStatusFilter(tab.id); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#062419] text-white border-[#062419]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search number, customer or box"
            className="pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:border-emerald-600 focus:outline-none w-64"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-xs font-bold">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading requests…
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <Inbox className="w-8 h-8" />
            <p className="text-xs font-bold">No link requests in this view.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-black">Old P.O. Box</th>
                  <th className="px-4 py-3 font-black">Customer</th>
                  <th className="px-4 py-3 font-black">Digital Box</th>
                  <th className="px-4 py-3 font-black">Evidence</th>
                  <th className="px-4 py-3 font-black">Submitted</th>
                  <th className="px-4 py-3 font-black">Status</th>
                  <th className="px-4 py-3 font-black text-right">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <span className="font-mono font-black text-slate-900">{request.legacyBoxNumber}</span>
                      {request.registeredPhone && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{request.registeredPhone}</p>
                      )}
                      {request.openClaims > 1 && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {request.openClaims} claims
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{request.userName}</p>
                      <p className="text-[10px] text-slate-400">{request.userEmail}</p>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-800">{request.boxNumber}</td>
                    <td className="px-4 py-3">
                      {request.documentUrl ? (
                        <a
                          href={request.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                      {request.declaration && (
                        <p className="text-[9px] text-slate-400 mt-0.5">Declaration signed</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(request.submittedAt)}</td>
                    <td className="px-4 py-3"><StatusPill status={request.status} /></td>
                    <td className="px-4 py-3">
                      {request.status === 'PENDING' || request.status === 'CONTESTED' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleAutoVerify(request)}
                            disabled={busyId === request.id || !registryConfigured}
                            title={registryConfigured ? 'Verify against the NIPOST registry' : 'NIPOST registry is not configured'}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-black hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <ScanSearch className="w-3 h-3" />
                            Auto-verify
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprove(request)}
                            disabled={busyId === request.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                          >
                            {busyId === request.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => { setRejectTarget(request); setRejectReason(''); }}
                            disabled={busyId === request.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
                          >
                            <XCircle className="w-3 h-3" />
                            Reject
                          </button>
                        </div>
                      ) : request.status === 'APPROVED' ? (
                        <div className="flex flex-col items-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => { setRevokeTarget(request); setRevokeReason(''); }}
                            disabled={busyId === request.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-black hover:bg-slate-200 disabled:opacity-50 cursor-pointer"
                          >
                            <Undo2 className="w-3 h-3" />
                            Revoke
                          </button>
                          {request.feeNgn != null && request.feeNgn > 0 && (
                            <span className="text-[9px] text-slate-400 font-mono">
                              Fee ₦{Number(request.feeNgn).toLocaleString('en-NG')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 text-right">
                          {request.reviewedAt ? `Decided ${formatDate(request.reviewedAt)}` : '—'}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
          <p className="text-[11px] text-slate-500">
            {total} request{total === 1 ? '' : 's'} · page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              <h2 className="text-sm font-black text-slate-900">Reject {rejectTarget.legacyBoxNumber}</h2>
            </div>
            <p className="text-[11px] text-slate-500">
              The customer will see this reason and can submit a new request.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Reason for rejection"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:border-rose-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={busyId === rejectTarget.id}
                className="px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                Reject request
              </button>
            </div>
          </div>
        </div>
      )}

      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Undo2 className="w-5 h-5 text-slate-700" />
              <h2 className="text-sm font-black text-slate-900">Revoke {revokeTarget.legacyBoxNumber}</h2>
            </div>
            <p className="text-[11px] text-slate-500">
              Mail addressed to the old number stops forwarding immediately. The customer is notified with this reason.
            </p>
            <textarea
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              rows={3}
              placeholder="Reason for revocation"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:border-slate-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setRevokeTarget(null); setRevokeReason(''); }}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={busyId === revokeTarget.id}
                className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                Revoke link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
