import { apiFetch } from '../../lib/api';
import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Download, HandCoins, RefreshCw, Wallet
} from 'lucide-react';

const TYPE_LABELS = {
  LEGACY_LINK_FEE: 'NIPOST verification fee',
  LEGACY_LINK_PLATFORM_FEE: 'Hotbox platform fee'
};

function firstOfMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatMoney(value) {
  return `₦${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function SummaryCard({ label, value, hint, accent }) {
  return (
    <div className={`bg-white border rounded-2xl p-4 ${accent || 'border-slate-200'}`}>
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-lg font-black text-slate-900 mt-1">{value}</p>
      {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export default function LegacyLinkRemittance() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayIso());
  const [summary, setSummary] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [remittances, setRemittances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      const res = await apiFetch(`/api/v1/operations/legacy-box-links/remittance?${params.toString()}`, { headers: {} });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load remittance data.');
      setSummary(data.summary);
      setLineItems(data.lineItems || []);
      setRemittances(data.remittances || []);
    } catch (err) {
      setNotice({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams({ from, to });
      const res = await apiFetch(`/api/v1/operations/legacy-box-links/remittance/export?${params.toString()}`, { headers: {} });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Export failed.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `legacy-link-remittance-${from}-${to}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setNotice({ type: 'success', message: 'Remittance CSV downloaded.' });
    } catch (err) {
      setNotice({ type: 'error', message: err.message });
    }
  };

  const recordRemittance = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/v1/operations/legacy-box-links/remittance', {
        method: 'POST',
        headers: {},
        body: JSON.stringify({ from, to, reference: reference || null, notes: notes || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not record the remittance.');
      setNotice({ type: 'success', message: data.message });
      setRecordOpen(false);
      setReference('');
      setNotes('');
      await load();
    } catch (err) {
      setNotice({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <HandCoins className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Legacy Link Remittance</h1>
            <p className="text-xs text-slate-500 mt-1">
              NIPOST verification fees and Hotbox platform fees are reported separately and never blended.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setRecordOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#062419] text-white text-xs font-black hover:bg-[#0a3524] cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5" />
            Record remittance
          </button>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:border-emerald-600 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:border-emerald-600 focus:outline-none"
          />
        </label>
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

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-xs font-bold">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading remittance…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard label="NIPOST verification fees" value={formatMoney(summary?.nipostAmountNgn)} hint="Payable to NIPOST" />
            <SummaryCard label="Hotbox platform fees" value={formatMoney(summary?.hotboxAmountNgn)} hint="Retained by Hotbox" />
            <SummaryCard label="Total collected" value={formatMoney(summary?.totalAmountNgn)} hint={`${summary?.lineItemCount || 0} line items`} accent="border-emerald-200" />
            <SummaryCard label="Period" value={`${summary?.period?.from || from} → ${summary?.period?.to || to}`} hint="Approved-link fees" />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-sm font-black text-slate-900">Fee line items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-black">Date</th>
                    <th className="px-4 py-3 font-black">Reference</th>
                    <th className="px-4 py-3 font-black">Type</th>
                    <th className="px-4 py-3 font-black">Legacy Box</th>
                    <th className="px-4 py-3 font-black">Customer</th>
                    <th className="px-4 py-3 font-black text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-xs font-bold">
                        No fee line items in this period.
                      </td>
                    </tr>
                  ) : lineItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-slate-500">{formatDate(item.created_at)}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-700">{item.reference}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black border ${
                          item.transaction_type === 'LEGACY_LINK_FEE'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {TYPE_LABELS[item.transaction_type] || item.transaction_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">{item.legacy_box_number || '—'}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800">{item.user_name || '—'}</p>
                        <p className="text-[10px] text-slate-400">{item.user_email}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900">{formatMoney(item.amount_ngn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-sm font-black text-slate-900">Recorded remittance statements</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-black">Period</th>
                    <th className="px-4 py-3 font-black text-right">NIPOST</th>
                    <th className="px-4 py-3 font-black text-right">Hotbox</th>
                    <th className="px-4 py-3 font-black text-right">Total</th>
                    <th className="px-4 py-3 font-black">Reference</th>
                    <th className="px-4 py-3 font-black">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {remittances.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-xs font-bold">
                        No remittance recorded yet.
                      </td>
                    </tr>
                  ) : remittances.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-slate-700">{row.period_start} → {row.period_end}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatMoney(row.nipost_amount_ngn)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatMoney(row.hotbox_amount_ngn)}</td>
                      <td className="px-4 py-3 text-right font-black text-slate-900">{formatMoney(row.total_amount_ngn)}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-700">{row.fee_reference || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black border bg-slate-50 text-slate-700 border-slate-200">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {recordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-700" />
              <h2 className="text-sm font-black text-slate-900">Record remittance</h2>
            </div>
            <p className="text-[11px] text-slate-500">
              {summary ? `Period ${summary.period.from} to ${summary.period.to}: NIPOST ${formatMoney(summary.nipostAmountNgn)}, Hotbox ${formatMoney(summary.hotboxAmountNgn)}.` : ''}
              {' '}The amounts are copied from the fee ledger and cannot be edited here.
            </p>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Remittance reference (e.g. NIPOST payout reference)"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:border-emerald-600 focus:outline-none"
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Notes (optional)"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:border-emerald-600 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setRecordOpen(false); setReference(''); setNotes(''); }}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={recordRemittance}
                disabled={saving}
                className="px-3 py-2 rounded-xl bg-[#062419] text-white text-xs font-black hover:bg-[#0a3524] disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Recording…' : 'Record remittance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}