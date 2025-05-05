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
import { AuthProvider } from '@/hooks/use-auth'; // Import AuthProvider


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
      router.push('/login'); // Redirect to login if not authenticated
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && firestore) {
      setLoading(true);
      setError(null);

      const fetchDetailsAndGenerateRecommendations = async () => {
        try {
          // Fetch vacation details
          const detailsQuery = query(collection(firestore, 'vacationDetails'), where('userId', '==', user.uid));
          const querySnapshot = await getDocs(detailsQuery);

          if (querySnapshot.empty) {
            // No vacation details found, redirect to input page
            router.push('/vacation-details');
            return;
          }

          const detailsDoc = querySnapshot.docs[0];
          const fetchedDetails = { id: detailsDoc.id, ...detailsDoc.data() } as VacationDetails;
          setVacationDetails(fetchedDetails);

          // Generate recommendations
          const input: GenerateLocationRecommendationsInput = {
            destination: fetchedDetails.destination,
            dates: fetchedDetails.dates,
            interests: fetchedDetails.interests,
          };
          const result = await generateLocationRecommendations(input);
          setRecommendations(result.recommendations);

        } catch (err: any) {
          console.error("Error fetching details or generating recommendations:", err);
          setError(err.message || 'Failed to load recommendations.');
        } finally {
          setLoading(false);
        }
      };

      fetchDetailsAndGenerateRecommendations();
    }
  }, [user, firestore, router]);


  if (authLoading || loading || !vacationDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary p-4">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardHeader>
            <Skeleton className="h-8 w-3/5 mx-auto mb-2" />
            <Skeleton className="h-4 w-4/5 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </CardContent>
          <CardFooter className="flex justify-between">
             <Skeleton className="h-10 w-24" />
             <Skeleton className="h-4 w-1/3" />
          </CardFooter>
        </Card>
      </div>
    );
  }


  return (
    <div className="flex flex-col items-center min-h-screen bg-secondary p-4 pt-10">
      <Card className="w-full max-w-2xl shadow-xl mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-primary">Your Trip Details</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Destination: {vacationDetails.destination} | Dates: {vacationDetails.dates} | Interests: {vacationDetails.interests}
          </CardDescription>
        </CardHeader>
      </Card>

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
            <ul className="space-y-3 list-disc list-inside pl-4">
              {recommendations.map((rec, index) => (
                <li key={index} className="text-foreground">{rec}</li>
              ))}
            </ul>
          ) : (
            !error && <p className="text-center text-muted-foreground">No recommendations generated yet.</p>
          )}
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <Button variant="outline" onClick={() => router.push('/vacation-details')}>
            Edit Details
          </Button>
          <span className="text-sm text-muted-foreground">Happy travels!</span>
        </CardFooter>
      </Card>
    </div>
  );
}


// Wrap the content with AuthProvider
export default function RecommendationsPage() {
    return (
      <AuthProvider>
        <RecommendationsContent />
      </AuthProvider>
    );
  }
