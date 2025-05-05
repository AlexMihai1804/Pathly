'use client';

import React, { useState, useEffect, useContext, createContext } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation'; // Import useRouter

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { auth } = getFirebase();
  const router = useRouter(); // Initialize useRouter

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
       // Removed redirection logic from here, will be handled in page.tsx
    });

    return () => unsubscribe();
  }, [auth]); // Removed router from dependencies

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {loading ? <AuthLoading /> : children}
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

// Optional: Create a loading component to show while auth state is resolving
const AuthLoading: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
       <div className="flex flex-col items-center space-y-4">
          <Skeleton className="h-16 w-16 rounded-full bg-primary/20" />
          <Skeleton className="h-4 w-[200px] bg-muted" />
          <Skeleton className="h-4 w-[150px] bg-muted" />
        </div>
    </div>
  );
};
