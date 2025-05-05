'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getFirebase } from '@/firebase';
import { collection, addDoc, query, where, getDocs, doc, setDoc, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox
import { useRouter } from 'next/navigation';
import { VacationDetailsSchema, VacationDetails } from '@/firebase/types';
import { z } from 'zod';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePickerWithRange } from '@/components/ui/date-picker'; // Import DatePicker
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';


const availableInterests = [
    { id: 'museums', label: 'Museums & History' },
    { id: 'hiking', label: 'Hiking & Outdoors' },
    { id: 'food', label: 'Local Cuisine' },
    { id: 'beach', label: 'Beach & Relaxation' },
    { id: 'shopping', label: 'Shopping' },
    { id: 'nightlife', label: 'Nightlife & Entertainment' },
    { id: 'art', label: 'Art & Culture' },
    { id: 'nature', label: 'Nature & Wildlife' },
];

// Renamed component to avoid conflict with file name convention
function VacationDetailsForm() {
  const { user, loading: authLoading } = useAuth();
  const [destination, setDestination] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined); // State for date range
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]); // State for selected interests
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingDetails, setCheckingDetails] = useState(true);
  const router = useRouter();
  const { firestore } = getFirebase();

   useEffect(() => {
     if (!authLoading && !user) {
       router.replace('/login');
     }
   }, [user, authLoading, router]);

   // Check if user already has vacation details only once on mount
   useEffect(() => {
     let isMounted = true;
     if (user && firestore) {
       setCheckingDetails(true);
       const detailsQuery = query(
         collection(firestore, 'vacationDetails'),
         where('userId', '==', user.uid),
         limit(1)
       );

       getDocs(detailsQuery)
         .then((querySnapshot) => {
           if (isMounted && !querySnapshot.empty) {
             router.replace('/discover');
           } else if (isMounted) {
             setCheckingDetails(false);
           }
         })
         .catch((err) => {
           if (isMounted) {
             console.error("Error checking vacation details:", err);
             setError("Failed to check existing vacation details.");
             setCheckingDetails(false);
           }
         });
     } else if (!authLoading && !user) {
         if(isMounted) setCheckingDetails(false);
     }

      return () => { isMounted = false };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [user, firestore, authLoading]);

   const handleInterestChange = (interestId: string) => {
     setSelectedInterests(prev =>
       prev.includes(interestId)
         ? prev.filter(id => id !== interestId)
         : [...prev, interestId]
     );
   };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore) {
      setError('Authentication or Database service is not ready.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    // Format date range into a string
    const formattedDates = dateRange?.from && dateRange?.to
        ? `${format(dateRange.from, "yyyy-MM-dd")} to ${format(dateRange.to, "yyyy-MM-dd")}`
        : ''; // Handle case where dates are not fully selected

    try {
       const vacationData = {
         userId: user.uid,
         destination,
         dates: formattedDates, // Use formatted date string
         interests: selectedInterests, // Use array of selected interests
       };

      // Validate with Zod Schema (ensure schema matches: interests is array, dates is string)
      const validationResult = VacationDetailsSchema.omit({ id: true }).safeParse(vacationData);

       if (!validationResult.success) {
           const errorMessages = validationResult.error.errors.map(err => `${err.path.join('.')} (${err.message})`).join(', ');
           throw new Error(`Invalid input: ${errorMessages}`);
       }

      const validatedData = validationResult.data;

      const docRef = doc(collection(firestore, "vacationDetails"));
      await setDoc(docRef, { ...validatedData, id: docRef.id });

      console.log('Vacation details saved successfully!');
      router.push('/discover');
    } catch (err: any) {
      console.error("Error saving vacation details:", err);
        if (err instanceof z.ZodError) {
          const errorMessages = err.errors.map(e => `${e.path.join('.')} (${e.message})`).join(', ');
         setError(`Validation failed: ${errorMessages}`);
       } else {
        setError(err.message || 'Failed to save vacation details.');
       }
    } finally {
      setIsSubmitting(false);
    }
  };

   // Show loading skeleton while checking auth or initial details
   if (authLoading || checkingDetails) {
     return (
       <div className="flex items-center justify-center min-h-screen bg-secondary p-4">
         <Card className="w-full max-w-lg shadow-xl">
           <CardHeader>
             <Skeleton className="h-8 w-3/4 mx-auto" />
             <Skeleton className="h-4 w-1/2 mx-auto" />
           </CardHeader>
           <CardContent className="space-y-6">
             <div className="space-y-2">
               <Skeleton className="h-4 w-1/4" />
               <Skeleton className="h-10 w-full" />
             </div>
              <div className="space-y-2">
               <Skeleton className="h-4 w-1/4" />
               <Skeleton className="h-10 w-full" />
             </div>
             <div className="space-y-2">
               <Skeleton className="h-4 w-1/4" />
               <Skeleton className="h-4 w-3/4 mb-2"/>
               <Skeleton className="h-4 w-3/4 mb-2"/>
               <Skeleton className="h-4 w-3/4 mb-2"/>
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

    if (!user) {
        return null; // Handled by page.tsx usually
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
               {/* Replace Input with DatePickerWithRange */}
               <DatePickerWithRange
                 date={dateRange}
                 onDateChange={setDateRange}
                 className="[&>button]:w-full" // Ensure button takes full width
                 aria-describedby="dates-help"
                  aria-invalid={error?.includes('dates') ? "true" : "false"}
               />
              <p id="dates-help" className="text-xs text-muted-foreground">When are you planning to travel?</p>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold block mb-1">Interests</Label>
               <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 border rounded-md">
                 {availableInterests.map((interest) => (
                   <div key={interest.id} className="flex items-center space-x-2">
                     <Checkbox
                       id={`interest-${interest.id}`}
                       checked={selectedInterests.includes(interest.id)}
                       onCheckedChange={() => handleInterestChange(interest.id)}
                       aria-labelledby={`interest-label-${interest.id}`}
                     />
                     <Label
                       htmlFor={`interest-${interest.id}`}
                       id={`interest-label-${interest.id}`}
                       className="text-sm font-normal cursor-pointer"
                     >
                       {interest.label}
                     </Label>
                   </div>
                 ))}
               </div>
               <p id="interests-help" className="text-xs text-muted-foreground">What kind of activities do you enjoy?</p>
                {error?.includes('interests') && <p className="text-destructive text-xs mt-1">{error}</p>}
            </div>
            {error && !error.includes('Validation failed:') && <p className="text-destructive text-sm font-medium">{error}</p>}
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

export default VacationDetailsForm;
