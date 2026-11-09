import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  StatusBar
} from 'react-native';

import { apiFetch, getToken, setToken } from './src/api';
import styles from './styles';

export default function App() {
  const [role, setRole] = useState('customer'); // 'customer' | 'rider' | 'hub'
  const [postcode, setPostcode] = useState('FC-01-A03-FK-01');
  const [trackingCode, setTrackingCode] = useState('DBX-FC01A0-8100');
  const [hubs, setHubs] = useState([]);
  const [trackingData, setTrackingData] = useState(null);
  const [radarJobs, setRadarJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Authentication
  const [token, setTokenState] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // Booking Modal
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [recipientName, setRecipientName] = useState('Ngozi Eze');
  const [recipientPhone, setRecipientPhone] = useState('+2348029988112');
  const [bookingSuccess, setBookingSuccess] = useState(null);

  // Handover / Intake
  const [otpInput, setOtpInput] = useState('');
  const [selectedBay, setSelectedBay] = useState('BAY-A01');
  const [handoverMsg, setHandoverMsg] = useState(null);

  useEffect(() => {
    getToken()
      .then(stored => {
        if (stored) setTokenState(stored);
        setAuthLoading(false);
      })
      .catch(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchHubs();
    if (role === 'rider') fetchRadarJobs();
  }, [role, token]);

  const fetchHubs = async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`/hubs/nearby?postcode=${postcode}`);
      if (Array.isArray(data.hubs)) {
        setHubs(data.hubs);
      }
    } catch (err) {
      Alert.alert('Network Error', err.message || 'Could not load nearby hubs.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTracking = async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`/shipments/track/${trackingCode.trim().toUpperCase()}`);
      setTrackingData(data);
    } catch (err) {
      Alert.alert('Tracking Error', err.message || 'Tracking code not found.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRadarJobs = async () => {
    try {
      const data = await apiFetch('/riders/radar/jobs');
      setRadarJobs(data.jobs || []);
    } catch (err) {
      Alert.alert('Network Error', err.message || 'Could not load rider jobs.');
    }
  };

  const handleBookingSubmit = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/shipments/book', {
        method: 'POST',
        body: JSON.stringify({
          serviceType: 'DOOR_TO_HUB',
          senderName: 'Tunde Fashola',
          senderPhone: '+2348037778899',
          senderPostcode: postcode,
          senderAddressText: 'Wuse 2, Abuja',
          recipientName,
          recipientPhone,
          recipientPostcode: 'FC-01-A03-FK-01',
          recipientAddressText: 'Plot 112 Aminu Kano Crescent',
          destinationHubId: hubs[0]?.id
        })
      });
      setBookingSuccess(data);
    } catch (err) {
      Alert.alert('Booking Error', err.message || 'Booking failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustodyHandover = async (type) => {
    if (!otpInput) {
      Alert.alert('Missing Token', 'Please enter verification OTP or QR token.');
      return;
    }
    setLoading(true);
    setHandoverMsg(null);
    try {
      const data = await apiFetch('/custody/transfer', {
        method: 'POST',
        body: JSON.stringify({
          shipmentId: 'd0000000-0000-0000-0000-000000000001',
          handoverType: type,
          verificationMethod: 'OTP',
          verificationToken: otpInput.trim(),
          bayCode: selectedBay
        })
      });
      setHandoverMsg(`Success! New status: ${data.newStatus}`);
      setOtpInput('');
    } catch (err) {
      Alert.alert('Verification Failed', err.message || 'Custody transfer failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginPhone.trim()) {
      setLoginError('Enter your phone number or email.');
      return;
    }
    setLoginLoading(true);
    setLoginError(null);
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: loginPhone.trim() })
      });
      await setToken(data.token);
      setTokenState(data.token);
      if (data.user && data.user.role) {
        const roleMap = { rider: 'rider', hub_owner: 'hub' };
        setRole(roleMap[data.user.role] || 'customer');
      }
    } catch (err) {
      setLoginError(err.message || 'Sign in failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>📦</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>DROPBOXZ</Text>
            <Text style={styles.headerSubtitle}>🇳🇬 Nigeria Digital Postcode Logistics</Text>
          </View>
        </View>

        {/* Role Toggle Tabs */}
        <View style={styles.roleToggleRow}>
          {[
            { id: 'customer', label: 'Customer (C01)' },
            { id: 'rider', label: 'Rider Radar (R01)' },
            { id: 'hub', label: 'Hub Station (H01)' }
          ].map(r => (
            <TouchableOpacity
              key={r.id}
              style={[styles.roleTab, role === r.id && styles.roleTabActive]}
              onPress={() => setRole(r.id)}
            >
              <Text style={[styles.roleTabText, role === r.id && styles.roleTabTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ----------------- 1. CUSTOMER MOBILE BOARD (C01 - C20) ----------------- */}
        {role === 'customer' && (
          <View style={styles.sectionContainer}>
            {/* Banner */}
            <View style={styles.bannerCard}>
              <Text style={styles.bannerTag}>POSTCODE-FIRST LOGISTICS</Text>
              <Text style={styles.bannerHeading}>Neighborhood Drop-Off & Collection</Text>
              <Text style={styles.bannerSub}>Pick an accredited local hub to send or receive parcels with verified OTP security.</Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setIsBookingOpen(true)}
              >
                <Text style={styles.primaryButtonText}>+ Book Parcel Delivery</Text>
              </TouchableOpacity>
            </View>

            {/* Postcode Search */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Find Verified Hubs by Postcode</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.input}
                  value={postcode}
                  onChangeText={setPostcode}
                  placeholder="Enter Postcode (e.g. FC-01-A03-FK-01)"
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity style={styles.smallSearchButton} onPress={fetchHubs}>
                  <Text style={styles.smallButtonText}>Search</Text>
                </TouchableOpacity>
              </View>

              {/* Hub Cards */}
              <View style={styles.hubsList}>
                {hubs.map(h => (
                  <View key={h.id} style={styles.hubItem}>
                    <View style={styles.hubHeaderRow}>
                      <Text style={styles.hubName}>{h.business_name}</Text>
                      <Text style={styles.ratingBadge}>⭐ {h.rating || 4.8}</Text>
                    </View>
                    <Text style={styles.hubAddress}>{h.neighbourhood} • Postcode: {h.postcode}</Text>
                    <View style={styles.hubFooter}>
                      <Text style={styles.capacityText}>
                        Free Bays: {h.capacity - h.current_load} / {h.capacity}
                      </Text>
                      <Text style={styles.hoursText}>08:00 - 20:00</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Live Tracking Widget */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Track Parcel & Collection Pass</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.input}
                  value={trackingCode}
                  onChangeText={setTrackingCode}
                  placeholder="Tracking Code (e.g. DBX-FC01A0-8100)"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="characters"
                />
                <TouchableOpacity style={styles.smallSearchButton} onPress={fetchTracking}>
                  <Text style={styles.smallButtonText}>Track</Text>
                </TouchableOpacity>
              </View>

              {trackingData && (
                <View style={styles.trackingResultCard}>
                  <View style={styles.statusRow}>
                    <Text style={styles.trackingCodeText}>{trackingData.shipment.tracking_code}</Text>
                    <Text style={styles.statusPill}>{trackingData.shipment.status}</Text>
                  </View>

                  <View style={styles.otpBox}>
                    <Text style={styles.otpLabel}>RECIPIENT COLLECTION OTP</Text>
                    <Text style={styles.otpCode}>{trackingData.shipment.delivery_otp}</Text>
                    <Text style={styles.otpSub}>Show this code to Hub host for release</Text>
                  </View>

                  <Text style={styles.subHeading}>Chain-of-Custody Timeline:</Text>
                  {trackingData.timeline.map((ev, i) => (
                    <View key={i} style={styles.timelineRow}>
                      <Text style={styles.timelineIndex}>{i + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.timelineEvent}>{ev.handover_type}</Text>
                        <Text style={styles.timelineNotes}>{ev.notes}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* ----------------- 2. RIDER DELIVERY RADAR (R01 - R18) ----------------- */}
        {role === 'rider' && (
          <View style={styles.sectionContainer}>
            <View style={styles.riderBanner}>
              <Text style={styles.bannerTag}>TRACK B VERIFIED RIDER</Text>
              <Text style={styles.bannerHeading}>Musa Danladi (Plate: ABJ-432-QA)</Text>
              <Text style={styles.bannerSub}>Operational Zone: FC-01-A03-FK-01, FC-01-A02-FK-02 • ⭐ 4.95 Rating</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Available Delivery Radar Jobs</Text>
              {radarJobs.map(job => (
                <View key={job.id} style={styles.jobCard}>
                  <View style={styles.hubHeaderRow}>
                    <Text style={styles.trackingCodeText}>{job.tracking_code}</Text>
                    <Text style={styles.payoutText}>₦{job.potential_earning_ngn} Payout</Text>
                  </View>
                  <Text style={styles.hubAddress}>Pickup: {job.sender_address_text}</Text>
                  <Text style={styles.hubAddress}>Drop: {job.destination_hub_name || 'Neighborhood Hub'}</Text>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => Alert.alert('Job Accepted', `Accepted dispatch for ${job.tracking_code}`)}
                  >
                    <Text style={styles.acceptButtonText}>Accept Dispatch</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Handover OTP Verification */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Doorstep Pickup Verification</Text>
              <Text style={styles.inputHelp}>Enter the 6-digit Pickup OTP provided by the sender:</Text>
              <TextInput
                style={styles.inputLarge}
                value={otpInput}
                onChangeText={setOtpInput}
                placeholder="Sender Pickup OTP (e.g. 419201)"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                maxLength={6}
              />
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => handleCustodyHandover('SENDER_TO_RIDER')}
              >
                <Text style={styles.primaryButtonText}>Verify & Confirm Pickup</Text>
              </TouchableOpacity>

              {handoverMsg && (
                <Text style={styles.successText}>{handoverMsg}</Text>
              )}
            </View>
          </View>
        )}

        {/* ----------------- 3. HUB OWNER EXPERIENCE (H01 - H18) ----------------- */}
        {role === 'hub' && (
          <View style={styles.sectionContainer}>
            <View style={styles.hubBanner}>
              <Text style={styles.bannerTag}>ACCREDITED COMMUNITY HUB</Text>
              <Text style={styles.bannerHeading}>Wuse 2 Express Mart & Hub</Text>
              <Text style={styles.bannerSub}>Postcode: FC-01-A03-FK-01 • Occupancy: 12 / 60 Bays • Commissions: ₦45,000</Text>
            </View>

            {/* Hub Intake Scanner */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Parcel Intake & Bay Assignment</Text>
              <Text style={styles.inputHelp}>Enter Parcel QR Token or Tracking Code:</Text>
              <TextInput
                style={styles.input}
                value={otpInput}
                onChangeText={setOtpInput}
                placeholder="e.g. QR-TOKEN-DBX-FC01A0-8100"
                placeholderTextColor="#94a3b8"
              />

              <Text style={[styles.inputHelp, { marginTop: 10 }]}>Assign Storage Bay:</Text>
              <View style={styles.bayPickerRow}>
                {['BAY-A01', 'BAY-A02', 'BAY-A03', 'BAY-A04'].map(bay => (
                  <TouchableOpacity
                    key={bay}
                    style={[styles.bayButton, selectedBay === bay && styles.bayButtonActive]}
                    onPress={() => setSelectedBay(bay)}
                  >
                    <Text style={[styles.bayButtonText, selectedBay === bay && styles.bayButtonTextActive]}>
                      {bay}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => handleCustodyHandover('RIDER_TO_HUB')}
              >
                <Text style={styles.primaryButtonText}>Intake & Lock in Bay</Text>
              </TouchableOpacity>

              {handoverMsg && (
                <Text style={styles.successText}>{handoverMsg}</Text>
              )}
            </View>

            {/* Handover to Recipient */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Release Parcel to Recipient</Text>
              <Text style={styles.inputHelp}>Enter Recipient Delivery OTP to unlock bay:</Text>
              <TextInput
                style={styles.inputLarge}
                value={otpInput}
                onChangeText={setOtpInput}
                placeholder="Recipient OTP (e.g. 882194)"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                maxLength={6}
              />
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#0284c7' }]}
                onPress={() => handleCustodyHandover('HUB_TO_RECIPIENT')}
              >
                <Text style={styles.primaryButtonText}>Verify OTP & Complete Collection</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>

      {/* Login Modal */}
      <Modal visible={!authLoading && !token} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sign in to Dropboxz</Text>
            <Text style={styles.inputHelp}>Phone number or email</Text>
            <TextInput
              style={styles.input}
              value={loginPhone}
              onChangeText={setLoginPhone}
              placeholder="e.g. +2348029988112"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              keyboardType="phone-pad"
            />
            {loginError && <Text style={styles.errorText}>{loginError}</Text>}
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleLogin}
              disabled={loginLoading}
            >
              {loginLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Booking Modal */}
      <Modal visible={isBookingOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Book Parcel Dispatch</Text>
            <Text style={styles.inputHelp}>Recipient Full Name:</Text>
            <TextInput
              style={styles.input}
              value={recipientName}
              onChangeText={setRecipientName}
            />
            <Text style={styles.inputHelp}>Recipient Phone:</Text>
            <TextInput
              style={styles.input}
              value={recipientPhone}
              onChangeText={setRecipientPhone}
              keyboardType="phone-pad"
            />
            <Text style={styles.inputHelp}>Sender Postcode: {postcode}</Text>

            {bookingSuccess ? (
              <View style={styles.successBox}>
                <Text style={styles.successTitle}>Booking Confirmed!</Text>
                <Text style={styles.successSub}>Tracking: {bookingSuccess.shipment?.tracking_code}</Text>
                <Text style={styles.successSub}>Pickup OTP: {bookingSuccess.pickupOtp}</Text>
                <TouchableOpacity
                  style={[styles.primaryButton, { marginTop: 10 }]}
                  onPress={() => { setIsBookingOpen(false); setBookingSuccess(null); }}
                >
                  <Text style={styles.primaryButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setIsBookingOpen(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleBookingSubmit}
                >
                  <Text style={styles.primaryButtonText}>Confirm (₦1,600)</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

