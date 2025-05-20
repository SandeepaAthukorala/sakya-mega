import React, { useState } from 'react';
import { Item, EditingCellState, NewItemDataType } from '../types';
import { HighlightMatch } from './index';
import TableSection from './TableSection';
import { supabase } from '../../../supabaseClient';

interface ItemsSectionProps {
    items: Item[];
    setItems: React.Dispatch<React.SetStateAction<Item[]>>;
    editingCell: EditingCellState;
    setEditingCell: React.Dispatch<React.SetStateAction<EditingCellState>>;
    editValue: any;
    setEditValue: React.Dispatch<React.SetStateAction<any>>;
    isLoadingInline: boolean;
    setIsLoadingInline: React.Dispatch<React.SetStateAction<boolean>>;
    inputRef: React.RefObject<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
    isEditingOrAdding: boolean;
}

const ItemsSection: React.FC<ItemsSectionProps> = ({
    items,
    setItems,
    editingCell,
    setEditingCell,
    editValue,
    setEditValue,
    isLoadingInline,
    setIsLoadingInline,
    inputRef,
    isEditingOrAdding
}) => {
    // Define columns for the table
    const columns = [
        {
            key: 'item_number',
            header: 'Item #',
            editable: true,
            filterable: true,
            type: 'number'
        },
        {
            key: 'item_name',
            header: 'Name',
            editable: true,
            filterable: true,
            render: (item: Item) => (
                <div className="font-medium">{item.item_name}</div>
            )
        },
        {
            key: 'value',
            header: 'Value',
            editable: true,
            filterable: true,
            type: 'number',
            render: (item: Item) => (
                <span>{item.value ? `Rs.${item.value.toFixed(2)}` : 'N/A'}</span>
            )
        }
    ];

    // Handle adding a new item
    const handleAddItem = async () => {
        const newItemNumber = Math.max(0, ...items.map(i => i.item_number || 0)) + 1;
        const newItem: NewItemDataType = {
            item_name: `New Item ${newItemNumber}`,
            item_number: newItemNumber,
            value: 0
        };

        try {
            const { data, error } = await supabase
                .from('items')
                .insert(newItem)
                .select()
                .single();

            if (error) throw error;
            if (data) {
                setItems(prev => [...prev, data]);
            }
        } catch (error) {
            console.error('Error adding new item:', error);
        }
    };

    // Define filters for items
    const filters = [
        {
            key: 'recent',
            label: 'Recent Items',
            filter: (item: Item) => {
                if (!item.created_at) return false;
                const itemDate = new Date(item.created_at);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return itemDate >= thirtyDaysAgo;
            }
        }
    ];

    return (
        <TableSection
            title="Items"
            data={items}
            setData={setItems}
            columns={columns}
            tableName="items"
            itemType="item"
            searchPlaceholder="Search items..."
            filters={[]} /* Removed filter buttons */
            onAddItem={handleAddItem}
            addButtonText="Add Item"
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

export default ItemsSection;