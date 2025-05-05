import React from 'react';
import { Visit, User } from '../../../types';
import { Item, EditingCellState, NewVisitDataType } from '../types';
import { HighlightMatch } from './index';
import TableSection from './TableSection';
import { supabase } from '../../../supabaseClient';

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
            key: 'this-week',
            label: 'This Week',
            filter: (visit: Visit) => {
                const visitDate = visit.date.split('T')[0];
                return visitDate >= thisWeekStart && visitDate <= thisWeekEnd;
            }
        },
        {
            key: 'pending',
            label: 'Pending',
            filter: (visit: Visit) => visit.status === 'Pending'
        },
        {
            key: 'completed',
            label: 'Completed',
            filter: (visit: Visit) => visit.status === 'Completed'
        },
        {
            key: 'cancelled',
            label: 'Cancelled',
            filter: (visit: Visit) => visit.status === 'Cancelled'
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

    return (
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
    );
};

export default VisitsSection;