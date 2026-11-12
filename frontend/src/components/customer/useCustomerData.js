import { apiFetch } from '../../lib/api';
import { useState, useEffect } from 'react';

export function useCustomerData(currentUser) {
  // Customer Data State
  const [profile, setProfile] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [savedHubs, setSavedHubs] = useState([]);
  const [claims, setClaims] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  // Hotbox Digital P.O. Box
  const [digitalBox, setDigitalBox] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('hotbox_token');
    return token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : { 'Content-Type': 'application/json' };
  };

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const [pRes, sRes, cRes, tRes, dRes] = await Promise.all([
        apiFetch('/api/v1/customer/profile', { headers }),
        apiFetch('/api/v1/customer/shipments', { headers }),
        apiFetch('/api/v1/customer/claims', { headers }),
        apiFetch('/api/v1/customer/tickets', { headers }),
        apiFetch('/api/v1/customer/digital-box', { headers })
      ]);

      if (dRes && dRes.ok) {
        const dData = await dRes.json();
        setDigitalBox(dData);
      }

      if (pRes.ok) {
        const pData = await pRes.json();
        setProfile(pData.user);
        setWallet(pData.wallet || null);
        setTransactions(pData.transactions || []);
        setSavedAddresses(pData.addresses || []);
        setSavedHubs(pData.savedHubs || []);
      }
      if (sRes.ok) {
        const sData = await sRes.json();
        setShipments(sData.shipments || []);
      }
      if (cRes.ok) {
        const cData = await cRes.json();
        setClaims(cData.claims || []);
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        setTickets(tData.tickets || []);
      }
    } catch (err) {
      console.error('Customer fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, [currentUser]);

  return {
    profile, setProfile, shipments, savedAddresses, savedHubs, claims,
    tickets, wallet, transactions, digitalBox, setDigitalBox, loading,
    getAuthHeaders, fetchCustomerData
  };
}
