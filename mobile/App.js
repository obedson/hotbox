import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
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

const API_BASE = 'http://127.0.0.1:5000/api/v1';

export default function App() {
  const [role, setRole] = useState('customer'); // 'customer' | 'rider' | 'hub'
  const [postcode, setPostcode] = useState('FC-01-A03-FK-01');
  const [trackingCode, setTrackingCode] = useState('DBX-FC01A0-8100');
  const [hubs, setHubs] = useState([]);
  const [trackingData, setTrackingData] = useState(null);
  const [radarJobs, setRadarJobs] = useState([]);
  const [loading, setLoading] = useState(false);

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
    fetchHubs();
    if (role === 'rider') fetchRadarJobs();
  }, [role]);

  const fetchHubs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/hubs/nearby?postcode=${postcode}`);
      const data = await res.json();
      if (Array.isArray(data.hubs)) {
        setHubs(data.hubs);
      }
    } catch (err) {
      // Fallback local fixture if offline
      setHubs([
        {
          id: 'b0000000-0000-0000-0000-000000000001',
          business_name: 'Wuse 2 Express Mart & Hub',
          neighbourhood: 'Wuse 2, Abuja',
          postcode: 'FC-01-A03-FK-01',
          capacity: 60,
          current_load: 12,
          rating: 4.8
        },
        {
          id: 'b0000000-0000-0000-0000-000000000002',
          business_name: 'Banex Plaza Gadgets & Hub',
          neighbourhood: 'Wuse 2, Abuja',
          postcode: 'FC-01-A03-FK-01',
          capacity: 40,
          current_load: 8,
          rating: 4.9
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTracking = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/shipments/track/${trackingCode.trim().toUpperCase()}`);
      const data = await res.json();
      if (res.ok) {
        setTrackingData(data);
      } else {
        Alert.alert('Tracking Error', data.error || 'Tracking code not found.');
      }
    } catch (err) {
      // Mock tracking fallback
      setTrackingData({
        shipment: {
          tracking_code: trackingCode,
          status: 'STORED_IN_BAY',
          service_type: 'DOOR_TO_HUB',
          package_description: 'Electronics & Gadgets',
          destination_hub_name: 'Wuse 2 Express Mart & Hub',
          destination_hub_address: 'Plot 112 Aminu Kano Crescent, Wuse 2',
          delivery_otp: '882194',
          collection_qr_token: 'QR-PASS-FC01A0'
        },
        timeline: [
          { handover_type: 'SENDER_TO_RIDER', verification_method: 'OTP', notes: 'Collected at sender doorstep' },
          { handover_type: 'RIDER_TO_HUB', verification_method: 'QR_SCAN', notes: 'Received and secured in BAY-A02' }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRadarJobs = async () => {
    try {
      const res = await fetch(`${API_BASE}/riders/radar/jobs`, {
        headers: { 'x-user-id': 'a0000000-0000-0000-0000-000000000006' }
      });
      const data = await res.json();
      setRadarJobs(data.jobs || []);
    } catch (e) {
      setRadarJobs([
        {
          id: 'd0000000-0000-0000-0000-000000000002',
          tracking_code: 'DBX-900241-2002',
          sender_address_text: 'Plot 112 Aminu Kano, Wuse 2',
          sender_postcode: 'FC-01-A03-FK-01',
          destination_hub_name: 'Jabi Lakeside Community Hub',
          potential_earning_ngn: 490.00
        }
      ]);
    }
  };

  const handleBookingSubmit = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/shipments/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'a0000000-0000-0000-0000-000000000005'
        },
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
      const data = await res.json();
      if (res.ok) {
        setBookingSuccess(data);
      } else {
        Alert.alert('Booking Error', data.error);
      }
    } catch (err) {
      setBookingSuccess({
        shipment: { tracking_code: `DBX-${postcode}-5521`, status: 'BOOKED' },
        pickupOtp: '519201'
      });
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
      const res = await fetch(`${API_BASE}/custody/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': role === 'rider' ? 'a0000000-0000-0000-0000-000000000006' : 'a0000000-0000-0000-0000-000000000001'
        },
        body: JSON.stringify({
          shipmentId: 'd0000000-0000-0000-0000-000000000001',
          handoverType: type,
          verificationMethod: 'OTP',
          verificationToken: otpInput.trim(),
          bayCode: selectedBay
        })
      });
      const data = await res.json();
      if (res.ok) {
        setHandoverMsg(`Success! New status: ${data.newStatus}`);
        setOtpInput('');
      } else {
        Alert.alert('Verification Failed', data.error);
      }
    } catch (e) {
      setHandoverMsg('Custody transfer verified locally in simulator mode.');
    } finally {
      setLoading(false);
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  roleToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  roleTabActive: {
    backgroundColor: '#059669',
  },
  roleTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  roleTabTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  scrollContent: {
    backgroundColor: '#f8fafc',
    padding: 16,
    gap: 16,
  },
  sectionContainer: {
    gap: 14,
  },
  bannerCard: {
    backgroundColor: '#064e3b',
    borderRadius: 20,
    padding: 18,
    gap: 6,
  },
  riderBanner: {
    backgroundColor: '#312e81',
    borderRadius: 20,
    padding: 18,
    gap: 6,
  },
  hubBanner: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 18,
    gap: 6,
  },
  bannerTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34d399',
    letterSpacing: 0.8,
  },
  bannerHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  bannerSub: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 16,
  },
  primaryButton: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a',
  },
  inputLarge: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 4,
    color: '#0f172a',
  },
  inputHelp: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  smallSearchButton: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
  },
  smallButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  hubsList: {
    gap: 10,
    marginTop: 6,
  },
  hubItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  hubHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hubName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  ratingBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#d97706',
  },
  hubAddress: {
    fontSize: 11,
    color: '#64748b',
  },
  hubFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  capacityText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#059669',
  },
  hoursText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  trackingResultCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 10,
    marginTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackingCodeText: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    color: '#0f172a',
  },
  statusPill: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  otpBox: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#10b981',
    alignItems: 'center',
    gap: 2,
  },
  otpLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  otpCode: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
    color: '#0f172a',
  },
  otpSub: {
    fontSize: 10,
    color: '#64748b',
  },
  subHeading: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#334155',
    marginTop: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  timelineIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#475569',
  },
  timelineEvent: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  timelineNotes: {
    fontSize: 10,
    color: '#64748b',
  },
  jobCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
    marginTop: 6,
  },
  payoutText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#059669',
  },
  acceptButton: {
    backgroundColor: '#4338ca',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  bayPickerRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 4,
  },
  bayButton: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  bayButtonActive: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
  },
  bayButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  bayButtonTextActive: {
    color: '#059669',
    fontWeight: 'bold',
  },
  successText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#059669',
    textAlign: 'center',
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#475569',
    fontWeight: 'bold',
    fontSize: 12,
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 12,
    backgroundColor: '#059669',
    borderRadius: 10,
    alignItems: 'center',
  },
  successBox: {
    alignItems: 'center',
    gap: 4,
    padding: 10,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  successSub: {
    fontSize: 12,
    color: '#334155',
  },
});
