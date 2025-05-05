'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, MapPin, ArrowRight, Car, Footprints, Info } from 'lucide-react';
import { getFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit, onSnapshot } from 'firebase/firestore';
import { VacationDetails, PlannedVisit, Itinerary, ItineraryStep } from '@/firebase/types';
import { generateItinerary } from '@/ai/flows/generate-itinerary'; // Import the new flow
import { useToast } from "@/hooks/use-toast";

// Interface matching AI Flow output
interface GeneratedItinerary {
    days: Record<string, ItineraryStep[]>;
}

export default function ItineraryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } } from useToast();
  const [vacations, setVacations] = useState<VacationDetails[]>([]);
  const [selectedVacation, setSelectedVacation] = useState<VacationDetails | null>(null);
  const [plannedItems, setPlannedItems] = useState<PlannedVisit[]>([]);
  const [itinerary, setItinerary] = useState<GeneratedItinerary | null>(null); // State for the generated itinerary
  const [loadingVacations, setLoadingVacations] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [loadingItinerary, setLoadingItinerary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { firestore } = getFirebase();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

   // Fetch user's vacations to allow selection
   useEffect(() => {
    if (user && firestore) {
      setLoadingVacations(true);
      const vacationsQuery = query(collection(firestore, 'vacationDetails'), where('userId', '==', user.uid));
      const unsubscribe = onSnapshot(vacationsQuery, (snapshot) => {
          const fetchedVacations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VacationDetails));
          setVacations(fetchedVacations);
           // Select the first vacation if none is selected or current selection is gone
           if (!selectedVacation || !fetchedVacations.some(v => v.id === selectedVacation?.id)) {
               setSelectedVacation(fetchedVacations.length > 0 ? fetchedVacations[0] : null);
           }
          setLoadingVacations(false);
      }, (error) => {
          console.error("Error fetching vacations:", error);
          setError("Failed to load vacation plans.");
          setLoadingVacations(false);
      });
       return () => unsubscribe();
    } else if (!authLoading && !user) {
        setLoadingVacations(false);
        setVacations([]);
        setSelectedVacation(null);
    }
  }, [user, firestore, authLoading]); // Removed selectedVacation

  // Fetch planned items for the selected vacation
  useEffect(() => {
    if (user && firestore && selectedVacation) {
      setLoadingPlan(true);
       setItinerary(null); // Clear old itinerary when vacation changes
       setError(null); // Clear old errors
      const plannedVisitsQuery = query(
        collection(firestore, `users/${user.uid}/plannedVisits`),
        where('vacationId', '==', selectedVacation.id)
      );
      const unsubscribe = onSnapshot(plannedVisitsQuery, (snapshot) => {
        const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlannedVisit));
        setPlannedItems(fetchedItems);
        setLoadingPlan(false);
        // Trigger generation only if there are items
        if (fetchedItems.length > 0) {
            handleGenerateItinerary(fetchedItems, selectedVacation); // Pass current items and vacation
        } else {
            setLoadingItinerary(false); // No items, no itinerary to load
        }
      }, (error) => {
        console.error("Error fetching planned visits:", error);
        toast({ title: "Failed to load plan items.", variant: "destructive" });
        setLoadingPlan(false);
        setLoadingItinerary(false);
      });
      return () => unsubscribe();
    } else {
      setPlannedItems([]);
      setLoadingPlan(false);
      setLoadingItinerary(false);
      setItinerary(null);
    }
  }, [user, firestore, selectedVacation, toast]); // Re-run when selected vacation changes

  // Function to call the AI itinerary generation flow
  const handleGenerateItinerary = useCallback(async (currentPlannedItems: PlannedVisit[], currentVacation: VacationDetails | null) => {
      if (!currentVacation || currentPlannedItems.length === 0) {
          //setError("Cannot generate itinerary without a plan or vacation details.");
          return;
      }
       setLoadingItinerary(true);
       setError(null);
       setItinerary(null); // Clear previous itinerary

      try {
           const input = {
             destination: currentVacation.destination,
             dates: currentVacation.dates,
             plannedVisits: currentPlannedItems.map(item => ({ // Map to expected format for the flow
                 locationId: item.locationId,
                 locationName: item.locationName,
                 description: item.description || '',
             }))
           };
          console.log("Generating itinerary with input:", input);
          const result = await generateItinerary(input);
          console.log("Itinerary generation result:", result);
          setItinerary(result); // Assuming the flow returns the { days: ... } structure
      } catch (err: any) {
           console.error("Error generating itinerary:", err);
           setError(err.message || "Failed to generate itinerary.");
           toast({ title: "Failed to generate itinerary", description: err.message, variant: "destructive" });
      } finally {
          setLoadingItinerary(false);
      }
  }, [toast]); // Add dependencies used inside useCallback


  const getTravelIcon = (mode?: 'walk' | 'drive' | 'transit') => {
     switch (mode) {
        case 'walk': return <Footprints className="h-4 w-4 text-muted-foreground" />;
        case 'drive': return <Car className="h-4 w-4 text-muted-foreground" />;
        case 'transit': return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bus"><path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg> ; // Example for transit
        default: return <ArrowRight className="h-4 w-4 text-muted-foreground" />;
     }
  };

  if (authLoading || loadingVacations) {
     return (
      <div className="p-4 pt-10 space-y-6">
        <Skeleton className="h-8 w-1/2 mx-auto mb-6" /> {/* Title */}
        <Skeleton className="h-10 w-full md:w-1/2 mx-auto" /> {/* Vacation Selector */}
         {/* Itinerary Skeleton */}
         {[...Array(2)].map((_, dayIndex) => (
           <Card key={`day-skel-${dayIndex}`}>
             <CardHeader>
               <Skeleton className="h-6 w-1/4" />
             </CardHeader>
             <CardContent className="space-y-4">
               {[...Array(3)].map((_, stepIndex) => (
                 <div key={`step-skel-${dayIndex}-${stepIndex}`} className="flex items-center gap-4 p-3 border-b last:border-b-0">
                   <Skeleton className="h-6 w-20" /> {/* Time */}
                   <Skeleton className="h-5 w-5 rounded-full" /> {/* Icon */}
                   <div className="flex-grow space-y-1">
                     <Skeleton className="h-5 w-3/4" />
                     <Skeleton className="h-3 w-1/2" />
                   </div>
                   <Skeleton className="h-5 w-16" /> {/* Duration */}
                 </div>
               ))}
             </CardContent>
           </Card>
         ))}
         <Skeleton className="h-10 w-full mt-6" /> {/* Edit Plan Button */}
      </div>
    );
  }

   if (!selectedVacation && !loadingVacations) {
    return (
      <div className="p-4 pt-10 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
         <Card className="w-full max-w-md">
           <CardHeader>
             <CardTitle>No Vacation Plan Selected</CardTitle>
             <CardDescription>Please select a vacation plan to view or generate its itinerary.</CardDescription>
           </CardHeader>
            <CardContent>
             <Button onClick={() => router.push('/vacation-details')}>
               Create Vacation Plan
             </Button>
           </CardContent>
         </Card>
       </div>
    );
   }


  return (
    <div className="p-4 pt-10 space-y-6 pb-20 md:pb-4">
      <h1 className="text-2xl font-bold mb-6 text-center text-primary">Your Generated Itinerary</h1>

      {/* Display Loading/Error/NoPlan States */}
      {loadingItinerary ? (
          <>
            <CardDescription className="text-center text-muted-foreground animate-pulse">Generating itinerary...</CardDescription>
            {/* Itinerary Skeleton */}
            {[...Array(2)].map((_, dayIndex) => (
               <Card key={`day-skel-${dayIndex}`}>
                 <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
                 <CardContent className="space-y-4">
                   {[...Array(3)].map((_, stepIndex) => (
                     <div key={`step-skel-${dayIndex}-${stepIndex}`} className="flex items-center gap-4 p-3 border-b last:border-b-0">
                       <Skeleton className="h-6 w-20" /><Skeleton className="h-5 w-5 rounded-full" />
                       <div className="flex-grow space-y-1"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                       <Skeleton className="h-5 w-16" />
                     </div>))}
                 </CardContent>
               </Card>))}
           </>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-destructive text-center">
            <p>Error generating itinerary: {error}</p>
             <Button variant="link" onClick={() => handleGenerateItinerary(plannedItems, selectedVacation)} className="mt-2">Retry</Button>
          </CardContent>
        </Card>
       ) : !itinerary || Object.keys(itinerary.days).length === 0 ? (
         <Card>
           <CardContent className="p-6 text-center text-muted-foreground flex flex-col items-center gap-3">
             <Info className="h-8 w-8"/>
             {plannedItems.length === 0
               ? "Add items to your plan to generate an itinerary."
               : "Itinerary generation did not produce results. Try adjusting your plan."
             }
             <Button variant="outline" size="sm" onClick={() => router.push('/plan')} className="mt-2">
               Go to Plan
             </Button>
           </CardContent>
         </Card>
      ) : (
        Object.entries(itinerary.days).map(([day, steps]) => (
          <Card key={day}>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-secondary-foreground">{day}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-0">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                   <div className="w-20 text-sm font-medium text-muted-foreground tabular-nums shrink-0">
                       {step.startTime} {step.endTime && `- ${step.endTime}`}
                   </div>
                   <div className="flex items-center justify-center w-6 shrink-0">
                      {step.type === 'visit' ? <MapPin className="h-4 w-4 text-primary" /> : getTravelIcon(step.travelMode)}
                   </div>
                  <div className="flex-grow min-w-0"> {/* Added min-w-0 */}
                    {step.type === 'visit' ? (
                      <p className="font-semibold text-foreground truncate">{step.locationName}</p>
                    ) : (
                       <p className="text-sm italic text-muted-foreground truncate">
                            Travel {step.travelMode ? `(${step.travelMode})` : ''}
                            {step.travelDetails ? ` - ${step.travelDetails}` : ''}
                        </p>
                    )}
                  </div>
                   <div className="flex items-center text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                       <Clock className="h-3 w-3 mr-1" /> {step.durationMinutes} min
                   </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}

       <Button variant="outline" onClick={() => router.push('/plan')} className="w-full mt-6">
         Back to Plan
       </Button>
    </div>
  );
}
