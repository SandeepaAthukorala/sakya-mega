import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Select, { createFilter, SingleValue } from 'react-select'; // Import react-select types
import {
    Plus, Filter, MapPin, Check, X, Calendar, ArrowDownAZ, Trash2, User, Phone, Edit, Save, XCircle, Package, AlertTriangle, Search, XSquare, CalendarRange, Route, FileText, ChevronDown // Added Route, FileText, ChevronDown
} from 'lucide-react';
import { Visit } from '../types';
import { supabase } from '../supabaseClient';
import { format, parseISO, isValid, startOfDay, endOfDay } from 'date-fns';

// --- react-select Filter & Styles (can be defined globally or passed) ---
const filterConfig = { ignoreCase: true, matchFrom: 'any' as const, trim: true };
const customFilter = (option: any, rawInput: string) => createFilter(filterConfig)(option, rawInput);
const customSelectStyles = { /* ... copy customStyles from VisitFormPage here ... */
    control: (provided: any, state: any) => ({
        ...provided, minHeight: '42px', paddingLeft: '40px',
        borderColor: state.isFocused ? '#a5b4fc' : '#d1d5db',
        '&:hover': { borderColor: '#d1d5db' },
        boxShadow: state.isFocused ? '0 0 0 1px #a5b4fc' : 'none', borderRadius: '0.375rem',
    }),
    input: (provided: any) => ({ ...provided, paddingLeft: '0px', marginLeft: '0px', color: '#1f2937', }),
    valueContainer: (provided: any) => ({ ...provided, padding: '2px 8px', }),
    placeholder: (provided: any) => ({ ...provided, color: '#6b7280', }),
    singleValue: (provided: any) => ({ ...provided, color: '#1f2937', }),
    dropdownIndicator: (provided: any) => ({ ...provided, padding: '8px', color: '#6b7280', }),
    indicatorSeparator: () => ({ display: 'none' }),
    menu: (provided: any) => ({ ...provided, zIndex: 60 }), // Higher zIndex for modal dropdowns
};
interface SelectOption { value: string; label: string; }
// --- End react-select setup ---

// Simple Item & Route Types
interface Item { id: string; item_name: string; item_number: number; }
interface RouteInfo { id: string; name: string; number: number; } // Assuming Route structure

// --- Edit Visit Modal Component ---
interface EditVisitModalProps {
    isOpen: boolean;
    onClose: () => void;
    visit: Visit | null;
    onSave: (updatedData: Partial<Visit>) => Promise<void>;
    isLoading: boolean; // Loading state for the save operation
    deliveryTypes: Visit['type'][];
    // Pass down necessary data for selectors
    allItems: Item[];
    allRoutes: RouteInfo[];
}

const EditVisitModal: React.FC<EditVisitModalProps> = ({
    isOpen, onClose, visit, onSave, isLoading, deliveryTypes, allItems, allRoutes
}) => {
    // --- Form State ---
    const [buyerName, setBuyerName] = useState('');
    const [mobilePhone, setMobilePhone] = useState('');
    const [landPhone, setLandPhone] = useState('');
    const [address, setAddress] = useState('');
    const [visitDate, setVisitDate] = useState('');
    const [visitType, setVisitType] = useState<Visit['type']>('Sample');
    const [status, setStatus] = useState('');
    const [notes, setNotes] = useState('');
    const [routeId, setRouteId] = useState<string | null>(null);
    const [currentItemToAdd, setCurrentItemToAdd] = useState<SelectOption | null>(null);
    const [addedItems, setAddedItems] = useState<SelectOption[]>([]);
    const [modalFormError, setModalFormError] = useState('');

    // --- Derived Options ---
    const itemOptions: SelectOption[] = useMemo(() => allItems.map(item => ({
        value: item.id, label: `${item.item_name} (${item.item_number})`
    })), [allItems]);

    const routeOptions: SelectOption[] = useMemo(() => allRoutes.map(route => ({
        value: route.id, label: `${route.name} (${route.number})`
    })), [allRoutes]);

    // --- Initialize form when modal opens or visit changes ---
    useEffect(() => {
        if (visit) {
            setBuyerName(visit.buyer_name || '');
            setMobilePhone(visit.mobile_phone || '');
            setLandPhone(visit.land_phone || '');
            setAddress(visit.address || '');
            setVisitDate(visit.date ? format(parseISO(visit.date), 'yyyy-MM-dd') : ''); // Format for date input
            setVisitType(visit.type);
            setStatus(visit.status);
            setNotes(visit.notes || '');
            setRouteId(visit.route_id || null);

            // Initialize addedItems from visit.item_id
            const initialItems = (visit.item_id || [])
                .map(id => {
                    const item = allItems.find(i => i.id === id);
                    return item ? { value: item.id, label: `${item.item_name} (${item.item_number})` } : null;
                })
                .filter((item): item is SelectOption => item !== null); // Filter out nulls and type guard
            setAddedItems(initialItems);

            setModalFormError(''); // Clear previous errors
            setCurrentItemToAdd(null); // Clear item selector

        } else {
            // Optionally reset state if visit becomes null (e.g., on close)
             setAddedItems([]);
             setRouteId(null);
             // Reset other fields if needed
        }
    }, [visit, allItems]); // Depend on visit and allItems

    if (!isOpen || !visit) return null;

    // --- Form Handlers ---
    const handleAddItem = () => {
        if (currentItemToAdd) {
            setAddedItems(prev => [...prev, currentItemToAdd]);
            setCurrentItemToAdd(null);
            setModalFormError('');
        } else {
            setModalFormError("Please select an item to add.");
        }
    };

    const handleRemoveItem = (indexToRemove: number) => {
        setAddedItems(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleModalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalFormError('');

        // --- Validation ---
        if (addedItems.length === 0) {
            setModalFormError('Please add at least one item.');
            return;
        }
        if (!routeId) {
            setModalFormError('Please select a route.');
            return;
        }
        if (!visitDate) {
             setModalFormError('Please select a visit date.');
             return;
        }

        const updatedVisitData: Partial<Visit> = {
            id: visit.id, // Crucial for update
            buyer_name: buyerName,
            mobile_phone: mobilePhone || null,
            land_phone: landPhone || null,
            address: address,
            date: new Date(visitDate).toISOString(), // Ensure ISO string format
            type: visitType,
            status: status,
            notes: notes || null,
            route_id: routeId,
            item_id: addedItems.map(item => item.value), // Get array of IDs
            // location is not typically edited here, keep original
            location: visit.location
        };

        await onSave(updatedVisitData);
    };

    // Display existing location
    const displayLocation = visit.location?.lat && visit.location?.lng
        ? `Lat: ${visit.location.lat.toFixed(6)}, Lng: ${visit.location.lng.toFixed(6)}`
        : "Geo-coordinates not available";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-2 sm:p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"> {/* Wider modal */}
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10 flex-shrink-0">
                    <h2 className="text-xl font-semibold text-gray-800">Edit Visit Details</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={isLoading}>
                        <X size={24} />
                    </button>
                </div>

                {/* Form Body - Scrollable */}
                <form onSubmit={handleModalSubmit} className="p-4 md:p-6 space-y-4 overflow-y-auto flex-grow">

                    {modalFormError && (
                         <div className="mb-3 p-3 bg-red-100 border border-red-300 text-red-700 text-sm rounded-md">
                            {modalFormError}
                        </div>
                    )}

                    {/* Row 1: Date & Buyer */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Visit Date */}
                        <div>
                            <label htmlFor="edit_visitDate" className="lbl">Visit Date</label>
                            <div className="relative">
                                <div className="input-icon left-0 pl-3"><Calendar size={18} /></div>
                                <input type="date" id="edit_visitDate" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="input pl-10" required disabled={isLoading} />
                            </div>
                        </div>
                        {/* Buyer Name */}
                        <div>
                            <label htmlFor="edit_buyerName" className="lbl">Buyer Name</label>
                            <div className="relative">
                                <div className="input-icon left-0 pl-3"><User size={18} /></div>
                                <input type="text" id="edit_buyerName" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className="input pl-10" required disabled={isLoading} />
                            </div>
                        </div>
                    </div>

                     {/* Row 2: Address */}
                     <div>
                        <label htmlFor="edit_address" className="lbl">Address</label>
                         <div className="relative">
                            <div className="input-icon left-0 pl-3"><MapPin size={18} /></div>
                            <input type="text" id="edit_address" value={address} onChange={(e) => setAddress(e.target.value)} className="input pl-10" required disabled={isLoading} />
                         </div>
                    </div>


                     {/* Row 3: Phones */}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Mobile Phone */}
                        <div>
                            <label htmlFor="edit_mobile_phone" className="lbl">Mobile Phone</label>
                             <div className="relative">
                                <div className="input-icon left-0 pl-3"><Phone size={18} /></div>
                                <input type="tel" id="edit_mobile_phone" value={mobilePhone} onChange={(e) => setMobilePhone(e.target.value)} className="input pl-10" required disabled={isLoading} pattern="[0-9]{10,15}" />
                             </div>
                        </div>
                         {/* Land Phone */}
                        <div>
                            <label htmlFor="edit_land_phone" className="lbl">Land Phone (Optional)</label>
                             <div className="relative">
                                <div className="input-icon left-0 pl-3"><Phone size={18} /></div>
                                <input type="tel" id="edit_land_phone" value={landPhone} onChange={(e) => setLandPhone(e.target.value)} className="input pl-10" disabled={isLoading} pattern="[0-9]{9,15}" />
                             </div>
                        </div>
                    </div>

                     {/* Row 4: Item Selection */}
                     <div>
                        <label htmlFor="itemToAdd" className="lbl">Items</label>
                        <div className="flex items-center space-x-2">
                            {/* Item Selector */}
                            <div className="relative flex-grow">
                                <div className="input-icon left-0 pl-3 z-10"><Package size={18} /></div>
                                <Select inputId="itemToAdd" options={itemOptions} value={currentItemToAdd}
                                    onChange={(selected) => setCurrentItemToAdd(selected as SingleValue<SelectOption>)}
                                    placeholder="Search and select item..." styles={customSelectStyles}
                                    isSearchable isClearable filterOption={customFilter}
                                    className="react-select-container" classNamePrefix="react-select" isDisabled={isLoading}
                                />
                            </div>
                            {/* Add Button */}
                            <button type="button" onClick={handleAddItem} disabled={!currentItemToAdd || isLoading}
                                className="btn btn-secondary p-2 h-[42px] flex-shrink-0" title="Add selected item">
                                <Plus size={20} />
                            </button>
                        </div>
                        {/* Added Items List */}
                        {addedItems.length > 0 && (
                            <div className="mt-2 space-y-1 border border-gray-200 rounded-md p-2 bg-gray-50 max-h-28 overflow-y-auto">
                                {addedItems.map((item, index) => (
                                    <div key={`${item.value}-${index}`} className="flex justify-between items-center py-0.5 px-1.5 text-sm text-gray-800 hover:bg-gray-100 rounded">
                                        <span>{item.label}</span>
                                        <button type="button" onClick={() => handleRemoveItem(index)} disabled={isLoading}
                                            className="text-red-500 hover:text-red-700 p-0.5 rounded-full hover:bg-red-100 ml-2" title="Remove">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                     {/* Row 5: Route & Type */}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Route Selector */}
                        <div>
                            <label htmlFor="edit_routeId" className="lbl">Route</label>
                            <div className="relative">
                                <div className="input-icon left-0 pl-3 z-10"><Route size={18} /></div>
                                <Select inputId="edit_routeId" options={routeOptions}
                                    value={routeOptions.find(option => option.value === routeId)}
                                    onChange={(selected) => setRouteId(selected?.value || null)}
                                    placeholder="Select Route" styles={customSelectStyles}
                                    isSearchable isClearable filterOption={customFilter}
                                    className="react-select-container" classNamePrefix="react-select" isDisabled={isLoading} required
                                />
                             </div>
                        </div>
                        {/* Visit Type */}
                        <div>
                            <label htmlFor="edit_visitType" className="lbl">Visit Type</label>
                            <div className="relative">
                                {/* You might want an icon here too */}
                                <select id="edit_visitType" value={visitType} onChange={(e) => setVisitType(e.target.value as Visit['type'])}
                                    className="input pr-10 appearance-none" required disabled={isLoading}>
                                    {deliveryTypes.map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <ChevronDown size={18} className="text-gray-400" />
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* Row 6: Status & Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         {/* Status */}
                        <div>
                            <label htmlFor="edit_status" className="lbl">Status</label>
                            <select id="edit_status" name="status" value={status} onChange={(e) => setStatus(e.target.value)}
                                className="input" required disabled={isLoading}>
                                <option value="Pending">Pending</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                        {/* Notes */}
                        <div className="sm:col-span-2"> {/* Make notes span full width on small screens if desired, or keep in column */}
                             <label htmlFor="edit_notes" className="lbl">Notes (Optional)</label>
                             <div className="relative">
                                <div className="absolute top-3 left-3 pointer-events-none z-10"><FileText size={18} /></div>
                                <textarea id="edit_notes" value={notes} onChange={(e) => setNotes(e.target.value)}
                                    className="input pl-10 min-h-[70px]" rows={3} disabled={isLoading}></textarea>
                             </div>
                        </div>
                     </div>

                    {/* Display Location (Non-Editable) */}
                    <div className="pt-2">
                        <label className="lbl">Captured Geo-Coordinates</label>
                        <div className="flex items-center text-sm p-2 rounded border bg-gray-50 text-gray-500">
                            <MapPin size={16} className="mr-2 flex-shrink-0" />
                            <span>{displayLocation}</span>
                        </div>
                    </div>

                </form>

                {/* Footer/Actions */}
                <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 flex-shrink-0">
                    <button type="button" onClick={onClose} className="btn btn-outline" disabled={isLoading}>Cancel</button>
                    <button type="submit" form="editVisitForm" // Link to the form element by id if needed, or rely on button type="submit" inside form
                      className="btn btn-primary" disabled={isLoading} onClick={handleModalSubmit}>
                        {isLoading ? (
                            <> <div className="spinner-xs mr-2"></div> Saving... </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Main Visit List Page Component (incorporates changes) ---
const VisitListPage: React.FC = () => {
    const { user } = useAuth();
    const [visits, setVisits] = useState<Visit[]>([]);
    const [allItems, setAllItems] = useState<Item[]>([]);
    const [allRoutes, setAllRoutes] = useState<RouteInfo[]>([]); // State for routes
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // --- Filtering State ---
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');
    const deliveryTypes: Visit['type'][] = ['Sample', 'Sittu', 'Over'];

    // --- Modal State ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [visitToEdit, setVisitToEdit] = useState<Visit | null>(null);

    // --- Fetch Data (including Routes) ---
    useEffect(() => {
        const fetchAllData = async () => {
            if (!user) { setIsLoading(false); return; }
            setIsLoading(true);
            try {
                // Use Promise.all for concurrent fetching
                const [visitsRes, itemsRes, routesRes] = await Promise.all([
                    supabase.from('visits').select('*').eq('ref_id', user.id).order('date', { ascending: false }),
                    supabase.from('items').select('id, item_name, item_number'),
                    supabase.from('routes').select('id, name, number') // Fetch routes
                ]);

                if (visitsRes.error) throw visitsRes.error;
                if (itemsRes.error) throw itemsRes.error;
                if (routesRes.error) throw routesRes.error;

                setAllItems(itemsRes.data || []);
                setAllRoutes(routesRes.data || []); // Set routes data
                setVisits(visitsRes.data || []);

            } catch (error) {
                console.error('Failed to fetch data:', error);
                alert(`Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllData();
    }, [user]);

     // --- Memoized Filtering Logic ---
     const filteredVisits = useMemo(() => {
        // ... filtering logic remains the same using visits, allItems, searchTerm, filters ...
         const lowerSearchTerm = searchTerm.toLowerCase();
         const start = startDateFilter ? startOfDay(parseISO(startDateFilter)) : null;
         const end = endDateFilter ? endOfDay(parseISO(endDateFilter)) : null;
         const itemMap = new Map(allItems.map(item => [item.id, `${item.item_name} ${item.item_number}`]));

         return visits.filter(visit => {
             if (start || end) {
                 const visitDate = parseISO(visit.date);
                 if (!isValid(visitDate)) return false;
                 if (start && visitDate < start) return false;
                 if (end && visitDate > end) return false;
             }
             if (statusFilter !== 'all' && visit.status !== statusFilter) return false;
             if (typeFilter !== 'all' && visit.type !== typeFilter) return false;
             if (lowerSearchTerm) {
                 const itemNames = (visit.item_id || []).map(id => itemMap.get(id) || '').join(' ').toLowerCase();
                 const searchableText = [visit.buyer_name?.toLowerCase(), visit.address?.toLowerCase(), visit.notes?.toLowerCase(), visit.mobile_phone, visit.land_phone, itemNames].join(' ');
                 if (!searchableText.includes(lowerSearchTerm)) return false;
             }
             return true;
         });
     }, [visits, searchTerm, statusFilter, typeFilter, startDateFilter, endDateFilter, allItems]);

    // --- Helper Functions ---
    const clearFilters = () => { /* ... */ setStatusFilter('all'); setTypeFilter('all'); setStartDateFilter(''); setEndDateFilter(''); setShowFilters(false); };
    const clearSearch = () => setSearchTerm('');
    const formatDate = (dateString: string) => { /* ... */ try { return format(parseISO(dateString), 'MMM d, yyyy'); } catch { return dateString; } };
    const getItemDisplay = (itemId: string): string => { /* ... */ const item = allItems.find(i => i.id === itemId); return item ? `${item.item_name} (${item.item_number})` : `Unknown Item`; };
    const getStatusClasses = (status: string) => { /* ... */ switch (status?.toLowerCase()) { case 'completed': return 'bg-green-100 text-green-700 border-green-300'; case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-300'; case 'cancelled': return 'bg-red-100 text-red-700 border-red-300'; default: return 'bg-gray-100 text-gray-700 border-gray-300'; } };

    // --- CRUD Handlers ---
    const handleOpenEditModal = (visit: Visit) => { setVisitToEdit(visit); setIsEditModalOpen(true); };
    const handleCloseEditModal = () => { setIsEditModalOpen(false); setVisitToEdit(null); };

    // Modified saveVisit to handle rich data from modal
    const saveVisit = async (updatedData: Partial<Visit>) => {
        if (!updatedData.id) return;
        setIsSaving(true);
        const { id, ...dataToUpdate } = updatedData;

        // Ensure required fields for update are present (adjust as needed)
        const updatePayload = {
            buyer_name: dataToUpdate.buyer_name,
            mobile_phone: dataToUpdate.mobile_phone,
            land_phone: dataToUpdate.land_phone,
            address: dataToUpdate.address,
            date: dataToUpdate.date,
            type: dataToUpdate.type,
            status: dataToUpdate.status,
            notes: dataToUpdate.notes,
            route_id: dataToUpdate.route_id,
            item_id: dataToUpdate.item_id,
            // Do NOT include 'location' here unless you specifically intend to update it
        };

        try {
            const { data: savedVisit, error } = await supabase
                .from('visits')
                .update(updatePayload) // Send structured payload
                .eq('id', id)
                .select() // Re-select to get the final state
                .single();

            if (error) throw error;

            setVisits(visits.map(v => (v.id === id ? { ...v, ...savedVisit } : v))); // Update local state
            handleCloseEditModal();
        } catch (error: any) {
            console.error('Error updating visit:', error);
            alert(`Failed to update visit: ${error.message}`);
            // Potentially keep modal open on error? Or show error in modal?
        } finally {
            setIsSaving(false);
        }
    };

    const deleteVisit = async (visitId: string) => { /* ... delete logic ... */ };

    // --- Render Logic (Main Page JSX) ---
    return (
        <div className="space-y-4 sm:space-y-6 pt-4 pb-16 animate-fade-in max-w-5xl mx-auto px-2 sm:px-4">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 mb-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Visits</h1>
                <Link to="/visits/new" className="btn btn-primary w-full sm:w-auto">
                    <Plus size={18} className="mr-1.5" /> New Visit
                </Link>
            </header>

             {/* Search Bar */}
             <div className="relative">
                <input type="text" placeholder="Search visits..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input pl-10 w-full" />
                <Search size={18} className="input-icon left-3" />
                {searchTerm && (<button onClick={clearSearch} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"><XSquare size={18} /></button>)}
            </div>

            {/* Filters */}
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
                 {/* ... filter toggle and inputs ... */}
                <div className="flex justify-between items-center mb-3">
                    <button onClick={() => setShowFilters(!showFilters)} className="btn btn-secondary btn-sm"> <Filter size={16} className="mr-1.5" /> Filters </button>
                    {(statusFilter !== 'all' || typeFilter !== 'all' || startDateFilter || endDateFilter) && (<button onClick={clearFilters} className="text-sm text-blue-600 hover:underline font-medium">Clear All Filters</button>)}
                </div>
                {showFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-3 border-t border-gray-200 animate-fade-in">
                        {/* Filters inputs remain the same */}
                          <div> <label htmlFor="statusFilter" className="lbl-xs">Status</label> <select id="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input input-sm w-full"> <option value="all">All</option> <option value="Pending">Pending</option> <option value="Completed">Completed</option> <option value="Cancelled">Cancelled</option> </select> </div>
                          <div> <label htmlFor="typeFilter" className="lbl-xs">Type</label> <select id="typeFilter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input input-sm w-full"> <option value="all">All</option> {deliveryTypes.map(type => <option key={type} value={type}>{type}</option>)} </select> </div>
                          <div> <label htmlFor="startDateFilter" className="lbl-xs">Start Date</label> <input type="date" id="startDateFilter" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} className="input input-sm w-full" /> </div>
                          <div> <label htmlFor="endDateFilter" className="lbl-xs">End Date</label> <input type="date" id="endDateFilter" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} className="input input-sm w-full" /> </div>
                    </div>
                )}
            </div>


            {/* Visit List */}
            <div>
                <div className="flex justify-between items-center mb-3 px-1">
                    <p className="text-sm text-gray-600">{filteredVisits.length} visits found</p>
                </div>

                {isLoading && !visits.length ? (
                     <div className="text-center py-16"> {/* Loading spinner */} </div>
                ) : filteredVisits.length > 0 ? (
                    <div className="space-y-4">
                        {/* Visit Card Mapping */}
                        {filteredVisits.map((visit) => {
                            const hasValidLocation = !!(visit.location?.lat && visit.location?.lng);
                            return (
                                <div key={visit.id} className="bg-white rounded-lg shadow-md border overflow-hidden">
                                    {/* Card Top Bar */}
                                    <div className={`px-3 sm:px-4 py-2 flex justify-between items-center border-b ${getStatusClasses(visit.status).replace('text-', 'bg-').replace('border-', 'bg-').split(' ')[0].replace('bg', 'border')}`}>
                                        {/* Status Badge */}
                                        <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium border ${getStatusClasses(visit.status)}`}>
                                            {visit.status === 'Completed' && <Check size={12} className="-ml-0.5 mr-1" />} {visit.status === 'Cancelled' && <X size={12} className="-ml-0.5 mr-1" />} {visit.status}
                                        </span>
                                        {/* Type Badge */}
                                        <span className={`text-xs uppercase px-2.5 py-0.5 rounded-full font-semibold ${visit.type === 'Sample' ? 'bg-blue-100 text-blue-800' : visit.type === 'Sittu' ? 'bg-pink-100 text-pink-800' : visit.type === 'Over' ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-800'}`}>{visit.type}</span>
                                    </div>
                                    {/* Card Main Content */}
                                    <div className="p-3 sm:p-4 flex flex-col md:flex-row md:justify-between gap-3 md:gap-4">
                                        {/* Card Left Details */}
                                        <div className="flex-grow space-y-2 md:space-y-2.5 pr-0 md:pr-4">
                                            {/* ... Buyer, Phones, Address, Items, Date, Notes display (same as before) ... */}
                                             <div className="flex items-center"> <User size={16} className="mr-2 text-gray-400 fs-0" /> <h3 className="font-semibold text-base sm:text-lg text-gray-800">{visit.buyer_name || 'N/A'}</h3> </div>
                                             <div className="space-y-1 text-xs sm:text-sm text-gray-600 pl-6"> <div className="flex items-center"><Phone size={12} className="mr-1.5 fs-0 text-gray-400" /><span className="font-medium mr-1">M:</span><span>{visit.mobile_phone || <span className="text-gray-400 italic">n/a</span>}</span></div> <div className="flex items-center"><Phone size={12} className="mr-1.5 fs-0 text-gray-400" /><span className="font-medium mr-1">L:</span><span>{visit.land_phone || <span className="text-gray-400 italic">n/a</span>}</span></div> </div>
                                             <div className="text-xs sm:text-sm text-gray-600 flex items-start pt-1"> <MapPin size={14} className="mr-2 fs-0 mt-0.5 text-gray-400" /> <span>{visit.address || <span className="text-gray-400 italic">No address</span>}</span> </div>
                                             <div className="text-xs sm:text-sm text-gray-600 flex items-start pt-1"> <Package size={14} className="mr-2 fs-0 mt-0.5 text-gray-400" /> <div className="flex flex-wrap gap-1"> {(visit.item_id && visit.item_id.length > 0) ? visit.item_id.map((id, index) => <span key={`${id}-${index}`} className="badge bg-indigo-100 text-indigo-700 text-xs">{getItemDisplay(id)}</span>) : <span className="text-gray-400 italic text-xs">No items</span>} </div> </div>
                                             <div className="flex items-center text-xs sm:text-sm text-gray-500 pt-1"> <CalendarRange size={14} className="mr-2 fs-0 text-gray-400" /> {formatDate(visit.date)} </div>
                                             {visit.notes && (<div className="flex items-start text-xs sm:text-sm text-gray-600 pt-1 border-t border-gray-100 mt-2"> <ArrowDownAZ size={14} className="mr-2 fs-0 mt-0.5 text-gray-400" /> <span className="whitespace-pre-wrap italic">{visit.notes}</span> </div>)}
                                        </div>
                                        {/* Card Right Actions */}
                                        <div className="flex flex-row items-center justify-between md:flex-col md:items-end flex-shrink-0 gap-2 md:gap-3 mt-3 md:mt-0 border-t md:border-t-0 pt-3 md:pt-0">
                                            {/* Edit/Delete buttons */}
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleOpenEditModal(visit)} className="btn btn-ghost btn-sm p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100" title="Edit visit" disabled={isSaving}><Edit size={16} /></button>
                                                <button onClick={() => deleteVisit(visit.id)} className="btn btn-ghost btn-sm p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-100" title="Delete visit" disabled={isSaving}><Trash2 size={16} /></button>
                                            </div>
                                            {/* Navigate Button */}
                                            <a href={hasValidLocation ? `https://...` : '#'} className={`btn btn-sm w-auto ${hasValidLocation ? 'btn-outline border-blue-500 ...' : 'border-red-300 bg-red-100 ... cursor-not-allowed'}`} /* ... other attrs */ >
                                               {hasValidLocation ? <MapPin size={14} className="mr-1.5" /> : <AlertTriangle size={14} className="mr-1.5 text-red-600" />} Navigate
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16 px-6 bg-white rounded-lg shadow border border-gray-200"> {/* Empty state */} </div>
                )}
            </div>

            {/* Edit Modal Render */}
            <EditVisitModal
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                visit={visitToEdit}
                onSave={saveVisit}
                isLoading={isSaving}
                deliveryTypes={deliveryTypes}
                // Pass data needed for selectors
                allItems={allItems}
                allRoutes={allRoutes}
            />

            {/* Utility Classes (add to your global CSS or Tailwind config if needed) */}
            <style jsx global>{`
                .lbl { display: block; font-size: 0.875rem; font-weight: 500; color: #4b5563; margin-bottom: 0.25rem; }
                .lbl-xs { display: block; font-size: 0.75rem; font-weight: 500; color: #4b5563; margin-bottom: 0.25rem; }
                .input-icon { position: absolute; top: 50%; transform: translateY(-50%); display: flex; align-items: center; pointer-events: none; color: #9ca3af; }
                .spinner-xs { width: 1rem; height: 1rem; border-width: 2px; border-style: solid; border-color: transparent; border-top-color: currentcolor; border-radius: 50%; display: inline-block; animation: spin 1s linear infinite; }
                .badge { display: inline-flex; align-items: center; padding: 0.125rem 0.625rem; font-weight: 500; line-height: 1; border-radius: 9999px; }
                .fs-0 { flex-shrink: 0; }
                @keyframes spin { to { transform: rotate(360deg); } }
             `}</style>
        </div>
    );
};

export default VisitListPage;