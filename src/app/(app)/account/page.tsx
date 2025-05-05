'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { VacationDetails } from '@/firebase/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { List, LogOut, PlusCircle, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


export default function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [vacations, setVacations] = useState<VacationDetails[]>([]);
  const [loadingVacations, setLoadingVacations] = useState(true);
  const { auth, firestore } = getFirebase();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    } else if (user && firestore) {
       setLoadingVacations(true);
      const vacationsQuery = query(collection(firestore, 'vacationDetails'), where('userId', '==', user.uid));
      getDocs(vacationsQuery)
        .then((snapshot) => {
          const fetchedVacations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VacationDetails));
          setVacations(fetchedVacations);
        })
        .catch(error => console.error("Error fetching vacations:", error))
        .finally(() => setLoadingVacations(false));
    }
  }, [user, authLoading, router, firestore]);

  const handleLogout = async () => {
    if (auth) {
      try {
        await signOut(auth);
        router.push('/login'); // Redirect to login after sign out
      } catch (error) {
        console.error('Logout Error:', error);
        // Optionally show a toast or error message
      }
    }
  };

  const handleDeleteVacation = async (vacationId: string) => {
     if (!firestore || !user) return;
     console.log(`Deleting vacation ${vacationId}`);
      try {
        await deleteDoc(doc(firestore, 'vacationDetails', vacationId));
        setVacations(prev => prev.filter(v => v.id !== vacationId));
        // Optionally show a success toast
      } catch (error) {
          console.error("Error deleting vacation:", error);
          // Optionally show an error toast
      }
  };


  if (authLoading) {
     return (
       <div className="p-4 pt-10 space-y-6">
         <Skeleton className="h-8 w-1/3 mx-auto mb-4" /> {/* Title */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
               <div className="space-y-1">
                 <Skeleton className="h-5 w-32" />
                 <Skeleton className="h-4 w-48" />
               </div>
            </CardHeader>
            <CardContent className="space-y-2">
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
           <Card>
             <CardHeader>
               <Skeleton className="h-6 w-1/2" />
             </CardHeader>
             <CardContent className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-10 w-full" />
             </CardContent>
             <CardFooter>
                 <Skeleton className="h-10 w-32" />
             </CardFooter>
           </Card>
       </div>
     );
   }

  if (!user) {
    // Should be redirected, but handle the case where it might render briefly
    return null;
  }


  return (
    <div className="p-4 pt-10 space-y-6">
      <h1 className="text-2xl font-bold mb-6 text-center text-primary">Account</h1>

      {/* User Info Card */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4 pb-4">
           <Avatar className="h-12 w-12">
             <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || 'User'} />
             <AvatarFallback>
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </AvatarFallback>
           </Avatar>
           <div>
             <CardTitle className="text-lg">{user.displayName || 'User'}</CardTitle>
             <CardDescription>{user.email}</CardDescription>
           </div>
        </CardHeader>
         <CardContent className="border-t pt-4">
             {/* Add other account management options here later */}
             <Button variant="outline" className="w-full justify-start gap-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4" /> Sign Out
             </Button>
         </CardContent>
      </Card>

       {/* Vacations Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><List className="h-5 w-5"/> Your Vacations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
           {loadingVacations ? (
             <>
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-10 w-full" />
             </>
           ) : vacations.length > 0 ? (
            vacations.map((vacation) => (
              <div key={vacation.id} className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted/50">
                <div>
                  <p className="font-medium">{vacation.destination}</p>
                  <p className="text-sm text-muted-foreground">{vacation.dates}</p>
                </div>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Delete vacation ${vacation.destination}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your
                          vacation plan for {vacation.destination}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDeleteVacation(vacation.id)}
                        >
                         Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
              </div>
            ))
           ) : (
             <p className="text-muted-foreground text-sm text-center py-4">No vacations planned yet.</p>
           )}
        </CardContent>
         <CardFooter>
           <Button variant="default" className="w-full gap-2" onClick={() => router.push('/vacation-details')}>
              <PlusCircle className="h-4 w-4"/> Create New Vacation Plan
           </Button>
         </CardFooter>
      </Card>

    </div>
  );
}
