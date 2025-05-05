export type UserRole = 'Ref' | 'Admin';

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  dateRegistered: string;
}

export interface Route {
  id: string;
  ref_id: string | null;
  name: string;
  number: number;
  created_at?: string; // Optional
}
export interface Item {
  id: string;
  item_name: string;
  item_number: number;
  created_at?: string; // Optional
}

export interface Visit {
  id: string;
  refId: string;
  buyerName: string;
  phone: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  date: string;
  type: 'Sample' | 'Sittu' | 'Over';
  status: 'Pending' | 'Completed' | 'Cancelled';
  notes?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (firstName: string, lastName: string, email: string, password: string, role: UserRole) => Promise<void>;
}
