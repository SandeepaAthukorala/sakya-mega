// Admin component types
import { Visit, User as UserType } from '../../types';

// --- Route Type ---
export interface Route {
    id: string; // uuid
    ref_id: string | null; // uuid, fk to users
    name: string; // text
    number: number; // integer
    created_at?: string;
}

// --- Item Type ---
export interface Item {
    id: string; // uuid
    item_name: string; // text
    item_number: number; // integer
    created_at?: string;
}

// --- Types for New Data ---
export type NewVisitDataType = Partial<Omit<Visit, 'id' | 'created_at' | 'location'>> & { item_id_string?: string };
export type NewRefDataType = Partial<Omit<UserType, 'id' | 'created_at' | 'role' | 'invited_at' | 'updated_at'>>;
export type NewRouteDataType = Partial<Omit<Route, 'id' | 'created_at'>>;
export type NewItemDataType = Partial<Omit<Item, 'id' | 'created_at'>>;

// --- Inline Editing State Type ---
export interface EditingCellState {
    type: 'visit' | 'ref' | 'route' | 'item' | null;
    rowId: string | null;
    field: keyof Visit | keyof UserType | keyof Route | keyof Item | null;
}

// --- Filter Types ---
export type ActiveVisitDateFilter = 'Today' | 'This Week' | 'All' | 'Custom';
export type ActiveRefDateFilter = 'All' | 'This Month' | 'Last Month' | 'Custom';