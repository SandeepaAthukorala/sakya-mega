// First, install react-select by running:
// npm install react-select

import React, { useState, useEffect } from 'react';
import Select, { createFilter } from 'react-select'; // Import createFilter
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Phone, User, FileText, Check, ChevronDown, Calendar, Route, Package } from 'lucide-react';
import { supabase } from '../supabaseClient';

// --- Custom Filter for react-select (triggers after 2 chars) ---
const filterConfig = {
  ignoreCase: true,
  matchFrom: 'any', // 'start' or 'any'
  trim: true,
};

const customFilter = (option, rawInput) => {
  // Directly apply the filtering logic, regardless of input length
  return createFilter(filterConfig)(option, rawInput);
};
// --- End Custom Filter ---


// Add custom styles for react-select
const customStyles = {
  control: (provided, state) => ({ // Added state parameter
    ...provided,
    minHeight: '42px', // Increased minHeight slightly
    paddingLeft: '40px', // Keep padding for the icon
    borderColor: state.isFocused ? '#a5b4fc' : '#d1d5db', // Tailwind indigo-300 for focus, neutral-300 otherwise
    '&:hover': { borderColor: '#d1d5db' },
    boxShadow: state.isFocused ? '0 0 0 1px #a5b4fc' : 'none', // Optional: Add focus ring similar to inputs
    borderRadius: '0.375rem', // Tailwind rounded-md
  }),
  input: (provided) => ({
    ...provided,
    // Removed margin reset - let control padding handle it
    paddingLeft: '0px',
    marginLeft: '0px', // Ensure input text starts correctly after padding
    color: '#1f2937', // Tailwind text-gray-800
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '2px 8px', // Standard padding
    // Removed explicit paddingLeft override here, rely on control's padding
  }),
  placeholder: (provided) => ({
    ...provided,
    // Removed margin reset
    color: '#6b7280', // Tailwind text-neutral-500
  }),
  singleValue: (provided) => ({
      ...provided,
      // Removed margin reset
      color: '#1f2937', // Tailwind text-gray-800
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    padding: '8px',
    color: '#6b7280',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  menu: (provided) => ({ // Ensure menu appears above other elements
    ...provided,
    zIndex: 50, // Higher z-index for the dropdown menu
  }),
};


const VisitFormPage: React.FC = () => {
  const [buyerName, setBuyerName] = useState('');
  const [phone, setPhone] = useState('');
  const [visitType, setVisitType] = useState<'Sample' | 'Sittu' | 'Over'>('Sample');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [itemId, setItemId] = useState('');
  const [items, setItems] = useState<{ id: string; item_name: string; item_number: number }[]>([]);
  const [routeId, setRouteId] = useState('');
  const [routes, setRoutes] = useState<{ id: string; name: string; number: number }[]>([]);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [location, setLocation] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [address, setAddress] = useState('');
  const [formError, setFormError] = useState('');

  const { user } = useAuth();
  const navigate = useNavigate();

  // --- getCurrentLocation and handleSubmit remain the same ---
   const getCurrentLocation = () => {
    setIsGettingLocation(true);
    setLocationError('');
    setFormError(''); // Clear form error when getting location

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: address // Use the manually entered address for now
        });
        setIsGettingLocation(false);
      },
      (error) => {
        let errorMsg = 'Failed to get location';
        switch(error.code) {
          case error.PERMISSION_DENIED: errorMsg = 'Location access denied. Please enable location services.'; break;
          case error.POSITION_UNAVAILABLE: errorMsg = 'Location information is unavailable.'; break;
          case error.TIMEOUT: errorMsg = 'Location request timed out.'; break;
        }
        setLocationError(errorMsg);
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setLocationError('');

    if (!location) {
      setLocationError('Please get your current geo-coordinates first');
      return;
    }
     if (!address) { // Also check if address is entered
        setFormError('Please enter the address');
        return;
     }
    if (!itemId) {
      setFormError('Please select an item');
      return;
    }
    if (!routeId) {
      setFormError('Please select a route');
      return;
    }

    setIsSubmitting(true);

    try {
      const finalLocation = { ...location, address: address };

      const { error } = await supabase
        .from('visits')
        .insert({
          ref_id: user?.id,
          buyer_name: buyerName,
          phone: phone,
          location: finalLocation,
          date: new Date(visitDate).toISOString(),
          type: visitType,
          status: 'Pending',
          notes: notes || undefined,
          item_id: itemId,
          route_id: routeId,
        })
        .single();

      if (error) {
        console.error('Error saving visit:', error);
        setFormError(`Failed to save visit: ${error.message}`);
        throw error;
      }

      setShowSuccess(true);
      setBuyerName('');
      setPhone('');
      setVisitType('Sample');
      setVisitDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setItemId('');
      setRouteId('');
      setLocation(null);
      setAddress('');
      setFormError('');
      setLocationError('');

      setTimeout(() => {
        navigate('/visits');
      }, 2000);
    } catch (error: any) {
      console.error('Error in handleSubmit:', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  // --- End unchanged functions ---

  useEffect(() => {
    const fetchRoutes = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('routes')
          .select('id, name, number')
          .eq('ref_id', user.id);

        if (error) {
          console.error('Error fetching routes:', error);
          setFormError('Failed to load routes');
        } else {
          setRoutes(data || []);
        }
      } catch (error) {
        console.error('Error fetching routes:', error);
        setFormError('An error occurred while loading routes');
      }
    };

    const fetchItems = async () => {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('id, item_name, item_number');

        if (error) {
          console.error('Error fetching items:', error);
          setFormError('Failed to load items');
        } else {
          setItems(data || []);
        }
      } catch (error) {
        console.error('Error fetching items:', error);
        setFormError('An error occurred while loading items');
      }
    };

    if (user) {
      fetchRoutes();
      fetchItems();
    }
  }, [user]);

  const itemOptions = items.map(item => ({
    value: item.id,
    label: `${item.item_name} ${item.item_number}`
  }));

  const routeOptions = routes.map(route => ({
    value: route.id,
    label: `${route.name} ${route.number}`
  }));

  if (showSuccess) {
    // --- Success message remains the same ---
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] animate-fade-in">
        <div className="bg-success/10 p-4 rounded-full mb-4">
          <Check size={48} className="text-success" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Visit Recorded!</h2>
        <p className="text-neutral-600 text-center mb-6">
          The visit has been successfully recorded.
        </p>
        <p className="text-sm text-neutral-500">Redirecting to visits list...</p>
      </div>
    );
    // --- End Success message ---
  }

  return (
    <div className="max-w-xl mx-auto py-6 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Record New Visit</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-medium mb-4">Visit Details</h2>
          <div className="space-y-4">
            {/* Visit Date */}
            <div>
              <label htmlFor="visitDate" className="block text-sm font-medium text-neutral-700 mb-1">
                Visit Date
              </label>
              <div className="relative">
                 {/* Increased z-index for icon */}
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                  <Calendar size={18} className="text-neutral-500" />
                </div>
                <input
                  type="date"
                  id="visitDate"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="input pl-10" // Ensure input class is applied
                  required
                />
              </div>
            </div>

            {/* Buyer Name */}
            <div>
              <label htmlFor="buyerName" className="block text-sm font-medium text-neutral-700 mb-1">
                Buyer Name
              </label>
              <div className="relative">
                 {/* Increased z-index for icon */}
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                  <User size={18} className="text-neutral-500" />
                </div>
                <input
                  type="text"
                  id="buyerName"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="input pl-10" // Ensure input class is applied
                  required
                  placeholder="Enter buyer's full name"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                {/* Increased z-index for icon */}
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                  <Phone size={18} className="text-neutral-500" />
                </div>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input pl-10" // Ensure input class is applied
                  required
                  placeholder="Enter buyer's phone number"
                />
              </div>
            </div>

            {/* Item Selector (react-select) */}
            <div>
              <label htmlFor="itemId" className="block text-sm font-medium text-neutral-700 mb-1">
                Item
              </label>
              <div className="relative">
                {/* Increased z-index for icon */}
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                  <Package size={18} className="text-neutral-500" />
                </div>
                <Select
                  inputId="itemId"
                  options={itemOptions}
                  value={itemOptions.find(option => option.value === itemId)}
                  onChange={(selectedOption) => setItemId(selectedOption?.value || '')}
                  placeholder="Select Item"
                  styles={customStyles}
                  isSearchable
                  required
                  filterOption={customFilter} // Added custom filter
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </div>
            </div>

            {/* Route Selector (react-select) */}
            <div>
              <label htmlFor="routeId" className="block text-sm font-medium text-neutral-700 mb-1">
                Route
              </label>
              <div className="relative">
                {/* Increased z-index for icon */}
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                  <Route size={18} className="text-neutral-500" />
                </div>
                <Select
                  inputId="routeId"
                  options={routeOptions}
                  value={routeOptions.find(option => option.value === routeId)}
                  onChange={(selectedOption) => setRouteId(selectedOption?.value || '')}
                  placeholder="Select Route"
                  styles={customStyles}
                  isSearchable
                  required
                  filterOption={customFilter} // Added custom filter
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </div>
            </div>

            {/* Visit Type */}
            <div>
              <label htmlFor="visitType" className="block text-sm font-medium text-neutral-700 mb-1">
                Visit Type
              </label>
              <div className="relative">
                <select
                  id="visitType"
                  value={visitType}
                  onChange={(e) => setVisitType(e.target.value as 'Delivery' | 'Collection')}
                  className="input pr-10 appearance-none" // Use standard input class
                  required
                >
                  <option value="Sample">Sample</option>
                  <option value="Sittu">Sittu</option>
                  <option value="Over">Over</option>
                </select>
                {/* No z-index needed here as it's part of standard select */}
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown size={18} className="text-neutral-500" />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-neutral-700 mb-1">
                Notes (Optional)
              </label>
              <div className="relative">
                {/* Increased z-index for icon */}
                <div className="absolute top-3 left-3 pointer-events-none z-20">
                  <FileText size={18} className="text-neutral-500" />
                </div>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input pl-10 min-h-[100px]" // Ensure input class & padding
                  placeholder="Add any special instructions or notes"
                />
              </div>
            </div>

            {/* Display Form Error */}
            {formError && (
                <p className="text-error text-sm mt-2">{formError}</p>
            )}

          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-medium mb-4">Location</h2>
          <div className="space-y-4">
            {/* Address Input */}
             <div>
                <label htmlFor="address" className="block text-sm font-medium text-neutral-700 mb-1">
                    Address
                </label>
                <div className="relative">
                    {/* Example Icon (Optional) */}
                    {/* <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                      <MapPin size={18} className="text-neutral-500" />
                    </div> */}
                    <input
                      type="text"
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="input" // Use input class, add pl-10 if using icon
                      placeholder="Enter visit address"
                      required // Address is required
                    />
                 </div>
            </div>

            {/* Get Location Button and Display */}
            <div>
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className="btn btn-secondary w-full"
              >
                {isGettingLocation ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-accent mr-2"></div>
                    Getting coordinates...
                  </>
                ) : location ? (
                  <>
                    <MapPin size={18} className="mr-2 text-accent" />
                    Update Geo-Coordinates
                  </>
                ) : (
                  <>
                    <MapPin size={18} className="mr-2" />
                    Get Current Geo-Coordinates
                  </>
                )}
              </button>

              {/* Display Location Error */}
              {locationError && (
                <p className="text-error text-sm mt-2">{locationError}</p>
              )}

              {/* Display Captured Location */}
              {location && (
                <div className="mt-3 p-3 bg-accent/5 rounded-md border border-accent/20">
                  <p className="text-sm font-medium text-success">Geo-coordinates captured:</p>
                  <p className="text-xs text-neutral-600 mt-1">
                    Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !location || !address} // Disable if no coordinates OR no address
            className="btn btn-primary"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Visit'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VisitFormPage;