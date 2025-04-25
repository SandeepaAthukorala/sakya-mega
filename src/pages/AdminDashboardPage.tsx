import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    BarChart2, MapPin, Calendar, Filter, User, RefreshCw,
    ChevronDown, ChevronUp, Check, X, Trash2, Edit, Save
} from 'lucide-react';
import { Visit, User as UserType } from '../types';
import { supabase } from '../supabaseClient';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';

const AdminDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const [visits, setVisits] = useState<Visit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [showAllDates, setShowAllDates] = useState(false); // State for 'Show All' date filter
    const [dateRange, setDateRange] = useState<{ start: string, end: string }>({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
    });
    const [filterStatus, setFilterStatus] = useState<string>(''); // State for status filter ('', 'Pending', 'Completed', 'Cancelled')
    const [filterType, setFilterType] = useState<string>('');     // State for type filter ('', 'Delivery', 'Collection')
    const [sortField, setSortField] = useState<string>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [users, setUsers] = useState<UserType[]>([]);
    const [refs, setRefs] = useState<UserType[]>([]);
    const [isDeletingRef, setIsDeletingRef] = useState<string | null>(null);

    const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
    const [editedVisitData, setEditedVisitData] = useState<Partial<Visit> | null>(null);

    const todayDate = new Date();
    const thisWeekStart = startOfWeek(todayDate).toISOString().split('T')[0];
    const thisWeekEnd = endOfWeek(todayDate).toISOString().split('T')[0];
    const todayString = todayDate.toISOString().split('T')[0];

    useEffect(() => {
        // Set initial date range to today and ensure 'Show All' is off
        setDateRange({ start: todayString, end: todayString });
        setShowAllDates(false);

        const fetchVisits = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('visits')
                    .select('*')
                    .order('date', { ascending: false }); // Fetch sorted initially

                if (error) throw error;
                setVisits(data || []);
                // No need to set sortField/Direction here as it's done in state init
                // and controlled by user interaction later

            } catch (error) {
                console.error('Error fetching visits:', error);
                alert('Failed to fetch visits.');
            } finally {
                 // Delay setting loading false until users are also fetched
                 // setIsLoading(false);
            }
        };

        const fetchUsers = async () => {
             // Don't reset isLoading if visits are still loading
             // setIsLoading(true);
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
                 // Set loading false after both fetches are attempted
                setIsLoading(false);
            }
        };

        fetchVisits();
        fetchUsers();
    }, []); // Run only on mount

    // Calculate filtered visits based on all filters and sorting
    const filteredVisits = visits.filter(visit => {
        // Date Filter Logic
        let dateMatch = true; // Assume match if 'Show All' is true
        if (!showAllDates) {
            const visitDate = visit.date.split('T')[0];
            // Ensure dateRange start/end are valid before comparing
            if (dateRange.start && dateRange.end) {
                dateMatch = visitDate >= dateRange.start && visitDate <= dateRange.end;
            } else {
                // If range is invalid but showAllDates is false, treat as no match?
                // Or default to today? Let's assume it must match a valid range if showAllDates is false.
                // For simplicity, we rely on UI ensuring valid dates or showAllDates=true
                dateMatch = false;
            }
        }

        // Status Filter Logic
        // Match if filterStatus is empty ('All') or matches the visit status
        const statusMatch = !filterStatus || visit.status === filterStatus;

        // Type Filter Logic
        // Match if filterType is empty ('All') or matches the visit type
        const typeMatch = !filterType || visit.type === filterType;

        // Combine all filters
        return dateMatch && statusMatch && typeMatch;

    }).sort((a, b) => {
        const fieldA = a[sortField as keyof Visit];
        const fieldB = b[sortField as keyof Visit];

        // Handle null or undefined values, placing them at the end
        if (fieldA == null && fieldB == null) return 0;
        if (fieldA == null) return 1; // Nulls last
        if (fieldB == null) return -1; // Nulls last

        let comparison = 0;
        if (typeof fieldA === 'string' && typeof fieldB === 'string') {
            comparison = fieldA.localeCompare(fieldB);
        } else {
             if (fieldA > fieldB) comparison = 1;
             else if (fieldA < fieldB) comparison = -1;
        }

        return sortDirection === 'asc' ? comparison : comparison * -1;
    });

    // Stats calculation remains mostly the same, but based on *all* visits
    const stats = {
        today: visits.filter(v => v.date.split('T')[0] === todayString).length,
        thisWeek: visits.filter(v => {
            const visitDate = v.date.split('T')[0];
            return visitDate >= thisWeekStart && visitDate <= thisWeekEnd;
        }).length,
        completed: visits.filter(v => v.status === 'Completed').length,
        pending: visits.filter(v => v.status === 'Pending').length,
        total: visits.length, // Total based on unfiltered visits
    };

    const completionRate = stats.total > 0
        ? Math.round((stats.completed / stats.total) * 100)
        : 0;

    const handleSort = (field: keyof Visit) => {
        const newDirection = (sortField === field && sortDirection === 'asc') ? 'desc' : 'asc';
        setSortField(field);
        setSortDirection(newDirection);
    };

    // Date range button handlers now also manage the showAllDates state
    const setThisWeekRange = () => {
        setDateRange({ start: thisWeekStart, end: thisWeekEnd });
        setShowAllDates(false); // Turn off 'Show All' when selecting a specific range
    };
    const setTodayRange = () => {
        setDateRange({ start: todayString, end: todayString });
        setShowAllDates(false); // Turn off 'Show All' when selecting a specific range
    };
    const setShowAllDatesFilter = () => {
         setShowAllDates(true);
         // Optional: Clear visual date range inputs, though filtering logic ignores them
         // setDateRange({ start: '', end: '' });
    };

    // Reset all filters to their initial states
    const resetFilters = () => {
        setDateRange({ start: todayString, end: todayString }); // Default to today
        setShowAllDates(false); // Turn off show all
        setFilterStatus('');    // Reset status filter
        setFilterType('');      // Reset type filter
        setSortField('date');   // Reset sort
        setSortDirection('desc');
    };

    // --- Utility Functions (formatDateDisplay, etc.) ---
    const formatDateDisplay = (dateString: string | null | undefined): string => {
        if (!dateString) return 'N/A';
        try {
            const datePart = dateString.split('T')[0];
            return format(parseISO(datePart), 'MMM d, yyyy');
        } catch (e) {
            console.warn("Failed to parse date:", dateString, e);
            return dateString; // Return original string if parsing fails
        }
    };

    // --- Handlers (handleDeleteRef, handleEditClick, handleSaveVisit, handleDeleteVisit) ---
    // Keep these handlers as they are, no changes needed for the requested filters/labels

    const handleDeleteRef = async (refId: string) => {
        if (!window.confirm('Are you sure you want to delete this Ref user? This action cannot be undone.')) return;
        setIsDeletingRef(refId);
        try {
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
            const { error: deleteError } = await supabase
                .from('users')
                .delete()
                .eq('id', refId);
            if (deleteError) throw deleteError;
            setRefs(prevRefs => prevRefs.filter(ref => ref.id !== refId));
            setUsers(prevUsers => prevUsers.filter(user => user.id !== refId));
            alert('Ref deleted successfully.');
        } catch (error: any) {
            console.error('Error deleting ref:', error);
            alert(`Failed to delete ref: ${error.message || 'Please try again.'}`);
        } finally {
            setIsDeletingRef(null);
        }
    };

    const handleEditClick = (visit: Visit) => {
        const visitDataToEdit = { ...visit };
        setEditingVisitId(visit.id);
        setEditedVisitData(visitDataToEdit);
    };

    const handleSaveVisit = async () => {
        if (!editingVisitId || !editedVisitData) return;
        const { id, location, ...updateData } = editedVisitData;
        if (!updateData.buyer_name?.trim()) return alert("Buyer name cannot be empty.");
        if (!updateData.phone?.trim()) return alert("Phone number cannot be empty.");
        // Simple validation for required fields during edit
        if (!updateData.status) return alert("Status is required.");
        if (!updateData.type) return alert("Type is required.");

        setIsLoading(true); // Indicate saving process
        try {
            // Ensure ref_id is either a valid UUID string or null
            const finalUpdateData = {
                ...updateData,
                ref_id: updateData.ref_id || null // Ensure empty string becomes null
            };

            const { data, error } = await supabase
                .from('visits')
                .update(finalUpdateData as Partial<Visit>) // Use validated data
                .eq('id', editingVisitId)
                .select()
                .single();

            if (error) throw error;

            setVisits(prevVisits =>
                prevVisits.map(v => (v.id === editingVisitId ? data : v))
            );
            setEditingVisitId(null);
            setEditedVisitData(null);
        } catch (error: any) {
            console.error('Error updating visit:', error);
            alert(`Failed to update visit: ${error.message || 'Please try again.'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteVisit = async (visitId: string) => {
        if (!window.confirm('Are you sure you want to delete this visit record?')) return;
        setIsLoading(true); // Indicate deleting process
        try {
            const { error } = await supabase
                .from('visits')
                .delete()
                .eq('id', visitId);
            if (error) throw error;
            setVisits(prevVisits => prevVisits.filter(v => v.id !== visitId));
            // If the deleted visit was being edited, cancel edit mode
            if (editingVisitId === visitId) {
                setEditingVisitId(null);
                setEditedVisitData(null);
            }
            alert('Visit deleted successfully.');
        } catch (error: any) {
            console.error('Error deleting visit:', error);
            alert(`Failed to delete visit: ${error.message || 'Please try again.'}`);
        } finally {
            setIsLoading(false);
        }
    };


    // --- Visit Row Rendering ---
    // Keep renderVisitRow as is, it handles editing correctly based on state
      const renderVisitRow = (visit: Visit) => {
        const isEditing = editingVisitId === visit.id;
        const currentData = isEditing ? editedVisitData : visit;
        const refUser = users.find(u => u.id === visit.ref_id);

        return (
            <tr key={visit.id} className={`border-b border-neutral-200 ${isEditing ? 'bg-accent/5' : 'hover:bg-neutral-50'} text-sm`}>
                {/* Date */}
                <td className="px-2 py-2 sm:px-4 align-top whitespace-nowrap">
                    {formatDateDisplay(visit.date)}
                </td>
                {/* Buyer Name */}
                <td className="px-2 py-2 sm:px-4 align-top">
                    {isEditing ? (
                        <input
                            type="text"
                            value={currentData?.buyer_name || ''}
                            onChange={(e) => setEditedVisitData(prev => ({ ...prev, buyer_name: e.target.value }))}
                            className="input input-bordered input-xs sm:input-sm w-full"
                            placeholder="Buyer Name"
                            required // Basic HTML validation
                        />
                    ) : (
                        <span className="font-medium">{visit.buyer_name}</span>
                    )}
                </td>
                {/* Phone */}
                <td className="px-2 py-2 sm:px-4 align-top hidden md:table-cell">
                    {isEditing ? (
                        <input
                            type="tel"
                            value={currentData?.phone || ''}
                            onChange={(e) => setEditedVisitData(prev => ({ ...prev, phone: e.target.value }))}
                            className="input input-bordered input-xs sm:input-sm w-full"
                            placeholder="Phone"
                            required // Basic HTML validation
                        />
                    ) : (
                        visit.phone
                    )}
                </td>

                {/* Type */}
                <td className="px-2 py-2 sm:px-4 align-top hidden lg:table-cell">
                    {isEditing ? (
                        <select
                            value={currentData?.type || ''}
                            onChange={(e) => setEditedVisitData(prev => ({ ...prev, type: e.target.value }))}
                            className="select select-bordered select-xs sm:select-sm w-full"
                            required // Basic HTML validation
                        >
                            <option value="" disabled>Select Type</option>
                            <option value="Delivery">Delivery</option>
                            <option value="Collection">Collection</option>
                        </select>
                    ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 whitespace-nowrap">
                            {visit.type}
                        </span>
                    )}
                </td>
                {/* Reference */}
                <td className="px-2 py-2 sm:px-4 align-top hidden lg:table-cell">
                    {isEditing ? (
                        <select
                            value={currentData?.ref_id || ''} // Use '' for 'None' option
                            onChange={(e) => setEditedVisitData(prev => ({ ...prev, ref_id: e.target.value || null }))} // Set null if '' selected
                            className="select select-bordered select-xs sm:select-sm w-full"
                        >
                            <option value="">None</option> {/* Represents null */}
                            {refs.map(ref => (
                                <option key={ref.id} value={ref.id}>
                                    {ref.first_name} {ref.last_name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        refUser ? `${refUser.first_name} ${refUser.last_name}` : <span className="text-neutral-500">None</span>
                    )}
                </td>
                {/* Status */}
                <td className="px-2 py-2 sm:px-4 align-top">
                    {isEditing ? (
                        <select
                            value={currentData?.status || ''}
                            onChange={(e) => setEditedVisitData(prev => ({ ...prev, status: e.target.value }))}
                            className="select select-bordered select-xs sm:select-sm w-full"
                            required // Basic HTML validation
                        >
                            <option value="" disabled>Select Status</option>
                            <option value="Pending">Pending</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    ) : (
                        <span
                            className={`inline-flex items-center text-xs px-2 py-1 rounded-full whitespace-nowrap ${visit.status === 'Completed' ? 'bg-success/10 text-success' : visit.status === 'Pending' ? 'bg-warning/10 text-warning' : visit.status === 'Cancelled' ? 'bg-error/10 text-error' : 'bg-neutral-100 text-neutral-600'}`}
                        >
                            {visit.status === 'Completed' && <Check size={12} className="mr-1 flex-shrink-0" />}
                            {visit.status === 'Cancelled' && <X size={12} className="mr-1 flex-shrink-0" />}
                            {visit.status || 'N/A'}
                        </span>
                    )}
                </td>

                {/* Item */}
                <td className="px-2 py-2 sm:px-4 align-top hidden md:table-cell">
                    {isEditing ? (
                        <input
                            type="text"
                            value={currentData?.item_id || ''}
                            onChange={(e) => setEditedVisitData(prev => ({ ...prev, item_id: e.target.value }))}
                            className="input input-bordered input-xs sm:input-sm w-full"
                            placeholder="Item ID"
                        />
                    ) : (
                        visit.item_id || <span className="text-neutral-400">N/A</span>
                    )}
                </td>
                {/* Actions */}
                <td className="px-2 py-2 sm:px-4 align-top">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-1 space-y-1 sm:space-y-0">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleSaveVisit}
                                    disabled={isLoading} // Disable while loading/saving
                                    className="btn btn-xs btn-success btn-outline flex items-center justify-center sm:justify-start"
                                    title="Save Changes"
                                >
                                    <Save size={14} className="mr-0 sm:mr-1" />
                                    <span className="hidden sm:inline">Save</span>
                                </button>
                                <button
                                    onClick={() => setEditingVisitId(null)}
                                    disabled={isLoading} // Disable while loading/saving
                                    className="btn btn-xs btn-ghost flex items-center justify-center sm:justify-start"
                                    title="Cancel Editing"
                                >
                                    <X size={14} className="mr-0 sm:mr-1" />
                                    <span className="hidden sm:inline">Cancel</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => handleEditClick(visit)}
                                    disabled={editingVisitId !== null || isLoading} // Disable if another row is editing or during load
                                    className="btn btn-xs btn-ghost text-accent hover:bg-accent/10 flex items-center justify-center sm:justify-start"
                                    title="Edit Visit"
                                >
                                    <Edit size={14} className="mr-0 sm:mr-1" />
                                    <span className="hidden sm:inline">Edit</span>
                                </button>
                                <button
                                    onClick={() => handleDeleteVisit(visit.id)}
                                    disabled={isLoading || editingVisitId !== null} // Disable during load or if editing
                                    className="btn btn-xs btn-ghost text-error hover:bg-error/10 flex items-center justify-center sm:justify-start"
                                    title="Delete Visit"
                                >
                                    <Trash2 size={14} className="mr-0 sm:mr-1" />
                                    <span className="hidden sm:inline">Delete</span>
                                </button>
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${visit.location?.lat},${visit.location?.lng}`}
                                    className={`btn btn-xs btn-ghost text-info hover:bg-info/10 flex items-center justify-center sm:justify-start ${!visit.location?.lat ? 'disabled opacity-50 pointer-events-none' : ''}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Open in Google Maps"
                                >
                                    <MapPin size={14} className="mr-0 sm:mr-1" />
                                    <span className="hidden sm:inline">Map</span>
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
        <div className="space-y-4 sm:space-y-6 pt-2 pb-10 sm:pt-4 sm:pb-16 animate-fade-in px-2 sm:px-0">
            <header className="px-2 sm:px-0 mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Admin Dashboard</h1>
                <p className="text-sm sm:text-base text-neutral-600 mt-1">
                    {format(new Date(), 'EEEE, MMM d, yyyy')}
                </p>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 px-0">
                {/* Today's Visits Card - MODIFIED LABEL */}
                <div className="card bg-white p-4 shadow-sm border border-neutral-200">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-info/10 text-info">
                            <MapPin size={20} />
                        </div>
                        <div className="ml-3 sm:ml-4">
                            {/* MODIFIED LABEL HERE */}
                            <h2 className="text-sm font-medium text-neutral-500">Today's Visits</h2>
                            <p className="text-xl sm:text-2xl font-semibold text-neutral-900">{stats.today}</p>
                        </div>
                    </div>
                </div>
                {/* This Week Card */}
                <div className="card bg-white p-4 shadow-sm border border-neutral-200">
                     <div className="flex items-center">
                        <div className="p-3 rounded-full bg-accent/10 text-accent">
                            <Calendar size={20} />
                        </div>
                        <div className="ml-3 sm:ml-4">
                            <h2 className="text-sm font-medium text-neutral-500">This Week</h2>
                            <p className="text-xl sm:text-2xl font-semibold text-neutral-900">{stats.thisWeek}</p>
                        </div>
                    </div>
                </div>
                {/* Completion Rate Card */}
                <div className="card bg-white p-4 shadow-sm border border-neutral-200">
                     <div className="flex items-center">
                        <div className="p-3 rounded-full bg-success/10 text-success">
                            <BarChart2 size={20} />
                        </div>
                        <div className="ml-3 sm:ml-4">
                            <h2 className="text-sm font-medium text-neutral-500">Complete</h2>
                            <p className="text-xl sm:text-2xl font-semibold text-neutral-900">{completionRate}%</p>
                        </div>
                    </div>
                </div>
                {/* Refs Card */}
                <div className="card bg-white p-4 shadow-sm border border-neutral-200">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-warning/10 text-warning">
                            <User size={20} />
                        </div>
                        <div className="ml-3 sm:ml-4">
                            <h2 className="text-sm font-medium text-neutral-500">Refs</h2>
                            <p className="text-xl sm:text-2xl font-semibold text-neutral-900">{refs.length}</p>
                        </div>
                    </div>
                </div>
            </div>

             {/* Ref Records Card */}
             <div className="card bg-white p-3 sm:p-5 shadow-sm border border-neutral-200">
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                    <h2 className="text-base sm:text-lg font-semibold text-neutral-800">Ref Management</h2>
                </div>
                {/* Keep Ref table rendering logic */}
                {isLoading && !refs.length ? (
                    <div className="text-center py-6 sm:py-10">
                        <span className="loading loading-spinner loading-md sm:loading-lg text-accent"></span>
                        <p className="mt-2 text-sm sm:text-base text-neutral-600">Loading refs...</p>
                    </div>
                ) : !refs.length ? (
                    <p className="text-neutral-600 text-center py-3 sm:py-5 text-sm sm:text-base">No Ref users found.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table table-xs sm:table-sm w-full text-sm">
                            <thead className="bg-neutral-50 text-neutral-700 text-xs sm:text-sm">
                                <tr>
                                    <th className="px-2 py-2 sm:px-4 sm:py-3">Name</th>
                                    <th className="px-2 py-2 sm:px-4 sm:py-3 hidden sm:table-cell">Email</th>
                                    <th className="px-2 py-2 sm:px-4 sm:py-3">Role</th>
                                    <th className="px-2 py-2 sm:px-4 sm:py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {refs.map((ref) => (
                                    <tr key={ref.id} className="border-b border-neutral-200 hover:bg-neutral-50">
                                        <td className="px-2 py-2 sm:px-4 whitespace-nowrap">{ref.first_name} {ref.last_name}</td>
                                        <td className="px-2 py-2 sm:px-4 hidden sm:table-cell">{ref.email}</td>
                                        <td className="px-2 py-2 sm:px-4">
                                            <span className="badge badge-warning badge-outline text-xs">{ref.role}</span>
                                        </td>
                                        <td className="px-2 py-2 sm:px-4">
                                            <button
                                                onClick={() => handleDeleteRef(ref.id)}
                                                disabled={isDeletingRef === ref.id || isLoading}
                                                className="btn btn-xs btn-ghost text-error hover:bg-error/10 flex items-center"
                                                title={`Delete Ref ${ref.first_name}`}
                                            >
                                                {isDeletingRef === ref.id ? (
                                                    <>
                                                        <span className="loading loading-spinner loading-xs mr-1 sm:mr-2"></span>
                                                        <span className="hidden sm:inline">Deleting...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Trash2 size={14} className="mr-0 sm:mr-1" />
                                                        <span className="hidden sm:inline">Delete</span>
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


            {/* Visit Records Card */}
            <div className="card bg-white p-3 sm:p-5 shadow-sm border border-neutral-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                    {/* Title reflects filtered results potentially */}
                    <h2 className="text-base sm:text-lg font-semibold text-neutral-800">
                         {showAllDates ? 'All Visit Records' : 'Filtered Visit Records'}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="btn btn-xs sm:btn-sm btn-outline "
                        >
                            <Filter size={14} className="mr-1" />
                            Filters
                            {showFilters ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />}
                        </button>
                    </div>
                </div>

                {/* --- Filters --- MODIFIED SECTION */}
{showFilters && (
  <div className="bg-neutral-50 p-4 rounded-md mb-4 border border-neutral-200 animate-fade-in shadow-sm">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
      
      {/* Date Range Filter */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">Date Range</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="input input-bordered input-sm w-full"
            disabled={showAllDates}
          />
          <span className="text-neutral-500 text-center sm:text-left">to</span>
          <input
            type="date"
            value={dateRange.end}
            min={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="input input-bordered input-sm w-full"
            disabled={showAllDates}
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            onClick={setTodayRange}
            disabled={showAllDates}
            className={`btn btn-xs btn-outline ${
              !showAllDates && dateRange.start === todayString && dateRange.end === todayString ? 'btn-active' : ''
            }`}
          >
            Today
          </button>
          <button
            onClick={setThisWeekRange}
            disabled={showAllDates}
            className={`btn btn-xs btn-outline ${
              !showAllDates && dateRange.start === thisWeekStart && dateRange.end === thisWeekEnd ? 'btn-active' : ''
            }`}
          >
            This Week
          </button>
          <button
            onClick={setShowAllDatesFilter}
            disabled={showAllDates}
            className={`btn btn-xs btn-outline ${showAllDates ? 'btn-active' : ''}`}
          >
            Show All Dates
          </button>
        </div>
      </div>

      {/* Status Filter */}
      <div>
        <label htmlFor="filterStatus" className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
        <select
          id="filterStatus"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="select select-bordered select-sm w-full"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Type Filter */}
      <div>
        <label htmlFor="filterType" className="block text-sm font-medium text-neutral-700 mb-1">Type</label>
        <select
          id="filterType"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="select select-bordered select-sm w-full"
        >
          <option value="">All Types</option>
          <option value="Delivery">Delivery</option>
          <option value="Collection">Collection</option>
        </select>
      </div>
    </div>

    {/* Reset Filters */}
    <div className="flex justify-end mt-2">
      <button
        onClick={resetFilters}
        className="btn btn-xs sm:btn-sm btn-ghost text-accent hover:bg-accent/10"
      >
        <RefreshCw size={14} className="mr-1" /> Reset All Filters
      </button>
    </div>
  </div>
)}


                {/* --- Visits Table --- */}
                {isLoading ? (
                   <div className="text-center py-6 sm:py-10">
                        <span className="loading loading-spinner loading-md sm:loading-lg text-accent"></span>
                        <p className="mt-2 text-sm sm:text-base text-neutral-600">Loading visits...</p>
                    </div>
                ) : filteredVisits.length > 0 ? (
                    <div>
                        <p className="text-xs sm:text-sm text-neutral-600 mb-2 sm:mb-3">
                            Showing {filteredVisits.length} visit{filteredVisits.length !== 1 ? 's' : ''}
                            {/* Updated text to reflect total vs filtered */}
                            {visits.length !== filteredVisits.length
                                ? ` (filtered from ${stats.total} total visits)`
                                : ` (of ${stats.total} total visits)`}
                        </p>
                        <div className="overflow-x-auto border border-neutral-200 rounded-md">
                            <table className="table table-xs sm:table-sm w-full">
                                {/* Table Head with Sorting */}
                                <thead className="bg-neutral-50 text-neutral-700 text-xs sm:text-sm">
                                    <tr>
                                        {/* Date */}
                                        <th className="px-2 py-2 sm:px-4 sm:py-3 cursor-pointer hover:bg-neutral-100 whitespace-nowrap" onClick={() => handleSort('date')}>
                                            <div className="flex items-center">Date {sortField === 'date' && (sortDirection === 'asc' ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />)}</div>
                                        </th>
                                        {/* Buyer */}
                                        <th className="px-2 py-2 sm:px-4 sm:py-3 cursor-pointer hover:bg-neutral-100" onClick={() => handleSort('buyer_name')}>
                                            <div className="flex items-center">Buyer {sortField === 'buyer_name' && (sortDirection === 'asc' ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />)}</div>
                                        </th>
                                        {/* Phone */}
                                        <th className="px-2 py-2 sm:px-4 sm:py-3 hidden md:table-cell">Phone</th>
                                         {/* Type - Sortable */}
                                        <th className="px-2 py-2 sm:px-4 sm:py-3 hidden lg:table-cell cursor-pointer hover:bg-neutral-100" onClick={() => handleSort('type')}>
                                            <div className="flex items-center">Type {sortField === 'type' && (sortDirection === 'asc' ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />)}</div>
                                        </th>
                                        {/* Reference - Sortable? Maybe not needed, depends on use case */}
                                        <th className="px-2 py-2 sm:px-4 sm:py-3 hidden lg:table-cell">Reference</th>
                                         {/* Status - Sortable */}
                                        <th className="px-2 py-2 sm:px-4 sm:py-3 cursor-pointer hover:bg-neutral-100" onClick={() => handleSort('status')}>
                                            <div className="flex items-center">Status {sortField === 'status' && (sortDirection === 'asc' ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />)}</div>
                                        </th>
                                        {/* Item */}
                                        <th className="px-2 py-2 sm:px-4 sm:py-3 hidden md:table-cell">Item</th> {/* Changed from lg to md */}
                                        {/* Actions */}
                                        <th className="px-2 py-2 sm:px-4 sm:py-3">Actions</th>
                                    </tr>
                                </thead>
                                {/* Table Body */}
                                <tbody>
                                    {/* Render rows using the filtered and sorted list */}
                                    {filteredVisits.map(visit => renderVisitRow(visit))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    // No visits found message
                    <div className="text-center py-6 sm:py-10 border border-dashed border-neutral-300 rounded-md">
                        <Calendar size={40} className="mx-auto text-neutral-400 mb-3" />
                        <p className="text-neutral-600 mb-3 sm:mb-4 text-sm sm:text-base">
                            {visits.length === 0 ? "No visits have been recorded yet." : "No visits found matching your current filters."}
                        </p>
                        {/* Show Reset Filters button only if filters are active */}
                        { (showAllDates || filterStatus || filterType || dateRange.start !== todayString || dateRange.end !== todayString || sortField !== 'date' || sortDirection !== 'desc') && visits.length > 0 && (
                            <button
                                onClick={resetFilters}
                                className="btn sm:btn-sm btn-primary btn-outline text-white hover:text-white"
                            >
                                <RefreshCw size={14} className="mr-1" />
                                Reset Filters
                            </button>
                         )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboardPage;