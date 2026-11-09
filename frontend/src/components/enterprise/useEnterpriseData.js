import { useState, useEffect } from 'react';

export default function useEnterpriseData() {
  const [account, setAccount] = useState(null);
  const [stats, setStats] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [webhooks, setWebhooks] = useState([]);

  const fetchEnterpriseData = async () => {
    try {
      const res = await fetch('/api/v1/enterprise/account', {
        headers: {
        }
      });
      const data = await res.json();
      setAccount(data.account);
      setApiKeys(data.apiKeys || []);
      setWebhooks(data.webhooks || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load enterprise data:', err);
    }
  };

  useEffect(() => {
    fetchEnterpriseData();
  }, []);

  return {
    account,
    stats,
    apiKeys,
    webhooks,
    setAccount,
    setStats,
    setApiKeys,
    setWebhooks,
    fetchEnterpriseData
  };
}
