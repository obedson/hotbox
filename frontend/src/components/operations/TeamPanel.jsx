import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users, UserCog, Search, RefreshCw, Loader2, X, AlertTriangle,
  CheckCircle2, Copy, Check, ShieldCheck, ShieldOff, KeyRound, UserPlus, Store
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { PROVISIONABLE_ROLES, STAFF_ROLES } from '../../lib/portals';

const ROLE_LABELS = {
  super_admin: 'Super admin',
  ops_admin: 'Operations admin',
  compliance_officer: 'Compliance officer',
  finance_officer: 'Finance officer',
  support_agent: 'Support agent',
  hub_owner: 'Hub owner',
  hub_staff: 'Hub staff',
  rider: 'Rider',
  logistics_partner: 'Logistics partner',
  enterprise_shipper: 'Enterprise shipper',
  nipost_verifier: 'NIPOST verifier',
  customer: 'Customer'
};

const HUB_OWNER_ONLY_FIELDS = ['businessName', 'postcode', 'neighbourhood', 'capacity'];

function generatePassword(length = 16) {
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const symbols = '!@#$%&*?';
  const all = lower + upper + digits + symbols;
  const pick = (set) => set[Math.floor(Math.random() * set.length)];
  const chars = [pick(lower), pick(upper), pick(digits), pick(symbols)];
  while (chars.length < length) chars.push(pick(all));
  return chars.sort(() => Math.random() - 0.5).join('');
}

const inputClass = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500';

function PasswordReveal({ password, onDone, label = 'Temporary password', emailSent, emailAddress, onResend, resending }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      setCopied(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
        <KeyRound className="w-4 h-4" />
        {label}
      </div>
      <p className="text-[11px] text-amber-800">
        Shown once. Store it in a password manager and share it over a separate channel.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-lg font-mono text-sm font-bold text-slate-900 break-all">
          {password}
        </code>
        <button
          type="button"
          onClick={copy}
          className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {typeof emailSent === 'boolean' && (
        <div className={`flex items-start gap-2 text-[11px] font-semibold ${emailSent ? 'text-emerald-800' : 'text-amber-900'}`}>
          {emailSent
            ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
          <span>
            {emailSent
              ? `Set-your-password instructions emailed to ${emailAddress}. The link expires in 30 minutes.`
              : `Could not email ${emailAddress}. Share the password above, or resend the link.`}
          </span>
        </div>
      )}
      {emailSent === false && onResend && (
        <button
          type="button"
          onClick={onResend}
          disabled={resending}
          className="text-[11px] font-bold text-amber-800 underline cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {resending ? 'Sending…' : 'Resend instructions'}
        </button>
      )}
      <button
        type="button"
        onClick={onDone}
        className="text-[11px] font-bold text-amber-800 underline cursor-pointer"
      >
        I have saved it
      </button>
    </div>
  );
}

export default function TeamPanel({ currentUser, showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState('');
  const [createdUser, setCreatedUser] = useState(null);
  const [emailSent, setEmailSent] = useState(null);
  const [resending, setResending] = useState(false);

  const emptyForm = {
    name: '', email: '', phone: '', role: 'compliance_officer', password: '',
    businessName: '', cacNumber: '', postcode: 'FC-01-A03-FK-01', neighbourhood: 'Wuse 2', capacity: '50'
  };
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  const fetchUsers = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/v1/operations/users');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to load the team.');
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const openCreate = () => {
    setForm({ ...emptyForm, password: generatePassword() });
    setFormErrors({});
    setRevealedPassword('');
    setCreatedUser(null);
    setEmailSent(null);
    setResending(false);
    setIsCreateOpen(true);
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter the full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (String(form.phone || '').replace(/\D/g, '').length < 10) next.phone = 'Enter a valid phone number.';
    if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    if (form.role === 'hub_owner') {
      if (!form.businessName.trim()) next.businessName = 'Enter the business name.';
      if (!form.postcode.trim()) next.postcode = 'Enter the NDAPS postcode.';
      if (!parseInt(form.capacity, 10)) next.capacity = 'Enter a valid capacity.';
    }
    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const createMember = async (event) => {
    event.preventDefault();
    setNotice('');
    if (!validate()) return;

    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone,
        password: form.password,
        role: form.role
      };
      if (form.role === 'hub_owner') {
        payload.businessName = form.businessName.trim();
        if (form.cacNumber.trim()) payload.cacNumber = form.cacNumber.trim();
        payload.postcode = form.postcode.trim();
        payload.neighbourhood = form.neighbourhood.trim();
        payload.capacity = parseInt(form.capacity, 10);
      }

      const res = await apiFetch('/api/v1/operations/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to create the account.');

      setIsCreateOpen(false);
      setRevealedPassword(data.temporaryPassword || form.password);
      setCreatedUser(data.user || null);
      setEmailSent(typeof data.emailSent === 'boolean' ? data.emailSent : null);
      await fetchUsers(true);
      if (showToast) showToast(`${ROLE_LABELS[data.user.role] || data.user.role} account created.`);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };

  const resendOnboarding = async () => {
    if (!createdUser?.id) return;
    setResending(true);
    setNotice('');
    try {
      const res = await apiFetch(`/api/v1/operations/users/${createdUser.id}/onboarding-email`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to resend the instructions.');
      setEmailSent(data.emailSent === true);
      if (showToast) {
        showToast(data.emailSent ? 'Onboarding instructions resent.' : 'Email could not be sent.');
      }
    } catch (err) {
      setNotice(err.message);
    } finally {
      setResending(false);
    }
  };

  const toggleStatus = async (user) => {
    const next = user.status === 'active' ? 'suspended' : 'active';
    setNotice('');
    try {
      const res = await apiFetch(`/api/v1/operations/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to update the account.');
      await fetchUsers(true);
      if (showToast) showToast(`${user.name} ${next === 'active' ? 'reactivated' : 'suspended'}.`);
    } catch (err) {
      setNotice(err.message);
    }
  };

  const openReset = (user) => {
    setResetTarget(user);
    setResetPassword(generatePassword());
  };

  const submitReset = async (event) => {
    event.preventDefault();
    if (!resetTarget) return;
    setResetBusy(true);
    setNotice('');
    try {
      const res = await apiFetch(`/api/v1/operations/users/${resetTarget.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to reset the password.');
      setResetTarget(null);
      setRevealedPassword(data.temporaryPassword || resetPassword);
      if (showToast) showToast(`Password reset for ${resetTarget.name}.`);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setResetBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== 'ALL' && user.role !== roleFilter) return false;
      if (!query) return true;
      return [user.name, user.email, user.phone].some((value) =>
        String(value || '').toLowerCase().includes(query)
      );
    });
  }, [users, search, roleFilter]);

  const rolesInTeam = useMemo(() => {
    const present = Array.from(new Set(users.map((user) => user.role)));
    // Keep every role already seated - including super_admin, which can no
    // longer be granted - so the filter never hides a row it is showing.
    return Array.from(new Set([...PROVISIONABLE_ROLES, ...STAFF_ROLES, ...present]));
  }, [users]);

  const kpis = useMemo(() => {
    const staff = users.filter((user) => STAFF_ROLES.includes(user.role)).length;
    const active = users.filter((user) => user.status === 'active').length;
    const suspended = users.filter((user) => user.status !== 'active').length;
    return [
      { label: 'Total members', value: users.length, icon: Users, color: 'text-slate-700' },
      { label: 'Staff accounts', value: staff, icon: UserCog, color: 'text-emerald-600' },
      { label: 'Active', value: active, icon: ShieldCheck, color: 'text-teal-600' },
      { label: 'Suspended', value: suspended, icon: ShieldOff, color: 'text-rose-600' }
    ];
  }, [users, rolesInTeam]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Administration
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
            Team & Access
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Provision staff accounts, control roles and issue temporary passwords. Staff roles can never self-register.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fetchUsers(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add team member</span>
          </button>
        </div>
      </div>

      {revealedPassword && (
        <PasswordReveal
          password={revealedPassword}
          onDone={() => setRevealedPassword('')}
          emailSent={emailSent}
          emailAddress={createdUser?.email}
          onResend={resendOnboarding}
          resending={resending}
        />
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />{error}
        </div>
      )}
      {notice && !error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />{notice}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{kpi.label}</span>
                <Icon className="w-4 h-4 text-slate-300" />
              </div>
              <div className={`text-2xl font-black mt-1 ${kpi.color}`}>{kpi.value}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 pt-4 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email or phone"
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All roles</option>
            {(rolesInTeam.length ? rolesInTeam : PROVISIONABLE_ROLES).map((role) => (
              <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Loading team members...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">No team members match this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-left text-slate-500">
                  <th className="py-2.5 px-4 font-bold">Name</th>
                  <th className="py-2.5 px-4 font-bold">Role</th>
                  <th className="py-2.5 px-4 font-bold">Email</th>
                  <th className="py-2.5 px-4 font-bold">Phone</th>
                  <th className="py-2.5 px-4 font-bold">Status</th>
                  <th className="py-2.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const isSelf = currentUser?.id === user.id;
                  return (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 align-top">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{user.name}</div>
                        {isSelf && <div className="text-[10px] text-slate-400">you</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold whitespace-nowrap">
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{user.email || '—'}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono">{user.phone || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          user.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {user.status || 'active'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openReset(user)}
                            title="Issue a new temporary password"
                            className="px-2.5 py-1.5 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-600 rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            Reset password
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => toggleStatus(user)}
                              disabled={user.role === 'super_admin'}
                              title={user.status === 'active' ? 'Suspend this account' : 'Reactivate this account'}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                user.status === 'active'
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              {user.status === 'active' ? 'Suspend' : 'Reactivate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start md:items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto">
          <form
            onSubmit={createMember}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl m-auto p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Add team member</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Staff roles are provisioned here and can never be self-assigned.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Full name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  className={inputClass}
                  placeholder="Amina Bello"
                />
                {formErrors.name && <p className="text-[11px] text-rose-600 mt-1">{formErrors.name}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(event) => updateField('role', event.target.value)}
                  className={inputClass}
                >
                  {PROVISIONABLE_ROLES.map((role) => (
                    <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  className={inputClass}
                  placeholder="amina@hotbox.ng"
                />
                {formErrors.email && <p className="text-[11px] text-rose-600 mt-1">{formErrors.email}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  className={inputClass}
                  placeholder="+234 803 000 0000"
                />
                {formErrors.phone && <p className="text-[11px] text-rose-600 mt-1">{formErrors.phone}</p>}
              </div>
            </div>

            {form.role === 'hub_owner' && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-800">
                  <Store className="w-4 h-4" />
                  Hub details
                  <span className="font-normal text-teal-700">(starts a draft accreditation application)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-teal-800 mb-1">Business name</label>
                    <input
                      type="text"
                      value={form.businessName}
                      onChange={(event) => updateField('businessName', event.target.value)}
                      className={inputClass}
                    />
                    {formErrors.businessName && <p className="text-[11px] text-rose-600 mt-1">{formErrors.businessName}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-teal-800 mb-1">CAC / RC number</label>
                    <input
                      type="text"
                      value={form.cacNumber}
                      onChange={(event) => updateField('cacNumber', event.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-teal-800 mb-1">NDAPS postcode</label>
                    <input
                      type="text"
                      value={form.postcode}
                      onChange={(event) => updateField('postcode', event.target.value)}
                      className={inputClass}
                    />
                    {formErrors.postcode && <p className="text-[11px] text-rose-600 mt-1">{formErrors.postcode}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-teal-800 mb-1">Neighbourhood</label>
                    <input
                      type="text"
                      value={form.neighbourhood}
                      onChange={(event) => updateField('neighbourhood', event.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-teal-800 mb-1">Storage capacity</label>
                    <input
                      type="number"
                      min="1"
                      value={form.capacity}
                      onChange={(event) => updateField('capacity', event.target.value)}
                      className={inputClass}
                    />
                    {formErrors.capacity && <p className="text-[11px] text-rose-600 mt-1">{formErrors.capacity}</p>}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Temporary password</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  className={`${inputClass} font-mono font-bold`}
                />
                <button
                  type="button"
                  onClick={() => updateField('password', generatePassword())}
                  className="px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-[11px] font-bold text-slate-600 shrink-0 cursor-pointer"
                >
                  Regenerate
                </button>
              </div>
              {formErrors.password && <p className="text-[11px] text-rose-600 mt-1">{formErrors.password}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {busy ? 'Creating...' : 'Create account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form
            onSubmit={submitReset}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Reset password</h3>
                <p className="text-xs text-slate-500 mt-0.5">{resetTarget.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">New temporary password</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  className={`${inputClass} font-mono font-bold`}
                />
                <button
                  type="button"
                  onClick={() => setResetPassword(generatePassword())}
                  className="px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-[11px] font-bold text-slate-600 shrink-0 cursor-pointer"
                >
                  Regenerate
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resetBusy}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                {resetBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {resetBusy ? 'Saving...' : 'Save password'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <span>
          Only the roles listed above can be provisioned. Customers, riders and enterprise shippers
          register themselves. A suspended account cannot sign in until it is reactivated.
        </span>
      </div>
    </div>
  );
}