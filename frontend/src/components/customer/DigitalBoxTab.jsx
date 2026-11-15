import { apiFetch } from '../../lib/api';
import { useState } from 'react';
import { fundWalletWithCard } from '../../lib/walletFunding';
import CertificateModal from './CertificateModal';
import DigitalBoxHero from './digitalbox/DigitalBoxHero';
import AddressAndForwarding from './digitalbox/AddressAndForwarding';
import ProofOfAddress from './digitalbox/ProofOfAddress';
import ProposalPillars from './digitalbox/ProposalPillars';

function ActLabel({ index, title, hint }) {
  return (
    <div className="flex items-baseline gap-3 pt-2">
      <span className="text-[11px] font-black font-mono text-emerald-700">{index}</span>
      <div>
        <h2 className="text-sm font-black text-slate-900">{title}</h2>
        {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

export default function DigitalBoxTab({
  digitalBox, profile, wallet, currentUser, senderLocation, showToast,
  getAuthHeaders, fetchCustomerData, isCertificateModalOpen, setIsCertificateModalOpen,
  onChangeAddress
}) {
  const [isRenewingBox, setIsRenewingBox] = useState(false);
  const [isRequestingGroundTruth, setIsRequestingGroundTruth] = useState(false);

  const handleRenewDigitalBox = async () => {
    setIsRenewingBox(true);
    try {
      const annualFee = digitalBox?.annualFeeNgn || 3500;
      const balance = Number(wallet?.balance || 0);
      if (balance < annualFee) {
        await fundWalletWithCard({
          amountNgn: annualFee - balance,
          email: currentUser?.email || '',
          metadata: { reason: 'box_renewal' },
          onCredited: () => fetchCustomerData()
        });
      }
      const res = await apiFetch('/api/v1/customer/renew-digital-box', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Digital P.O. Box renewed successfully!');
        fetchCustomerData();
      } else {
        showToast(data.error || 'Failed to renew Digital P.O. Box', 'error');
      }
    } catch (err) {
      showToast('Network error during renewal', 'error');
    } finally {
      setIsRenewingBox(false);
    }
  };

  const handleRequestGroundTruth = async () => {
    setIsRequestingGroundTruth(true);
    try {
      const verificationFee = digitalBox?.groundTruthingFeeNgn || 2500;
      const balance = Number(wallet?.balance || 0);
      if (balance < verificationFee) {
        await fundWalletWithCard({
          amountNgn: verificationFee - balance,
          email: currentUser?.email || '',
          metadata: { reason: 'doorway_verification' },
          onCredited: () => fetchCustomerData()
        });
      }
      const res = await apiFetch('/api/v1/customer/request-ground-truthing', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Doorway verification ordered');
        fetchCustomerData();
      } else {
        showToast(data.error || 'Failed to request doorway verification', 'error');
      }
    } catch (err) {
      showToast('Network error requesting doorway verification', 'error');
    } finally {
      setIsRequestingGroundTruth(false);
    }
  };

  return (
    <div className="space-y-6">
      <DigitalBoxHero
        digitalBox={digitalBox}
        profile={profile}
        showToast={showToast}
        onOpenCertificate={() => setIsCertificateModalOpen(true)}
      />

      <div className="space-y-4">
        <ActLabel index="01" title="Address & Forwarding" hint="Where your mail reaches, and how it follows you." />
        <AddressAndForwarding
          digitalBox={digitalBox}
          profile={profile}
          wallet={wallet}
          relocations={digitalBox?.relocations || []}
          onRenew={handleRenewDigitalBox}
          isRenewing={isRenewingBox}
          onChangeAddress={onChangeAddress}
          getAuthHeaders={getAuthHeaders}
          fetchCustomerData={fetchCustomerData}
          showToast={showToast}
        />
      </div>

      <div className="space-y-4">
        <ActLabel index="02" title="Proof of Address" hint="A verifiable certificate for banks and service providers." />
        <ProofOfAddress
          digitalBox={digitalBox}
          onRequestGroundTruth={handleRequestGroundTruth}
          isRequestingGroundTruth={isRequestingGroundTruth}
          onOpenCertificate={() => setIsCertificateModalOpen(true)}
          showToast={showToast}
        />
      </div>

      <ProposalPillars />

      <CertificateModal
        isOpen={isCertificateModalOpen}
        onClose={() => setIsCertificateModalOpen(false)}
        digitalBox={digitalBox}
        profile={profile}
        currentUser={currentUser}
        senderLocation={senderLocation}
      />
    </div>
  );
}