import { useState } from 'react';

export default function useAddressBook() {
  // Enterprise Pre-Validated Address Book State (Live PostgreSQL Feed)
  const [addressBook, setAddressBook] = useState([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSearch, setAddressSearch] = useState('');
  const [addressTypeFilter, setAddressTypeFilter] = useState('ALL');
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({
    contactName: '',
    contactPhone: '+234 ',
    contactEmail: '',
    addressType: 'business',
    postcode: 'FC-01-A03-FK-01',
    streetAddress: '',
    landmark: '',
    isDefault: false
  });

  const fetchAddressBook = async (search = addressSearch, type = addressTypeFilter) => {
    setAddressLoading(true);
    try {
      const params = new URLSearchParams();
      if (search && search.trim()) params.set('search', search.trim());
      if (type && type !== 'ALL') params.set('type', type);
      const res = await fetch(`/api/v1/enterprise/addresses?${params.toString()}`, {
        headers: {}
      });
      const data = await res.json();
      if (data.addresses) {
        setAddressBook(data.addresses);
      }
    } catch (err) {
      console.error('Failed to load enterprise address book:', err);
    } finally {
      setAddressLoading(false);
    }
  };

  const handleCreateAddress = async (e) => {
    e.preventDefault();
    setSavingAddress(true);
    try {
      const res = await fetch('/api/v1/enterprise/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAddressForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save address');
      setIsAddAddressOpen(false);
      setNewAddressForm({
        contactName: '',
        contactPhone: '+234 ',
        contactEmail: '',
        addressType: 'business',
        postcode: 'FC-01-A03-FK-01',
        streetAddress: '',
        landmark: '',
        isDefault: false
      });
      fetchAddressBook();
    } catch (err) {
      alert('Save Address Error: ' + err.message);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from your enterprise address book?`)) return;
    try {
      const res = await fetch(`/api/v1/enterprise/addresses/${id}`, {
        method: 'DELETE',
        headers: {}
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete address');
      fetchAddressBook();
    } catch (err) {
      alert('Delete Error: ' + err.message);
    }
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      const res = await fetch(`/api/v1/enterprise/addresses/${id}/default`, {
        method: 'PUT',
        headers: {}
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update default address');
      fetchAddressBook();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return {
    addressBook,
    addressLoading,
    addressSearch,
    addressTypeFilter,
    isAddAddressOpen,
    savingAddress,
    newAddressForm,
    setAddressSearch,
    setAddressTypeFilter,
    setIsAddAddressOpen,
    setNewAddressForm,
    fetchAddressBook,
    handleCreateAddress,
    handleDeleteAddress,
    handleSetDefaultAddress
  };
}
