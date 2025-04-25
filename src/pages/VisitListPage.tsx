import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Filter, MapPin, ChevronRight, Map, Check, X, Calendar, ArrowDownAZ, Trash2, User, Phone, Edit, Save, XCircle } from 'lucide-react';
import { Visit } from '../types';
import { supabase } from '../supabaseClient';
import { format, parseISO } from 'date-fns';

// Helper function for consistent status styling (Unchanged)
const getStatusClasses = (status: string) => {
  switch (status) {
    case 'Completed':
      return 'bg-success/10 text-success border-success';
    case 'Pending':
      return 'bg-warning/10 text-warning border-warning';
    case 'Cancelled':
      return 'bg-error/10 text-error border-error';
    default:
      return 'bg-neutral-100 text-neutral-700 border-neutral-300';
  }
};

const VisitListPage: React.FC = () => {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
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

  // --- Fetching Logic (Unchanged) ---
  useEffect(() => {
    const fetchVisits = async () => {
      setIsLoading(true);
      setIsProcessing(false);
      try {
        const { data, error } = await supabase
          .from('visits')
          .select('*')
          .eq('ref_id', user?.id)
          .order('date', { ascending: true });

        if (error) throw error;

        const mappedData = (data || []).map(visit => ({
          ...visit,
          buyerName: visit.buyer_name || visit.buyerName
        }));

        setVisits(mappedData);
        setFilteredVisits(mappedData);
      } catch (error) {
        console.error('Failed to fetch visits:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchVisits();
    }
  }, [user]);

  // --- Filtering Logic (Unchanged) ---
  useEffect(() => {
    let result = [...visits];
    if (statusFilter !== 'all') {
      result = result.filter(visit => visit.status === statusFilter);
    }
    if (typeFilter !== 'all') {
      result = result.filter(visit => visit.type === typeFilter);
    }
    setFilteredVisits(result);
  }, [visits, statusFilter, typeFilter]);

  // --- Helper Functions (Unchanged, except trim in saveVisit) ---
  const clearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setShowFilters(false);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM d, yyyy');
    } catch { return dateString; }
  };

  const deleteVisit = async (visitId: string) => {
     if (window.confirm('Are you sure you want to delete this visit?')) {
      setIsProcessing(true);
      try {
        const { error } = await supabase.from('visits').delete().eq('id', visitId);
        if (error) throw error;
        setVisits(visits.filter(visit => visit.id !== visitId));
      } catch (error) { console.error('Error deleting visit:', error); }
      finally { setIsProcessing(false); }
    }
  };

  const saveVisit = async (visitId: string) => {
    setIsProcessing(true);
    try {
      const updateData = {
        type: editedVisit.type,
        status: editedVisit.status,
        buyer_name: editedVisit.buyer_name.trim() || null, // Trim input
        phone: editedVisit.phone.trim() || null,       // Trim input
        notes: editedVisit.notes?.trim() || null,      // Trim input
      };
      const { data, error } = await supabase.from('visits').update(updateData).eq('id', visitId).select().single();
      if (error) throw error;
      setVisits(visits.map(v => (v.id === visitId ? { ...v, ...data } : v)));
      setEditingVisitId(null);
    } catch (error) { console.error('Error updating visit:', error); }
    finally { setIsProcessing(false); }
  };

  const startEditing = (visit: Visit) => {
    setEditingVisitId(visit.id);
    setEditedVisit({
      type: visit.type,
      status: visit.status,
      buyer_name: visit.buyer_name || '',
      phone: visit.phone || '',
      notes: visit.notes || '',
    });
  };

  const cancelEditing = () => { setEditingVisitId(null); };

  // --- Component Rendering ---
  return (
    <div className="px-4 space-y-6 pt-4 pb-16 animate-fade-in">
      <header className="flex flex-wrap gap-2 justify-between items-center">
        <h1 className="text-2xl font-bold text-neutral-900">Visits</h1>
        <Link to="/visits/new" className="btn btn-primary btn-sm sm:btn-md">
          <Plus size={18} className="mr-1" /> New Visit
        </Link>
      </header>

      {/* Filters Section (Unchanged) */}
      <div className="space-y-3">
         <div className="flex flex-wrap gap-2 justify-between items-center">
           <button onClick={() => setShowFilters(!showFilters)} className="btn btn-secondary btn-sm py-1 px-3">
             <Filter size={16} className="mr-1" /> {showFilters ? 'Hide Filters' : 'Show Filters'}
           </button>
           {(statusFilter !== 'all' || typeFilter !== 'all') && ( <button onClick={clearFilters} className="text-sm text-accent hover:underline"> Clear Filters </button> )}
         </div>
         {showFilters && ( <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200 animate-fade-in"> <div> <label htmlFor="statusFilter" className="block text-sm font-medium text-neutral-700 mb-1"> Status </label> <select id="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-full"> <option value="all">All Statuses</option> <option value="Pending">Pending</option> <option value="Completed">Completed</option> <option value="Cancelled">Cancelled</option> </select> </div> <div> <label htmlFor="typeFilter" className="block text-sm font-medium text-neutral-700 mb-1"> Type </label> <select id="typeFilter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input w-full"> <option value="all">All Types</option> <option value="Delivery">Delivery</option> <option value="Collection">Collection</option> </select> </div> </div> )}
      </div>

      {/* Visit List Section */}
      <div>
        <div className="flex flex-wrap gap-2 justify-between items-center mb-3">
          <p className="text-sm text-neutral-600">{filteredVisits.length} visit{filteredVisits.length !== 1 ? 's' : ''} found</p>
          <Link to="/map" className="btn btn-outline btn-sm py-1 px-3"> <Map size={16} className="mr-1" /> View on Map </Link>
        </div>

        {isLoading ? (
           <div className="text-center py-10"> <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent mx-auto"></div> <p className="mt-2 text-neutral-600">Loading visits...</p> </div>
        ) : (
          filteredVisits.length > 0 ? (
            <div className="space-y-4">
              {filteredVisits.map((visit) => {
                const isEditing = editingVisitId === visit.id;
                const [statusBgColor, statusTextColor, statusBorderColor] = getStatusClasses(isEditing ? editedVisit.status : visit.status).split(' ');
                const cardBorderClass = `border-${statusBorderColor.split('-')[1]}`;

                return (
                  <div
                    key={visit.id}
                    className={`card bg-white shadow-sm rounded-lg overflow-hidden border-l-4 ${cardBorderClass} p-4 ${isProcessing && (isEditing || editingVisitId === visit.id) ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-4">

                      {/* Left side: Visit details */}
                      {/* Adjusted spacing inside for edit mode */}
                      <div className={`flex-grow space-y-3`}> {/* Increased space-y */}

                        {/* --- Buyer Name and Type --- */}
                        {isEditing ? (
                          <div className="space-y-2"> {/* Stack Name/Type vertically in edit mode */}
                            {/* Editing Buyer Name */}
                            <div className="flex items-center gap-2"> {/* Consistent icon alignment */}
                                <User size={16} className="text-neutral-400 flex-shrink-0" />
                                <input
                                    type="text"
                                    value={editedVisit.buyer_name}
                                    onChange={(e) => setEditedVisit({ ...editedVisit, buyer_name: e.target.value })}
                                    placeholder="Buyer Name"
                                    className="input input-bordered input-sm flex-grow w-full" // Use input-sm, bordered, w-full
                                />
                            </div>
                            {/* Editing Type */}
                             <select
                                value={editedVisit.type}
                                onChange={(e) => setEditedVisit({ ...editedVisit, type: e.target.value })}
                                className="select select-bordered select-sm text-xs uppercase w-full" // Use select-sm, bordered, w-full
                              >
                                <option value="Delivery">Delivery</option>
                                <option value="Collection">Collection</option>
                              </select>
                          </div>
                        ) : (
                          // Display Buyer Name and Type (Flex wrap for responsiveness)
                          <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
                            <h3 className="font-semibold flex items-center text-base mr-2">
                              <User size={16} className="mr-1.5 text-neutral-500 flex-shrink-0" />
                              {visit.buyer_name || 'N/A'}
                            </h3>
                            <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-medium">
                              {visit.type}
                            </span>
                          </div>
                        )}

                        {/* --- Phone --- */}
                        <div className="flex items-center gap-2 text-sm text-neutral-700"> {/* Consistent icon alignment */}
                           <Phone size={14} className="mr-0 flex-shrink-0 text-neutral-500" /> {/* Remove icon margin, use gap */}
                           {isEditing ? (
                             <input
                               type="tel"
                               value={editedVisit.phone}
                               onChange={(e) => setEditedVisit({ ...editedVisit, phone: e.target.value })}
                               placeholder="Phone Number"
                               className="input input-bordered input-sm flex-grow w-full" // Use input-sm, bordered, w-full
                              />
                           ) : (
                             <span>{visit.phone || <span className="text-neutral-400 italic">No phone</span>}</span>
                           )}
                         </div>

                        {/* --- Address (Display only) --- */}
                        <p className="text-sm text-neutral-700 flex items-start gap-2"> {/* Consistent icon alignment */}
                          <MapPin size={14} className="mr-0 flex-shrink-0 mt-0.5 text-neutral-500" /> {/* Remove icon margin, use gap */}
                          <span className="break-words">{visit.location.address || <span className="text-neutral-400 italic">No address</span>}</span>
                        </p>

                        {/* --- Date (Display only) --- */}
                        <div className="flex items-center gap-2 text-sm text-neutral-700"> {/* Consistent icon alignment */}
                          <Calendar size={14} className="mr-0 flex-shrink-0 text-neutral-500" /> {/* Remove icon margin, use gap */}
                          {formatDate(visit.date)}
                        </div>

                        {/* --- Notes --- */}
                         <div className="flex items-start gap-2 text-sm text-neutral-700"> {/* Consistent icon alignment */}
                           <ArrowDownAZ size={14} className="mr-0 flex-shrink-0 mt-0.5 text-neutral-500" /> {/* Remove icon margin, use gap */}
                           {isEditing ? (
                             <textarea
                               value={editedVisit.notes || ''}
                               onChange={(e) => setEditedVisit({ ...editedVisit, notes: e.target.value })}
                               placeholder="Notes"
                               className="textarea textarea-bordered textarea-sm flex-grow min-h-[60px] w-full" // Use textarea-sm, bordered, w-full
                               rows={3} // Adjust rows if needed
                              />
                           ) : (
                             <span className="whitespace-pre-wrap break-words">{visit.notes || <span className="text-neutral-400 italic">No notes</span>}</span>
                           )}
                         </div>
                      </div>

                      {/* Right side: Actions and Status */}
                      <div className="flex flex-col items-start sm:items-end justify-between flex-shrink-0 gap-3"> {/* Increased gap */}

                        {/* Status Badge / Select */}
                        <div className="order-first sm:order-none w-full sm:w-auto">
                          {isEditing ? (
                            <select
                              value={editedVisit.status}
                              onChange={(e) => setEditedVisit({ ...editedVisit, status: e.target.value })}
                              // Apply dynamic text/bg, use select-sm, bordered, w-full
                              className={`select select-bordered select-sm text-xs font-medium w-full sm:w-auto ${statusBgColor.replace('/10', '/20')} ${statusTextColor}`} // Slightly stronger BG in edit
                            >
                              <option value="Pending">Pending</option>
                              <option value="Completed">Completed</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          ) : (
                            // Display Status Badge
                            <span className={`flex items-center justify-center sm:justify-start text-xs px-2.5 py-1 rounded-full font-medium ${statusBgColor} ${statusTextColor}`}>
                              {visit.status === 'Completed' && <Check size={12} className="mr-1" />}
                              {visit.status === 'Cancelled' && <X size={12} className="mr-1" />}
                              {visit.status}
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {isEditing ? (
                            <>
                              <button onClick={() => saveVisit(visit.id)} className="btn btn-success btn-sm btn-square" title="Save changes" disabled={isProcessing}> <Save size={16} /> </button>
                              <button onClick={cancelEditing} className="btn btn-ghost btn-sm btn-square text-neutral-500 hover:text-error" title="Cancel edit" disabled={isProcessing}> <XCircle size={16} /> </button>
                            </>
                          ) : (
                            <button onClick={() => startEditing(visit)} className="btn btn-ghost btn-sm btn-square text-neutral-500 hover:text-accent" title="Edit visit" disabled={isProcessing || !!editingVisitId}> <Edit size={16} /> </button>
                          )}
                          <button onClick={() => deleteVisit(visit.id)} className="btn btn-ghost btn-sm btn-square text-neutral-500 hover:text-error" title="Delete visit" disabled={isProcessing || isEditing}> <Trash2 size={16} /> </button>
                        </div>

                        {/* Navigation Link */}
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${visit.location.lat},${visit.location.lng}`} className="btn btn-link btn-sm text-accent p-0 h-auto min-h-0 mt-1 sm:mt-0 self-start sm:self-end flex items-center hover:underline" target="_blank" rel="noopener noreferrer">
                          <MapPin size={14} className="mr-1" /> Navigate
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
             // Empty State Card (Unchanged)
            <div className="card bg-white shadow-sm rounded-lg p-6 text-center"> <p className="text-neutral-600 mb-4"> {statusFilter === 'all' && typeFilter === 'all' ? 'No visits scheduled yet.' : 'No visits found matching your filters.'} </p> {(statusFilter !== 'all' || typeFilter !== 'all') ? ( <button onClick={clearFilters} className="btn btn-outline btn-sm mx-auto"> Clear Filters </button> ) : ( <Link to="/visits/new" className="btn btn-primary btn-sm mx-auto"> <Plus size={16} className="mr-1" /> Add First Visit </Link> )} </div>
          )
        )}
      </div>
    </div>
  );
};

export default VisitListPage;