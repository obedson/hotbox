import { apiFetch } from '../../lib/api';
import { useState } from 'react';

export default function useBilling() {
  const [invoices, setInvoices] = useState([]);
  const [billingSummary, setBillingSummary] = useState(null);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [selectedInvoiceModal, setSelectedInvoiceModal] = useState(null);
  const [invoiceDetailLoading, setInvoiceDetailLoading] = useState(false);
  const [invoiceDetailData, setInvoiceDetailData] = useState(null);
  const [payingInvoiceId, setPayingInvoiceId] = useState(null);
  const [billingMsg, setBillingMsg] = useState(null);

  const fetchBillingAndInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const [summaryRes, invRes] = await Promise.all([
        apiFetch('/api/v1/enterprise/billing/summary', {
          headers: {}
        }),
        apiFetch('/api/v1/enterprise/invoices', {
          headers: {}
        })
      ]);
      const sData = await summaryRes.json();
      const iData = await invRes.json();
      if (sData.summary) setBillingSummary(sData.summary);
      if (iData.invoices) setInvoices(iData.invoices);
    } catch (err) {
      console.error('Failed to load billing & invoices from database:', err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleViewInvoiceBreakdown = async (inv) => {
    setSelectedInvoiceModal(inv);
    setInvoiceDetailLoading(true);
    setInvoiceDetailData(null);
    try {
      const res = await apiFetch(`/api/v1/enterprise/invoices/${inv.id}`, {
        headers: {}
      });
      const data = await res.json();
      setInvoiceDetailData(data);
    } catch (err) {
      alert('Failed to load invoice line items: ' + err.message);
    } finally {
      setInvoiceDetailLoading(false);
    }
  };

  const handleDownloadInvoiceCsv = (inv) => {
    window.open(`/api/v1/enterprise/invoices/${inv.id}/export`, '_blank');
  };

  const handleSettleInvoice = async (inv) => {
    if (!window.confirm(`Confirm corporate settlement of ${inv.invoice_number} for ₦${Number(inv.total_amount_ngn).toLocaleString()} via corporate remittance escrow?`)) return;
    setPayingInvoiceId(inv.id);
    try {
      const res = await apiFetch(`/api/v1/enterprise/invoices/${inv.id}/pay`, {
        method: 'POST',
        headers: {}
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBillingMsg(`Invoice ${inv.invoice_number} settled successfully! Corporate Remittance Ref: ${data.invoice.payment_reference}`);
      fetchBillingAndInvoices();
    } catch (err) {
      alert('Settlement error: ' + err.message);
    } finally {
      setPayingInvoiceId(null);
    }
  };

  return {
    invoices,
    billingSummary,
    invoicesLoading,
    selectedInvoiceModal,
    invoiceDetailLoading,
    invoiceDetailData,
    payingInvoiceId,
    billingMsg,
    setBillingMsg,
    setSelectedInvoiceModal,
    fetchBillingAndInvoices,
    handleViewInvoiceBreakdown,
    handleDownloadInvoiceCsv,
    handleSettleInvoice
  };
}
