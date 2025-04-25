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

  useEffect(() => {
    const getSession = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        const { data: user, error } = await supabase
          .from('users')
          .select()
          .eq('email', session.user.email)
          .single()

        if (error) {
          console.error('Error fetching user:', error);
        } else {
          setUser(user);
        }
      }

      setIsLoading(false);
    }

    getSession();

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const { data: user, error } = supabase
          .from('users')
          .select()
          .eq('email', session.user.email)
          .single()

        if (error) {
          console.error('Error fetching user:', error);
        } else {
          setUser(user);
        }
      } else {
        setUser(null);
      }
    })
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      console.log('Login data:', data);
      console.log('Login error:', error);

      if (error) throw error;

      if (data.user) {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select()
          .eq('email', data.user.email)
          .single()

        if (userError) {
          console.error('Error fetching user:', userError);
          throw userError;
        } else {
          setUser(user);
        }
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
      })

      if (error) {
        if (error.message === 'User already registered') {
          throw new Error('This email is already registered.');
        }
        throw error;
      }

      if (data.user) {
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: email,
            first_name: firstName,
            last_name: lastName,
            role: role,
          })
          .single()

        if (userError) throw userError;
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
      const { error } = await supabase.auth.signOut()
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
