'use client';

import { AuthProvider, useAuth } from '@/hooks/use-auth';
import LoginPage from '@/app/login/page';
import VacationDetailsPage from '@/app/vacation-details/page';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function AppContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
       router.push('/vacation-details');
    }
     // Intentionally not adding router to dependency array to avoid re-triggering on route change
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  if (loading) {
    // AuthLoading component is already shown by AuthProvider
    return null;
  }

  if (!user) {
    return <LoginPage />;
  }

  // User is logged in, but the redirect might not have happened yet.
  // Showing a loader or null prevents flashing the login page briefly.
  return null;

}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
