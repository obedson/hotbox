import React from 'react';
import { ShieldAlert, Lock, UserCheck, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

const ROLE_PERMISSIONS_MAP = {
  operations: {
    portalName: 'Operations Control Tower',
    requiredRoles: ['ops_admin', 'super_admin'],
    demoAccount: { role: 'ops_admin', name: 'Kolawole Adeleke', phone: '+2348061122335' },
    reason: 'Restricted to operational administrators to protect nationwide logistics load telemetry, partner incident logs, and postal adoption metrics.'
  },
  compliance: {
    portalName: 'Statutory Compliance & KYC Queue',
    requiredRoles: ['compliance_officer', 'super_admin'],
    demoAccount: { role: 'compliance_officer', name: 'Zainab Aliyu', phone: '+2348079988776' },
    reason: 'Statutory compliance queues contain sensitive NDPR-governed identity documents, CAC corporate documents, and confidential accreditation reports.'
  },
  hub_owner: {
    portalName: 'Hub Host & Compartment Console',
    requiredRoles: ['hub_owner', 'hub_staff', 'super_admin'],
    demoAccount: { role: 'hub_owner', name: 'Mallam Ibrahim', phone: '+2348031112223' },
    reason: 'Only accredited hub hosts and verified facility staff have physical authority to intake custody and assign compartmentalized parcel storage bays.'
  },
  rider: {
    portalName: 'Rider Radar & Dispatch Console',
    requiredRoles: ['rider', 'courier_company', 'super_admin'],
    demoAccount: { role: 'rider', name: 'Emeka Nnamdi', phone: '+2348051122334' },
    reason: 'Only vetted riders with valid vehicle and license credentials may accept live dispatch jobs and take physical custody of parcels.'
  },
  enterprise: {
    portalName: 'Enterprise B2B Console',
    requiredRoles: ['enterprise_shipper', 'courier_company', 'super_admin'],
    demoAccount: { role: 'enterprise_shipper', name: 'Konga Express Operations', phone: '+2348098877665' },
    reason: 'Restricted to registered corporate shippers managing negotiated commercial rate agreements, API credentials, and bulk webhooks.'
  }
};

export default function RbacGuard({ portalId, currentUser, onSwitchDemoAccount, onReturnToAllowed }) {
  const policy = ROLE_PERMISSIONS_MAP[portalId] || {
    portalName: 'Restricted Portal',
    requiredRoles: ['super_admin'],
    demoAccount: null,
    reason: 'This interface requires privileged role clearance.'
  };

  const userRole = currentUser?.role || 'anonymous';
  const userName = currentUser?.name || 'Unauthenticated User';

  return (
    <div className="max-w-4xl mx-auto my-12 p-8 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-2xl">
      <div className="flex items-start space-x-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
          <ShieldAlert className="w-8 h-8 text-amber-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
              RBAC Policy Enforcement
            </span>
            <span className="text-xs text-slate-400 font-mono">HTTP 403 Forbidden</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1">
            Access Denied for {policy.portalName}
          </h2>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">
            {policy.reason}
          </p>

          {/* Current Role vs Required Role Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Your Current Session
              </div>
              <div className="text-base font-bold text-white mt-1 flex items-center space-x-2">
                <span>{userName}</span>
              </div>
              <div className="mt-1">
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800">
                  Role: {userRole}
                </span>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Authorized Roles Required
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {policy.requiredRoles.map((r) => (
                  <span
                    key={r}
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center space-x-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>{r}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {policy.demoAccount && (
              <button
                onClick={() => onSwitchDemoAccount(policy.demoAccount)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-600/20 transition"
              >
                <UserCheck className="w-4 h-4" />
                <span>Log In as {policy.demoAccount.name} ({policy.demoAccount.role})</span>
              </button>
            )}
            <button
              onClick={onReturnToAllowed}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
            >
              Return to Customer Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
