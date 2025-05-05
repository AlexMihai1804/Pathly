'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { getFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import LoginPage from '@/app/login/page'; // Keep login page import
import { Skeleton } from '@/components/ui/skeleton'; // Use Skeleton for loading

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [hasVacations, setHasVacations] = useState<boolean | null>(null); // null: loading, true: has vacations, false: no vacations
  const [checkingVacations, setCheckingVacations] = useState(true);
  const { firestore } = getFirebase();

  useEffect(() => {
    if (!authLoading && user && firestore) {
      setCheckingVacations(true);
      const vacationsQuery = query(
        collection(firestore, 'vacationDetails'),
        where('userId', '==', user.uid),
        limit(1) // Only need to know if at least one exists
      );

      getDocs(vacationsQuery)
        .then((snapshot) => {
          setHasVacations(!snapshot.empty);
        })
        .catch((error) => {
          console.error("Error checking for vacations:", error);
          setHasVacations(false); // Assume no vacations on error to proceed
        })
        .finally(() => {
          setCheckingVacations(false);
        });
    } else if (!authLoading && !user) {
      // If not logged in and auth check is done, no need to check vacations
      setHasVacations(false);
      setCheckingVacations(false);
    }
  }, [user, authLoading, firestore]);

  useEffect(() => {
    // Redirect logic based on auth state and vacation check result
    if (!authLoading && !checkingVacations) {
      if (user) {
        if (hasVacations) {
          router.replace('/discover'); // User logged in and has vacations -> Discover
        } else {
          router.replace('/vacation-details'); // User logged in, no vacations -> Create details
        }
      }
       // else: User not logged in, LoginPage will be rendered below
    }
    // Intentionally not adding router to dependency array to avoid re-triggering on redirects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, hasVacations, checkingVacations]);

  // Show loading skeleton while checking auth or vacations
  if (authLoading || checkingVacations || (user && hasVacations === null)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="h-16 w-16 rounded-full bg-primary/20" />
          <Skeleton className="h-4 w-[200px] bg-muted" />
          <Skeleton className="h-4 w-[150px] bg-muted" />
        </div>
      </div>
    );
  }

  // If not loading and no user, show Login Page
  if (!user) {
    return <LoginPage />;
  }

  // If user is logged in but redirection hasn't happened yet (e.g., due to checks),
  // return null or a minimal loader to prevent flashing content.
  return null;
}

export default function Home() {
  // AuthProvider is now in RootLayout, no need to wrap here
  return <AppContent />;
}
