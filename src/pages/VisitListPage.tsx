import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Select, { createFilter, SingleValue } from 'react-select';
import {
    Plus, Filter, MapPin, Check, X, Calendar, ArrowDownAZ, Trash2, User, Phone, Edit, Save, XCircle, Package, AlertTriangle, Search, XSquare, CalendarRange, Route, FileText, ChevronDown, Loader // Added Loader
} from 'lucide-react';
import { Visit, LocationData } from '../types'; // Assuming Visit type includes necessary fields, added LocationData type if not already defined
import { supabase } from '../supabaseClient';
import { format, parseISO, isValid, startOfDay, endOfDay } from 'date-fns';



// --- react-select Filter & Styles ---
const filterConfig = { ignoreCase: true, matchFrom: 'any' as const, trim: true };
const customFilter = (option: any, rawInput: string) => createFilter(filterConfig)(option, rawInput);
const customSelectStyles = {
    control: (provided: any, state: any) => ({ /* ... control styles ... */ ...provided, minHeight: '42px', paddingLeft: '40px', borderColor: state.isFocused ? '#a5b4fc' : '#d1d5db', '&:hover': { borderColor: '#d1d5db' }, boxShadow: state.isFocused ? '0 0 0 1px #a5b4fc' : 'none', borderRadius: '0.375rem' }),
    input: (provided: any) => ({ /* ... input styles ... */ ...provided, paddingLeft: '0px', marginLeft: '0px', color: '#1f2937' }),
    valueContainer: (provided: any) => ({ /* ... valueContainer styles ... */ ...provided, padding: '2px 8px' }),
    placeholder: (provided: any) => ({ /* ... placeholder styles ... */ ...provided, color: '#6b7280' }),
    singleValue: (provided: any) => ({ /* ... singleValue styles ... */ ...provided, color: '#1f2937' }),
    dropdownIndicator: (provided: any) => ({ /* ... dropdownIndicator styles ... */ ...provided, padding: '8px', color: '#6b7280' }),
    indicatorSeparator: () => ({ display: 'none' }),
    menu: (provided: any) => ({ /* ... menu styles ... */ ...provided, zIndex: 60 }),
};
interface SelectOption { value: string; label: string; }
// --- End react-select setup ---

// Simple Item & Route Types
interface Item { id: string; item_name: string; item_number: number; }
interface RouteInfo { id: string; name: string; number: number; }

// --- Edit Visit Modal Component ---
interface EditVisitModalProps {
    isOpen: boolean;
    onClose: () => void;
    visit: Visit | null;
    // Ensure onSave accepts location of type LocationData | null | undefined
    onSave: (updatedData: Partial<Visit> & { location?: LocationData | null }) => Promise<void>;
    isLoading: boolean;
    deliveryTypes: Visit['type'][];
    allItems: Item[];
    allRoutes: RouteInfo[];
}

const EditVisitModal: React.FC<EditVisitModalProps> = ({
    isOpen, onClose, visit, onSave, isLoading, deliveryTypes, allItems, allRoutes
}) => {
    // --- Form State ---
    const [buyerName, setBuyerName] = useState('');
    const [numberOne, setNumberOne] = useState('');
    const [numberTwo, setNumberTwo] = useState('');
    const [numberThree, setNumberThree] = useState('');
    const [numberFour, setNumberFour] = useState('');
    const [billNumber, setBillNumber] = useState('');
    const [address, setAddress] = useState('');
    const [visitDate, setVisitDate] = useState('');
    const [visitType, setVisitType] = useState<Visit['type']>('Sample');
    const [status, setStatus] = useState('');
    const [notes, setNotes] = useState('');
    const [routeId, setRouteId] = useState<string | null>(null);
    const [currentItemToAdd, setCurrentItemToAdd] = useState<SelectOption | null>(null);
    const [addedItems, setAddedItems] = useState<SelectOption[]>([]);
    const [modalFormError, setModalFormError] = useState('');

    // --- Location State ---
    const [isCapturingLocation, setIsCapturingLocation] = useState(false);
    const [locationCaptureError, setLocationCaptureError] = useState('');
    const [capturedLocation, setCapturedLocation] = useState<LocationData | null>(null); // Store {lat, lng}

    // --- Derived Options ---
    const itemOptions: SelectOption[] = useMemo(() => allItems.map(item => ({
        value: item.item_number.toString(), label: `${item.item_name} (${item.item_number})`
    })), [allItems]);

    const routeOptions: SelectOption[] = useMemo(() => allRoutes.map(route => ({
        value: route.id, label: `${route.name} (${route.number})`
    })), [allRoutes]);

    // --- Initialize form ---
    useEffect(() => {
        if (visit) {
            setBuyerName(visit.buyer_name || '');
            setNumberOne(visit.number_one || '');
            setNumberTwo(visit.number_two || '');
            setNumberThree(visit.number_three || '');
            setNumberFour(visit.number_four || '');
            setBillNumber(visit.bill_number || '');
            setAddress(visit.address || '');
            setVisitDate(visit.date ? format(parseISO(visit.date), 'yyyy-MM-dd') : '');
            setVisitType(visit.type);
            setStatus(visit.status);
            setNotes(visit.notes || '');
            setRouteId(visit.route_id || null);
            setCapturedLocation(null); // Reset captured location on new modal open
            setLocationCaptureError(''); // Reset location error
            setModalFormError(''); // Clear previous errors
            setCurrentItemToAdd(null);

            const initialItems = (visit.item_id || [])
                .map(id => {
                    // Find item by id (which could be either a UUID or an item_number string)
                    const item = allItems.find(i => i.id === id || i.item_number.toString() === id);
                    return item ? { value: item.item_number.toString(), label: `${item.item_name} (${item.item_number})` } : null;
                })
                .filter((item): item is SelectOption => item !== null);
            setAddedItems(initialItems);

        } else {
            setAddedItems([]);
            setRouteId(null);
        }
    }, [visit, allItems]); // Rerun when visit changes

    if (!isOpen || !visit) return null;

    // --- Form Handlers ---
    const handleAddItem = () => { /* ... */ if (currentItemToAdd) { setAddedItems(prev => [...prev, currentItemToAdd]); setCurrentItemToAdd(null); setModalFormError(''); } else { setModalFormError("කරුණාකර එකතු කිරීමට භාණ්ඩයක් තෝරන්න."); } };
    const handleRemoveItem = (indexToRemove: number) => { /* ... */ setAddedItems(prev => prev.filter((_, index) => index !== indexToRemove)); };

    // --- Location Capture Handler ---
    const handleCaptureLocation = () => {
        setIsCapturingLocation(true);
        setLocationCaptureError('');
        setModalFormError(''); // Clear form errors when capturing location

        if (!navigator.geolocation) {
            setLocationCaptureError('ඔබගේ බ්‍රවුසරය භූගෝලීය ස්ථානගත කිරීම සඳහා සහාය නොදක්වයි');
            setIsCapturingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setCapturedLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setIsCapturingLocation(false);
            },
            (error) => {
                let errorMsg = 'ස්ථානය ලබා ගැනීමට අසමත් විය';
                switch (error.code) {
                    case error.PERMISSION_DENIED: errorMsg = 'ස්ථාන ප්‍රවේශය ප්‍රතික්ෂේප කර ඇත.'; break;
                    case error.POSITION_UNAVAILABLE: errorMsg = 'ස්ථාන තොරතුරු නොමැත.'; break;
                    case error.TIMEOUT: errorMsg = 'ස්ථාන ඉල්ලීම කල් ඉකුත් විය.'; break;
                }
                setLocationCaptureError(errorMsg);
                setIsCapturingLocation(false);
            },
            { enableHighAccuracy: true }
        );
    };

    // --- Form Submit Handler ---
    const handleModalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalFormError('');
        setLocationCaptureError(''); // Clear location error on submit attempt

        // --- Validation ---
        if (addedItems.length === 0) { setModalFormError('කරුණාකර අවම වශයෙන් එක් භාණ්ඩයක් වත් එකතු කරන්න.'); return; }
        if (!routeId) { setModalFormError('කරුණාකර මාර්ගයක් තෝරන්න.'); return; }
        if (!visitDate) { setModalFormError('කරුණාකර සංචාර දිනයක් තෝරන්න.'); return; }
        // No validation needed for location capture, it's optional

        const updatedVisitData: Partial<Visit> & { location?: LocationData | null } = {
            id: visit.id,
            buyer_name: buyerName,
            number_one: numberOne || null,
            number_two: numberTwo || null,
            number_three: numberThree || null,
            number_four: numberFour || null,
            bill_number: billNumber || null,
            address: address,
            date: new Date(visitDate).toISOString(),
            type: visitType,
            status: status,
            notes: notes || null,
            route_id: routeId,
            // Use item_number values (stored as strings) for item identification
            item_id: addedItems.map(item => item.value),
            // Include capturedLocation if it exists, otherwise retain original (or let backend handle if needed)
            location: capturedLocation !== null ? capturedLocation : visit.location // Send new or original
        };

        await onSave(updatedVisitData);
    };

    // Display current effective location
    const currentEffectiveLocation = capturedLocation || visit.location;
    const displayLocation = currentEffectiveLocation?.lat && currentEffectiveLocation?.lng
        ? `Lat: ${currentEffectiveLocation.lat.toFixed(6)}, Lng: ${currentEffectiveLocation.lng.toFixed(6)}`
        : "Geo-coordinates not available";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-2 sm:p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10 flex-shrink-0">
                    <h2 className="text-xl font-semibold text-gray-800">සංචාර විස්තර සංස්කරණය කරන්න</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={isLoading || isCapturingLocation}> <X size={24} /> </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleModalSubmit} className="p-4 md:p-6 space-y-4 overflow-y-auto flex-grow">

                    {modalFormError && <div className="modal-error">{modalFormError}</div>}
                    {locationCaptureError && <div className="modal-error text-orange-700 bg-orange-100 border-orange-300">{locationCaptureError}</div>}

                    {/* --- Fields moved to top --- */}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Status */}
                        <div>
                            <label htmlFor="edit_status" className="lbl">තත්ත්වය</label>
                            <select id="edit_status" name="status" value={status} onChange={(e) => setStatus(e.target.value)} className="input" required disabled={isLoading || isCapturingLocation}>
                                <option value="Pending">අපේක්ෂිත</option>
                                <option value="Completed">සම්පූර්ණයි</option>
                                <option value="Cancelled">අවලංගු කළා</option>
                                <option value="Return">ආපසු</option>
                            </select>
                        </div>
                         {/* Visit Type */}
                        <div>
                            <label htmlFor="edit_visitType" className="lbl">සංචාර වර්ගය</label>
                             <div className="relative">
                                <select id="edit_visitType" value={visitType} onChange={(e) => setVisitType(e.target.value as Visit['type'])} className="input pr-10 appearance-none" required disabled={isLoading || isCapturingLocation}>
                                    {deliveryTypes.map(type => {
                                        let displayName = type;
                                        if (type === 'Sample') displayName = 'සාම්පල';
                                        else if (type === 'Sittu') displayName = 'සිට්ටු';
                                        else if (type === 'Over') displayName = 'ඕවර්';
                                        return <option key={type} value={type}>{displayName}</option>;
                                    })}
                                </select>
                                <div className="input-icon right-0 pr-3"><ChevronDown size={18} /></div>
                             </div>
                        </div>
                    </div>
                    {/* --- End Fields moved to top --- */}


                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Visit Date */}
                        <div>
                            <label htmlFor="edit_visitDate" className="lbl">සංචාර දිනය</label>
                             <div className="relative">
                                <div className="input-icon left-0 pl-3"><Calendar size={18} /></div>
                                <input type="date" id="edit_visitDate" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="input pl-10" required disabled={isLoading || isCapturingLocation} />
                             </div>
                        </div>
                        {/* Buyer Name */}
                        <div>
                            <label htmlFor="edit_buyerName" className="lbl">ගනුදෙනුකරුගේ නම</label>
                             <div className="relative">
                                <div className="input-icon left-0 pl-3"><User size={18} /></div>
                                <input type="text" id="edit_buyerName" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className="input pl-10" required disabled={isLoading || isCapturingLocation} />
                             </div>
                        </div>
                    </div>

                     {/* Address */}
                     <div> <label htmlFor="edit_address" className="lbl">ලිපිනය</label> <div className="relative"> <div className="input-icon left-0 pl-3"><MapPin size={18} /></div> <input type="text" id="edit_address" value={address} onChange={(e) => setAddress(e.target.value)} className="input pl-10" required disabled={isLoading || isCapturingLocation} /> </div> </div>

                     {/* Phone Numbers */}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div> <label htmlFor="edit_number_one" className="lbl">අංක 1</label> <div className="relative"> <div className="input-icon left-0 pl-3"><Phone size={18} /></div> <input type="tel" id="edit_number_one" value={numberOne} onChange={(e) => setNumberOne(e.target.value)} className="input pl-10" required disabled={isLoading || isCapturingLocation} pattern="[0-9]{10,15}" /> </div> </div>
                        <div> <label htmlFor="edit_number_two" className="lbl">අංක 2 (විකල්ප)</label> <div className="relative"> <div className="input-icon left-0 pl-3"><Phone size={18} /></div> <input type="tel" id="edit_number_two" value={numberTwo} onChange={(e) => setNumberTwo(e.target.value)} className="input pl-10" disabled={isLoading || isCapturingLocation} pattern="[0-9]{9,15}" /> </div> </div>
                    </div>
                    
                    {/* Bill Number */}
                    <div>
                        <label htmlFor="edit_bill_number" className="lbl">බිල්පත් අංකය</label>
                        <div className="relative">
                            <div className="input-icon left-0 pl-3"><FileText size={18} /></div>
                            <input 
                                type="text" 
                                id="edit_bill_number" 
                                value={billNumber} 
                                onChange={(e) => setBillNumber(e.target.value)} 
                                className="input pl-10" 
                                disabled={isLoading || isCapturingLocation} 
                            />
                        </div>
                    </div>
                    
                    {/* Additional Phone Numbers */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div> <label htmlFor="edit_number_three" className="lbl">අංක 3 (විකල්ප)</label> <div className="relative"> <div className="input-icon left-0 pl-3"><Phone size={18} /></div> <input type="tel" id="edit_number_three" value={numberThree} onChange={(e) => setNumberThree(e.target.value)} className="input pl-10" disabled={isLoading || isCapturingLocation} pattern="[0-9]{9,15}" /> </div> </div>
                        <div> <label htmlFor="edit_number_four" className="lbl">අංක 4 (විකල්ප)</label> <div className="relative"> <div className="input-icon left-0 pl-3"><Phone size={18} /></div> <input type="tel" id="edit_number_four" value={numberFour} onChange={(e) => setNumberFour(e.target.value)} className="input pl-10" disabled={isLoading || isCapturingLocation} pattern="[0-9]{9,15}" /> </div> </div>
                    </div>

                     {/* Item Selection */}
                     <div> {/* ... Item selection area JSX (same as before) ... */}
                         <label htmlFor="itemToAdd" className="lbl">භාණ්ඩ</label>
                         <div className="flex items-center space-x-2">
                             <div className="relative flex-grow"> <div className="input-icon left-0 pl-3 z-10"><Package size={18} /></div> <Select inputId="itemToAdd" options={itemOptions} value={currentItemToAdd} onChange={(selected) => setCurrentItemToAdd(selected as SingleValue<SelectOption>)} placeholder="භාණ්ඩ සොයන්න සහ තෝරන්න..." styles={customSelectStyles} isSearchable isClearable filterOption={customFilter} className="react-select-container" classNamePrefix="react-select" isDisabled={isLoading || isCapturingLocation} /> </div>
                             <button type="button" onClick={handleAddItem} disabled={!currentItemToAdd || isLoading || isCapturingLocation} className="btn btn-secondary p-2 h-[42px] flex-shrink-0" title="තෝරාගත් භාණ්ඩය එකතු කරන්න"><Plus size={20} /></button>
                         </div>
                         {addedItems.length > 0 && ( <div className="mt-2 space-y-1 border border-gray-200 rounded-md p-2 bg-gray-50 max-h-28 overflow-y-auto"> {addedItems.map((item, index) => ( <div key={`${item.value}-${index}`} className="flex justify-between items-center py-0.5 px-1.5 text-sm text-gray-800 hover:bg-gray-100 rounded"> <span>{item.label}</span> <button type="button" onClick={() => handleRemoveItem(index)} disabled={isLoading || isCapturingLocation} className="modal-remove-btn" title="ඉවත් කරන්න"><Trash2 size={14} /></button> </div> ))} </div> )}
                    </div>

                     {/* Route */}
                     <div> {/* ... Route selection area JSX (same as before) ... */}
                         <label htmlFor="edit_routeId" className="lbl">මාර්ගය</label>
                         <div className="relative"> <div className="input-icon left-0 pl-3 z-10"><Route size={18} /></div> <Select inputId="edit_routeId" options={routeOptions} value={routeOptions.find(option => option.value === routeId)} onChange={(selected) => setRouteId(selected?.value || null)} placeholder="මාර්ගය තෝරන්න" styles={customSelectStyles} isSearchable isClearable filterOption={customFilter} className="react-select-container" classNamePrefix="react-select" isDisabled={isLoading || isCapturingLocation} required /> </div>
                    </div>

                    {/* Notes */}
                    <div> {/* ... Notes textarea JSX (same as before) ... */}
                         <label htmlFor="edit_notes" className="lbl">සටහන් (විකල්ප)</label>
                         <div className="relative"> <div className="absolute top-3 left-3 pointer-events-none z-10"><FileText size={18} className="text-gray-400"/></div> <textarea id="edit_notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="input pl-10 min-h-[70px]" rows={3} disabled={isLoading || isCapturingLocation}></textarea> </div>
                    </div>

                    {/* --- Location Capture Section --- */}
                    <div className="pt-2 space-y-2">
                         <label className="lbl">භූගෝලීය ඛණ්ඩාංක</label>
                         {/* Display Current/Captured Location */}
                        <div className="flex items-center text-sm p-2 rounded border bg-gray-50 text-gray-500">
                            <MapPin size={16} className="mr-2 flex-shrink-0" />
                            <span>{displayLocation}</span>
                            {capturedLocation && <Check size={16} className="ml-2 text-green-500" title="New coordinates captured"/>}
                        </div>
                         {/* Capture Button */}
                         <button
                            type="button"
                            onClick={handleCaptureLocation}
                            disabled={isCapturingLocation || isLoading}
                            className="btn btn-secondary btn-sm w-full flex items-center justify-center"
                         >
                             {isCapturingLocation ? (
                                <> <Loader size={16} className="animate-spin mr-2" /> ලබා ගනිමින්... </>
                             ) : capturedLocation ? (
                                <> <MapPin size={16} className="mr-2" /> නැවත ඛණ්ඩාංක ලබා ගන්න </>
                             ) : (
                                <> <MapPin size={16} className="mr-2" /> වත්මන් භූගෝලීය ඛණ්ඩාංක ලබා ගන්න </>
                             )}
                         </button>
                    </div>
                    {/* --- End Location Capture Section --- */}

                </form>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 flex-shrink-0">
                    <button type="button" onClick={onClose} className="btn btn-outline" disabled={isLoading || isCapturingLocation}>අවලංගු කරන්න</button>
                    <button type="submit" className="btn btn-primary" disabled={isLoading || isCapturingLocation} onClick={handleModalSubmit}>
                        {isLoading ? (
                            <> <div className="spinner-xs mr-2"></div> සුරකිමින්... </>
                        ) : ( 'වෙනස්කම් සුරකින්න' )}
                    </button>
                </div>

                {/* Utility Classes for Modal */}
                <style jsx>{`
                    .modal-error { margin-bottom: 0.75rem; padding: 0.75rem; background-color: #fee2e2; border: 1px solid #fecaca; color: #b91c1c; font-size: 0.875rem; border-radius: 0.375rem; }
                    .lbl { display: block; font-size: 0.875rem; font-weight: 500; color: #4b5563; margin-bottom: 0.25rem; }
                    .input-icon { position: absolute; top: 50%; transform: translateY(-50%); display: flex; align-items: center; pointer-events: none; color: #9ca3af; }
                    .modal-remove-btn { color: #ef4444; padding: 0.125rem; border-radius: 9999px; margin-left: 0.5rem; }
                    .modal-remove-btn:hover { color: #dc2626; background-color: #fee2e2; }
                    .spinner-xs { width: 1rem; height: 1rem; border-width: 2px; border-style: solid; border-color: transparent; border-top-color: currentcolor; border-radius: 50%; display: inline-block; animation: spin 1s linear infinite; }
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        </div>
    );
};


// --- Main Visit List Page Component ---
const VisitListPage: React.FC = () => {
    // ... (All state from previous version: user, visits, allItems, allRoutes, isLoading, isSaving, filters, modal state) ...
    const { user } = useAuth();
    const [visits, setVisits] = useState<Visit[]>([]);
    const [allItems, setAllItems] = useState<Item[]>([]);
    const [allRoutes, setAllRoutes] = useState<RouteInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [refFilter, setRefFilter] = useState<string>('all');
    const [routeFilter, setRouteFilter] = useState<string>('all');
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');
    const deliveryTypes: Visit['type'][] = ['Sample', 'Sittu', 'Over'];
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [visitToEdit, setVisitToEdit] = useState<Visit | null>(null);

    // State for refs (users with role 'Ref')
    const [allRefs, setAllRefs] = useState<{id: string; first_name: string; last_name: string}[]>([]);

    // --- Fetch Data ---
    useEffect(() => {
        const fetchAllData = async () => {
            if (!user) { setIsLoading(false); return; }
            setIsLoading(true);
            try {
                // Different queries based on user role
                const visitsQuery = user.role === 'Admin' 
                    ? supabase.from('visits').select('*, routes(name, number)').order('date', { ascending: false })
                    : supabase.from('visits').select('*, routes(name, number)').eq('ref_id', user.id).order('date', { ascending: false });
                
                const promises = [
                    visitsQuery,
                    supabase.from('items').select('id, item_name, item_number'),
                    supabase.from('routes').select('id, name, number')
                ];
                
                // Only fetch refs if user is admin
                if (user.role === 'Admin') {
                    promises.push(supabase.from('users').select('id, first_name, last_name').eq('role', 'Ref'));
                }
                
                const results = await Promise.all(promises);
                
                const [visitsRes, itemsRes, routesRes, refsRes] = results;
                
                if (visitsRes.error) throw visitsRes.error;
                if (itemsRes.error) throw itemsRes.error;
                if (routesRes.error) throw routesRes.error;
                
                setAllItems(itemsRes.data || []);
                setAllRoutes(routesRes.data || []);
                setVisits(visitsRes.data || []);
                
                // Set refs data if admin
                if (user.role === 'Admin' && refsRes && !refsRes.error) {
                    setAllRefs(refsRes.data || []);
                }
            } catch (error) { 
                console.error('Failed to fetch data:', error); 
                // Consider adding a user-friendly error message here
            }
            finally { 
                setIsLoading(false); 
            }
        };
        fetchAllData();
    }, [user]);

    // --- Memoized Filtering and Sorting ---
    const filteredVisits = useMemo(() => {
        // Filtering logic - show all records by default, only filter by date when user sets one
         const lowerSearchTerm = searchTerm.toLowerCase();
         const start = startDateFilter ? startOfDay(parseISO(startDateFilter)) : null;
         const end = endDateFilter ? endOfDay(parseISO(endDateFilter)) : null;
         // Create a map that can look up items by both id and item_number
         const itemMap = new Map();
         allItems.forEach(item => {
             itemMap.set(item.id, `${item.item_name} ${item.item_number}`);
             itemMap.set(item.item_number.toString(), `${item.item_name} ${item.item_number}`);
         });
         
         // First filter the visits
         const filtered = visits.filter(visit => {
             // Only apply date filtering when user has set a date filter
             if (startDateFilter || endDateFilter) { 
                 const visitDate = parseISO(visit.date); 
                 if (!isValid(visitDate)) return false; 
                 if (start && visitDate < start) return false; 
                 if (end && visitDate > end) return false; 
             }
             if (statusFilter !== 'all' && visit.status !== statusFilter) return false;
             if (typeFilter !== 'all' && visit.type !== typeFilter) return false;
             if (routeFilter !== 'all' && visit.route_id !== routeFilter) return false;
             if (refFilter !== 'all' && visit.ref_id !== refFilter) return false;
             if (lowerSearchTerm) { const itemNames = (visit.item_id || []).map(id => itemMap.get(id) || '').join(' ').toLowerCase(); const searchableText = [visit.buyer_name?.toLowerCase(), visit.address?.toLowerCase(), visit.notes?.toLowerCase(), visit.mobile_phone, visit.land_phone, itemNames].join(' '); if (!searchableText.includes(lowerSearchTerm)) return false; }
             return true;
         });
         
         // Then sort the filtered visits by bill_number in ascending order
         return [...filtered].sort((a, b) => {
            // Primary sort by bill_number in ascending order (numerically when possible)
            const billNumberA = a.bill_number || '';
            const billNumberB = b.bill_number || '';
            
            if (billNumberA !== billNumberB) {
                // Try to convert bill numbers to numeric values for proper numerical sorting
                const numA = parseInt(billNumberA.replace(/\D/g, ''));
                const numB = parseInt(billNumberB.replace(/\D/g, ''));
                
                // If both can be converted to valid numbers, compare numerically
                if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                }
                
                // Fall back to string comparison if not valid numbers
                return billNumberA.localeCompare(billNumberB);
            }
            
            // Secondary sort by route_id if bill numbers are the same
            if (a.route_id !== b.route_id) {
                if (!a.route_id) return 1;
                if (!b.route_id) return -1;
                return a.route_id.localeCompare(b.route_id);
            }
            
            // Tertiary sort by date (most recent first) if both have same bill number and route
            return new Date(b.date).getTime() - new Date(a.date).getTime();
         });
    }, [visits, searchTerm, statusFilter, typeFilter, routeFilter, refFilter, startDateFilter, endDateFilter, allItems]);


    // --- Helpers ---
    const clearFilters = () => { /* ... */ setStatusFilter('all'); setTypeFilter('all'); setRefFilter('all'); setRouteFilter('all'); setStartDateFilter(''); setEndDateFilter(''); setShowFilters(false); };
    const clearSearch = () => setSearchTerm('');
    const formatDate = (dateString: string) => { /* ... */ try { return format(parseISO(dateString), 'MMM d, yyyy'); } catch { return dateString; } };
    const getItemDisplay = (itemId: string): string => { 
        // Find item by either UUID or item_number string
        const item = allItems.find(i => i.id === itemId || i.item_number.toString() === itemId); 
        return item ? `${item.item_name} - ${item.item_number}` : `Unknown Item`; 
    };
    const statusSinhalaLabels: { [key: string]: string } = {
        pending: 'අපේක්ෂිත',
        completed: 'සම්පූර්ණයි',
        cancelled: 'අවලංගු කළා',
        return: 'ආපසු',
      };
      
      const getSinhalaLabel = (status: string) => statusSinhalaLabels[status.toLowerCase()] || status;
      
    
    const getStatusClasses = (status: string) => {
        switch (status?.toLowerCase()) {
          case 'completed':
            return 'bg-green-100 text-green-700 border-green-300';
          case 'pending':
            return 'bg-yellow-100 text-yellow-700 border-yellow-300';
          case 'cancelled':
            return 'bg-red-100 text-red-700 border-red-300';
          case 'return':
            return 'bg-blue-100 text-blue-700 border-blue-300';
          default:
            return 'bg-gray-100 text-gray-700 border-gray-300';
        }
      };


    // --- CRUD Handlers ---
    const handleOpenEditModal = (visit: Visit) => { setVisitToEdit(visit); setIsEditModalOpen(true); };
    const handleCloseEditModal = () => { setIsEditModalOpen(false); setVisitToEdit(null); };

    // Updated saveVisit to handle potential location update and individual phone numbers
    const saveVisit = async (updatedData: Partial<Visit> & { location?: LocationData | null }) => {
        if (!updatedData.id) return;
        setIsSaving(true);
        const { id, ...dataToUpdate } = updatedData;

        // Prepare payload, explicitly including location if provided
        const updatePayload: any = {
            buyer_name: dataToUpdate.buyer_name,
            number_one: dataToUpdate.number_one,
            number_two: dataToUpdate.number_two,
            number_three: dataToUpdate.number_three,
            number_four: dataToUpdate.number_four,
            bill_number: dataToUpdate.bill_number,
            address: dataToUpdate.address,
            date: dataToUpdate.date,
            type: dataToUpdate.type,
            status: dataToUpdate.status,
            notes: dataToUpdate.notes,
            route_id: dataToUpdate.route_id,
            item_id: dataToUpdate.item_id,
        };
        // Only add location to payload if it's being updated (i.e., was captured in modal)
        if (dataToUpdate.location !== undefined) { // Check if location key exists in the update object
            updatePayload.location = dataToUpdate.location;
        }


        try {
            const { data: savedVisit, error } = await supabase
                .from('visits')
                .update(updatePayload)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setVisits(visits.map(v => (v.id === id ? { ...v, ...savedVisit } : v)));
            handleCloseEditModal();
        } catch (error: any) {
            console.error('Error updating visit:', error);
            alert(`සංචාරය යාවත්කාලීන කිරීමට අසමත් විය: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

     const deleteVisit = async (visitId: string) => {
        if (window.confirm('ඔබට මෙම සංචාරය මකා දැමීමට අවශ්‍ය බව විශ්වාසද?')) {
            const previousVisits = [...visits];
            setVisits(visits.filter(visit => visit.id !== visitId)); // Optimistic UI
            try {
                const { error } = await supabase.from('visits').delete().eq('id', visitId);
                if (error) throw error;
            } catch (error: any) {
                console.error('Error deleting visit:', error);
                setVisits(previousVisits); // Rollback
                alert(`සංචාරය මකා දැමීමට අසමත් විය: ${error.message}`);
            }
        }
    };


    // --- Render Logic ---
    return (
        <div className="space-y-4 sm:space-y-6 pt-4 pb-16 animate-fade-in max-w-5xl mx-auto px-2 sm:px-4">
            {/* Header */}
             <header className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 mb-4"> <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">සංචාර</h1> <Link to="/visits/new" className="btn btn-primary w-full sm:w-auto"> <Plus size={18} className="mr-1.5" /> නව සංචාරයක් </Link> </header>

            {/* Search Bar */}
             <div className="relative"> <input type="text" placeholder="සංචාර සොයන්න..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input pl-10 w-full" /> <Search size={18} className="input-icon left-3" /> {searchTerm && (<button onClick={clearSearch} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"><XSquare size={18} /></button>)} </div>

            {/* Filters */}
             <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
                 <div className="flex justify-between items-center mb-3"> <button onClick={() => setShowFilters(!showFilters)} className="btn btn-secondary btn-sm"> <Filter size={16} className="mr-1.5" /> පෙරහන් </button> {(statusFilter !== 'all' || typeFilter !== 'all' || routeFilter !== 'all' || refFilter !== 'all' || startDateFilter || endDateFilter) && (<button onClick={clearFilters} className="text-sm text-blue-600 hover:underline font-medium">සියලු පෙරහන් හිස් කරන්න</button>)} </div>
                 {showFilters && (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-3 border-t border-gray-200 animate-fade-in"> 
                    {/* Status Filter */}
                    <div> 
                        <label htmlFor="statusFilter" className="lbl-xs">තත්ත්වය</label> 
                        <select id="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input input-sm w-full"> 
                            <option value="all">සියල්ල</option> 
                            <option value="Pending">අපේක්ෂිත</option> 
                            <option value="Completed">සම්පූර්ණයි</option> 
                            <option value="Cancelled">අවලංගු කළා</option>
                            <option value="Return">ආපසු</option> 
                        </select> 
                    </div> 
                    
                    {/* Type Filter */}
                    <div> 
                        <label htmlFor="typeFilter" className="lbl-xs">වර්ගය</label> 
                        <select id="typeFilter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input input-sm w-full"> 
                            <option value="all">සියල්ල</option> 
                            {deliveryTypes.map(type => {
                                let displayName = type;
                                if (type === 'Sample') displayName = 'සාම්පල';
                                else if (type === 'Sittu') displayName = 'සිට්ටු';
                                else if (type === 'Over') displayName = 'ඕවර්';
                                return <option key={type} value={type}>{displayName}</option>;
                            })}
                        </select> 
                    </div> 
                    
                    {/* Route Filter */}
                    <div> 
                        <label htmlFor="routeFilter" className="lbl-xs">මාර්ගය</label> 
                        <select id="routeFilter" value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)} className="input input-sm w-full"> 
                            <option value="all">සියල්ල</option> 
                            {allRoutes.map(route => <option key={route.id} value={route.id}>{route.name} ({route.number})</option>)} 
                        </select> 
                    </div> 
                    
                    {/* Ref Filter - Only show if user is Admin */}
                     {user?.role === 'Admin' && (
                         <div> 
                             <label htmlFor="refFilter" className="lbl-xs">යොමුව</label> 
                             <select id="refFilter" value={refFilter} onChange={(e) => setRefFilter(e.target.value)} className="input input-sm w-full"> 
                                 <option value="all">සියල්ල</option> 
                                 {allRefs.map(ref => (
                                     <option key={ref.id} value={ref.id}>
                                         {ref.first_name} {ref.last_name}
                                     </option>
                                 ))}
                             </select> 
                         </div>
                     )}
                    
                    {/* Date Filters */}
                    <div> 
                        <label htmlFor="startDateFilter" className="lbl-xs">ආරම්භක දිනය</label> 
                        <input type="date" id="startDateFilter" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} className="input input-sm w-full" /> 
                    </div> 
                    <div> 
                        <label htmlFor="endDateFilter" className="lbl-xs">අවසාන දිනය</label> 
                        <input type="date" id="endDateFilter" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} className="input input-sm w-full" /> 
                    </div> 
                </div>)}
             </div>

            {/* Visit List Area */}
            <div>
                 <div className="flex justify-between items-center mb-3 px-1"> <p className="text-sm text-gray-600"> සංචාර {filteredVisits.length} හමු විය</p> </div>
                 {isLoading && !visits.length ? (<div className="loading-placeholder">පූරණය වෙමින්...</div>) : filteredVisits.length > 0 ? (
                     <div className="space-y-4">
                         {/* Visit Card Mapping */}
                         {filteredVisits.map((visit) => {
                             const hasValidLocation = !!(visit.location?.lat && visit.location?.lng);
                             return (
                                 <div key={visit.id} className="visit-card">
                                     {/* Card Top Bar */}
                                     <div className={`visit-card-topbar ${getStatusClasses(visit.status).replace('text-', 'bg-').replace('border-', 'bg-').split(' ')[0].replace('bg', 'border')}`}>
                                     <span className={`visit-card-status ${getStatusClasses(visit.status)}`}>
  {/* Icons */}
  {visit.status.toLowerCase() === 'completed' && <Check size={12} className="-ml-0.5 mr-1" />}
  {visit.status.toLowerCase() === 'cancelled' && <X size={12} className="-ml-0.5 mr-1" />}
  
  {/* Sinhala label */}
  {statusSinhalaLabels[visit.status.toLowerCase()] || visit.status}
</span>
                                         <span className={`visit-card-type ${visit.type === 'Sample' ? 'badge-blue' : visit.type === 'Sittu' ? 'badge-pink' : visit.type === 'Over' ? 'badge-teal' : 'badge-gray'}`}>
                                            {visit.type === 'Sample' ? 'සාම්පල' : 
                                             visit.type === 'Sittu' ? 'සිට්ටු' : 
                                             visit.type === 'Over' ? 'ඕවර්' : 
                                             visit.type}
                                         </span>
                                     </div>
                                     {/* Card Main Content */}
                                     <div className="visit-card-content">
                                         {/* Left Details */}
                                         <div className="visit-card-details">
                                             {/* Display fields: Buyer, Phones, Address, Items, Date, Notes */}
                                            <div className="detail-row"> <User size={16} className="detail-icon" /> <h3 className="detail-buyer">{visit.buyer_name || 'නැත'}</h3> </div>
                                            <div className="detail-row-group"> 
                                                <div className="detail-row text-sm"><Phone size={12} className="detail-icon-sm" /><span className="font-medium mr-1">1:</span><span>{visit.number_one || <i className="text-gray-400">n/a</i>}</span></div> 
                                                <div className="detail-row text-sm"><Phone size={12} className="detail-icon-sm" /><span className="font-medium mr-1">2:</span><span>{visit.number_two || <i className="text-gray-400">n/a</i>}</span></div>
                                                {visit.number_three && <div className="detail-row text-sm"><Phone size={12} className="detail-icon-sm" /><span className="font-medium mr-1">3:</span><span>{visit.number_three}</span></div>}
                                                {visit.number_four && <div className="detail-row text-sm"><Phone size={12} className="detail-icon-sm" /><span className="font-medium mr-1">4:</span><span>{visit.number_four}</span></div>}
                                            </div>
                                            <div className="detail-row"> <MapPin size={14} className="detail-icon" /> <span>{visit.address || <i className="text-gray-400">ලිපිනයක් නැත</i>}</span> </div>
                                            {/* Route Name */}
                                            <div className="detail-row"> <Route size={14} className="detail-icon" /> <span className="font-medium">මාර්ගය:</span> <span className="ml-1">{visit.routes?.name || allRoutes.find(r => r.id === visit.route_id)?.name || <i className="text-gray-400">මාර්ගයක් නැත</i>}</span> </div>
                                            {/* Bill Number */}
                                            <div className="detail-row"> <FileText size={14} className="detail-icon" /> <span className="font-medium">බිල්පත් අංකය:</span> <span className="ml-1">{visit.bill_number || <i className="text-gray-400">බිල්පත් අංකයක් නැත</i>}</span> </div>
                                            <div className="detail-row"> <Package size={14} className="detail-icon" /> <div className="flex flex-wrap gap-1"> {(visit.item_id?.length || 0) > 0 ? visit.item_id?.map((id, index) => <span key={`${id}-${index}`} className="badge badge-indigo">{getItemDisplay(id)}</span>) : <i className="text-gray-400 text-xs">භාණ්ඩ නැත</i>} </div> </div>
                                            <div className="detail-row text-sm text-gray-500"> <CalendarRange size={14} className="detail-icon" /> {formatDate(visit.date)} </div>
                                            {visit.notes && (<div className="detail-row detail-notes"> <ArrowDownAZ size={14} className="detail-icon" /> <span className="whitespace-pre-wrap italic">{visit.notes}</span> </div>)}
                                         </div>
                                         {/* Right Actions */}
                                         <div className="visit-card-actions">
                                             <div className="flex items-center gap-2 md:mb-auto">
                                                 <button onClick={() => handleOpenEditModal(visit)} className="action-btn hover-blue" title="සංචාරය සංස්කරණය කරන්න" disabled={isSaving}><Edit size={16} /></button>
                                                 <button onClick={() => deleteVisit(visit.id)} className="action-btn hover-red" title="සංචාරය මකන්න" disabled={isSaving}><Trash2 size={16} /></button>
                                             </div>
                                             <a href={hasValidLocation ? `https://www.google.com/maps/dir/?api=1&destination=${visit.location.lat},${visit.location.lng}` : '#'} className={`btn btn-sm w-full md:w-auto ${hasValidLocation ? 'btn-outline border-blue-500 text-blue-600 hover:bg-blue-50' : 'btn-disabled-red'}`} target={hasValidLocation ? "_blank" : undefined} rel={hasValidLocation ? "noopener noreferrer" : undefined} title={!hasValidLocation ? "ස්ථානය නොමැත" : "සංචාරය කරන්න"}>
                                                {hasValidLocation ? <MapPin size={14} className="mr-1.5" /> : <AlertTriangle size={14} className="mr-1.5 text-red-600" />} සංචාරය කරන්න
                                             </a>
                                         </div>
                                     </div>
                                 </div>
                             );
                         })}
                     </div>
                 ) : ( <div className="empty-state"> {/* Empty state content */} සංචාර හමු නොවීය... </div> )}
            </div>

            {/* Edit Modal Render */}
            <EditVisitModal
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                visit={visitToEdit}
                onSave={saveVisit}
                isLoading={isSaving}
                deliveryTypes={deliveryTypes}
                allItems={allItems}
                allRoutes={allRoutes}
            />

             {/* Utility Classes & Styles (Add to global CSS or keep scoped) */}
             <style jsx global>{`
                .lbl { display: block; font-size: 0.875rem; font-weight: 500; color: #4b5563; margin-bottom: 0.25rem; }
                .lbl-xs { display: block; font-size: 0.75rem; font-weight: 500; color: #4b5563; margin-bottom: 0.25rem; }
                .input-icon { position: absolute; top: 50%; transform: translateY(-50%); display: flex; align-items: center; pointer-events: none; color: #9ca3af; }
                .spinner-xs { width: 1rem; height: 1rem; border-width: 2px; border-style: solid; border-color: transparent; border-top-color: currentcolor; border-radius: 50%; display: inline-block; animation: spin 1s linear infinite; }
                .badge { display: inline-flex; align-items: center; padding: 0.125rem 0.625rem; font-weight: 500; line-height: 1; border-radius: 9999px; font-size: 0.75rem; }
                .badge-blue { background-color: #DBEAFE; color: #1E40AF; }
                .badge-pink { background-color: #FCE7F3; color: #9D174D; }
                .badge-teal { background-color: #CCFBF1; color: #134E4A; }
                .badge-gray { background-color: #F3F4F6; color: #374151; }
                .badge-indigo { background-color: #E0E7FF; color: #3730A3; }
                .visit-card { background-color: white; border-radius: 0.5rem; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; overflow: hidden; }
                .visit-card-topbar { padding: 0.5rem 1rem; display: flex; justify-content: space-between; align-items: center; border-bottom-width: 1px; }
                .visit-card-status { display: inline-flex; align-items: center; font-size: 0.75rem; padding: 0.125rem 0.625rem; border-radius: 9999px; font-weight: 500; border-width: 1px; }
                .visit-card-type { font-size: 0.75rem; text-transform: uppercase; padding: 0.125rem 0.625rem; border-radius: 9999px; font-weight: 600; }
                .visit-card-content { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; @media (min-width: 768px) { flex-direction: row; justify-content: space-between; gap: 1rem; } }
                .visit-card-details { flex-grow: 1; display: flex; flex-direction: column; gap: 0.625rem; padding-right: 0; @media (min-width: 768px) { padding-right: 1rem; } }
                .visit-card-actions { display: flex; flex-direction: row; align-items: center; justify-content: space-between; flex-shrink: 0; gap: 0.5rem; margin-top: 0.75rem; border-top: 1px solid #f3f4f6; padding-top: 0.75rem; @media (min-width: 768px) { flex-direction: column; align-items: flex-end; gap: 0.75rem; margin-top: 0; border-top: none; padding-top: 0; } }
                .detail-row { display: flex; align-items: center; font-size: 0.875rem; color: #4b5563; }
                .detail-row-group { display: flex; flex-direction: column; gap: 0.25rem; padding-left: 1.5rem; /* Indent */ }
                .detail-icon { margin-right: 0.5rem; color: #9ca3af; flex-shrink: 0; }
                .detail-icon-sm { margin-right: 0.375rem; color: #9ca3af; flex-shrink: 0; }
                .detail-buyer { font-weight: 600; font-size: 1rem; color: #1f2937; @media (min-width: 640px) { font-size: 1.125rem; } }
                .detail-notes { padding-top: 0.5rem; margin-top: 0.5rem; border-top: 1px solid #f3f4f6; align-items: flex-start; }
                .action-btn { padding: 0.375rem; border-radius: 0.375rem; background-color: transparent; border: none; color: #6b7280; }
                .hover-blue:hover { color: #2563eb; background-color: #eff6ff; }
                .hover-red:hover { color: #dc2626; background-color: #fee2e2; }
                .btn-disabled-red { border: 1px solid #fca5a5; background-color: #fee2e2; color: #ef4444; cursor: not-allowed; opacity: 0.7; }
                .fs-0 { flex-shrink: 0; }
                .loading-placeholder { text-align: center; padding: 4rem 0; color: #6b7280; }
                .empty-state { text-align: center; padding: 4rem 1.5rem; background-color: white; border-radius: 0.5rem; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1); border: 1px solid #e5e7eb; }
                @keyframes spin { to { transform: rotate(360deg); } }
             `}</style>
        </div>
    );
};

export default VisitListPage;

// Helper type (define in types.ts or here if simple)
export interface LocationData {
    lat: number;
    lng: number;
}