import { useState, useEffect } from 'react';

export function useProfileSettings({ currentUser, profile, setProfile, showToast, getAuthHeaders, fetchCustomerData, coords, setCoords, postcode, setPostcode }) {
  const [testRerouteLoading, setTestRerouteLoading] = useState(false);
  const [testRerouteResult, setTestRerouteResult] = useState(null);

  // Profile Form Inputs & Save State
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    email: '',
    postcode: 'FC-01-A03-FK-01'
  });
  const [postcodeDetails, setPostcodeDetails] = useState(null);
  const [isResolvingPostcode, setIsResolvingPostcode] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const handleToggleNotification = async (channel, enabled) => {
    const currentPrefs = profile?.notification_preferences || { inapp: true, email: true, sms: false, whatsapp: false };
    const updated = { ...currentPrefs, [channel]: enabled };
    setProfile(prev => ({ ...prev, notification_preferences: updated }));
    try {
      const res = await fetch('/api/v1/customer/notification-preferences', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const costStr = (channel === 'inapp' || channel === 'email') ? 'Free (₦0.00)' : channel === 'sms' ? '₦20.00/SMS' : '₦35.00/WhatsApp';
        showToast(`${channel.toUpperCase()} alerts ${enabled ? 'activated' : 'deactivated'} [${costStr}]`);
      }
    } catch (err) {
      showToast('Failed to update preferences', 'error');
    }
  };

  // Trigger Test Dual-Party Reroute Alert Simulation
  const handleTestRerouteAlert = async () => {
    setTestRerouteLoading(true);
    setTestRerouteResult(null);
    try {
      const res = await fetch('/api/v1/customer/test-reroute-alert', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          oldPostcode: 'LA-01-A01-AA-01',
          newPostcode: profile?.postcode || 'FC-01-A03-FK-01'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTestRerouteResult(data);
        showToast('Dual-party reroute alert dispatched successfully!');
        fetchCustomerData();
      } else {
        showToast(data.error || 'Failed to dispatch test reroute alert', 'error');
      }
    } catch (err) {
      showToast('Network error dispatching test alert', 'error');
    } finally {
      setTestRerouteLoading(false);
    }
  };

  const handleToggleLocationPrivacy = async (enabled) => {
    const currentPrivacy = profile?.privacy_settings || { shareLocation: false, allowAnalytics: true };
    if (enabled) {
      if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser', 'error');
        return;
      }
      setGeoLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const liveLat = position.coords.latitude;
          const liveLng = position.coords.longitude;
          setCoords({ lat: liveLat, lng: liveLng });
          const updatedPrivacy = { ...currentPrivacy, shareLocation: true, coords: { lat: liveLat, lng: liveLng } };
          setProfile(prev => ({ ...prev, privacy_settings: updatedPrivacy }));
          setGeoLoading(false);
          try {
            await fetch('/api/v1/customer/profile', {
              method: 'PUT',
              headers: getAuthHeaders(),
              body: JSON.stringify({ privacy_settings: updatedPrivacy })
            });
            showToast(`GPS captured (${liveLat.toFixed(4)}, ${liveLng.toFixed(4)})! Hubs re-ranked.`);
          } catch (err) {
            console.error(err);
          }
        },
        async (err) => {
          setGeoLoading(false);
          console.warn('Geolocation error:', err.message);
          showToast(`Browser GPS prompt: ${err.message}. Please allow location access.`, 'error');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      const updatedPrivacy = { ...currentPrivacy, shareLocation: false };
      setProfile(prev => ({ ...prev, privacy_settings: updatedPrivacy }));
      setCoords({ lat: 9.0772, lng: 7.4990 }); // Default Abuja
      try {
        await fetch('/api/v1/customer/profile', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ privacy_settings: updatedPrivacy })
        });
        showToast('Location privacy enabled. Using standard hub coordinates.');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handlePostcodeChange = async (val) => {
    // Tolerant of letters, digits, hyphens, and spaces up to 15 characters
    const code = val.toUpperCase().replace(/[^0-9A-Z\-\s]/g, '').slice(0, 15);
    setProfileForm(prev => ({ ...prev, postcode: code }));

    const clean = code.replace(/[\s\-]/g, '');
    // Resolve when valid 6-digit legacy or 11-digit NDAPS format is typed
    if (clean.length === 6 || clean.length === 11) {
      setIsResolvingPostcode(true);
      try {
        const res = await fetch(`/api/v1/postcodes/lookup?code=${encodeURIComponent(code)}&level=1`);
        if (res.ok) {
          const json = await res.json();
          const d = json.data;
          setPostcodeDetails({
            postcode: d.postcode,
            display: d.display,
            compact: d.compact,
            state: d.administrative_address?.state_name,
            lga: d.administrative_address?.lga_name,
            neighbourhood: d.administrative_address?.locality_name,
            zone: d.administrative_address?.zone,
            description: d.recent_house_address?.recent,
            legacy_postcode: d.legacy_postcode,
            lat: d.coordinates?.lat,
            lng: d.coordinates?.lng,
            segments: d.segments
          });
        } else {
          const fallbackRes = await fetch(`/api/v1/postcodes/${encodeURIComponent(code)}`);
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            setPostcodeDetails(data);
          } else {
            setPostcodeDetails(null);
          }
        }
      } catch (err) {
        setPostcodeDetails(null);
      } finally {
        setIsResolvingPostcode(false);
      }
    } else if (clean.length < 6) {
      setPostcodeDetails(null);
    }
  };
  const handleSelectQuickRelocation = async (code) => {
    setProfileForm(prev => ({ ...prev, postcode: code }));
    setIsResolvingPostcode(true);
    try {
      const res = await fetch(`/api/v1/postcodes/lookup?code=${encodeURIComponent(code)}&level=1`);
      if (res.ok) {
        const json = await res.json();
        const d = json.data;
        setPostcodeDetails({
          postcode: d.postcode,
          display: d.display,
          compact: d.compact,
          state: d.administrative_address?.state_name,
          lga: d.administrative_address?.lga_name,
          neighbourhood: d.administrative_address?.locality_name,
          zone: d.administrative_address?.zone,
          description: d.recent_house_address?.recent,
          legacy_postcode: d.legacy_postcode,
          lat: d.coordinates?.lat,
          lng: d.coordinates?.lng,
          segments: d.segments
        });
      }
    } catch (e) {
    } finally {
      setIsResolvingPostcode(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    if (!profileForm.name.trim()) {
      showToast('Legal name is required', 'error');
      return;
    }
    const cleanPostcode = (profileForm.postcode || 'FC-01-A03-FK-01').trim();
    try {
      setIsSavingProfile(true);
      const res = await fetch('/api/v1/customer/profile', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: profileForm.name.trim(),
          phone: profileForm.phone.trim(),
          email: profileForm.email.trim(),
          postcode: cleanPostcode
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Legal profile & relocation details updated!');
        if (data.user) {
          setProfile(data.user);
          if (cleanPostcode) {
            setPostcode(cleanPostcode);
            // Re-center map & fetch nearby hubs if user relocated
            try {
              const pcRes = await fetch(`/api/v1/postcodes/${encodeURIComponent(cleanPostcode)}`);
              if (pcRes.ok) {
                const pcData = await pcRes.json();
                if (pcData.lat && pcData.lng) {
                  setCoords({ lat: parseFloat(pcData.lat), lng: parseFloat(pcData.lng) });
                }
              }
            } catch (err) {}
          }
          try {
            const stored = JSON.parse(localStorage.getItem('dropboxz_user') || '{}');
            localStorage.setItem('dropboxz_user', JSON.stringify({
              ...stored,
              name: data.user.name,
              phone: data.user.phone,
              email: data.user.email,
              postcode: data.user.postcode
            }));
          } catch (e) {}
        }
        fetchCustomerData();
      } else {
        showToast(data.error || 'Failed to update profile', 'error');
      }
    } catch (err) {
      showToast('Error saving profile changes', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };
  const handleCopyId = (id) => {
    if (!id) return;
    navigator.clipboard?.writeText(id);
    setCopiedId(true);
    showToast('Customer Account ID copied to clipboard');
    setTimeout(() => setCopiedId(false), 2000);
  };


  useEffect(() => {
    if (!profile) return;
    const userPostcode = profile.postcode || '';
    setProfileForm({
      name: profile.name || '',
      phone: profile.phone || '',
      email: profile.email || '',
      postcode: userPostcode
    });
    if (profile.postcode_neighbourhood || profile.postcode_state) {
      setPostcodeDetails({
        neighbourhood: profile.postcode_neighbourhood,
        lga: profile.postcode_lga,
        state: profile.postcode_state,
        description: profile.postcode_description
      });
    }
  }, [profile]);

  return {
    profileForm, setProfileForm, postcodeDetails, isResolvingPostcode,
    isSavingProfile, copiedId, geoLoading, testRerouteLoading, testRerouteResult,
    handlePostcodeChange, handleSelectQuickRelocation, handleSaveProfile,
    handleCopyId, handleToggleNotification, handleTestRerouteAlert,
    handleToggleLocationPrivacy
  };
}
