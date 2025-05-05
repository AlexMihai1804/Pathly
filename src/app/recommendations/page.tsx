'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { VacationDetails } from '@/firebase/types';
import { generateLocationRecommendations, GenerateLocationRecommendationsInput } from '@/ai/flows/generate-location-recommendations';
// Removed AuthProvider import as it's now global


function RecommendationsContent() {
  const { user, loading: authLoading } = useAuth();
  const [recommendations, setRecommendations] = useState<string[] | null>(null);
  const [vacationDetails, setVacationDetails] = useState<VacationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { firestore } = getFirebase();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login'); // Use replace to avoid history stack issues
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component
    if (user && firestore) {
      setLoading(true);
      setError(null);

      const fetchDetailsAndGenerateRecommendations = async () => {
        try {
          // Fetch vacation details
          const detailsQuery = query(
              collection(firestore, 'vacationDetails'),
              where('userId', '==', user.uid),
              limit(1) // Assuming one details doc per user for now
            );
          const querySnapshot = await getDocs(detailsQuery);

          if (querySnapshot.empty) {
             if (isMounted) {
                // No vacation details found, redirect to input page
                console.log("No vacation details found, redirecting...");
                router.replace('/vacation-details');
             }
            return;
          }

          const detailsDoc = querySnapshot.docs[0];
          const fetchedDetails = { id: detailsDoc.id, ...detailsDoc.data() } as VacationDetails;
          if (isMounted) setVacationDetails(fetchedDetails);


          // Generate recommendations only if details are fetched
          if (fetchedDetails) {
              const input: GenerateLocationRecommendationsInput = {
                destination: fetchedDetails.destination,
                dates: fetchedDetails.dates,
                interests: fetchedDetails.interests,
              };
              const result = await generateLocationRecommendations(input);
              if (isMounted) setRecommendations(result.recommendations);
          } else if (isMounted) {
             setError("Could not load vacation details.");
          }

        } catch (err: any) {
          console.error("Error fetching details or generating recommendations:", err);
           if (isMounted) setError(err.message || 'Failed to load recommendations.');
        } finally {
          if (isMounted) setLoading(false);
        }
      };

      fetchDetailsAndGenerateRecommendations();
    } else if (!authLoading && !user) {
         if (isMounted) setLoading(false); // Stop loading if user is confirmed absent
    }
     return () => { isMounted = false }; // Cleanup function
  }, [user, firestore, router, authLoading]); // Added authLoading


  if (authLoading || loading) { // Simplified loading check
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary p-4">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardHeader>
             {/* Added specific skeletons */}
            <Skeleton className="h-6 w-1/2 mx-auto mb-3" />
            <Skeleton className="h-4 w-3/4 mx-auto" />
             <Skeleton className="h-4 w-2/3 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
             <Skeleton className="h-6 w-2/5 mb-4" />
            {[...Array(3)].map((_, i) => (
               <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton key={i} className="h-4 flex-grow rounded-md" />
               </div>
            ))}
          </CardContent>
          <CardFooter className="flex justify-between pt-4">
             <Skeleton className="h-10 w-24" />
             <Skeleton className="h-4 w-1/3" />
          </CardFooter>
        </Card>
      </div>
    );
  }


  return (
    <div className="flex flex-col items-center min-h-screen bg-secondary p-4 pt-10">
       {/* Display Vacation Details */}
      {vacationDetails && (
          <Card className="w-full max-w-2xl shadow-xl mb-6">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-center text-primary">Your Trip Details</CardTitle>
              <CardDescription className="text-center text-muted-foreground px-2">
                 <span className="font-medium">Destination:</span> {vacationDetails.destination} | <span className="font-medium">Dates:</span> {vacationDetails.dates} | <span className="font-medium">Interests:</span> {vacationDetails.interests}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-primary">Pathly Recommendations</CardTitle>
           <CardDescription className="text-center text-muted-foreground">
            Here are some places you might enjoy based on your interests!
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive text-center mb-4">{error}</p>}
          {recommendations && recommendations.length > 0 ? (
            <ul className="space-y-3 list-disc list-inside pl-4 text-foreground">
              {recommendations.map((rec, index) => (
                <li key={index} >{rec}</li>
              ))}
            </ul>
          ) : (
            !error && <p className="text-center text-muted-foreground">No recommendations available for this trip yet.</p>
          )}
        </CardContent>
        <CardFooter className="flex justify-between items-center pt-4">
          <Button variant="outline" onClick={() => router.push('/vacation-details')}>
            Edit Trip Details
          </Button>
          <span className="text-sm text-muted-foreground">Happy travels!</span>
        </CardFooter>
      </Card>
    </div>
  );
}


// Export the page component directly
export default RecommendationsContent;
