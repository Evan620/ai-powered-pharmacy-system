'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata: { name: string; pharmacyName: string; role?: string }) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Check if this is a new user who just confirmed their email
        const pendingData = localStorage.getItem('pendingProfileData');
        if (pendingData && event === 'SIGNED_IN') {
          const metadata = JSON.parse(pendingData);

          // Create pharmacy and profile now that user is confirmed and signed in
          await createProfileFromPendingData(metadata);
          localStorage.removeItem('pendingProfileData');
        } else {
          // Regular sign in, load existing profile
          await loadProfile(session.user.id);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        // If it's a 406 error, it might be RLS blocking us
        if (error.code === 'PGRST301' || error.message.includes('406')) {
          await createMissingProfile(userId);
        }
      } else if (data) {
        setProfile(data);
      } else {
        await createMissingProfile(userId);
      }
    } catch (error) {
      // Try to create a profile as fallback
      await createMissingProfile(userId);
    } finally {
      setLoading(false);
    }
  };

  const createMissingProfile = async (userId: string) => {
    try {
      // First, try to call our secure function to create pharmacy and profile
      const { data: functionResult, error: functionError } = await supabase.rpc(
        'setup_user_profile',
        {
          pharmacy_name: 'Default Pharmacy'
        }
      );

      // Even if the function fails, try to fetch the profile directly
      // Fetch the profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          pharmacies (
            id,
            name
          )
        `)
        .eq('id', userId)
        .single();

      if (profileError) {
        // Try to create a minimal profile if none exists
        await createMinimalProfile(userId);
      } else if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      // Try to create a minimal profile as last resort
      await createMinimalProfile(userId);
    }
  };

  const createMinimalProfile = async (userId: string) => {
    try {
      // First check if a default pharmacy exists
      let { data: pharmacy, error: pharmacyError } = await supabase
        .from('pharmacies')
        .select('id')
        .limit(1)
        .single();
      
      let pharmacyId;
      if (pharmacyError || !pharmacy) {
        // Create a default pharmacy
        const { data: newPharmacy, error: createPharmacyError } = await supabase
          .from('pharmacies')
          .insert({
            name: 'Default Pharmacy',
            timezone: 'Africa/Nairobi'
          })
          .select('id')
          .single();
        
        if (createPharmacyError) {
          return;
        }
        
        pharmacyId = newPharmacy.id;
      } else {
        pharmacyId = pharmacy.id;
      }
      
      // Create a minimal profile
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          pharmacy_id: pharmacyId,
          role: 'owner',
          name: 'Default User'
        })
        .select(`
          *,
          pharmacies (
            id,
            name
          )
        `)
        .single();
      
      if (!profileError && userProfile) {
        setProfile(userProfile);
      }
    } catch (error) {
      // Silent error handling
    }
  };

  const createProfileFromPendingData = async (metadata: any) => {
    try {
      const { data: functionResult, error: functionError } = await supabase.rpc(
        'create_pharmacy_and_profile',
        {
          user_id: metadata.userId,
          user_email: user?.email || '',
          user_name: metadata.name,
          pharmacy_name: metadata.pharmacyName,
          user_role: metadata.role || 'owner'
        }
      );

      if (functionError || functionResult?.error) {
        return;
      }

      // Fetch the created profile
      const { data: newProfile, error: fetchError } = await supabase
        .from('profiles')
        .select(`
          *,
          pharmacies (
            id,
            name
          )
        `)
        .eq('id', metadata.userId)
        .single();

      if (!fetchError && newProfile) {
        setProfile(newProfile);
      }

      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, metadata: { name: string; pharmacyName: string; role?: string }) => {
    try {
      setLoading(true);

      // Sign up the user first WITHOUT metadata to avoid trigger issues
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        return { error };
      }

      if (!data.user) {
        return { error: new Error('No user returned from signup') };
      }

      // If email confirmation is required, we can't create profile yet
      if (!data.session) {
        // Store metadata for later use when they confirm email
        localStorage.setItem('pendingProfileData', JSON.stringify({
          userId: data.user.id,
          name: metadata.name,
          pharmacyName: metadata.pharmacyName,
          role: metadata.role || 'owner'
        }));
        return {
          error: null,
          needsEmailConfirmation: true,
          message: 'Please check your email and click the confirmation link to complete your account setup.'
        };
      }

      // User is immediately signed in, create pharmacy and profile now
      const { data: functionResult, error: functionError } = await supabase.rpc(
        'create_pharmacy_and_profile',
        {
          user_id: data.user.id,
          user_email: email,
          user_name: metadata.name,
          pharmacy_name: metadata.pharmacyName,
          user_role: metadata.role || 'owner'
        }
      );

      if (functionError) {
        return { error: functionError };
      }

      if (functionResult?.error) {
        return { error: new Error(functionResult.error) };
      }

      // Fetch the created profile
      const { data: newProfile, error: fetchError } = await supabase
        .from('profiles')
        .select(`
          *,
          pharmacies (
            id,
            name
          )
        `)
        .eq('id', data.user.id)
        .single();

      if (fetchError) {
        return { error: fetchError };
      }

      setProfile(newProfile);

      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    return { error };
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setProfile(null);
    setLoading(false);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
