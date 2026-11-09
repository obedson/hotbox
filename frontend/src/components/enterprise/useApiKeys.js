import { apiFetch } from '../../lib/api';
import { useState } from 'react';
import useCopyToClipboard from './useCopyToClipboard';

export default function useApiKeys({ fetchEnterpriseData }) {
  const [loading, setLoading] = useState(false);
  const { copiedKeyId, copyToClipboard } = useCopyToClipboard();
  const [newKeyName, setNewKeyName] = useState('Production Backend Key');
  const [apiKeyEnvironment, setApiKeyEnvironment] = useState('production');
  const [apiKeyPermissions, setApiKeyPermissions] = useState(['shipments:read', 'shipments:write']);
  const [isAddKeyOpen, setIsAddKeyOpen] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState('curl');
  const [keyActionLoading, setKeyActionLoading] = useState(null);
  const [generatedKey, setGeneratedKey] = useState(null);

  const handleGenerateKey = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/enterprise/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newKeyName.trim(),
          environment: apiKeyEnvironment,
          permissions: apiKeyPermissions
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate key');

      setGeneratedKey(data.apiKey);
      setIsAddKeyOpen(false);
      setNewKeyName('');
      fetchEnterpriseData();
    } catch (err) {
      alert('Key error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeKey = async (id, name) => {
    if (!window.confirm(`Are you sure you want to revoke API key "${name}"? Any systems using this token will immediately lose access.`)) return;
    setKeyActionLoading(id);
    try {
      const res = await apiFetch(`/api/v1/enterprise/api-keys/${id}/revoke`, {
        method: 'POST',
        headers: {}
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke key');
      fetchEnterpriseData();
    } catch (err) {
      alert('Revoke Error: ' + err.message);
    } finally {
      setKeyActionLoading(null);
    }
  };

  const handleDeleteKey = async (id, name) => {
    if (!window.confirm(`Permanently delete "${name}" from your records?`)) return;
    setKeyActionLoading(id);
    try {
      const res = await apiFetch(`/api/v1/enterprise/api-keys/${id}`, {
        method: 'DELETE',
        headers: {}
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete key');
      fetchEnterpriseData();
    } catch (err) {
      alert('Delete Error: ' + err.message);
    } finally {
      setKeyActionLoading(null);
    }
  };

  return {
    loading,
    newKeyName,
    apiKeyEnvironment,
    apiKeyPermissions,
    isAddKeyOpen,
    copiedKeyId,
    activeCodeTab,
    keyActionLoading,
    generatedKey,
    setNewKeyName,
    setApiKeyEnvironment,
    setApiKeyPermissions,
    setIsAddKeyOpen,
    setActiveCodeTab,
    copyToClipboard,
    handleGenerateKey,
    handleRevokeKey,
    handleDeleteKey
  };
}
