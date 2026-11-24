import {
  BadgeCheck, Check, Copy, Crosshair, ExternalLink, FileText, RefreshCw, ShieldCheck
} from 'lucide-react';
import { InfoTooltip } from '../ui';

function Fact({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-900',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700'
  };
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={`font-bold text-right leading-snug ${tones[tone] || tones.slate}`}>{value}</span>
    </div>
  );
}

export default function ProofOfAddress({
  digitalBox, onRequestGroundTruth, isRequestingGroundTruth, onOpenCertificate, showToast
}) {
  const certificate = digitalBox?.certificate || null;
  const verified = Boolean(digitalBox?.isGroundTruthVerified);
  const pending = Boolean(digitalBox?.hasPendingInspection);
  const inspectionFee = digitalBox?.doorwayInspectionFeeNgn || 2500;
  const revalidationFee = digitalBox?.revalidationFeeNgn || 2500;
  const revalidationMonths = digitalBox?.revalidationMonths || 12;
  const certificateStatus = certificate?.status || null;
  const certificateLive = Boolean(certificate) && certificateStatus === 'ACTIVE';
  const status = certificate
    ? (certificateLive ? 'Certificate Issued' : `Certificate ${certificateStatus || 'Inactive'}`)
    : verified
      ? 'Ground-Truth Verified'
      : pending
        ? 'Inspection Pending'
        : 'Registry Verified';

  const apiBase = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
  const verifyUrl = certificate
    ? `${apiBase || window.location.origin}/api/v1/verification/certificate/${certificate.serial}`
    : null;

  const copyVerifyUrl = () => {
    if (!verifyUrl) return;
    navigator.clipboard?.writeText(verifyUrl);
    showToast('Certificate verification link copied');
  };

  let action;
  if (certificateLive) {
    action = (
      <button
        type="button"
        onClick={onOpenCertificate}
        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
      >
        <FileText className="w-3.5 h-3.5" />
        <span>Download NIPOST POA Certificate (PDF)</span>
      </button>
    );
  } else {
    const renewing = verified;
    action = (
      <button
        type="button"
        onClick={onRequestGroundTruth}
        disabled={isRequestingGroundTruth}
        className="w-full py-2.5 px-4 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
      >
        {isRequestingGroundTruth ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            <span>Dispatching Inspector…</span>
          </>
        ) : (
          <>
            <Crosshair className="w-3.5 h-3.5 text-slate-500" />
            <span>
              {renewing
                ? `Renew your POA Certificate (₦${Number(revalidationFee).toLocaleString('en-NG')})`
                : `Request Doorway Verification (₦${Number(inspectionFee).toLocaleString('en-NG')})`}
            </span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 min-w-0 items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-0.5 flex-wrap">
              <h3 className="text-sm font-black text-slate-900">Proof of Address Certificate</h3>
              <InfoTooltip text="A doorway inspection by an accredited Hotbox officer, recorded with GPS coordinates and issued as a certificate with a public verification link you can present to banks and service providers." />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Issued once an accredited officer verifies your doorway. Present it to banks and service providers.
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border shrink-0 ${
          certificate || verified
            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
            : pending
              ? 'bg-amber-100 text-amber-800 border-amber-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
          <BadgeCheck className="w-3 h-3" />
          {status}
        </span>
      </div>

      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
        <Fact label="Verification level" value={verified ? 'Ground-Truth Verified' : 'Registry Verified'} tone={verified ? 'emerald' : 'amber'} />
        <Fact label="Doorway inspection" value={`₦${Number(inspectionFee).toLocaleString('en-NG')} (one-time)`} />
        <Fact label="Revalidation" value={`₦${Number(revalidationFee).toLocaleString('en-NG')} / ${revalidationMonths} months`} />
        <Fact label="Certificate validity" value={certificate ? `${revalidationMonths} months from issue` : `${revalidationMonths} months once issued`} />
      </div>

      <div className="space-y-2 pt-1">
        {action}
        <p className="text-[10px] text-center text-slate-400">
          {certificateLive
            ? `Your certificate is active and can be verified publicly by serial. Revalidation is due every ${revalidationMonths} months.`
            : 'An inspection is ordered immediately; the certificate is issued once the report is approved. Revalidation applies per the configured interval.'}
        </p>
      </div>

      {certificate && (
        <div className="border border-emerald-200 bg-emerald-50/50 rounded-2xl p-4 space-y-2.5 animate-fadeIn">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Issued Certificate</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Certificate No</span>
              <p className="font-mono font-bold text-slate-900 break-all">{certificate.serial}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Validity</span>
              <p className="font-semibold text-slate-800">
                {new Date(certificate.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                {' — '}
                {new Date(certificate.expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Verified Address</span>
              <p className="font-semibold text-slate-800">
                {certificate.postcode || '—'}
                {certificate.addressText ? ` · ${certificate.addressText}` : ''}
              </p>
              {certificate.lat != null && certificate.lng != null && (
                <a
                  href={`https://www.google.com/maps?q=${Number(certificate.lat)},${Number(certificate.lng)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700 hover:text-emerald-900 transition mt-0.5"
                >
                  <ExternalLink className="w-3 h-3" />
                  {Number(certificate.lat).toFixed(6)}, {Number(certificate.lng).toFixed(6)}
                </a>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-emerald-200 space-y-1.5">
            <p className="text-[10px] text-slate-500 font-semibold">Public verification link</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 text-[10px] font-mono text-slate-700 bg-white border border-emerald-200 rounded-lg px-2 py-1.5 truncate">
                {verifyUrl}
              </code>
              <button
                type="button"
                onClick={copyVerifyUrl}
                className="p-1.5 rounded-lg border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100 transition cursor-pointer shrink-0"
                title="Copy verification link"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <a
                href={verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100 transition shrink-0"
                title="Open verification"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-600" />
              Returns the certificate holder, address, coordinates and validity status.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}