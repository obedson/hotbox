import { apiFetch } from '../../lib/api';
import { useState } from 'react';
import useCopyToClipboard from './useCopyToClipboard';

export const AVAILABLE_WEBHOOK_EVENTS = [
  { id: 'shipment.status_changed', label: 'shipment.status_changed', desc: 'Triggered whenever shipment lifecycle status updates' },
  { id: 'shipment.in_transit', label: 'shipment.in_transit', desc: 'Dispatched when assigned dispatch rider begins transit' },
  { id: 'shipment.arrived_at_hub', label: 'shipment.arrived_at_hub', desc: 'Dispatched when parcel scans into destination hub compartment' },
  { id: 'shipment.collected', label: 'shipment.collected', desc: 'Dispatched when recipient redeems OTP and collects parcel' },
  { id: 'shipment.disputed', label: 'shipment.disputed', desc: 'Dispatched on recipient claims, address mismatch, or damage' },
  { id: 'kyc.address_verified', label: 'kyc.address_verified', desc: 'Dispatched when B2B NDAPS address verification succeeds' }
];

export default function useWebhooks({ fetchEnterpriseData, webhooks, setWebhooks }) {
  const [loading, setLoading] = useState(false);
  const { copiedKeyId, copyToClipboard } = useCopyToClipboard();
  const [newWebhookUrl, setNewWebhookUrl] = useState('https://api.merchant.ng/webhooks/hotbox');
  const [webhookMsg, setWebhookMsg] = useState(null);

  // Webhooks & Live Delivery Logs State (PostgreSQL live query, no simulation)
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [webhookLogsLoading, setWebhookLogsLoading] = useState(false);
  const [selectedWebhookEvents, setSelectedWebhookEvents] = useState([
    'shipment.status_changed',
    'shipment.in_transit',
    'shipment.arrived_at_hub',
    'shipment.collected'
  ]);
  const [testingWebhookId, setTestingWebhookId] = useState(null);
  const [togglingWebhookId, setTogglingWebhookId] = useState(null);
  const [deletingWebhookId, setDeletingWebhookId] = useState(null);
  const [showSecretIds, setShowSecretIds] = useState({});
  const [selectedPayloadLog, setSelectedPayloadLog] = useState(null);
  const [webhookTestFeedback, setWebhookTestFeedback] = useState(null);
  const [webhookDocTab, setWebhookDocTab] = useState('nodejs');
  const [isRegisterWebhookOpen, setIsRegisterWebhookOpen] = useState(false);

  const fetchWebhooksAndLogs = async () => {
    setWebhookLogsLoading(true);
    try {
      const [whRes, logsRes] = await Promise.all([
        apiFetch('/api/v1/enterprise/webhooks', {
          headers: {}
        }),
        apiFetch('/api/v1/enterprise/webhooks/logs', {
          headers: {}
        })
      ]);
      const whData = await whRes.json();
      const logsData = await logsRes.json();
      if (whData.webhooks) setWebhooks(whData.webhooks);
      if (logsData.logs) setWebhookLogs(logsData.logs);
    } catch (err) {
      console.error('Failed to load webhooks or delivery logs:', err);
    } finally {
      setWebhookLogsLoading(false);
    }
  };

  const handleRegisterWebhook = async (e) => {
    e.preventDefault();
    if (!newWebhookUrl || (!newWebhookUrl.startsWith('http://') && !newWebhookUrl.startsWith('https://'))) {
      alert('Please provide a valid URL starting with http:// or https://');
      return;
    }
    if (selectedWebhookEvents.length === 0) {
      alert('Please select at least one event topic to subscribe to.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/enterprise/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUrl: newWebhookUrl.trim(),
          events: selectedWebhookEvents
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register webhook');

      setWebhookMsg(`Endpoint registered successfully! Signing secret: ${data.signingSecret}`);
      setIsRegisterWebhookOpen(false);
      fetchWebhooksAndLogs();
      fetchEnterpriseData();
    } catch (err) {
      alert('Webhook Registration Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestPing = async (wh) => {
    setTestingWebhookId(wh.id);
    setWebhookTestFeedback(null);
    try {
      const res = await apiFetch(`/api/v1/enterprise/webhooks/${wh.id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to test webhook');
      setWebhookTestFeedback({
        webhookId: wh.id,
        targetUrl: wh.target_url,
        message: data.message,
        delivery: data.delivery,
        signatureHeader: data.signatureHeader
      });
      fetchWebhooksAndLogs();
    } catch (err) {
      alert('Test Ping Error: ' + err.message);
    } finally {
      setTestingWebhookId(null);
    }
  };

  const handleToggleWebhook = async (wh) => {
    setTogglingWebhookId(wh.id);
    try {
      const res = await apiFetch(`/api/v1/enterprise/webhooks/${wh.id}/toggle`, {
        method: 'PUT',
        headers: {
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle status');
      fetchWebhooksAndLogs();
    } catch (err) {
      alert('Toggle Error: ' + err.message);
    } finally {
      setTogglingWebhookId(null);
    }
  };

  const handleDeleteWebhook = async (wh) => {
    if (!window.confirm(`Permanently remove webhook listener for "${wh.target_url}"? All logged delivery records for this endpoint will also be purged.`)) {
      return;
    }
    setDeletingWebhookId(wh.id);
    try {
      const res = await apiFetch(`/api/v1/enterprise/webhooks/${wh.id}`, {
        method: 'DELETE',
        headers: {
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete webhook');
      fetchWebhooksAndLogs();
      fetchEnterpriseData();
    } catch (err) {
      alert('Delete Error: ' + err.message);
    } finally {
      setDeletingWebhookId(null);
    }
  };

  const toggleEventSelection = (eventId) => {
    setSelectedWebhookEvents(prev =>
      prev.includes(eventId) ? prev.filter(e => e !== eventId) : [...prev, eventId]
    );
  };

  const toggleSecretVisibility = (whId) => {
    setShowSecretIds(prev => ({ ...prev, [whId]: !prev[whId] }));
  };

  return {
    loading,
    webhooks,
    newWebhookUrl,
    webhookMsg,
    webhookLogs,
    webhookLogsLoading,
    selectedWebhookEvents,
    testingWebhookId,
    togglingWebhookId,
    deletingWebhookId,
    showSecretIds,
    selectedPayloadLog,
    webhookTestFeedback,
    webhookDocTab,
    isRegisterWebhookOpen,
    copiedKeyId,
    setNewWebhookUrl,
    setWebhookMsg,
    setIsRegisterWebhookOpen,
    setSelectedPayloadLog,
    setWebhookDocTab,
    setWebhookTestFeedback,
    copyToClipboard,
    fetchWebhooksAndLogs,
    handleRegisterWebhook,
    handleTestPing,
    handleToggleWebhook,
    handleDeleteWebhook,
    toggleEventSelection,
    toggleSecretVisibility
  };
}
