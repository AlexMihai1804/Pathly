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
// Removed AuthProvider import as it's now global
import { z } from 'zod'; // Import Zod for error handling
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Renamed component to avoid conflict with file name convention
function VacationDetailsForm() {
  const { user, loading: authLoading } = useAuth();
  const [destination, setDestination] = useState('');
  const [dates, setDates] = useState('');
  const [interests, setInterests] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Renamed loading to isSubmitting for clarity
  const [checkingDetails, setCheckingDetails] = useState(true); // State to track initial check
  const router = useRouter();
  const { firestore } = getFirebase();

  // Redirect if not logged in (handled by root layout/page.tsx now usually)
   useEffect(() => {
     if (!authLoading && !user) {
       router.replace('/login');
     }
   }, [user, authLoading, router]);


  // Check if user already has vacation details only once on mount
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates after unmount
    if (user && firestore) {
      setCheckingDetails(true);
      const detailsQuery = query(
        collection(firestore, 'vacationDetails'),
        where('userId', '==', user.uid),
        limit(1) // Only need one document to confirm existence
      );

      getDocs(detailsQuery)
        .then((querySnapshot) => {
          if (isMounted && !querySnapshot.empty) {
            // Details exist, redirect to discover (or recommendations)
            router.replace('/discover');
          } else if (isMounted) {
             // No details found, allow rendering the form
             setCheckingDetails(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
             console.error("Error checking vacation details:", err);
             setError("Failed to check existing vacation details.");
             setCheckingDetails(false); // Allow rendering form even on error
           }
        });
    } else if (!authLoading && !user) {
        // If not logged in after auth check, no need to check details
        if(isMounted) setCheckingDetails(false);
    }

     return () => { isMounted = false }; // Cleanup function
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, firestore, authLoading]); // Depend on user and firestore


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore) {
      setError('Authentication or Database service is not ready.');
      return;
    }
    setError(null);
    setIsSubmitting(true); // Use isSubmitting state

    try {
      const vacationData = { // No need for Omit<...> if id is handled below
        userId: user.uid,
        destination,
        dates,
        interests,
      };

      // Validate with Zod
      // Use safeParse for better error handling potential
       const validationResult = VacationDetailsSchema.omit({ id: true }).safeParse(vacationData);

       if (!validationResult.success) {
          // Map Zod errors to a user-friendly string
          const errorMessages = validationResult.error.errors.map(err => `${err.path.join('.')} (${err.message})`).join(', ');
          throw new Error(`Invalid input: ${errorMessages}`);
       }

      // Use the validated data
      const validatedData = validationResult.data;

      // Add a new document with an auto-generated ID
      const docRef = doc(collection(firestore, "vacationDetails")); // Create a ref with auto ID
      await setDoc(docRef, { ...validatedData, id: docRef.id }); // Set the data including the ID


      console.log('Vacation details saved successfully!');
      router.push('/discover'); // Redirect after successful save
    } catch (err: any) {
      console.error("Error saving vacation details:", err);
       if (err instanceof z.ZodError) { // Check specific error type
         // Already handled by safeParse logic above, but keep for robustness
          const errorMessages = err.errors.map(e => `${e.path.join('.')} (${e.message})`).join(', ');
         setError(`Validation failed: ${errorMessages}`);
       } else {
        setError(err.message || 'Failed to save vacation details.');
       }
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

   // Show loading skeleton while checking auth or initial details
   if (authLoading || checkingDetails) {
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

    // If not loading and no user, LoginPage should be displayed (handled by page.tsx)
    if (!user) {
        return null; // Or redirect explicitly if needed, though page.tsx handles this
    }


  // Render the form if checks are complete and no details were found
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
                 aria-invalid={error?.includes('destination') ? "true" : "false"}
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
                 aria-invalid={error?.includes('dates') ? "true" : "false"}
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
                 aria-invalid={error?.includes('interests') ? "true" : "false"}
              />
               <p id="interests-help" className="text-xs text-muted-foreground">What kind of activities do you enjoy?</p>
            </div>
            {error && <p className="text-destructive text-sm font-medium">{error}</p>}
            <Button type="submit" disabled={isSubmitting || !user} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              {isSubmitting ? 'Saving...' : 'Get Recommendations'}
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

// Export the page component directly
export default VacationDetailsForm;
