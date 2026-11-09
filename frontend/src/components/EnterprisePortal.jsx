import { useEffect } from 'react';
import DashboardPanel from './enterprise/DashboardPanel';
import KycVerifyPanel from './enterprise/KycVerifyPanel';
import ShipmentsPanel from './enterprise/ShipmentsPanel';
import AddressBookPanel from './enterprise/AddressBookPanel';
import ApiKeysPanel from './enterprise/ApiKeysPanel';
import WebhooksPanel from './enterprise/WebhooksPanel';
import BillingPanel from './enterprise/BillingPanel';
import ClaimsPanel from './enterprise/ClaimsPanel';
import SettingsPanel from './enterprise/SettingsPanel';
import useEnterpriseData from './enterprise/useEnterpriseData';
import useKycVerify from './enterprise/useKycVerify';
import useShipments from './enterprise/useShipments';
import useAddressBook from './enterprise/useAddressBook';
import useApiKeys from './enterprise/useApiKeys';
import useWebhooks from './enterprise/useWebhooks';
import useBilling from './enterprise/useBilling';
import useClaims from './enterprise/useClaims';
import useCompanySettings from './enterprise/useCompanySettings';

export default function EnterprisePortal({ activeNav = 'dashboard', setActiveNav }) {
  const enterprise = useEnterpriseData();
  const kyc = useKycVerify();
  const shipmentData = useShipments({
    fetchEnterpriseData: enterprise.fetchEnterpriseData,
    setStats: enterprise.setStats
  });
  const addressBook = useAddressBook();
  const apiKeys = useApiKeys({ fetchEnterpriseData: enterprise.fetchEnterpriseData });
  const webhooks = useWebhooks({
    fetchEnterpriseData: enterprise.fetchEnterpriseData,
    webhooks: enterprise.webhooks,
    setWebhooks: enterprise.setWebhooks
  });
  const billing = useBilling();
  const claims = useClaims();
  const settings = useCompanySettings({
    account: enterprise.account,
    setAccount: enterprise.setAccount
  });

  const {
    fetchManifests, fetchShipments, statusFilter, searchQuery, selectedManifestId
  } = shipmentData;
  const { fetchAddressBook, addressSearch, addressTypeFilter } = addressBook;
  const { fetchWebhooksAndLogs } = webhooks;
  const { fetchBillingAndInvoices } = billing;
  const { fetchClaimsAndSummary } = claims;
  const { fetchCompanySettings } = settings;

  useEffect(() => {
    if (activeNav === 'shipments') {
      fetchManifests();
      fetchShipments(1, statusFilter, searchQuery, selectedManifestId);
    } else if (activeNav === 'address_book') {
      fetchAddressBook(addressSearch, addressTypeFilter);
    } else if (activeNav === 'webhooks') {
      fetchWebhooksAndLogs();
    } else if (activeNav === 'billing') {
      fetchBillingAndInvoices();
    } else if (activeNav === 'claims') {
      fetchClaimsAndSummary();
    } else if (activeNav === 'settings') {
      fetchCompanySettings();
    }
  }, [activeNav, statusFilter, selectedManifestId, addressTypeFilter]);

  return (
    <div className="space-y-4 sm:space-y-6">

      {activeNav === 'dashboard' && (
        <DashboardPanel stats={enterprise.stats} setActiveNav={setActiveNav} />
      )}

      {activeNav === 'kyc_verify' && (
        <KycVerifyPanel {...kyc} />
      )}

      {activeNav === 'shipments' && (
        <ShipmentsPanel {...shipmentData} />
      )}

      {activeNav === 'address_book' && (
        <AddressBookPanel {...addressBook} />
      )}

      {activeNav === 'api_keys' && (
        <ApiKeysPanel {...apiKeys} apiKeys={enterprise.apiKeys} />
      )}

      {activeNav === 'webhooks' && (
        <WebhooksPanel {...webhooks} />
      )}

      {activeNav === 'billing' && (
        <BillingPanel {...billing} />
      )}

      {activeNav === 'claims' && (
        <ClaimsPanel {...claims} />
      )}

      {activeNav === 'settings' && (
        <SettingsPanel {...settings} setActiveNav={setActiveNav} />
      )}
    </div>
  );
}
