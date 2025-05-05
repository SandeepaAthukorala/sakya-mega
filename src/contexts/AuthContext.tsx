import React, { createContext, useState, useEffect, useContext } from 'react';
import { User, AuthContextType, UserRole } from '../types';
import { supabase } from '../supabaseClient';

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  register: async () => {},
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to fetch user data from the database
  const fetchUserData = async (email: string) => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select()
        .eq('email', email)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        return null;
      }
      
      return userData;
    } catch (error) {
      console.error('Exception fetching user data:', error);
      return null;
    }
  };

  useEffect(() => {
    // Get the initial session
    const getSession = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user?.email) {
          const userData = await fetchUserData(session.user.email);
          if (userData) {
            setUser(userData);
          }
        }
      } catch (error) {
        console.error('Session retrieval error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setIsLoading(true);
        
        try {
          if (session?.user?.email) {
            const userData = await fetchUserData(session.user.email);
            setUser(userData);
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error('Auth state change error:', error);
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      }
    );

    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe();
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Use Supabase auth with session persistence enabled by default
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      if (data.user) {
        // Fetch user data from our database
        const userData = await fetchUserData(data.user.email);
        if (!userData) {
          throw new Error('Failed to retrieve user data after login.');
        }
        
        setUser(userData);
      } else {
        throw new Error('Failed to retrieve user data after login.');
      }

    } catch (error: any) {
      console.error('Login error:', error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (firstName: string, lastName: string, email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      if (role !== 'Ref' && role !== 'Admin') {
        throw new Error('Invalid role selected.');
      }

      // Register user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: role,
          },
        },
      });

      if (error) {
        if (error.message === 'User already registered') {
          throw new Error('This email is already registered.');
        }
        throw error;
      }

      if (data.user) {
        // Insert user data into our database
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: email,
            first_name: firstName,
            last_name: lastName,
            role: role,
          })
          .single();

        if (userError) {
          console.error('Error creating user record:', userError);
          throw userError;
        }
        
        // Fetch the newly created user data
        const userData = await fetchUserData(email);
        if (userData) {
          setUser(userData);
        }
      } else {
        throw new Error('Failed to retrieve user data after registration.');
      }

    } catch (error: any) {
      console.error('Registration error:', error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Sign out from all tabs/devices
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
    } catch (error: any) {
      console.error('Logout error:', error.message);
    } finally {
      setIsLoading(false);
      setUser(null);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
