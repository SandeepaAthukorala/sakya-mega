import React from 'react';
import { User } from '../../../types';
import { EditingCellState, NewRefDataType } from '../types';
import { HighlightMatch } from './index';
import TableSection from './TableSection';
import { supabase } from '../../../supabaseClient';

interface RefsSectionProps {
    allRefs: User[];
    setAllRefs: React.Dispatch<React.SetStateAction<User[]>>;
    editingCell: EditingCellState;
    setEditingCell: React.Dispatch<React.SetStateAction<EditingCellState>>;
    editValue: any;
    setEditValue: React.Dispatch<React.SetStateAction<any>>;
    isLoadingInline: boolean;
    setIsLoadingInline: React.Dispatch<React.SetStateAction<boolean>>;
    inputRef: React.RefObject<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
    isEditingOrAdding: boolean;
    formatDateDisplay: (d: string | null | undefined) => string;
    formatRelativeDate: (d: string | null | undefined) => string;
    thisMonthStart: string;
    thisMonthEnd: string;
    lastMonthStart: string;
    lastMonthEnd: string;
}

const RefsSection: React.FC<RefsSectionProps> = ({
    allRefs,
    setAllRefs,
    editingCell,
    setEditingCell,
    editValue,
    setEditValue,
    isLoadingInline,
    setIsLoadingInline,
    inputRef,
    isEditingOrAdding,
    formatDateDisplay,
    formatRelativeDate,
    thisMonthStart,
    thisMonthEnd,
    lastMonthStart,
    lastMonthEnd
}) => {
    // Define columns for the table
    const columns = [
        {
            key: 'first_name',
            header: 'First Name',
            editable: true,
            filterable: true
        },
        {
            key: 'last_name',
            header: 'Last Name',
            editable: true,
            filterable: true
        },
        {
            key: 'email',
            header: 'Email',
            editable: true,
            filterable: true
        },
        {
            key: 'phone',
            header: 'Phone',
            editable: true,
            filterable: true
        },
        {
            key: 'created_at',
            header: 'Joined',
            editable: false,
            filterable: true,
            render: (ref: User) => (
                <span title={formatDateDisplay(ref.created_at)}>
                    {formatRelativeDate(ref.created_at)}
                </span>
            )
        }
    ];

    // Define filters
    const filters = [
        {
            key: 'this-month',
            label: 'This Month',
            filter: (ref: User) => {
                const createdAt = ref.created_at?.split('T')[0];
                return createdAt ? (createdAt >= thisMonthStart && createdAt <= thisMonthEnd) : false;
            }
        },
        {
            key: 'last-month',
            label: 'Last Month',
            filter: (ref: User) => {
                const createdAt = ref.created_at?.split('T')[0];
                return createdAt ? (createdAt >= lastMonthStart && createdAt <= lastMonthEnd) : false;
            }
        }
    ];

    // Handle adding a new ref
    const handleAddRef = async () => {
        const newRef: NewRefDataType = {
            first_name: 'New',
            last_name: 'Referrer',
            email: 'new.referrer@example.com',
            phone: '',
            role: 'Ref'
        };

        try {
            const { data, error } = await supabase
                .from('users')
                .insert({...newRef, role: 'Ref'})
                .select()
                .single();

            if (error) throw error;
            if (data) {
                setAllRefs(prev => [...prev, data]);
            }
        } catch (error) {
            console.error('Error adding new referrer:', error);
        }
    };

    return (
        <TableSection
            title="Referrers"
            data={allRefs}
            setData={setAllRefs}
            columns={columns}
            tableName="users"
            itemType="ref"
            searchPlaceholder="Search referrers..."
            filters={filters}
            onAddItem={handleAddRef}
            addButtonText="Add Referrer"
            editingCell={editingCell}
            setEditingCell={setEditingCell}
            editValue={editValue}
            setEditValue={setEditValue}
            isLoadingInline={isLoadingInline}
            setIsLoadingInline={setIsLoadingInline}
            inputRef={inputRef}
            dateField="created_at"
        />
    );
};

export default RefsSection;