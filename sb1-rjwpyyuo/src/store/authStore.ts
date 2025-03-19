import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface Profile {
  username: string;
  email: string;
}

interface AuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  lastRegistrationAttempt: number;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,
  lastRegistrationAttempt: 0,

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    try {
      // First ensure profile exists
      const { error: ensureError } = await supabase
        .rpc('ensure_profile_exists', {
          user_id: user.id,
          user_email: user.email
        });

      if (ensureError) {
        console.error('Error ensuring profile exists:', ensureError);
        return;
      }

      // Then fetch the profile
      const { data: profiles, error: fetchError } = await supabase
        .from('profiles')
        .select('username, email')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching profile:', fetchError);
        return;
      }

      set({ profile: profiles });
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true });
      
      // Clear any existing session first
      await supabase.auth.signOut();
      localStorage.removeItem('supabase.auth.token');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });
      
      if (error) throw error;
      
      // Set session in localStorage to persist it
      if (data.session?.refresh_token) {
        localStorage.setItem('supabase.auth.token', data.session.refresh_token);
      }
      
      set({ user: data.user });
      await get().fetchProfile();
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (email: string, password: string, username?: string) => {
    const currentTime = Date.now();
    const lastAttempt = get().lastRegistrationAttempt;
    const timeSinceLastAttempt = currentTime - lastAttempt;
    
    if (timeSinceLastAttempt < 300000) {
      throw new Error(`Please wait ${Math.ceil((300000 - timeSinceLastAttempt) / 1000)} seconds before trying again`);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid email address');
    }

    try {
      set({ loading: true, lastRegistrationAttempt: currentTime });

      // Clear any existing session first
      await supabase.auth.signOut();
      localStorage.removeItem('supabase.auth.token');

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password,
        options: {
          data: {
            username: username
          }
        }
      });
      
      if (authError) {
        if (authError.status === 429) {
          throw new Error('Too many registration attempts. Please try again in 5 minutes.');
        }
        throw authError;
      }
      
      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Set session in localStorage to persist it
      if (authData.session?.refresh_token) {
        localStorage.setItem('supabase.auth.token', authData.session.refresh_token);
      }

      // Wait for auth to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Register user and create profile
      const { data: registerData, error: registerError } = await supabase
        .rpc('register_user', {
          user_id: authData.user.id,
          user_email: email.toLowerCase(),
          username: username || email.toLowerCase().split('@')[0]
        });

      if (registerError || !registerData?.success) {
        await supabase.auth.signOut();
        localStorage.removeItem('supabase.auth.token');
        throw new Error(registerData?.message || 'Failed to create user profile');
      }

      set({ 
        user: authData.user,
        profile: {
          username: username || email.toLowerCase().split('@')[0],
          email: email.toLowerCase()
        }
      });

    } catch (error: any) {
      await supabase.auth.signOut();
      localStorage.removeItem('supabase.auth.token');
      set({ user: null, profile: null });
      
      if (error.status === 429) {
        throw new Error('Too many registration attempts. Please try again in 5 minutes.');
      } else if (error.message.includes('User already registered')) {
        throw new Error('This email is already registered. Please try logging in instead.');
      } else {
        throw error;
      }
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    try {
      set({ loading: true });
      
      // Clear session from localStorage first
      localStorage.removeItem('supabase.auth.token');
      
      // Clear state immediately to prevent any flashing of authenticated content
      set({
        user: null,
        profile: null,
        lastRegistrationAttempt: 0
      });

      // Sign out from Supabase
      await supabase.auth.signOut();

      // Force reload to clear all state and redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('Error in signOut:', error);
      // Still redirect to login even if there's an error
      window.location.href = '/login';
    } finally {
      set({ loading: false });
    }
  }
}));

// Initialize auth state
const initializeAuth = async () => {
  try {
    // Try to get refresh token from localStorage
    const refreshToken = localStorage.getItem('supabase.auth.token');
    
    if (refreshToken) {
      try {
        // Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (!refreshError && refreshData.session) {
          useAuthStore.setState({ user: refreshData.user });
          await useAuthStore.getState().fetchProfile();
        } else {
          // Clear invalid token and state
          localStorage.removeItem('supabase.auth.token');
          useAuthStore.setState({ 
            user: null, 
            profile: null,
            loading: false,
            initialized: true 
          });
          window.location.href = '/login';
          return;
        }
      } catch (error) {
        // Handle refresh failure
        console.error('Error refreshing session:', error);
        localStorage.removeItem('supabase.auth.token');
        useAuthStore.setState({ 
          user: null, 
          profile: null,
          loading: false,
          initialized: true 
        });
        window.location.href = '/login';
        return;
      }
    }

    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      useAuthStore.setState({ 
        user: null,
        profile: null,
        loading: false, 
        initialized: true 
      });
      return;
    }

    if (session?.user) {
      useAuthStore.setState({ user: session.user });
      await useAuthStore.getState().fetchProfile();
    }
  } catch (error) {
    console.error('Error initializing auth:', error);
    useAuthStore.setState({ 
      user: null,
      profile: null,
      loading: false, 
      initialized: true 
    });
  } finally {
    useAuthStore.setState({ loading: false, initialized: true });
  }
};

// Listen for auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  const store = useAuthStore.getState();
  
  if (!store.initialized) {
    return; // Wait for initialization
  }

  if (event === 'SIGNED_OUT') {
    localStorage.removeItem('supabase.auth.token');
    useAuthStore.setState({
      user: null,
      profile: null,
      loading: false,
      lastRegistrationAttempt: 0
    });
  } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    if (session?.refresh_token) {
      localStorage.setItem('supabase.auth.token', session.refresh_token);
    }
    if (session?.user) {
      useAuthStore.setState({ user: session.user });
      await useAuthStore.getState().fetchProfile();
    }
  }
});

// Initialize auth state when the module loads
initializeAuth();

export default useAuthStore;