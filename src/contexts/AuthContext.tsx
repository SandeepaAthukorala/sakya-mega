import React, { createContext, useState, useEffect, useContext } from 'react';
import { User, AuthContextType, UserRole } from '../types';
import { supabase } from '../supabaseClient';

// Define the AuthContextType interface
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string, role: UserRole) => Promise<void>;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => { throw new Error('Login function not implemented'); }, // Provide a default implementation
  logout: async () => { throw new Error('Logout function not implemented'); }, // Provide a default implementation
  register: async () => { throw new Error('Register function not implemented'); }, // Provide a default implementation
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
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          // Fetch user details using ID
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*') // Select all columns including 'access'
            .eq('id', session.user.id)
            .single();

          if (userError) {
            console.error('Error fetching user details:', userError);
            setUser(null); // Clear user if fetch fails
          } else {
            setUser(userData);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error in getSession:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        try {
          // Fetch user details using ID on auth state change
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*') // Select all columns including 'access'
            .eq('id', session.user.id)
            .single();

          if (userError) {
            console.error('Error fetching user details on auth change:', userError);
            setUser(null);
          } else {
            setUser(userData);
          }
        } catch (error) {
          console.error('Error fetching user on auth state change:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      // No need to set loading here as getSession handles initial load
    });

    // Cleanup listener on component unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // 1. Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Supabase login error:', authError);
        throw new Error('Invalid email or password.'); // Generic error for security
      }

      if (!authData.session || !authData.user) {
        throw new Error('Login failed: No session or user data returned.');
      }

      // 2. Fetch user details from 'users' table using the ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*') // Select all columns including 'access'
        .eq('id', authData.user.id)
        .single();

      if (userError) {
        console.error('Error fetching user details after login:', userError);
        // Log out the user if fetching details fails after successful auth
        await supabase.auth.signOut();
        throw new Error('Login failed: Could not retrieve user details.');
      }

      // 3. Check the 'access' status
      if (userData && userData.access === false) {
        // Log out the user if access is denied
        await supabase.auth.signOut();
        throw new Error('Login Failed: Access Denied');
      }

      // 4. Set user state (Supabase onAuthStateChange might also handle this, but setting explicitly ensures immediate update)
      setUser(userData);

    } catch (error) {
      console.error('Login process error:', error);
      setUser(null); // Ensure user state is null on any login failure
      // Re-throw the specific error for the UI to catch
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null); // Clear user state immediately
    } catch (error) {
      console.error('Logout error:', error);
      // Optionally handle logout error display
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (firstName: string, lastName: string, email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        console.error('Supabase sign up error:', signUpError);
        // Check for specific errors like 'User already registered'
        if (signUpError.message.includes('User already registered')) {
          throw new Error('An account with this email already exists.');
        }
        throw new Error('Registration failed. Please try again.');
      }

      if (!authData.user) {
        throw new Error('Registration failed: No user data returned after sign up.');
      }

      // 2. Insert user details into 'users' table
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id, // Use the ID from Supabase Auth
          email,
          first_name: firstName,
          last_name: lastName,
          role,
          access: true, // Default access to true for new registrations
        });

      if (insertError) {
        console.error('Error inserting user details:', insertError);
        // Optional: Attempt to delete the auth user if insert fails?
        // await supabase.auth.api.deleteUser(authData.user.id) // Requires admin privileges
        throw new Error('Registration failed: Could not save user details.');
      }

      // 3. Set user state (onAuthStateChange will likely handle this, but explicit set can be faster)
      // Fetch the newly created user data to ensure state is consistent
      const { data: newUser, error: fetchNewUserError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (fetchNewUserError || !newUser) {
        console.error('Error fetching newly registered user:', fetchNewUserError);
        // User is authenticated but details fetch failed, proceed with caution or log out
        setUser(null); // Or set a minimal user object based on authData.user
      } else {
        setUser(newUser);
      }

    } catch (error) {
      console.error('Registration process error:', error);
      setUser(null); // Ensure user state is null on registration failure
      throw error; // Re-throw for UI
    } finally {
      setIsLoading(false);
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
