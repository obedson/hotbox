import { InfoTooltip } from './SettingsUi';
import { apiFetch } from '../../lib/api';
import React, { useEffect, useState } from 'react';
import { Database, ShieldCheck, ShieldOff } from 'lucide-react';

const MATCH_POLICIES = [
  { value: 'name_or_phone', label: 'Owner name or registered phone' },
  { value: 'name_only', label: 'Owner name only' },
  { value: 'phone_only', label: 'Registered phone only' }
];

export default function NipostRegistryTab({ nipostRegistryVal, updateField }) {
  const enabled = Boolean(nipostRegistryVal.enabled);
  const matchPolicy = nipostRegistryVal.match_policy || 'name_or_phone';
  const [endpointConfigured, setEndpointConfigured] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/v1/operations/legacy-box-links/registry-status', { headers: {} });
        const data = await res.json();
        if (!cancelled) setEndpointConfigured(Boolean(data.configured));
      } catch (err) {
        if (!cancelled) setEndpointConfigured(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
      <div>
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          NIPOST Registry Auto-Verification
          <InfoTooltip text="When enabled, pending legacy link requests can be verified against a digitized NIPOST registry. A positive match approves the link; anything else is left for a human reviewer." />
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          The registry endpoint and API key come from the deployment environment
          (<span className="font-mono">NIPOST_REGISTRY_URL</span>, <span className="font-mono">NIPOST_REGISTRY_API_KEY</span>). This switch controls whether Hotbox uses them.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {endpointConfigured === null ? (
          <span className="text-[11px] font-bold text-slate-400">Checking registry endpoint…</span>
        ) : endpointConfigured ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3 h-3" /> Endpoint configured
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
            <ShieldOff className="w-3 h-3" /> Endpoint not configured
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
        <div>
          <span className="text-[11px] font-bold text-slate-700 block">Enable auto-verification</span>
          <span className="text-[10px] text-slate-500 block">
            Approve a link only when the registry positively matches the claimant.
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => updateField('nipost_registry', 'enabled', !enabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${enabled ? 'bg-emerald-600' : 'bg-slate-300'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="space-y-2">
        <span className="text-[11px] font-bold text-slate-700 block">
          Ownership match policy
          <InfoTooltip text="Name or phone accepts either match. Stricter policies reduce false approvals but may reject legitimate claimants whose archive details differ." />
        </span>
        <select
          value={matchPolicy}
          onChange={(e) => updateField('nipost_registry', 'match_policy', e.target.value)}
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
        >
          {MATCH_POLICIES.map((policy) => (
            <option key={policy.value} value={policy.value}>{policy.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
        <Database className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Every registry decision is recorded on the request with its source and reference. A non-match is audited and left in the queue for NIPOST staff.
        </p>
      </div>
    </div>
  );
}