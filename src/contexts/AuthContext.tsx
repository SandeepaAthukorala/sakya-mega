import React, { createContext, useState, useEffect, useContext } from 'react';
import { User, AuthContextType, UserRole } from '../types';
import { supabase } from '../supabaseClient';

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  register: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async (email: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        console.error('Fetch user error:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Unexpected fetch error:', err);
      return null;
    }
  };

  const initializeUser = async (sessionUserEmail: string | null) => {
    if (!sessionUserEmail) {
      setUser(null);
      return;
    }

    const userData = await fetchUserData(sessionUserEmail);
    if (userData) {
      setUser(userData);
    } else {
      console.warn('User data missing, signing out...');
      await supabase.auth.signOut();
      setUser(null);
    }
  };

  useEffect(() => {
    let active = true;
    let initialLoadComplete = false;

    const init = async () => {
      // Initialize with the current session instead of signing out
      setIsLoading(true);
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!active) return;

        if (error) {
          console.error('Get session error:', error);
          setUser(null);
        } else if (session?.user) {
          await initializeUser(session.user.email ?? null);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Session initialization error:', err);
        setUser(null);
      } finally {
        if (active) {
          initialLoadComplete = true;
          setIsLoading(false);
        }
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!active) return;
        
        // Only handle auth state changes after initial load is complete
        // to prevent race conditions
        if (initialLoadComplete) {
          setIsLoading(true);
          
          try {
            if (session?.user) {
              // User is logged in, initialize user data
              await initializeUser(session.user.email ?? null);
            } else {
              // User is logged out or session is invalid
              setUser(null);
            }
          } catch (err) {
            console.error('Auth state change error:', err);
            setUser(null);
          } finally {
            if (active) {
              setIsLoading(false);
            }
          }
        }
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Invalid login response');

      // Directly set user data from the login response to prevent race conditions
      const userData = await fetchUserData(email);
      if (!userData) {
        throw new Error('Failed to fetch user data');
      }
      setUser(userData);
    } catch (err) {
      console.error('Login failed:', err);
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    role: UserRole
  ) => {
    setIsLoading(true);
    try {
      if (!['Admin', 'Ref'].includes(role)) {
        throw new Error('Invalid role.');
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName, last_name: lastName, role },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('No user returned from signUp');

      const { error: dbError } = await supabase.from('users').insert({
        id: data.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        role,
      });

      if (dbError) throw dbError;

      await initializeUser(email);
    } catch (err) {
      console.error('Registration failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Clear session and user data
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      setUser(null);
      
      // Clear local storage and session storage to ensure complete logout
      localStorage.clear();
      sessionStorage.clear();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
