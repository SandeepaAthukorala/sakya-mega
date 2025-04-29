import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Phone, User, FileText, Check, ChevronDown, Calendar, Route } from 'lucide-react';
import { supabase } from '../supabaseClient';

const VisitFormPage: React.FC = () => {
  const [buyerName, setBuyerName] = useState('');
  const [phone, setPhone] = useState('');
  const [visitType, setVisitType] = useState<'Delivery' | 'Collection'>('Delivery');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [itemId, setItemId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [routes, setRoutes] = useState<{ id: string; name: string; number: number }[]>([]);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [location, setLocation] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [address, setAddress] = useState('');
  
  const { user } = useAuth();
  const navigate = useNavigate();

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    setLocationError('');
    
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
          address: address
        });
        setIsGettingLocation(false);
      },
      (error) => {
        let errorMsg = 'Failed to get location';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'Location access denied. Please enable location services.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'Location information is unavailable.';
          case error.TIMEOUT:
            errorMsg = 'Location request timed out.';
            break;
        }
        
        setLocationError(errorMsg);
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!location) {
      setLocationError('Please get your current location first');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('visits')
        .insert({
          ref_id: user?.id,
          buyer_name: buyerName,
          phone: phone,
          location: location,
          date: new Date(visitDate).toISOString(),
          type: visitType,
          status: 'Pending',
          notes: notes || undefined,
          item_id: itemId || undefined,
          route_id: routeId || undefined,
        })
        .single();

      if (error) {
        console.error('Error saving visit:', error);
        throw error;
      }
      
      setShowSuccess(true);
      setBuyerName('');
      setPhone('');
      setVisitType('Delivery');
      setVisitDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setItemId('');
      setRouteId('');
      setLocation(null);
      setAddress('');
      
      setTimeout(() => {
        navigate('/visits');
      }, 2000);
    } catch (error: any) {
      console.error('Error saving visit:', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    getCurrentLocation();

    const fetchRoutes = async () => {
      try {
        const { data, error } = await supabase
          .from('routes')
          .select('id, name, number')
          .eq('ref_id', user?.id);

        if (error) {
          console.error('Error fetching routes:', error);
        }

        setRoutes(data || []);
      } catch (error) {
        console.error('Error fetching routes:', error);
      }
    };

    if (user) {
      fetchRoutes();
    }
  }, [user]);

  if (showSuccess) {
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
  }

  return (
    <div className="max-w-xl mx-auto py-6 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Record New Visit</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h2 className="text-lg font-medium mb-4">Visit Details</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="visitDate" className="block text-sm font-medium text-neutral-700 mb-1">
                Visit Date
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar size={18} className="text-neutral-500" />
                </div>
                <input
                  type="date"
                  id="visitDate"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="buyerName" className="block text-sm font-medium text-neutral-700 mb-1">
                Buyer Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={18} className="text-neutral-500" />
                </div>
                <input
                  type="text"
                  id="buyerName"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="input pl-10"
                  required
                  placeholder="Enter buyer's full name"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone size={18} className="text-neutral-500" />
                </div>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input pl-10"
                  required
                  placeholder="Enter buyer's phone number"
                />
              </div>
            </div>

            <div>
              <label htmlFor="itemId" className="block text-sm font-medium text-neutral-700 mb-1">
                Item ID (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="itemId"
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  className="input"
                  placeholder="Enter item ID"
                />
              </div>
            </div>

            <div>
              <label htmlFor="routeId" className="block text-sm font-medium text-neutral-700 mb-1">
                Route (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Route size={18} className="text-neutral-500" />
                </div>
                <select
                  id="routeId"
                  value={routeId}
                  onChange={(e) => setRouteId(e.target.value)}
                  className="input pl-10 pr-10 appearance-none"
                >
                  <option value="">Select Route</option>
                  {routes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {`${route.name} ${route.number}`}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown size={18} className="text-neutral-500" />
                </div>
              </div>
            </div>
            
            <div>
              <label htmlFor="visitType" className="block text-sm font-medium text-neutral-700 mb-1">
                Visit Type
              </label>
              <div className="relative">
                <select
                  id="visitType"
                  value={visitType}
                  onChange={(e) => setVisitType(e.target.value as 'Delivery' | 'Collection')}
                  className="input pr-10 appearance-none"
                  required
                >
                  <option value="Delivery">Delivery</option>
                  <option value="Collection">Collection</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown size={18} className="text-neutral-500" />
                </div>
              </div>
            </div>
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-neutral-700 mb-1">
                Notes (Optional)
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <FileText size={18} className="text-neutral-500" />
                </div>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input pl-10 min-h-[100px]"
                  placeholder="Add any special instructions or notes"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <h2 className="text-lg font-medium mb-4">Location</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-neutral-700 mb-1">
                Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="input"
                  placeholder="Enter address"
                />
              </div>
            </div>
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
                    Getting location...
                  </>
                ) : location ? (
                  <>
                    <MapPin size={18} className="mr-2 text-accent" />
                    Update location
                  </>
                ) : (
                  <>
                    <MapPin size={18} className="mr-2" />
                    Get current location
                  </>
                )}
              </button>
              
              {locationError && (
                <p className="text-error text-sm mt-2">{locationError}</p>
              )}
              
              {location && (
                <div className="mt-3 p-3 bg-accent/5 rounded-md border border-accent/20">
                  <p className="text-sm font-medium">Location captured:</p>
                  <p className="text-xs text-neutral-600 mt-1">
                    Address: {location.address}
                  </p>
                  <p className="text-xs text-neutral-600 mt-1">
                    Latitude: {location.lat.toFixed(6)}, Longitude: {location.lng.toFixed(6)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting || !location}
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
