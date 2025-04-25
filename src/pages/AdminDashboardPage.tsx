import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  BarChart2, MapPin, Calendar, Filter, Download, User, RefreshCw,
  ChevronDown, ChevronUp, Check, X, Trash2, Edit, Save // Added Edit, Save
} from 'lucide-react';
import { Visit, User as UserType } from '../types';
import { supabase } from '../supabaseClient';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';

const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth(); // Assuming user might be needed later, keep it for now
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string, end: string }>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  // NOTE: Removed statusFilter, typeFilter, refFilter as they weren't used in the Filter UI of Snippet 1.
  // If they are needed, they should be added back to the filter UI section.
  // const [statusFilter, setStatusFilter] = useState<string>('all');
  // const [typeFilter, setTypeFilter] = useState<string>('all');
  // const [refFilter, setRefFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [users, setUsers] = useState<UserType[]>([]);
  const [refs, setRefs] = useState<UserType[]>([]);
  const [isDeletingRef, setIsDeletingRef] = useState<string | null>(null); // Renamed for clarity

  // --- State from Snippet 2 ---
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [editedVisitData, setEditedVisitData] = useState<Partial<Visit> | null>(null);
  // ---------------------------

  // This week range for stats and default filter range
  const todayDate = new Date();
  const thisWeekStart = startOfWeek(todayDate).toISOString().split('T')[0];
  const thisWeekEnd = endOfWeek(todayDate).toISOString().split('T')[0];
  const todayString = todayDate.toISOString().split('T')[0];

  // --- Effects ---
  useEffect(() => {
    // Set initial date range to today on load
    setDateRange({ start: todayString, end: todayString });

    const fetchVisits = async () => {
      setIsLoading(true); // Start loading
      try {
        const { data, error } = await supabase
          .from('visits')
          .select('*')
          .order('date', { ascending: false }); // Default sort by date desc initially

        if (error) throw error;
        setVisits(data || []);
        // Initial sort state matches fetched order
        setSortField('date');
        setSortDirection('desc');

      } catch (error) {
        console.error('Error fetching visits:', error);
        alert('Failed to fetch visits.');
      } finally {
        // Don't set isLoading false here yet, wait for users too
      }
    };

    const fetchUsers = async () => {
       // No need to set isLoading true again
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*');

        if (error) throw error;

        setUsers(data || []);
        setRefs((data || []).filter(user => user.role === 'Ref'));
      } catch (error) {
        console.error('Error fetching users:', error);
        alert('Failed to fetch users.');
      } finally {
        setIsLoading(false); // Set loading false after both fetches attempt
      }
    };

    fetchVisits();
    fetchUsers();
  }, []); // Run only on mount

  // --- Derived State: Filtered and Sorted Visits ---
  const filteredVisits = visits.filter(visit => {
    // Date range filter
    const visitDate = visit.date.split('T')[0]; // Compare only date part
    const isInDateRange = visitDate >= dateRange.start && visitDate <= dateRange.end;

    // Add back other filters if UI elements are re-added
    // const matchesStatus = statusFilter === 'all' || visit.status === statusFilter;
    // const matchesType = typeFilter === 'all' || visit.type === typeFilter;
    // const matchesRef = refFilter === 'all' || visit.ref_id === refFilter;

    // return isInDateRange && matchesStatus && matchesType && matchesRef;
     return isInDateRange; // Only date filter is active based on Snippet 1 UI

  }).sort((a, b) => {
    const fieldA = a[sortField as keyof Visit];
    const fieldB = b[sortField as keyof Visit];

    // Basic comparison, adjust if complex types are needed
    let comparison = 0;
    if (fieldA > fieldB) {
      comparison = 1;
    } else if (fieldA < fieldB) {
      comparison = -1;
    }

    return sortDirection === 'asc' ? comparison : comparison * -1;
  });

  // --- Statistics Calculation ---
  const stats = {
    today: visits.filter(v => v.date.split('T')[0] === todayString).length,
    thisWeek: visits.filter(v => {
      const visitDate = v.date.split('T')[0];
      return visitDate >= thisWeekStart && visitDate <= thisWeekEnd;
    }).length,
    completed: visits.filter(v => v.status === 'Completed').length,
    pending: visits.filter(v => v.status === 'Pending').length,
    total: visits.length,
  };

  const completionRate = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  // --- Event Handlers ---

  // Sorting Handler
  const handleSort = (field: keyof Visit) => {
    const newDirection = (sortField === field && sortDirection === 'asc') ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
  };

  // CSV Export Placeholder
  const exportCSV = () => {
    alert('CSV Export functionality not implemented yet.');
    // Implementation would involve formatting `filteredVisits` and creating a downloadable file.
  };

  // Date Range Shortcuts
  const setThisWeekRange = () => setDateRange({ start: thisWeekStart, end: thisWeekEnd });
  const setTodayRange = () => setDateRange({ start: todayString, end: todayString });

  // Filter Reset
  const resetFilters = () => {
    setDateRange({ start: todayString, end: todayString });
    // Reset other filters if they are added back
    // setStatusFilter('all');
    // setTypeFilter('all');
    // setRefFilter('all');
    // Optionally reset sort?
    // setSortField('date');
    // setSortDirection('desc');
  };

  // Date Formatting
  const formatDateDisplay = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      // Ensure we handle potential 'T' separator or just date string
      const datePart = dateString.split('T')[0];
      return format(parseISO(datePart), 'MMM d, yyyy');
    } catch (e) {
      console.warn("Failed to parse date:", dateString, e);
      return dateString; // Return original if parsing fails
    }
  };

  // Ref Deletion
  const handleDeleteRef = async (refId: string) => {
    if (!window.confirm('Are you sure you want to delete this Ref user? This action cannot be undone.')) return;

    setIsDeletingRef(refId);
    try {
      // Check if Ref is assigned to any visits (optional but good practice)
      const { data: assignedVisits, error: checkError } = await supabase
        .from('visits')
        .select('id')
        .eq('ref_id', refId)
        .limit(1);

      if (checkError) throw checkError;

      if (assignedVisits && assignedVisits.length > 0) {
         alert('Cannot delete Ref. They are still assigned to one or more visits. Please reassign visits first.');
         setIsDeletingRef(null);
         return;
      }

      // Proceed with deletion
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', refId);

      if (deleteError) throw deleteError;

      setRefs(prevRefs => prevRefs.filter(ref => ref.id !== refId));
      setUsers(prevUsers => prevUsers.filter(user => user.id !== refId)); // Also remove from general users list
      alert('Ref deleted successfully.');

    } catch (error: any) {
      console.error('Error deleting ref:', error);
      alert(`Failed to delete ref: ${error.message || 'Please try again.'}`);
    } finally {
      setIsDeletingRef(null);
    }
  };

  // --- Visit Edit/Delete Handlers (from Snippet 2) ---
  const handleEditClick = (visit: Visit) => {
    // Ensure location is handled correctly if it's part of the editable data
     const visitDataToEdit = { ...visit };
     // If location needs specific handling (e.g., separate lat/lng inputs), adjust here.
     // For now, assume it's not directly editable in this inline form or handled elsewhere.
     // delete visitDataToEdit.location; // Example: Remove location if not editable here

    setEditingVisitId(visit.id);
    setEditedVisitData(visitDataToEdit);
  };

  const handleSaveVisit = async () => {
    if (!editingVisitId || !editedVisitData) return;

    // Exclude fields that might not be directly updatable this way (like id, maybe location)
    const { id, location, ...updateData } = editedVisitData;

    // Basic validation (optional, but recommended)
    if (!updateData.buyer_name?.trim()) return alert("Buyer name cannot be empty.");
    if (!updateData.phone?.trim()) return alert("Phone number cannot be empty.");
    // Add more validation as needed

    setIsLoading(true); // Indicate saving activity
    try {
      const { data, error } = await supabase
        .from('visits')
        .update(updateData as Partial<Visit>) // Cast might be needed depending on exact types
        .eq('id', editingVisitId)
        .select() // Select the updated row
        .single(); // Expect only one row back

      if (error) throw error;

      // Update local state with the *actual* data returned from DB
      setVisits(prevVisits =>
        prevVisits.map(v => (v.id === editingVisitId ? data : v))
      );

      // Reset editing state
      setEditingVisitId(null);
      setEditedVisitData(null);

    } catch (error: any) {
      console.error('Error updating visit:', error);
      alert(`Failed to update visit: ${error.message || 'Please try again.'}`);
    } finally {
       setIsLoading(false); // Stop indicating activity
    }
  };

  const handleDeleteVisit = async (visitId: string) => {
    if (!window.confirm('Are you sure you want to delete this visit record?')) return;

    setIsLoading(true); // Indicate deleting activity
    try {
      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('id', visitId);

      if (error) throw error;

      // Remove from local state
      setVisits(prevVisits => prevVisits.filter(v => v.id !== visitId));
      // If the deleted visit was being edited, reset edit state
      if (editingVisitId === visitId) {
         setEditingVisitId(null);
         setEditedVisitData(null);
      }
      alert('Visit deleted successfully.');

    } catch (error: any) {
      console.error('Error deleting visit:', error);
      alert(`Failed to delete visit: ${error.message || 'Please try again.'}`);
    } finally {
       setIsLoading(false); // Stop indicating activity
    }
  };

  // --- Row Rendering Function (from Snippet 2, adapted) ---
  const renderVisitRow = (visit: Visit) => {
    const isEditing = editingVisitId === visit.id;
    // Use editedVisitData if editing, otherwise the original visit data
    const currentData = isEditing ? editedVisitData : visit;
    const refUser = users.find(u => u.id === currentData?.ref_id);

    return (
      <tr key={visit.id} className={`border-b border-neutral-200 ${isEditing ? 'bg-accent/5' : 'hover:bg-neutral-50'}`}>
        {/* Date (Not Editable Inline) */}
        <td className="px-4 py-2 align-top">
          {formatDateDisplay(visit.date)}
        </td>

        {/* Buyer Name */}
        <td className="px-4 py-2 align-top">
          {isEditing ? (
            <input
              type="text"
              value={currentData?.buyer_name || ''}
              onChange={(e) => setEditedVisitData(prev => ({ ...prev, buyer_name: e.target.value }))}
              className="input input-bordered input-sm w-full max-w-xs" // Added Tailwind/DaisyUI classes
              placeholder="Buyer Name"
            />
          ) : (
            <span className="font-medium">{visit.buyer_name}</span>
          )}
        </td>

        {/* Phone */}
        <td className="px-4 py-2 align-top">
          {isEditing ? (
            <input
              type="tel" // Use tel type for phone numbers
              value={currentData?.phone || ''}
              onChange={(e) => setEditedVisitData(prev => ({ ...prev, phone: e.target.value }))}
              className="input input-bordered input-sm w-full max-w-xs"
              placeholder="Phone Number"
            />
          ) : (
            visit.phone
          )}
        </td>

        {/* Type */}
        <td className="px-4 py-2 align-top">
          {isEditing ? (
            <select
              value={currentData?.type || ''}
              onChange={(e) => setEditedVisitData(prev => ({ ...prev, type: e.target.value }))}
              className="select select-bordered select-sm w-full max-w-xs" // Added Tailwind/DaisyUI classes
            >
              <option value="" disabled>Select Type</option>
              <option value="Delivery">Delivery</option>
              <option value="Collection">Collection</option>
              {/* Add other valid types if necessary */}
            </select>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
              {visit.type}
            </span>
          )}
        </td>

        {/* Reference */}
        <td className="px-4 py-2 align-top">
          {isEditing ? (
            <select
              value={currentData?.ref_id || ''}
              onChange={(e) => setEditedVisitData(prev => ({ ...prev, ref_id: e.target.value || null }))} // Handle empty selection as null
              className="select select-bordered select-sm w-full max-w-xs"
            >
              <option value="">None</option> {/* Allow unassigning */}
              {refs.map(ref => (
                <option key={ref.id} value={ref.id}>
                  {ref.first_name} {ref.last_name}
                </option>
              ))}
            </select>
          ) : (
             // Find ref name from the original visit data, not potentially edited data
            users.find(u => u.id === visit.ref_id)?.first_name + ' ' +
            users.find(u => u.id === visit.ref_id)?.last_name || <span className="text-neutral-500">None</span>
          )}
        </td>

        {/* Status */}
        <td className="px-4 py-2 align-top">
          {isEditing ? (
            <select
              value={currentData?.status || ''}
              onChange={(e) => setEditedVisitData(prev => ({ ...prev, status: e.target.value }))}
              className="select select-bordered select-sm w-full max-w-xs"
            >
               <option value="" disabled>Select Status</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
               {/* Add other valid statuses if necessary */}
            </select>
          ) : (
            <span
              className={`inline-flex items-center text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                visit.status === 'Completed'
                  ? 'bg-success/10 text-success'
                  : visit.status === 'Pending'
                    ? 'bg-warning/10 text-warning'
                    : visit.status === 'Cancelled'
                      ? 'bg-error/10 text-error'
                      : 'bg-neutral-100 text-neutral-600' // Default/fallback style
              }`}
            >
              {visit.status === 'Completed' && <Check size={12} className="mr-1 flex-shrink-0" />}
              {visit.status === 'Cancelled' && <X size={12} className="mr-1 flex-shrink-0" />}
              {visit.status || 'Unknown'} {/* Handle potentially null/empty status */}
            </span>
          )}
        </td>

        {/* Actions */}
        <td className="px-4 py-2 align-top">
          <div className="flex items-center space-x-2 whitespace-nowrap">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveVisit}
                  disabled={isLoading} // Disable while saving
                  className="btn btn-xs btn-success btn-outline flex items-center" // DaisyUI button classes
                  title="Save Changes"
                >
                  <Save size={14} className="mr-1" />
                  Save
                </button>
                <button
                  onClick={() => setEditingVisitId(null)} // Cancel edit
                   disabled={isLoading}
                  className="btn btn-xs btn-ghost flex items-center" // DaisyUI button classes
                   title="Cancel Editing"
                >
                  <X size={14} className="mr-1" />
                  Cancel
                </button>
              </>
            ) : (
              <>
               <button
                  onClick={() => handleEditClick(visit)}
                  disabled={editingVisitId !== null} // Disable if another row is being edited
                  className="btn btn-xs btn-ghost text-accent hover:bg-accent/10 flex items-center"
                  title="Edit Visit"
                >
                  <Edit size={14} className="mr-1" />
                  Edit
                </button>
                 <button
                   onClick={() => handleDeleteVisit(visit.id)}
                   disabled={isLoading || editingVisitId !== null} // Disable while loading or editing another row
                   className="btn btn-xs btn-ghost text-error hover:bg-error/10 flex items-center"
                   title="Delete Visit"
                 >
                   <Trash2 size={14} className="mr-1" />
                   Delete
                 </button>
                 <a
                   href={`https://www.google.com/maps/dir/?api=1&destination=${visit.location?.lat},${visit.location?.lng}`}
                   className={`btn btn-xs btn-ghost text-info hover:bg-info/10 flex items-center ${!visit.location?.lat ? 'disabled opacity-50' : ''}`} // Disable if no location
                   target="_blank"
                   rel="noopener noreferrer"
                   title="Open in Google Maps"
                   onClick={(e) => !visit.location?.lat && e.preventDefault()} // Prevent click if disabled
                 >
                   <MapPin size={14} className="mr-1" />
                   Map
                 </a>
              </>
            )}
          </div>
        </td>
      </tr>
    );
  };


  // --- JSX Structure ---
  return (
    <div className="space-y-6 pt-4 pb-16 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900">Admin Dashboard</h1>
        <p className="text-neutral-600 mt-1">
          {format(new Date(), 'EEEE, MMMM do, yyyy')}
        </p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Today's Visits Card */}
        <div className="card bg-white px-4 py-5 shadow-sm border border-neutral-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-info/10 text-info"> {/* Changed color */}
              <MapPin size={24} />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-neutral-500">Today's Visits</h2>
              <p className="text-2xl font-semibold text-neutral-900">{stats.today}</p>
            </div>
          </div>
        </div>
        {/* This Week Card */}
        <div className="card bg-white px-4 py-5 shadow-sm border border-neutral-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-accent/10 text-accent"> {/* Changed color */}
              <Calendar size={24} />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-neutral-500">This Week</h2>
              <p className="text-2xl font-semibold text-neutral-900">{stats.thisWeek}</p>
            </div>
          </div>
        </div>
        {/* Completion Rate Card */}
        <div className="card bg-white px-4 py-5 shadow-sm border border-neutral-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-success/10 text-success">
              <BarChart2 size={24} />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-neutral-500">Completion Rate</h2>
              <p className="text-2xl font-semibold text-neutral-900">{completionRate}%</p>
            </div>
          </div>
        </div>
        {/* Refs Card */}
        <div className="card bg-white px-4 py-5 shadow-sm border border-neutral-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-warning/10 text-warning">
              <User size={24} />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-neutral-500">Active Refs</h2>
              <p className="text-2xl font-semibold text-neutral-900">{refs.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ref Records */}
      <div className="card bg-white p-5 shadow-sm border border-neutral-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-neutral-800">Ref Management</h2>
           {/* Add maybe a button to add new refs here? */}
        </div>
        {isLoading && !refs.length ? ( // Show loading only if refs haven't loaded yet
          <div className="text-center py-10">
            <span className="loading loading-spinner loading-lg text-accent"></span>
            <p className="mt-2 text-neutral-600">Loading refs...</p>
          </div>
        ) : !refs.length ? (
           <p className="text-neutral-600 text-center py-5">No Ref users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm w-full"> {/* DaisyUI table classes */}
              <thead className="bg-neutral-50 text-neutral-700">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {refs.map((ref) => (
                  <tr key={ref.id} className="border-b border-neutral-200 hover:bg-neutral-50">
                    <td className="px-4 py-2">{ref.first_name} {ref.last_name}</td>
                    <td className="px-4 py-2">{ref.email}</td>
                    <td className="px-4 py-2">
                        <span className="badge badge-warning badge-outline">{ref.role}</span> {/* DaisyUI badge */}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleDeleteRef(ref.id)}
                        disabled={isDeletingRef === ref.id || isLoading}
                        className="btn btn-xs btn-ghost text-error hover:bg-error/10 flex items-center"
                        title={`Delete Ref ${ref.first_name}`}
                      >
                        {isDeletingRef === ref.id ? (
                          <>
                            <span className="loading loading-spinner loading-xs mr-2"></span>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 size={14} className="mr-1" />
                            Delete
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Visit Records */}
      <div className="card bg-white p-5 shadow-sm border border-neutral-200">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h2 className="text-lg font-semibold text-neutral-800">Visit Records</h2>
          <div className="flex flex-wrap items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-sm btn-outline btn-secondary" // DaisyUI button classes
            >
              <Filter size={16} className="mr-1" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <button
              onClick={exportCSV}
              className="btn btn-sm btn-outline" // DaisyUI button classes
              disabled // Disable if not implemented
            >
              <Download size={16} className="mr-1" />
              Export CSV
            </button>
          </div>
        </div>

        {/* --- Filters --- */}
        {showFilters && (
          <div className="bg-neutral-50 p-4 rounded-md mb-4 border border-neutral-200 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3 items-end">
              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Date Range
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="input input-bordered input-sm w-full" // DaisyUI classes
                  />
                  <span className="text-neutral-500">to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    min={dateRange.start} // Prevent end date being before start date
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="input input-bordered input-sm w-full" // DaisyUI classes
                  />
                </div>
                <div className="flex space-x-2 mt-2">
                  <button onClick={setTodayRange} className="btn btn-xs btn-outline">Today</button>
                  <button onClick={setThisWeekRange} className="btn btn-xs btn-outline">This Week</button>
                </div>
              </div>

              {/* Add Status, Type, Ref filters here if needed, using similar pattern */}
              {/* Example Status Filter:
              <div>
                <label htmlFor="statusFilter" className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
                <select id="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select select-bordered select-sm w-full">
                  <option value="all">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
               */}

            </div>
            <div className="flex justify-end mt-2">
              <button
                onClick={resetFilters}
                className="btn btn-sm btn-ghost text-accent"
              >
                <RefreshCw size={16} className="mr-1" /> Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* --- Visits Table --- */}
        {isLoading ? (
          <div className="text-center py-10">
             <span className="loading loading-spinner loading-lg text-accent"></span>
            <p className="mt-2 text-neutral-600">Loading visits...</p>
          </div>
        ) : filteredVisits.length > 0 ? (
          <div>
            <p className="text-sm text-neutral-600 mb-3">
              Showing {filteredVisits.length} visit{filteredVisits.length !== 1 ? 's' : ''}
              {visits.length !== filteredVisits.length ? ` (filtered from ${visits.length} total)` : ''}
            </p>
            <div className="overflow-x-auto">
              <table className="table table-sm w-full"> {/* DaisyUI table classes */}
                <thead className="bg-neutral-50 text-neutral-700">
                  <tr>
                    {/* Date Header */}
                    <th className="px-4 py-3 cursor-pointer hover:bg-neutral-100" onClick={() => handleSort('date')}>
                      <div className="flex items-center">
                        Date
                        {sortField === 'date' && (sortDirection === 'asc' ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />)}
                      </div>
                    </th>
                     {/* Buyer Header */}
                     <th className="px-4 py-3 cursor-pointer hover:bg-neutral-100" onClick={() => handleSort('buyer_name')}>
                      <div className="flex items-center">
                        Buyer
                        {sortField === 'buyer_name' && (sortDirection === 'asc' ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />)}
                      </div>
                    </th>
                     {/* Phone Header (Not sortable in this example) */}
                    <th className="px-4 py-3">Phone</th>
                     {/* Type Header (Not sortable) */}
                    <th className="px-4 py-3">Type</th>
                    {/* Ref Header (Not sortable by name easily, maybe by ID) */}
                     <th className="px-4 py-3">Reference</th>
                     {/* Status Header */}
                    <th className="px-4 py-3 cursor-pointer hover:bg-neutral-100" onClick={() => handleSort('status')}>
                      <div className="flex items-center">
                        Status
                        {sortField === 'status' && (sortDirection === 'asc' ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />)}
                      </div>
                    </th>
                    {/* Actions Header */}
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Use the renderVisitRow function */}
                  {filteredVisits.map(visit => renderVisitRow(visit))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // No visits found state
          <div className="text-center py-10 border border-dashed border-neutral-300 rounded-md">
            <Calendar size={48} className="mx-auto text-neutral-400 mb-3" />
            <p className="text-neutral-600 mb-4">
              No visits found matching your current filters.
            </p>
            <button
              onClick={resetFilters}
              className="btn btn-sm btn-primary" // DaisyUI button classes
            >
              <RefreshCw size={16} className="mr-1" />
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
