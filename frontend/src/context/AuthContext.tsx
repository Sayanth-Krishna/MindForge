/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import api from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  syncing: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const syncProfileToBackend = async (supabaseUser: User) => {
    setSyncing(true);
    try {
      // Parse full name or metadata if it exists
      const metadata = supabaseUser.user_metadata || {};
      const fullName = metadata.full_name || metadata.name || null;
      const avatarUrl = metadata.avatar_url || null;

      await api.post('/auth/sync', {
        fullName,
        avatarUrl,
      });
      console.log('Successfully synchronized profile details to Postgres DB');
    } catch (err) {
      console.error('Failed to sync profile to database on sign-in:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const clearUrlHash = () => {
      if (window.location.href.includes('#')) {
        window.history.replaceState(
          null,
          '',
          window.location.pathname + window.location.search
        );
      }
    };

    // Clear hash immediately on mount if present
    clearUrlHash();
    const mountTimer = setTimeout(clearUrlHash, 100);

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        syncProfileToBackend(session.user);
      }
      setLoading(false);
      clearUrlHash();
      setTimeout(clearUrlHash, 100);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (event === 'SIGNED_IN' && currentUser) {
        await syncProfileToBackend(currentUser);
        clearUrlHash();
        setTimeout(clearUrlHash, 100);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(mountTimer);
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, syncing, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
