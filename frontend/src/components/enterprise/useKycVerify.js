import { useState } from 'react';

export default function useKycVerify() {
  // B2B KYC Address Verification State
  const [kycPostcode, setKycPostcode] = useState('FC-01-A03-FK-01');
  const [kycPhone, setKycPhone] = useState('+2349063085415');
  const [kycName, setKycName] = useState('Johnson O.');
  const [kycResult, setKycResult] = useState(null);
  const [kycLoading, setKycLoading] = useState(false);

  const handleKycVerify = async (e) => {
    if (e) e.preventDefault();
    setKycLoading(true);
    setKycResult(null);
    try {
      const res = await fetch('/api/v1/enterprise/verify-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postcode: kycPostcode.trim(),
          phone: kycPhone.trim(),
          name: kycName.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification query failed');
      setKycResult(data);
    } catch (err) {
      alert('KYC Query Error: ' + err.message);
    } finally {
      setKycLoading(false);
    }
  };

  return {
    kycPostcode,
    kycPhone,
    kycName,
    kycResult,
    kycLoading,
    setKycPostcode,
    setKycPhone,
    setKycName,
    handleKycVerify
  };
}
