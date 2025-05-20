// First, install react-select by running:
// npm install react-select

import React, { useState, useEffect } from 'react';
import Select, { createFilter, SingleValue } from 'react-select';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Phone, User, FileText, Check, ChevronDown, Calendar, Route, Package, Plus, Trash2, ClipboardList } from 'lucide-react'; // Added ClipboardList, Plus, Trash2
import { supabase } from '../supabaseClient';

// --- Custom Filter for react-select ---
const filterConfig = {
    ignoreCase: true,
    matchFrom: 'any', // 'start' or 'any'
    trim: true,
};

const formatOptionLabel = (option: any) => (
    <div>
      <span>{option.label}</span>
    </div>
  );

const customFilter = (option: any, rawInput: string) => {
    return createFilter(filterConfig)(option, rawInput);
};
// --- End Custom Filter ---


// Add custom styles for react-select
const customStyles = {
    control: (provided: any, state: any) => ({
        ...provided,
        minHeight: '42px',
        paddingLeft: '40px',
        borderColor: state.isFocused ? '#a5b4fc' : '#d1d5db',
        '&:hover': { borderColor: '#d1d5db' },
        boxShadow: state.isFocused ? '0 0 0 1px #a5b4fc' : 'none',
        borderRadius: '0.375rem',
    }),
    input: (provided: any) => ({
        ...provided,
        paddingLeft: '0px',
        marginLeft: '0px',
        color: '#1f2937',
    }),
    valueContainer: (provided: any) => ({
        ...provided,
        padding: '2px 8px',
    }),
    placeholder: (provided: any) => ({
        ...provided,
        color: '#6b7280',
    }),
    singleValue: (provided: any) => ({
        ...provided,
        color: '#1f2937',
    }),
    dropdownIndicator: (provided: any) => ({
        ...provided,
        padding: '8px',
        color: '#6b7280',
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    menu: (provided: any) => ({
        ...provided,
        zIndex: 50,
    }),
};

// Define a type for the select options
interface SelectOption {
    value: string; // Typically the ID
    label: string; // Display text
}


const VisitFormPage: React.FC = () => {
    const [buyerName, setBuyerName] = useState('');
    // States for the number fields from SQL schema
    const [number_one, setNumberOne] = useState('');
    const [number_two, setNumberTwo] = useState('');
    const [number_three, setNumberThree] = useState('');
    const [number_four, setNumberFour] = useState('');
    const [billNumber, setBillNumber] = useState('');

    const [visitType, setVisitType] = useState<'Sample' | 'Sittu' | 'Over'>('Sample');
    const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

    // --- Item Selection States ---
    const [items, setItems] = useState<{ id: string; item_name: string; item_number: number; value: number }[]>([]);
    const [currentItemToAdd, setCurrentItemToAdd] = useState<SelectOption | null>(null);
    const [addedItems, setAddedItems] = useState<SelectOption[]>([]); // List of items added

    const [routeId, setRouteId] = useState<SelectOption | null>(null);
    const [routes, setRoutes] = useState<{ id: string; name: string; number: number }[]>([]);

    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [locationError, setLocationError] = useState('');
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [address, setAddress] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [formError, setFormError] = useState('');

    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRoutes = async () => {
            try {
                const { data, error } = await supabase
                    .from('routes')
                    .select('id, name, number');

                if (error) {
                    console.error('Error fetching routes:', error);
                    setFormError('මාර්ග පූරණය කිරීමට අසමත් විය');
                } else {
                    setRoutes(data || []);
                }
            } catch (error) {
                console.error('Error fetching routes:', error);
                setFormError('මාර්ග පූරණය කිරීමේදී දෝෂයක් ඇති විය');
            }
        };

        const fetchItems = async () => {
            try {
                const { data, error } = await supabase
                    .from('items')
                    .select('id, item_name, item_number, value');

                if (error) {
                    console.error('Error fetching items:', error);
                    setFormError('භාණ්ඩ පූරණය කිරීමට අසමත් විය');
                } else {
                    setItems(data || []);
                }
            } catch (error) {
                console.error('Error fetching items:', error);
                setFormError('භාණ්ඩ පූරණය කිරීමේදී දෝෂයක් ඇති විය');
            }
        };

        fetchRoutes();
        fetchItems();
    }, []);

    const itemOptions: SelectOption[] = items.map(item => ({
        value: item.item_number,
        label: `${item.item_name} (${item.item_number}) - Rs.${item.value ?? 0}`
    }));

    const routeOptions: SelectOption[] = routes.map(route => ({
        value: route.id,
        label: `${route.name} (${route.number})`
    }));

    const handleAddItem = () => {
        if (currentItemToAdd) {
            setAddedItems(prevItems => [...prevItems, currentItemToAdd]);
            setCurrentItemToAdd(null);
            setFormError('');
        } else {
            setFormError("කරුණාකර එකතු කිරීමට භාණ්ඩයක් තෝරන්න.");
        }
    };

    const handleRemoveItem = (indexToRemove: number) => {
        setAddedItems(prevItems => prevItems.filter((_, index) => index !== indexToRemove));
    };

    const getCurrentLocation = () => {
        setIsGettingLocation(true);
        setLocationError('');
        setFormError('');

        if (!navigator.geolocation) {
            setLocationError('ඔබගේ බ්‍රවුසරය භූගෝලීය ස්ථානගත කිරීම සඳහා සහාය නොදක්වයි');
            setIsGettingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setIsGettingLocation(false);
            },
            (error) => {
                let errorMsg = 'ස්ථානය ලබා ගැනීමට අසමත් විය';
                switch (error.code) {
                    case error.PERMISSION_DENIED: errorMsg = 'ස්ථාන ප්‍රවේශය ප්‍රතික්ෂේප කර ඇත. කරුණාකර ස්ථාන සේවා සක්‍රීය කරන්න.'; break;
                    case error.POSITION_UNAVAILABLE: errorMsg = 'ස්ථාන තොරතුරු නොමැත.'; break;
                    case error.TIMEOUT: errorMsg = 'ස්ථාන ඉල්ලීම කල් ඉකුත් විය.'; break;
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
            setLocationError('කරුණාකර පළමුව ඔබගේ වත්මන් භූගෝලීය ඛණ්ඩාංක ලබා ගන්න');
            return;
        }
        if (!address) {
            setFormError('කරුණාකර ලිපිනය ඇතුළත් කරන්න');
            return;
        }
        if (addedItems.length === 0) {
            setFormError('කරුණාකර සංචාරයට අවම වශයෙන් එක් භාණ්ඩයක් වත් එකතු කරන්න');
            return;
        }
        if (!routeId) {
            setFormError('කරුණාකර මාර්ගයක් තෝරන්න');
            return;
        }

        setIsSubmitting(true);

        try {
            const itemIds = addedItems.map(item => item.value);

            const visitData = {
                ref_id: user?.id,
                buyer_name: buyerName,
                // Use new state variables for numbers and bill_number
                number_one: number_one || null,
                number_two: number_two || null,
                number_three: number_three || null,
                number_four: number_four || null,
                bill_number: billNumber || null,
                location: { lat: location.lat, lng: location.lng },
                address: address,
                date: new Date(visitDate).toISOString(),
                type: visitType,
                status: 'Pending',
                notes: notes || null,
                item_id: itemIds,
                route_id: routeId?.value || null,
            };

            console.log("Submitting Visit Data:", visitData);

            const { data, error } = await supabase
                .from('visits')
                .insert(visitData)
                .select()
                .single();

            if (error) {
                console.error('Error saving visit:', error);
                setFormError(`සංචාරය සුරැකීමට අසමත් විය: ${error.message}`);
                throw error;
            }

            console.log("Visit Saved Successfully:", data);
            setShowSuccess(true);

            setBuyerName('');
            // Reset new number and bill_number states
            setNumberOne('');
            setNumberTwo('');
            setNumberThree('');
            setNumberFour('');
            setBillNumber('');
            setVisitType('Sample');
            setVisitDate(new Date().toISOString().split('T')[0]);
            setNotes('');
            setCurrentItemToAdd(null);
            setAddedItems([]);
            setRouteId(null); // Corrected reset for routeId
            setLocation(null);
            setAddress('');
            setFormError('');
            setLocationError('');

            setTimeout(() => {
                navigate('/visits');
            }, 2000);

        } catch (error: any) {
            if (!formError) {
                console.error('Error in handleSubmit:', error.message);
                setFormError('සංචාරය සුරැකීමේදී අනපේක්ෂිත දෝෂයක් ඇති විය.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (showSuccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] animate-fade-in">
                <div className="bg-green-100 p-4 rounded-full mb-4">
                    <Check size={48} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-gray-800">සංචාරය වාර්තා කරන ලදී!</h2>
                <p className="text-neutral-600 text-center mb-6">
                    සංචාරය සාර්ථකව වාර්තා කර ඇත.
                </p>
                <p className="text-sm text-neutral-500">සංචාර ලැයිස්තුවට යොමු වෙමින්...</p>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto py-6 animate-fade-in">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">නව සංචාරයක් වාර්තා කරන්න</h1>

            {formError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 text-sm rounded-md">
                    {formError}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="card p-6 bg-white shadow rounded-lg">
                    <h2 className="text-lg font-medium mb-4 text-gray-700">සංචාර විස්තර</h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="visitDate" className="block text-sm font-medium text-neutral-700 mb-1">
                                සංචාර දිනය
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
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
                                ගනුදෙනුකරුගේ නම
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                                    <User size={18} className="text-neutral-500" />
                                </div>
                                <input
                                    type="text"
                                    id="buyerName"
                                    value={buyerName}
                                    onChange={(e) => setBuyerName(e.target.value)}
                                    className="input pl-10"
                                    required
                                    placeholder="නම"
                                />
                            </div>
                        </div>

                        {/* Number One (was mobile_phone) */}
                        <div>
                            <label htmlFor="number_one" className="block text-sm font-medium text-neutral-700 mb-1">
                                අංක 1
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                                    <Phone size={18} className="text-neutral-500" />
                                </div>
                                <input
                                    type="tel"
                                    id="number_one"
                                    value={number_one}
                                    onChange={(e) => setNumberOne(e.target.value)}
                                    className="input pl-10"
                                    required // As per original form, SQL allows NULL
                                    placeholder="දුරකථන අංකය (උදා: 07xxxxxxxx)"
                                    pattern="[0-9]{10,15}"
                                />
                            </div>
                        </div>

                        {/* Number Two (was land_phone) */}
                        <div>
                            <label htmlFor="number_two" className="block text-sm font-medium text-neutral-700 mb-1">
                                අංක 2 (විකල්ප)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                                    <Phone size={18} className="text-neutral-500" />
                                </div>
                                <input
                                    type="tel"
                                    id="number_two"
                                    value={number_two}
                                    onChange={(e) => setNumberTwo(e.target.value)}
                                    className="input pl-10"
                                    placeholder="දෙවන දුරකථන අංකය"
                                    pattern="[0-9]{9,15}"
                                />
                            </div>
                        </div>
                        
                        {/* Number Three */}
                        <div>
                            <label htmlFor="number_three" className="block text-sm font-medium text-neutral-700 mb-1">
                                අංක 3 (විකල්ප)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                                    <Phone size={18} className="text-neutral-500" />
                                </div>
                                <input
                                    type="tel"
                                    id="number_three"
                                    value={number_three}
                                    onChange={(e) => setNumberThree(e.target.value)}
                                    className="input pl-10"
                                    placeholder="තෙවන දුරකථන අංකය"
                                    pattern="[0-9]{9,15}"
                                />
                            </div>
                        </div>

                        {/* Number Four */}
                        <div>
                            <label htmlFor="number_four" className="block text-sm font-medium text-neutral-700 mb-1">
                                අංක 4 (විකල්ප)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                                    <Phone size={18} className="text-neutral-500" />
                                </div>
                                <input
                                    type="tel"
                                    id="number_four"
                                    value={number_four}
                                    onChange={(e) => setNumberFour(e.target.value)}
                                    className="input pl-10"
                                    placeholder="සිව්වන දුරකථන අංකය"
                                    pattern="[0-9]{9,15}"
                                />
                            </div>
                        </div>

                        {/* Bill Number */}
                        <div>
                            <label htmlFor="bill_number" className="block text-sm font-medium text-neutral-700 mb-1">
                                බිල්පත් අංකය (විකල්ප)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                                    <FileText size={18} className="text-neutral-500" />
                                </div>
                                <input
                                    type="text"
                                    id="bill_number"
                                    value={billNumber}
                                    onChange={(e) => setBillNumber(e.target.value)}
                                    className="input pl-10"
                                    placeholder="බිල්පත් අංකය"
                                />
                            </div>
                        </div>
                        
                        {/* Notes - Single instance of Notes field */}
                        <div>
                            <label htmlFor="notes" className="block text-sm font-medium text-neutral-700 mb-1">
                                සටහන් (විකල්ප)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 pt-2 flex items-start pointer-events-none z-20">
                                    <ClipboardList size={18} className="text-neutral-500" />
                                </div>
                                <textarea
                                    id="notes" // ID is now unique
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="input pl-10 h-24" // Or min-h-[100px]
                                    placeholder="සටහන්"
                                />
                            </div>
                        </div>

                        {/* Item Selection Area */}
                        <div>
                            <label htmlFor="itemToAdd" className="block text-sm font-medium text-neutral-700 mb-1">
                                භාණ්ඩ තෝරන්න
                            </label>
                            <div className="flex items-center space-x-2">
                                <div className="relative flex-grow">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                                        <Package size={18} className="text-neutral-500" />
                                    </div>
                                    <Select
                                        inputId="itemToAdd"
                                        options={itemOptions}
                                        value={currentItemToAdd}
                                        onChange={(selectedOption) => setCurrentItemToAdd(selectedOption as SingleValue<SelectOption>)}
                                        placeholder="භාණ්ඩ සොයන්න සහ තෝරන්න..."
                                        styles={customStyles}
                                        isSearchable
                                        isClearable
                                        filterOption={customFilter}
                                        formatOptionLabel={formatOptionLabel}
                                        className="react-select-container"
                                        classNamePrefix="react-select"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    disabled={!currentItemToAdd || isSubmitting}
                                    className="btn btn-secondary p-2 h-[42px]"
                                    title="තෝරාගත් භාණ්ඩය ලැයිස්තුවට එකතු කරන්න"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>

                        {addedItems.length > 0 && (
                            <div className="mt-3 space-y-2">
                                <h3 className="text-sm font-medium text-neutral-700">එකතු කළ භාණ්ඩ:</h3>
                                <ul className="border border-neutral-200 rounded-md p-2 bg-neutral-50 max-h-32 overflow-y-auto">
                                    {addedItems.map((item, index) => (
                                        <li key={`${item.value}-${index}`}
                                            className="flex justify-between items-center py-1 px-2 text-sm text-neutral-800 hover:bg-neutral-100 rounded"
                                        >
                                            <span>{item.label}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(index)}
                                                disabled={isSubmitting}
                                                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100"
                                                title="මෙම භාණ්ඩය ඉවත් කරන්න"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Route Selector */}
                        <div>
                            <label htmlFor="routeId" className="block text-sm font-medium text-neutral-700 mb-1">
                                මාර්ගය
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                                    <Route size={18} className="text-neutral-500" />
                                </div>
                                <Select
                                    options={routeOptions}
                                    value={routeId}
                                    onChange={(selected) => setRouteId(selected as SingleValue<SelectOption>)}
                                    styles={customStyles}
                                    placeholder="මාර්ගය තෝරන්න..."
                                    filterOption={customFilter}
                                    formatOptionLabel={formatOptionLabel}
                                    className="react-select-container"
                                    classNamePrefix="react-select"
                                />
                            </div>
                        </div>

                        {/* Visit Type */}
                        <div>
                            <label htmlFor="visitType" className="block text-sm font-medium text-neutral-700 mb-1">
                                සංචාර වර්ගය
                            </label>
                            <div className="relative">
                                <select
                                    id="visitType"
                                    value={visitType}
                                    onChange={(e) => setVisitType(e.target.value as 'Sample' | 'Sittu' | 'Over')}
                                    className="input pr-10 appearance-none"
                                    required
                                >
                                    <option value="Sample">සාම්පල</option>
                                    <option value="Sittu">සිට්ටු</option>
                                    <option value="Over">ඕවර්</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <ChevronDown size={18} className="text-neutral-500" />
                                </div>
                            </div>
                        </div>
                        {/* Second notes field removed from here to avoid duplication */}
                    </div>
                </div>

                {/* Location Card */}
                <div className="card p-6 bg-white shadow rounded-lg">
                    <h2 className="text-lg font-medium mb-4 text-gray-700">ස්ථානය</h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-neutral-700 mb-1">
                                ලිපිනය
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                    <MapPin size={18} className="text-neutral-500" />
                                </div>
                                <input
                                    type="text"
                                    id="address"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="input pl-10"
                                    placeholder="ලිපිනය ඇතුළත් කරන්න"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="button"
                                onClick={getCurrentLocation}
                                disabled={isGettingLocation || isSubmitting}
                                className="btn btn-secondary w-full flex items-center justify-center"
                            >
                                {isGettingLocation ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current mr-2"></div>
                                        ඛණ්ඩාංක ලබා ගනිමින්...
                                    </>
                                ) : location ? (
                                    <>
                                        <Check size={18} className="mr-2 text-green-600" />
                                        භූගෝලීය ඛණ්ඩාංක ලබාගත් (යාවත්කාලීන කරන්නද?)
                                    </>
                                ) : (
                                    <>
                                        <MapPin size={18} className="mr-2" />
                                        වත්මන් භූගෝලීය ඛණ්ඩාංක ලබාගන්න
                                    </>
                                )}
                            </button>

                            {locationError && (
                                <p className="text-red-600 text-sm mt-2">{locationError}</p> 
                            )}

                            {location && (
                                <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-200">
                                    <p className="text-sm font-medium text-green-700 flex items-center">
                                        <Check size={16} className="mr-1.5" /> භූගෝලීය ඛණ්ඩාංක ලබාගත්:
                                    </p>
                                    <p className="text-xs text-neutral-600 mt-1 pl-5">
                                        Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                                    </p>
                                </div>
                            )}
                             {!location && address && (
                                <p className="text-xs text-neutral-500 mt-2 pl-1">භූගෝලීය ඛණ්ඩාංක ලබා ගැනීමට මතක තබා ගන්න.</p>
                             )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="btn btn-outline"
                        disabled={isSubmitting}
                    >
                        අවලංගු කරන්න
                    </button>
                    <button
                        type="submit"
                        disabled={
                            isSubmitting ||
                            !location ||
                            !address ||
                            addedItems.length === 0 ||
                            !routeId ||
                            !buyerName || // Added common required fields for better UX on button disable
                            !number_one   // Example: if number_one is truly required
                        }
                        className="btn btn-primary"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                සංචාරය සුරකිමින්...
                            </>
                        ) : (
                            'සංචාරය සුරකින්න'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default VisitFormPage;