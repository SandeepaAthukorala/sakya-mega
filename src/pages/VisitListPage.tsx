import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Filter, MapPin, ChevronRight, Map, Check, X, Calendar, ArrowDownAZ, Trash2, User, Phone, Edit, Save, XCircle } from 'lucide-react'; // Added Save, XCircle
import { Visit } from '../types';
import { supabase } from '../supabaseClient';
import { format, parseISO } from 'date-fns';

const VisitListPage: React.FC = () => {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Removed searchTerm state
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  // Extended editedVisit state to include buyer_name, phone, and notes
  const [editedVisit, setEditedVisit] = useState<{
    type: string;
    status: string;
    buyer_name: string;
    phone: string;
    notes: string | null;
  }>({
    type: '',
    status: '',
    buyer_name: '',
    phone: '',
    notes: ''
  });

  useEffect(() => {
    const fetchVisits = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('visits')
          .select('*')
          .eq('ref_id', user?.id)
          .order('date', { ascending: true });

        if (error) {
          console.error('Error fetching visits:', error);
          throw error; // Rethrow to potentially show user feedback
        }

        // Ensure consistency: Use buyer_name from data if it exists
        const mappedData = (data || []).map(visit => ({
          ...visit,
          buyerName: visit.buyer_name || visit.buyerName // Prefer buyer_name if available
        }));

        setVisits(mappedData);
        setFilteredVisits(mappedData);
      } catch (error) {
        console.error('Failed to fetch visits:', error);
        // Optionally set an error state here to display to the user
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchVisits();
    }
  }, [user]);

  // Updated useEffect to remove searchTerm dependency and logic
  useEffect(() => {
    let result = [...visits];

    // Removed search term filtering

    if (statusFilter !== 'all') {
      result = result.filter(visit => visit.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter(visit => visit.type === typeFilter);
    }

    setFilteredVisits(result);
  }, [visits, statusFilter, typeFilter]);

  const clearFilters = () => {
    // Removed setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setShowFilters(false);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM d, yyyy');
    } catch {
      return dateString; // Fallback if parsing fails
    }
  };

  const deleteVisit = async (visitId: string) => {
    if (window.confirm('Are you sure you want to delete this visit?')) {
      try {
        setIsLoading(true); // Optional: Indicate loading during delete
        const { error } = await supabase
          .from('visits')
          .delete()
          .eq('id', visitId);

        if (error) {
          console.error('Error deleting visit:', error);
          // Add user feedback (e.g., toast notification)
        } else {
          setVisits(visits.filter(visit => visit.id !== visitId));
          // Optionally show success feedback
        }
      } catch (error) {
        console.error('Error deleting visit:', error);
         // Add user feedback
      } finally {
         setIsLoading(false); // Stop loading indicator
      }
    }
  };

  // Updated saveVisit function to include new fields
  const saveVisit = async (visitId: string) => {
    try {
      setIsLoading(true); // Indicate loading during save
      const updateData = {
        type: editedVisit.type,
        status: editedVisit.status,
        buyer_name: editedVisit.buyer_name,
        phone: editedVisit.phone,
        notes: editedVisit.notes, // Send null if empty string, or adjust based on DB constraints
      };

      const { data, error } = await supabase
        .from('visits')
        .update(updateData)
        .eq('id', visitId)
        .select() // Select the updated row to confirm changes
        .single(); // Expect only one row back


      if (error) throw error;

      // Update local state with the confirmed data from Supabase
      setVisits(visits.map(v => (v.id === visitId ? { ...v, ...data } : v)));
      setEditingVisitId(null); // Exit edit mode
      // Optionally show success feedback
    } catch (error) {
      console.error('Error updating visit:', error);
      // Add user feedback (e.g., toast notification about failure)
    } finally {
      setIsLoading(false); // Stop loading indicator
    }
  };

  const startEditing = (visit: Visit) => {
    setEditingVisitId(visit.id);
    // Populate editedVisit state with current visit data
    setEditedVisit({
      type: visit.type,
      status: visit.status,
      // Use buyer_name consistently, handle potential null/undefined
      buyer_name: visit.buyer_name || '',
      phone: visit.phone || '',
      notes: visit.notes || '',
    });
  };

  const cancelEditing = () => {
    setEditingVisitId(null);
    // Optionally reset editedVisit state if needed, but not strictly necessary
    // setEditedVisit({ type: '', status: '', buyer_name: '', phone: '', notes: '' });
  };


  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-success/10 text-success';
      case 'Pending':
        return 'bg-warning/10 text-warning';
      case 'Cancelled':
        return 'bg-error/10 text-error';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  return (
    <div className="space-y-6 pt-4 pb-16 animate-fade-in">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-neutral-900">Visits</h1>
        <Link to="/visits/new" className="btn btn-primary">
          <Plus size={18} className="mr-1" /> New Visit
        </Link>
      </header>

      <div className="space-y-3">
        {/* Search input removed */}

        <div className="flex justify-between items-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary py-1 px-3 text-sm"
          >
            <Filter size={16} className="mr-1" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>

          {(statusFilter !== 'all' || typeFilter !== 'all') && (
            <button
              onClick={clearFilters}
              className="text-sm text-accent hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-neutral-50 rounded-md border border-neutral-200 animate-fade-in">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Types</option>
                <option value="Delivery">Delivery</option>
                <option value="Collection">Collection</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm text-neutral-600">{filteredVisits.length} visits found</p>
          <Link to="/map" className="btn btn-outline py-1 px-3 text-sm">
            <Map size={16} className="mr-1" /> View on Map
          </Link>
        </div>

        {isLoading && !visits.length ? ( // Show initial loading spinner only if no visits are loaded yet
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent mx-auto"></div>
            <p className="mt-2 text-neutral-600">Loading visits...</p>
          </div>
        ) : filteredVisits.length > 0 ? (
          <div className="space-y-3">
            {filteredVisits.map((visit) => (
              <div
                key={visit.id}
                className={`card border-l-4 relative ${visit.status === 'Completed'
                  ? 'border-success'
                  : visit.status === 'Pending'
                    ? 'border-warning'
                    : 'border-error'
                  } ${isLoading && editingVisitId === visit.id ? 'opacity-50 pointer-events-none' : ''}`} // Dim card while saving/deleting
              >
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  {/* Left side: Visit details */}
                  <div className="flex-grow pr-4 space-y-2 mb-3 sm:mb-0">
                    {/* Buyer Name and Type */}
                    <div className="flex items-center flex-wrap gap-x-2">
                      {editingVisitId === visit.id ? (
                        <div className="flex items-center flex-grow sm:flex-grow-0">
                          <User size={16} className="mr-1 text-neutral-500" />
                          <input
                            type="text"
                            value={editedVisit.buyer_name}
                            onChange={(e) => setEditedVisit({ ...editedVisit, buyer_name: e.target.value })}
                            placeholder="Buyer Name"
                            className="input input-sm flex-grow" // Use input-sm for consistency
                          />
                        </div>
                      ) : (
                        <h3 className="font-medium flex items-center">
                           <User size={16} className="mr-1 text-neutral-500 inline-block" />
                           {visit.buyer_name || 'N/A'}
                        </h3>
                      )}
                       {editingVisitId === visit.id ? (
                        <select
                          value={editedVisit.type}
                          onChange={(e) => setEditedVisit({ ...editedVisit, type: e.target.value })}
                          className="input input-sm text-xs uppercase" // Consistent small input
                        >
                          <option value="Delivery">Delivery</option>
                          <option value="Collection">Collection</option>
                        </select>
                      ) : (
                        <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                          {visit.type}
                        </span>
                      )}
                    </div>

                     {/* Phone */}
                     <div className="flex items-center text-sm text-neutral-600">
                      <Phone size={14} className="mr-1.5 flex-shrink-0 text-neutral-500" />
                      {editingVisitId === visit.id ? (
                        <input
                          type="tel"
                          value={editedVisit.phone}
                          onChange={(e) => setEditedVisit({ ...editedVisit, phone: e.target.value })}
                          placeholder="Phone Number"
                          className="input input-sm flex-grow"
                        />
                      ) : (
                        <span>{visit.phone || 'No phone'}</span>
                      )}
                    </div>

                    {/* Address */}
                    <p className="text-sm text-neutral-600 flex items-start">
                      <MapPin size={14} className="mr-1.5 flex-shrink-0 mt-0.5 text-neutral-500" />
                      <span>{visit.location.address || 'No address provided'}</span>
                    </p>

                    {/* Date */}
                    <div className="flex items-center text-sm text-neutral-600">
                      <Calendar size={14} className="mr-1.5 flex-shrink-0 text-neutral-500" />
                      {formatDate(visit.date)}
                    </div>

                    {/* Notes */}
                    <div className="flex items-start text-sm text-neutral-600">
                       <ArrowDownAZ size={14} className="mr-1.5 flex-shrink-0 mt-0.5 text-neutral-500" />
                      {editingVisitId === visit.id ? (
                        <textarea
                          value={editedVisit.notes || ''}
                          onChange={(e) => setEditedVisit({ ...editedVisit, notes: e.target.value })}
                          placeholder="Notes"
                          className="input input-sm flex-grow min-h-[40px]" // Use textarea with min height
                          rows={2}
                        />
                      ) : (
                        <span className="whitespace-pre-wrap">{visit.notes || 'No notes'}</span> // Preserve line breaks if any
                      )}
                    </div>

                  </div>

                  {/* Right side: Actions and Status */}
                  <div className="flex flex-col items-start sm:items-end sm:flex-shrink-0">
                    {/* Status */}
                     <div className="mb-2">
                       {editingVisitId === visit.id ? (
                        <select
                          value={editedVisit.status}
                          onChange={(e) => setEditedVisit({ ...editedVisit, status: e.target.value })}
                          className={`input input-sm text-xs ${getStatusClasses(editedVisit.status)}`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      ) : (
                        <span
                          className={`flex items-center text-xs px-2 py-1 rounded-full ${getStatusClasses(visit.status)}`}
                        >
                          {visit.status === 'Completed' && <Check size={12} className="mr-1" />}
                          {visit.status === 'Cancelled' && <X size={12} className="mr-1" />}
                          {visit.status}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 mb-2">
                      {editingVisitId === visit.id ? (
                        <>
                          <button
                            onClick={() => saveVisit(visit.id)}
                            className="btn btn-success btn-sm p-1" // Use button classes for consistency
                            title="Save changes"
                            disabled={isLoading} // Disable while loading
                          >
                            <Save size={16} />
                          </button>
                           <button
                            onClick={cancelEditing}
                            className="btn btn-ghost btn-sm p-1 text-neutral-500 hover:text-error" // Use button classes
                            title="Cancel edit"
                            disabled={isLoading}
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEditing(visit)}
                          className="btn btn-ghost btn-sm p-1 text-neutral-500 hover:text-accent" // Use button classes
                          title="Edit visit"
                          disabled={isLoading}
                        >
                          <Edit size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteVisit(visit.id)}
                        className="btn btn-ghost btn-sm p-1 text-neutral-500 hover:text-error" // Use button classes
                        title="Delete visit"
                        disabled={isLoading || editingVisitId === visit.id} // Disable while loading or editing this item
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Navigation Link */}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${visit.location.lat},${visit.location.lng}`}
                      className="text-accent text-sm mt-auto flex items-center hover:underline" // mt-auto pushes it down in flex-col
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MapPin size={14} className="mr-1" /> Navigate
                    </a>

                    {/* Optional: Details Link Chevron - consider if still needed */}
                    {/* <div className="mt-2 flex items-center text-neutral-400 hover:text-accent cursor-pointer">
                       <ChevronRight size={18} />
                    </div> */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card py-8 text-center">
            <p className="text-neutral-600 mb-4">
              {statusFilter === 'all' && typeFilter === 'all'
                ? 'No visits found.'
                : 'No visits found matching your filters.'}
            </p>
            {(statusFilter !== 'all' || typeFilter !== 'all') && (
                <button onClick={clearFilters} className="btn btn-primary">
                Clear All Filters
                </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitListPage;
