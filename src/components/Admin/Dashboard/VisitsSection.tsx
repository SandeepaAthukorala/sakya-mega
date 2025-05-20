import React, { useState, useEffect, useMemo } from 'react';
import { Visit, User } from '../../../types';
import { Item, EditingCellState, NewVisitDataType, Route } from '../types';
import { HighlightMatch } from './index';
import TableSection from './TableSection';
import { supabase } from '../../../supabaseClient';
import { Map } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
    // State for routes data
    const [routesData, setRoutesData] = useState<Route[]>([]);
    
    // Fetch routes data for ID formatting
    useEffect(() => {
        const fetchRoutes = async () => {
            try {
                const { data, error } = await supabase
                    .from('routes')
                    .select('*');
                
                if (error) throw error;
                if (data) setRoutesData(data);
            } catch (error) {
                console.error('Error fetching routes:', error);
            }
        };
        
        fetchRoutes();
    }, []);
    
    // No longer need formatVisitId as we're using bill_number instead
    
    // Sort visits by bill_number in ascending order by default
    const sortedVisits = useMemo(() => {
        return [...visits].sort((a, b) => {
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
            
            // Tertiary sort by order if both have order values
            if (typeof a.order === 'number' && typeof b.order === 'number') {
                return a.order - b.order;
            }
            
            return 0; // Equal sorting value
        });
    }, [visits]);
    
    // Component state
    // Define columns for the table
    const columns = [
        {
            key: 'bill_number',
            header: 'Bill Number',
            editable: true,
            filterable: true
        },
        {
            key: 'date',
            header: 'Date',
            editable: true,
            filterable: true,
            render: (visit: Visit) => formatDateDisplay(visit.date)
        },
        {
            key: 'route_id',
            header: 'Route',
            editable: true,
            filterable: true,
            type: 'select',
            options: ['', ...routesData.map(route => ({ 
                value: route.id, 
                label: `${route.name || 'Unknown'} ${route.number || ''}`.trim() 
            }))],
            render: (visit: Visit) => (
                <div>
                    {visit.route_id ? (
                        <>
                            {routesData.find(route => route.id === visit.route_id)?.name || 'Unknown'} 
                            {routesData.find(route => route.id === visit.route_id)?.number || ''}
                        </>
                    ) : (
                        <span className="text-neutral-400">No Route</span>
                    )}
                </div>
            )
        },
        {
            key: 'ref_id',
            header: 'Ref',
            editable: true,
            filterable: true,
            type: 'select',
            options: ['', ...allRefs.map(ref => ({
                value: ref.id,
                label: `${ref.first_name || 'Unknown'} ${ref.last_name || ''}`.trim()
            }))],
            render: (visit: Visit) => (
                <div>
                    {visit.ref_id ? (
                        <>
                            {allRefs.find(ref => ref.id === visit.ref_id)?.first_name || 'Unknown'}
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
            key: 'combined_numbers',
            header: 'Phone Numbers',
            editable: true,
            filterable: true,
            render: (visit: Visit) => {
                // Get all non-empty number fields
                const numbers = [
                    visit.number_one,
                    visit.number_two,
                    visit.number_three,
                    visit.number_four
                ].filter(num => num && num.trim() !== '');
                
                if (numbers.length === 0) {
                    return <span className="text-neutral-400">No numbers</span>;
                }
                
                // Display each number on a new line
                return (
                    <div className="flex flex-col gap-1">
                        {numbers.map((number, index) => (
                            <div key={index} className="text-sm">{number}</div>
                        ))}
                    </div>
                );
            },
            // Custom handler for editing the combined numbers
            customEditHandler: async (visit: Visit, value: string, supabase: any) => {
                // When editing starts, the current values are already loaded
                // Split the input by newlines or commas (to support both formats)
                const numberArray = value.split(/[,\n]/).map(num => num.trim()).filter(num => num !== '');
                
                // Assign values to the appropriate fields (up to 4 numbers)
                const updateData: any = {
                    number_one: numberArray[0] || '',
                    number_two: numberArray[1] || '',
                    number_three: numberArray[2] || '',
                    number_four: numberArray[3] || ''
                };
                
                // Update the database
                const { error } = await supabase
                    .from('visits')
                    .update(updateData)
                    .eq('id', visit.id);
                
                if (error) throw error;
                
                // Return the updated data to update the local state
                return {
                    ...visit,
                    ...updateData
                };
            }
        },

        {
            key: 'item_id',
            header: 'Items',
            editable: true,
            filterable: true,
            type: 'custom', // Use custom type for specialized editing

            render: (visit: Visit) => {
                // Get all item numbers for this visit (item_id now stores item_numbers as strings)
                const visitItemNumbers = (visit.item_id || []) as string[];

                if (visitItemNumbers.length === 0) {
                    return <span className="text-neutral-400">No items</span>;
                }

                return (
                    <div className="flex flex-col gap-1">
                        {visitItemNumbers.map((itemNumberStr, index) => {
                            const item = items.find(i => String(i.item_number) === itemNumberStr);
                            return (
                                <div key={index} className="flex items-center gap-1">
                                    <div className="text-sm badge badge-outline">
                                        {item ? `${item.item_name} - ${item.item_number}` : `Item ${itemNumberStr} (Unknown)`}
                                    </div>
                                    <button
                                        className="btn btn-xs btn-ghost text-error"
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            // Find the index of the first occurrence of the item to remove
                                            const indexToRemove = visitItemNumbers.findIndex(num => num === itemNumberStr);
                                            
                                            // Only proceed if the item was found
                                            if (indexToRemove !== -1) {
                                                // Create a new array without the first occurrence of the item
                                                const updatedItemNumbers = [
                                                    ...visitItemNumbers.slice(0, indexToRemove),
                                                    ...visitItemNumbers.slice(indexToRemove + 1)
                                                ];
                                                
                                                try {
                                                    const { error } = await supabase
                                                        .from('visits')
                                                        .update({ item_id: updatedItemNumbers }) // Send item_numbers (strings)
                                                        .eq('id', visit.id);
                                                    if (error) throw error;
                                                    setVisits(prev => prev.map(v =>
                                                        v.id === visit.id ? { ...v, item_id: updatedItemNumbers } : v
                                                    ));
                                                } catch (error) {
                                                    console.error('Error removing item:', error);
                                                }
                                            }
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                );
            },
            customEditHandler: async (visit: Visit, value: string, supabase: any) => {
                // value is a comma-separated string of item_numbers
                const selectedItemNumbers = value.split(',').filter(num => num.trim() !== '');

                const { error } = await supabase
                    .from('visits')
                    .update({ item_id: selectedItemNumbers }) // Store item_numbers (strings)
                    .eq('id', visit.id);

                if (error) throw error;

                return {
                    ...visit,
                    item_id: selectedItemNumbers
                };
            },
            customEditor: (props: {
                value: string; // Comma-separated string of item_numbers
                onChange: (value: string) => void;
                onBlur: () => void;
                visit: Visit; // visit.item_id is string[] of item_numbers
            }) => {
                const initialItemNumbers = useMemo(() => {
                    return props.value ? props.value.split(',').filter(num => num.trim() !== '') : [];
                }, [props.value]);

                const [currentItemNumbers, setCurrentItemNumbers] = useState<string[]>(initialItemNumbers);
                const [itemNumberInput, setItemNumberInput] = useState('');

                useEffect(() => {
                    // Sync with props.value if it changes externally, but avoid infinite loops
                    const newNumbersFromProps = props.value ? props.value.split(',').filter(num => num.trim() !== '') : [];
                    if (JSON.stringify(newNumbersFromProps) !== JSON.stringify(currentItemNumbers)) {
                        setCurrentItemNumbers(newNumbersFromProps);
                    }
                }, [props.value]); // Removed currentItemNumbers from dependency array to prevent potential loops if parent re-renders often

                const updateParentState = (newNumbers: string[]) => {
                    setCurrentItemNumbers(newNumbers);
                    props.onChange(newNumbers.join(','));
                };

                const handleAddItemByInput = () => {
                    if (!itemNumberInput.trim()) return;
                    const inputNumStr = itemNumberInput.trim();

                    const foundItem = items.find(item =>
                        String(item.item_number).toLowerCase() === inputNumStr.toLowerCase()
                    );

                    if (foundItem) {
                        const foundItemNumStr = String(foundItem.item_number);
                        if (!currentItemNumbers.includes(foundItemNumStr)) {
                            updateParentState([...currentItemNumbers, foundItemNumStr]);
                        }
                        setItemNumberInput('');
                    } else {
                        alert(`Item number "${inputNumStr}" not found.`);
                    }
                };

                const handleItemSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
                    const selectedNumStr = e.target.value;
                    if (!selectedNumStr) return;

                    if (!currentItemNumbers.includes(selectedNumStr)) {
                        updateParentState([...currentItemNumbers, selectedNumStr]);
                    }
                    e.target.value = ''; // Reset select to placeholder
                };

                const handleRemoveItem = (itemNumToRemoveStr: string) => {
                    // Find the index of the first occurrence of the item to remove
                    const indexToRemove = currentItemNumbers.findIndex(num => num === itemNumToRemoveStr);
                    
                    // Only proceed if the item was found
                    if (indexToRemove !== -1) {
                        // Create a new array without the first occurrence of the item
                        const updatedItemNumbers = [
                            ...currentItemNumbers.slice(0, indexToRemove),
                            ...currentItemNumbers.slice(indexToRemove + 1)
                        ];
                        updateParentState(updatedItemNumbers);
                    }
                };

                const handleKeyPress = (e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItemByInput();
                    }
                };

                return (
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                placeholder="Enter item number..."
                                value={itemNumberInput}
                                onChange={(e) => setItemNumberInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                            />
                            <button
                                className="btn btn-primary"
                                onClick={handleAddItemByInput}
                                type="button"
                            >
                                Add
                            </button>
                        </div>

                        <select
                            className="select select-bordered w-full"
                            onChange={handleItemSelectChange}
                            defaultValue="" 
                        >
                            <option value="" disabled>Or select an item from list...</option>
                            {items.map(item => (
                                <option
                                    key={item.id} 
                                    value={String(item.item_number)} 
                                    disabled={currentItemNumbers.includes(String(item.item_number))}
                                >
                                    {item.item_number} - {item.item_name}
                                </option>
                            ))}
                        </select>

                        <div className="flex flex-col gap-1 mt-2">
                            {currentItemNumbers.length > 0 ? (
                                currentItemNumbers.map(itemNumStr => {
                                    const item = items.find(i => String(i.item_number) === itemNumStr);
                                    return (
                                        <div key={itemNumStr} className="flex items-center gap-1">
                                            <div className="text-sm badge badge-outline">
                                                {item ? `${item.item_number} - ${item.item_name}` : `Item ${itemNumStr} (Data Missing)`}
                                            </div>
                                            <button
                                                className="btn btn-xs btn-ghost text-error"
                                                onClick={() => handleRemoveItem(itemNumStr)}
                                                type="button"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <span className="text-neutral-400">No items selected</span>
                            )}
                        </div>

                        <input
                            type="hidden"
                            value={currentItemNumbers.join(',')}
                            onBlur={props.onBlur} 
                        />
                    </div>
                );
            },
            getEditValue: (visit: Visit) => {
                const visitItemNumbers = (visit.item_id || []) as string[];
                return visitItemNumbers.join(',');
            }
        },
        {
            key: 'notes',
            header: 'Notes',
            editable: true,
            filterable: true
        },
        {
            key: 'total_price',
            header: 'Total Price',
            editable: false,
            filterable: false,
            render: (visit: Visit) => {
                // Calculate total price for this visit
                const visitItemNumbers = (visit.item_id || []) as string[];
                const totalPrice = visitItemNumbers.reduce((sum, itemNumberStr) => {
                    const item = items.find(i => String(i.item_number) === itemNumberStr);
                    return sum + (item?.value || 0);
                }, 0);
                
                return (
                    <div className="font-semibold text-right">
                        {totalPrice > 0 ? `Rs.${totalPrice.toFixed(2)}` : <span className="text-neutral-400">Rs.0.00</span>}
                    </div>
                );
            }
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
    
    // Define type filters
    const typeFilters = useMemo(() => {
        return deliveryTypes.map(type => ({
            key: `type-${type}`,
            label: type,
            filter: (visit: Visit) => visit.type === type
        }));
    }, [deliveryTypes]);
    
    // Define status filters
    const statusFilters = useMemo(() => {
        return visitStatuses.map(status => ({
            key: `status-${status}`,
            label: status,
            filter: (visit: Visit) => visit.status === status
        }));
    }, [visitStatuses]);
    
    // Add route filters based on available routes
    const routeFilters = useMemo(() => {
        // Create a filter for visits with no route assigned
        const noRouteFilter = {
            key: 'no-route',
            label: 'No Route',
            filter: (visit: Visit) => !visit.route_id
        };
        
        // Create filters for each route
        const routeSpecificFilters = routesData.map(route => ({
            key: `route-${route.id}`,
            label: `${route.name} ${route.number}`,
            filter: (visit: Visit) => visit.route_id === route.id
        }));
        
        return [noRouteFilter, ...routeSpecificFilters];
    }, [routesData]);
    
    // Combine all filters
    const allFilters = [...filters, ...routeFilters, ...typeFilters, ...statusFilters];

    // Handle adding a new visit
    const handleAddVisit = async (activeFilter: string = 'all') => {
        // Check if we have any routes available
        if (routesData.length === 0) {
            console.error('Cannot add visit: No routes available');
            return;
        }
        
        // Extract filter values from activeFilter
        let selectedRouteId = null;
        let selectedType = 'Sample';
        let selectedStatus = 'Pending';
        
        // Check if a specific route is selected
        if (activeFilter.startsWith('route-')) {
            const routeId = activeFilter.replace('route-', '');
            selectedRouteId = routeId;
        }
        
        // Check if a specific type is selected
        if (activeFilter.startsWith('type-')) {
            const type = activeFilter.replace('type-', '');
            if (deliveryTypes.includes(type as Visit['type'])) {
                selectedType = type as Visit['type'];
            }
        }
        
        // Check if a specific status is selected
        if (activeFilter.startsWith('status-')) {
            const status = activeFilter.replace('status-', '');
            if (visitStatuses.includes(status as Visit['status'])) {
                selectedStatus = status as Visit['status'];
            }
        }
        
        // Use the selected route or default to the first route
        const defaultRouteId = selectedRouteId || (routesData.length > 0 ? routesData[0].id : null);
        
        // Find the highest order in the selected route
        let highestOrder = 0;
        if (defaultRouteId) {
            const visitsInSelectedRoute = visits.filter(v => v.route_id === defaultRouteId);
            highestOrder = visitsInSelectedRoute.length > 0 
                ? Math.max(...visitsInSelectedRoute.map(v => v.order || 0)) 
                : 0;
        }
        
        // Create a basic new visit with values based on selected filters
        const newVisit: NewVisitDataType = {
            buyer_name: 'New Visit',
            date: new Date().toISOString(),
            type: selectedType,
            status: selectedStatus,
            ref_id: allRefs.length > 0 ? allRefs[0].id : null,
            address: '',
            location: { lat: 0, lng: 0 },
            number_one: '',
            number_two: '',
            number_three: '',
            number_four: '',
            route_id: defaultRouteId,
            order: defaultRouteId ? highestOrder + 1 : null, // Set order only if route is selected
            item_id: [] // Initialize with empty array of items
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
    
    // Handle drag end event for reordering visits
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        
        if (!over || active.id === over.id) {
            return;
        }
        
        // Find the dragged visit and the target visit
        const draggedVisit = visits.find(visit => visit.id === active.id);
        const targetVisit = visits.find(visit => visit.id === over.id);
        
        if (!draggedVisit || !targetVisit) {
            return;
        }
        
        // Only allow reordering within the same route
        if (draggedVisit.route_id !== targetVisit.route_id) {
            return;
        }
        
        // Update the local state first for immediate UI feedback
        const oldIndex = sortedVisits.findIndex(visit => visit.id === active.id);
        const newIndex = sortedVisits.findIndex(visit => visit.id === over.id);
        
        const newVisits = arrayMove(sortedVisits, oldIndex, newIndex);
        
        // Get only the visits that belong to the same route as the dragged visit
        const routeVisits = newVisits.filter(visit => visit.route_id === draggedVisit.route_id);
        
        // Assign new order values (1-based) while preserving the original order values
        // This ensures we only update the order field in the database when necessary
        const updatedVisits = routeVisits.map((visit, index) => {
            const newOrder = index + 1;
            // Only update the order if it's different from the current order
            return visit.order !== newOrder ? {
                ...visit,
                order: newOrder
            } : visit;
        });
        
        // Update the local state
        setVisits(prev => {
            const otherVisits = prev.filter(visit => visit.route_id !== draggedVisit.route_id);
            return [...otherVisits, ...updatedVisits];
        });
        
        // Update the database - only update visits whose order has changed
        try {
            // Create an array of updates for visits whose order has changed
            const visitsToUpdate = updatedVisits.filter(visit => {
                const originalVisit = visits.find(v => v.id === visit.id);
                return originalVisit && originalVisit.order !== visit.order;
            });
            
            if (visitsToUpdate.length === 0) {
                return; // No order changes needed
            }
            
            // Batch update all changed visits
            for (const visit of visitsToUpdate) {
                const { error } = await supabase
                    .from('visits')
                    .update({ order: visit.order })
                    .eq('id', visit.id);
                
                if (error) {
                    console.error(`Error updating visit order for ID ${visit.id}:`, error);
                }
            }
            
            console.log(`Updated order for ${visitsToUpdate.length} visits`);
        } catch (error) {
            console.error('Error updating visit orders:', error);
        }
    };



    // Set up DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Minimum drag distance before activation
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    
    // Calculate grand total for all filtered visits
    const calculateGrandTotal = (filteredVisits: Visit[]) => {
        return filteredVisits.reduce((total, visit) => {
            const visitItemNumbers = (visit.item_id || []) as string[];
            const visitTotal = visitItemNumbers.reduce((sum, itemNumberStr) => {
                const item = items.find(i => String(i.item_number) === itemNumberStr);
                return sum + (item?.value || 0);
            }, 0);
            return total + visitTotal;
        }, 0);
    };

    return (
        <>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext 
                    items={sortedVisits.map(visit => visit.id)} // Still using ID for unique identification in drag-drop
                    strategy={horizontalListSortingStrategy}
                >
                    <TableSection
                        title="Visits"
                        data={sortedVisits}
                        setData={setVisits}
                        columns={columns}
                        tableName="visits"
                        itemType="visit"
                        searchPlaceholder="Search visits..."
                        filters={allFilters}
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
                        isDraggable={true}
                        renderSummary={(filteredData) => (
                            <div className="mt-4 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-gray-700">Grand Total:</span>
                                    <span className="font-bold text-lg text-gray-900">
                                        Rs.{calculateGrandTotal(filteredData as Visit[]).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        )}
                    />
                </SortableContext>
            </DndContext>
        </>
    );
};

export default VisitsSection;