import React, { useState } from 'react';
import { Visit, User } from '../../../types';
import { Item, EditingCellState, NewVisitDataType } from '../types';
import { HighlightMatch } from './index';
import TableSection from './TableSection';
import { supabase } from '../../../supabaseClient';
import { Map } from 'lucide-react';

interface VisitsSectionProps {
    visits: Visit[];
    setVisits: React.Dispatch<React.SetStateAction<Visit[]>>;
    users: User[];
    allRefs: User[];
    items: Item[];
    editingCell: EditingCellState;
    setEditingCell: React.Dispatch<React.SetStateAction<EditingCellState>>;
    editValue: any;
    setEditValue: React.Dispatch<React.SetStateAction<any>>;
    isLoadingInline: boolean;
    setIsLoadingInline: React.Dispatch<React.SetStateAction<boolean>>;
    inputRef: React.RefObject<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
    isEditingOrAdding: boolean;
    deliveryTypes: Visit['type'][];
    visitStatuses: Visit['status'][];
    todayString: string;
    thisWeekStart: string;
    thisWeekEnd: string;
    formatDateDisplay: (d: string | null | undefined) => string;
}

const VisitsSection: React.FC<VisitsSectionProps> = ({
    visits,
    setVisits,
    users,
    allRefs,
    items,
    editingCell,
    setEditingCell,
    editValue,
    setEditValue,
    isLoadingInline,
    setIsLoadingInline,
    inputRef,
    isEditingOrAdding,
    deliveryTypes,
    visitStatuses,
    todayString,
    thisWeekStart,
    thisWeekEnd,
    formatDateDisplay
}) => {
    // State for proximity sorting
    const [startLat, setStartLat] = useState(() => localStorage.getItem('lastLat') || '');
    const [startLng, setStartLng] = useState(() => localStorage.getItem('lastLng') || '');
    const [sortedByProximity, setSortedByProximity] = useState<boolean>(false);
    // Define columns for the table
    const columns = [
        {
            key: 'date',
            header: 'Date',
            editable: true,
            filterable: true,
            render: (visit: Visit) => formatDateDisplay(visit.date)
        },
        {
            key: 'ref_id',
            header: 'Ref',
            editable: true,
            filterable: true,
            type: 'select',
            options: ['', ...allRefs.map(ref => ref.id)],
            render: (visit: Visit) => (
                <div>
                    {visit.ref_id ? (
                        <>
                            {allRefs.find(ref => ref.id === visit.ref_id)?.first_name || 'Unknown'} 
                            {allRefs.find(ref => ref.id === visit.ref_id)?.last_name || ''}
                        </>
                    ) : (
                        <span className="text-neutral-400">Unassigned</span>
                    )}
                </div>
            )
        },
        {
            key: 'type',
            header: 'Type',
            editable: true,
            filterable: true,
            type: 'select',
            options: deliveryTypes,
            render: (visit: Visit) => (
                <span className={`badge ${visit.type === 'Sample' ? 'badge-primary' : visit.type === 'Sittu' ? 'badge-secondary' : 'badge-accent'}`}>
                    {visit.type}
                </span>
            )
        },
        {
            key: 'status',
            header: 'Status',
            editable: true,
            filterable: true,
            type: 'select',
            options: visitStatuses,
            render: (visit: Visit) => (
                <span className={`badge ${visit.status === 'Completed' ? 'badge-success' : visit.status === 'Pending' ? 'badge-warning' : 'badge-error'}`}>
                    {visit.status}
                </span>
            )
        },
        {
            key: 'buyer_name',
            header: 'Buyer',
            editable: true,
            filterable: true
        },
        {
            key: 'navigation',
            header: 'Navigation',
            editable: false,
            filterable: false,
            render: (visit: Visit) => {
                // Check if location data exists and is valid
                const hasValidLocation = visit.location && 
                    typeof visit.location.lat === 'number' && 
                    typeof visit.location.lng === 'number' && 
                    (visit.location.lat !== 0 || visit.location.lng !== 0);
                
                if (!hasValidLocation) {
                    return <span className="text-neutral-400">No location</span>;
                }
                
                // Create Google Maps URL
                const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${visit.location.lat},${visit.location.lng}`;
                
                return (
                    <a 
                        href={googleMapsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-primary text-white"
                        title="Open in Google Maps"
                    >
                        <Map size={18} />
                    </a>
                );
            }
        }
    ];

    // Define filters
    const filters = [
        {
            key: 'today',
            label: 'Today',
            filter: (visit: Visit) => visit.date.split('T')[0] === todayString
        },
        {
            key: 'all-days',
            label: 'All Days',
            filter: () => true
        }
    ];

    // Handle adding a new visit
    const handleAddVisit = async () => {
        // Create a basic new visit with default values
        const newVisit: NewVisitDataType = {
            buyer_name: 'New Visit',
            date: new Date().toISOString(),
            type: 'Sample',
            status: 'Pending',
            ref_id: allRefs.length > 0 ? allRefs[0].id : null,
            address: '',
            location: { lat: 0, lng: 0 },
            mobile_phone: ''
        };

        try {
            const { data, error } = await supabase
                .from('visits')
                .insert(newVisit)
                .select()
                .single();

            if (error) throw error;
            if (data) {
                setVisits(prev => [data, ...prev]);
            }
        } catch (error) {
            console.error('Error adding new visit:', error);
        }
    };

    // Calculate distance between two points using Haversine formula
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const R = 6371; // Radius of the Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Distance in km
    };

    // Sort visits by proximity to starting location
    const handleSortByProximity = () => {
        // Validate inputs
        const lat = parseFloat(startLat);
        const lng = parseFloat(startLng);
        
        if (isNaN(lat) || isNaN(lng)) {
            alert('Please enter valid latitude and longitude values');
            return;
        }
        
        // Create a copy of visits with distance calculated
        const visitsWithDistance = visits.map(visit => {
            // Check if location data exists and is valid
            const hasValidLocation = visit.location && 
                typeof visit.location.lat === 'number' && 
                typeof visit.location.lng === 'number' && 
                (visit.location.lat !== 0 || visit.location.lng !== 0);
            
            // Calculate distance or set to Infinity if no valid location
            const distance = hasValidLocation 
                ? calculateDistance(lat, lng, visit.location.lat, visit.location.lng)
                : Infinity;
                
            return { ...visit, distance };
        });
        
        // Sort by distance (ascending)
        const sorted = [...visitsWithDistance].sort((a, b) => a.distance - b.distance);
        
        // Update visits with sorted data
        setVisits(sorted);
        setSortedByProximity(true);
    };

    return (
        <>
            {/* Proximity Sorting UI */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-4">
                <h3 className="text-lg font-bold mb-3">Sort Visits by Proximity</h3>
                <div className="flex flex-wrap gap-3 items-end">
                    <div>
                        <label className="block text-sm font-medium mb-1">Latitude</label>
                        <input 
                            type="text" 
                            className="input input-bordered w-full max-w-xs" 
                            placeholder="e.g. 7.7187474"
                            value={startLat}
                            onChange={(e) => {
                                setStartLat(e.target.value);
                                localStorage.setItem('lastLat', e.target.value);
                            }}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Longitude</label>
                        <input 
                            type="text" 
                            className="input input-bordered w-full max-w-xs" 
                            placeholder="e.g. 80.3625707"
                            value={startLng}
                            onChange={(e) => {
                                setStartLng(e.target.value);
                                localStorage.setItem('lastLng', e.target.value);
                            }}
                        />
                    </div>
                    <button 
                        className="btn btn-primary"
                        onClick={handleSortByProximity}
                    >
                        Sort by Nearest
                    </button>
                    {sortedByProximity && (
                        <div className="text-sm text-success">
                            Visits sorted by proximity to ({startLat}, {startLng})
                        </div>
                    )}
                </div>
            </div>
            
            <TableSection
                title="Visits"
                data={visits}
                setData={setVisits}
                columns={columns}
                tableName="visits"
                itemType="visit"
                searchPlaceholder="Search visits..."
                filters={filters}
                onAddItem={handleAddVisit}
                addButtonText="Add Visit"
                editingCell={editingCell}
                setEditingCell={setEditingCell}
                editValue={editValue}
                setEditValue={setEditValue}
                isLoadingInline={isLoadingInline}
                setIsLoadingInline={setIsLoadingInline}
                inputRef={inputRef}
                dateField="date"
            />
        </>
    );
};

export default VisitsSection;