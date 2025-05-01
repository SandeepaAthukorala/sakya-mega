import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Navigation, List, RefreshCw, Calendar, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Visit } from '../types';
import { supabase } from '../supabaseClient';

const MapViewPage: React.FC = () => {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [optimizedPath, setOptimizedPath] = useState<google.maps.Polyline | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  const loadGoogleMapsScript = useCallback(() => {
    setTimeout(() => {
      setMapLoaded(true);

      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }, 1500);
  }, []);

  const initMap = useCallback(() => {
    setMap({} as google.maps.Map);
  }, []);

  const loadVisits = useCallback(() => {
    const fetchVisits = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('visits')
          .select('*')
          .eq('ref_id', user?.id)
          .eq('date', selectedDate);

        if (error) {
          console.error('Error fetching visits:', error);
        }

        setVisits(data || []);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchVisits();
    }
  }, [selectedDate, user]);

  const addMarkersToMap = useCallback(() => {
    setMarkers(new Array(visits.length));
  }, [visits]);

  const optimizeRoute = () => {
    setOptimizing(true);

    setTimeout(() => {
      setOptimizedPath({} as google.maps.Polyline);
      setOptimizing(false);
    }, 2000);
  };

  const openInGoogleMaps = () => {
    if (visits.length === 0) return;

    const waypoints = visits.map(visit => `${visit.location.lat},${visit.location.lng}`).join('|');

    const url = `https://www.google.com/maps/dir/?api=1&destination=${visits[visits.length - 1].location.lat},${visits[visits.length - 1].location.lng}&waypoints=${waypoints}`;

    window.open(url, '_blank');
  };

  useEffect(() => {
    loadGoogleMapsScript();
  }, [loadGoogleMapsScript]);

  useEffect(() => {
    if (mapLoaded) {
      initMap();
    }
  }, [mapLoaded, initMap]);

  useEffect(() => {
    if (mapLoaded) {
      loadVisits();
    }
  }, [selectedDate, mapLoaded, loadVisits]);

  useEffect(() => {
    if (map && visits.length > 0) {
      addMarkersToMap();
    }
  }, [map, visits, addMarkersToMap]);

  return (
    <div className="animate-fade-in pb-16">
      <header className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <Link to="/visits" className="mr-2">
            <ArrowLeft size={20} className="text-neutral-600" />
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900">Route Map</h1>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input py-1 px-2 text-sm"
          />

          <Link to="/visits" className="btn btn-outline py-1 px-3 text-sm">
            <List size={16} className="mr-1" /> List
          </Link>
        </div>
      </header>

      <div className="relative">
        <div
          className="w-full bg-neutral-100 rounded-lg overflow-hidden shadow-md"
          style={{ height: '60vh', minHeight: '400px' }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full bg-neutral-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent mx-auto"></div>
                <p className="mt-4 text-neutral-600">Loading map...</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-neutral-500">Map will be displayed here</p>
              <div className="absolute bottom-4 left-4 right-4 flex justify-between">
                <div className="bg-white p-2 rounded-md shadow-md">
                  <p className="text-sm font-medium">{visits.length} visits planned</p>
                  <p className="text-xs text-neutral-600">
                    {format(new Date(selectedDate), 'EEEE, MMMM do, yyyy')}
                  </p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={optimizeRoute}
                    disabled={optimizing || visits.length === 0}
                    className="btn btn-primary py-1 px-3 text-sm"
                  >
                    {optimizing ? (
                      <>
                        <RefreshCw size={16} className="mr-1 animate-spin" />
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} className="mr-1" />
                        Optimize Route
                      </>
                    )}
                  </button>

                  <button
                    onClick={openInGoogleMaps}
                    disabled={visits.length === 0}
                    className="btn btn-secondary py-1 px-3 text-sm"
                  >
                    <Navigation size={16} className="mr-1" />
                    Navigate
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">
            {visits.length > 0
              ? `${visits.length} Visits on ${format(new Date(selectedDate), 'MMM d, yyyy')}`
              : `No visits on ${format(new Date(selectedDate), 'MMM d, yyyy')}`}
          </h2>

          <Link
            to="/visits/new"
            className="btn btn-primary py-1 px-3 text-sm"
          >
            <Plus size={16} className="mr-1" />
            Add Visit
          </Link>
        </div>

        {visits.length > 0 ? (
          <div className="space-y-3">
            {visits.map((visit, index) => (
              <div
                key={visit.id}
                className={`card border-l-4 ${visit.status === 'Completed'
                  ? 'border-success'
                  : visit.status === 'Pending'
                    ? 'border-warning'
                    : 'border-error'
                  }`}
              >
                <div className="flex justify-between">
                  <div className="flex items-start">
                    <div className="w-8 h-8 flex items-center justify-center bg-accent text-white rounded-full mr-3">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-medium">{visit.buyerName}</h3>
                      <p className="text-sm text-neutral-600">
                        {visit.location.address || 'No address provided'}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        {visit.type} • {visit.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span
                      className={`flex items-center text-xs px-2 py-1 rounded-full ${visit.status === 'Completed'
                        ? 'bg-success/10 text-success'
                        : visit.status === 'Pending'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-error/10 text-error'
                        }`}
                      >
                      {visit.status === 'Completed' && <Check size={12} className="mr-1" />}
                      {visit.status === 'Cancelled' && <X size={12} className="mr-1" />}
                      {visit.status}
                    </span>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${visit.location.lat},${visit.location.lng}`}
                      className="text-accent text-sm mt-2 flex items-center hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Navigation size={14} className="mr-1" /> Navigate
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card py-8 text-center">
            <Calendar size={48} className="mx-auto text-neutral-300 mb-3" />
            <p className="text-neutral-600 mb-4">No visits scheduled for this date</p>
            <Link to="/visits/new" className="btn btn-primary">
              <Plus size={18} className="mr-2" /> Add New Visit
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapViewPage;
