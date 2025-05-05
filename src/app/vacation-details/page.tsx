'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getFirebase } from '@/firebase';
import { collection, addDoc, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { VacationDetailsSchema, VacationDetails } from '@/firebase/types'; // Assuming types are defined
import { AuthProvider } from '@/hooks/use-auth'; // Import AuthProvider
import { z } from 'zod'; // Import Zod for error handling
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

function VacationDetailsContent() {
  const { user, loading: authLoading } = useAuth();
  const [destination, setDestination] = useState('');
  const [dates, setDates] = useState('');
  const [interests, setInterests] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasDetails, setHasDetails] = useState<boolean | null>(null); // null means loading/unknown
  const router = useRouter();
  const { firestore } = getFirebase();

  // Check if user already has vacation details
  useEffect(() => {
    if (user && hasDetails === null && firestore) { // Ensure firestore is initialized
      setLoading(true);
      const detailsQuery = query(collection(firestore, 'vacationDetails'), where('userId', '==', user.uid));
      getDocs(detailsQuery)
        .then((querySnapshot) => {
          if (!querySnapshot.empty) {
            setHasDetails(true);
            router.push('/recommendations'); // Redirect if details exist
          } else {
            setHasDetails(false);
          }
        })
        .catch((err) => {
          console.error("Error checking vacation details:", err);
          setError("Failed to check existing vacation details.");
          setHasDetails(false); // Assume no details on error to allow input
        })
        .finally(() => setLoading(false));
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, firestore, hasDetails]); // Removed router from deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore) { // Ensure firestore is initialized
      setError('You must be logged in to save vacation details.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const vacationData: Omit<VacationDetails, 'id'> = { // Omit id for creation
        userId: user.uid,
        destination,
        dates,
        interests,
      };

      // Validate with Zod (optional but recommended)
      VacationDetailsSchema.omit({ id: true }).parse(vacationData); // Validate before saving

      // Add a new document with an auto-generated ID
      const docRef = doc(collection(firestore, "vacationDetails")); // Create a ref with auto ID
      await setDoc(docRef, { ...vacationData, id: docRef.id }); // Set the data including the ID


      console.log('Vacation details saved successfully!');
      router.push('/recommendations'); // Redirect to recommendations page
    } catch (err: any) {
      console.error("Error saving vacation details:", err);
       if (err instanceof z.ZodError) {
         setError(`Invalid input: ${err.errors.map(e => `${e.path.join('.')} - ${e.message}`).join(', ')}`);
       } else {
        setError(err.message || 'Failed to save vacation details.');
       }
    } finally {
      setLoading(false);
    }
  };

  // Render loading state or null if auth is loading or user has details and is redirecting
   if (authLoading || hasDetails === null || hasDetails === true) {
    return (
       <div className="flex items-center justify-center min-h-screen bg-secondary p-4">
         {/* Loading Skeleton */}
         <Card className="w-full max-w-lg shadow-xl">
           <CardHeader>
             <Skeleton className="h-8 w-3/4 mx-auto" />
             <Skeleton className="h-4 w-1/2 mx-auto" />
           </CardHeader>
           <CardContent className="space-y-6">
             <div className="space-y-2">
               <Skeleton className="h-4 w-1/4" />
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-3 w-1/2" />
             </div>
              <div className="space-y-2">
               <Skeleton className="h-4 w-1/4" />
               <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-1/2" />
             </div>
             <div className="space-y-2">
               <Skeleton className="h-4 w-1/4" />
               <Skeleton className="h-24 w-full" />
                <Skeleton className="h-3 w-1/2" />
             </div>
             <Skeleton className="h-10 w-full" />
           </CardContent>
            <CardFooter>
              <Skeleton className="h-4 w-1/3 mx-auto" />
            </CardFooter>
         </Card>
       </div>
     );
   }


  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-primary">Plan Your Dream Vacation</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Tell us about your trip, and we'll find the best spots!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="destination" className="font-semibold">Destination</Label>
              <Input
                id="destination"
                type="text"
                placeholder="e.g., Paris, France"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
                className="focus:ring-primary"
                aria-describedby="destination-help"
              />
               <p id="destination-help" className="text-xs text-muted-foreground">Where do you want to go?</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dates" className="font-semibold">Dates</Label>
              <Input
                id="dates"
                type="text"
                placeholder="e.g., July 10th - July 20th, 2024 or Next Summer"
                value={dates}
                onChange={(e) => setDates(e.target.value)}
                required
                 className="focus:ring-primary"
                 aria-describedby="dates-help"
              />
              <p id="dates-help" className="text-xs text-muted-foreground">When are you planning to travel?</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interests" className="font-semibold">Interests</Label>
              <Textarea
                id="interests"
                placeholder="e.g., Museums, hiking, local cuisine, relaxing on beaches"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                required
                 className="focus:ring-primary min-h-[100px]"
                 aria-describedby="interests-help"
              />
               <p id="interests-help" className="text-xs text-muted-foreground">What kind of activities do you enjoy?</p>
            </div>
            {error && <p className="text-destructive text-sm font-medium">{error}</p>}
            <Button type="submit" disabled={loading || !user} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              {loading ? 'Finding Places...' : 'Get Recommendations'}
            </Button>
          </form>
        </CardContent>
         <CardFooter className="justify-center text-sm text-muted-foreground">
             Let's find your perfect path!
        </CardFooter>
      </Card>
    </div>
  );
}


// Wrap the content with AuthProvider
export default function VacationDetailsPage() {
  return (
    <AuthProvider>
      <VacationDetailsContent />
    </AuthProvider>
  );
}
