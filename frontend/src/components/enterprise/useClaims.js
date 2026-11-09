import { apiFetch } from '../../lib/api';
import { useState } from 'react';

export default function useClaims() {
  // Live Enterprise B2B Claims & Support State (PostgreSQL claims table)
  const [claims, setClaims] = useState([]);
  const [claimsSummary, setClaimsSummary] = useState(null);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimFilter, setClaimFilter] = useState('ALL');
  const [eligibleShipments, setEligibleShipments] = useState([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [isSubmitClaimOpen, setIsSubmitClaimOpen] = useState(false);
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimSubmitError, setClaimSubmitError] = useState(null);
  const [claimSubmitSuccess, setClaimSubmitSuccess] = useState(null);
  const [selectedClaimModal, setSelectedClaimModal] = useState(null);
  const [claimDetailLoading, setClaimDetailLoading] = useState(false);
  const [newClaimForm, setNewClaimForm] = useState({
    shipmentId: '',
    claimType: 'DAMAGED_PARCEL',
    claimAmountNgn: '',
    description: '',
    evidenceUrls: ''
  });

  const fetchClaimsAndSummary = async () => {
    setClaimsLoading(true);
    try {
      const [claimsRes, summaryRes] = await Promise.all([
        apiFetch('/api/v1/enterprise/claims', {
          headers: {}
        }),
        apiFetch('/api/v1/enterprise/claims/summary', {
          headers: {}
        })
      ]);
      const cData = await claimsRes.json();
      const sData = await summaryRes.json();
      if (cData.claims) setClaims(cData.claims);
      if (sData.summary) setClaimsSummary(sData.summary);
    } catch (err) {
      console.error('Failed to load enterprise claims:', err);
    } finally {
      setClaimsLoading(false);
    }
  };

  const fetchEligibleShipments = async () => {
    setEligibleLoading(true);
    try {
      const res = await apiFetch('/api/v1/enterprise/claims/eligible-shipments', {
        headers: {}
      });
      const data = await res.json();
      if (data.shipments) {
        setEligibleShipments(data.shipments);
        if (data.shipments.length > 0 && !newClaimForm.shipmentId) {
          setNewClaimForm(prev => ({
            ...prev,
            shipmentId: data.shipments[0].id,
            claimAmountNgn: data.shipments[0].pricing_total_ngn || '5000'
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load eligible shipments:', err);
    } finally {
      setEligibleLoading(false);
    }
  };

  const handleOpenSubmitClaim = () => {
    setClaimSubmitError(null);
    setClaimSubmitSuccess(null);
    setIsSubmitClaimOpen(true);
    fetchEligibleShipments();
  };

  const handleSelectEligibleShipment = (shipmentId) => {
    const selected = eligibleShipments.find(s => s.id === shipmentId);
    setNewClaimForm(prev => ({
      ...prev,
      shipmentId,
      claimAmountNgn: selected ? selected.pricing_total_ngn || prev.claimAmountNgn : prev.claimAmountNgn
    }));
  };

  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    if (!newClaimForm.shipmentId) {
      setClaimSubmitError('Please select a shipment to dispute.');
      return;
    }
    if (!newClaimForm.claimAmountNgn || Number(newClaimForm.claimAmountNgn) <= 0) {
      setClaimSubmitError('Please enter a valid claim amount in NGN.');
      return;
    }
    if (!newClaimForm.description || newClaimForm.description.trim().length < 10) {
      setClaimSubmitError('Please provide a detailed incident description (at least 10 characters).');
      return;
    }

    setSubmittingClaim(true);
    setClaimSubmitError(null);
    setClaimSubmitSuccess(null);

    try {
      const evidenceList = newClaimForm.evidenceUrls
        ? newClaimForm.evidenceUrls.split('\n').map(u => u.trim()).filter(Boolean)
        : [];

      const res = await apiFetch('/api/v1/enterprise/claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shipmentId: newClaimForm.shipmentId,
          claimType: newClaimForm.claimType,
          claimAmountNgn: parseFloat(newClaimForm.claimAmountNgn),
          description: newClaimForm.description.trim(),
          evidenceUrls: evidenceList
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit claim');

      setClaimSubmitSuccess('B2B claim submitted successfully and routed to NDAPS arbitration.');
      fetchClaimsAndSummary();
      setTimeout(() => {
        setIsSubmitClaimOpen(false);
        setClaimSubmitSuccess(null);
        setNewClaimForm({
          shipmentId: '',
          claimType: 'DAMAGED_PARCEL',
          claimAmountNgn: '',
          description: '',
          evidenceUrls: ''
        });
      }, 1200);
    } catch (err) {
      setClaimSubmitError(err.message);
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleViewClaimInvestigation = async (claimId) => {
    setClaimDetailLoading(true);
    setSelectedClaimModal(null);
    try {
      const res = await apiFetch(`/api/v1/enterprise/claims/${claimId}`, {
        headers: {}
      });
      const data = await res.json();
      if (data.claim) {
        setSelectedClaimModal(data.claim);
      }
    } catch (err) {
      alert('Failed to load investigation details: ' + err.message);
    } finally {
      setClaimDetailLoading(false);
    }
  };

  return {
    claims,
    claimsSummary,
    claimsLoading,
    claimFilter,
    eligibleShipments,
    eligibleLoading,
    isSubmitClaimOpen,
    submittingClaim,
    claimSubmitError,
    claimSubmitSuccess,
    selectedClaimModal,
    claimDetailLoading,
    newClaimForm,
    setClaimFilter,
    setIsSubmitClaimOpen,
    setNewClaimForm,
    setSelectedClaimModal,
    fetchClaimsAndSummary,
    fetchEligibleShipments,
    handleOpenSubmitClaim,
    handleSelectEligibleShipment,
    handleSubmitClaim,
    handleViewClaimInvestigation
  };
}
