'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trash2, Route, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { getFirebase } from '@/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, limit } from 'firebase/firestore'; // Import needed functions
import { PlannedVisit, VacationDetails } from '@/firebase/types'; // Import types
import { useToast } from '@/hooks/use-toast'; // Import toast
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function PlanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [vacations, setVacations] = useState<VacationDetails[]>([]);
  const [selectedVacation, setSelectedVacation] = useState<VacationDetails | null>(null);
  const [plannedItems, setPlannedItems] = useState<PlannedVisit[]>([]);
  const [loadingVacations, setLoadingVacations] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(false); // Changed initial state
  const { firestore } = getFirebase();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

   // Fetch user's vacations
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
          toast({ title: "Failed to load vacation plans.", variant: "destructive" });
          setLoadingVacations(false);
      });
       return () => unsubscribe();
    } else if (!authLoading && !user) {
        setLoadingVacations(false);
        setVacations([]);
        setSelectedVacation(null);
    }
  }, [user, firestore, authLoading, toast]); // Removed selectedVacation

  // Fetch planned items for the selected vacation
  useEffect(() => {
    if (user && firestore && selectedVacation) {
      setLoadingPlan(true);
      const plannedVisitsQuery = query(
        collection(firestore, `users/${user.uid}/plannedVisits`),
        where('vacationId', '==', selectedVacation.id)
        // Add orderBy('orderField') here later if needed
      );
      const unsubscribe = onSnapshot(plannedVisitsQuery, (snapshot) => {
        const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlannedVisit));
        setPlannedItems(fetchedItems);
        setLoadingPlan(false);
      }, (error) => {
        console.error("Error fetching planned visits:", error);
        toast({ title: "Failed to load plan items.", variant: "destructive" });
        setLoadingPlan(false);
      });
      return () => unsubscribe(); // Clean up listener
    } else {
      // Clear planned items if no vacation is selected or user logs out
      setPlannedItems([]);
      setLoadingPlan(false); // Ensure loading stops
    }
  }, [user, firestore, selectedVacation, toast]); // Rerun when selected vacation changes

  const handleRemoveFromPlan = async (plannedItemId: string, itemName: string) => {
    if (!user || !firestore) return;
    console.log(`Removing item ${plannedItemId} from plan`);
    const planRef = doc(firestore, `users/${user.uid}/plannedVisits`, plannedItemId);
    try {
      await deleteDoc(planRef);
      toast({ title: `${itemName} removed from plan.` });
      // Optimistic update handled by listener
    } catch (error) {
      console.error("Error removing from plan:", error);
      toast({ title: `Could not remove ${itemName}.`, variant: "destructive" });
    }
  };

  const handleGenerateItinerary = () => {
     if (!selectedVacation) {
         toast({ title: "Please select a vacation plan first.", variant: "destructive"});
         return;
     }
     if (plannedItems.length === 0) {
         toast({ title: "Add items to your plan before generating an itinerary.", variant: "destructive"});
         return;
     }
    console.log('Navigating to generate itinerary for vacation:', selectedVacation.id);
    router.push('/itinerary'); // Pass vacationId as query param maybe? No, rely on selectedVacation state for now.
  };

  const renderLoadingSkeletons = (count: number) => (
     <div className="space-y-4">
        {[...Array(count)].map((_, i) => (
          <Card key={i} className="flex gap-4 p-4">
            <Skeleton className="h-16 w-16 rounded-md" />
            <div className="flex-grow space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full self-center" />
          </Card>
        ))}
      </div>
  );

  if (authLoading || loadingVacations) {
     return (
      <div className="p-4 pt-10 space-y-4">
        <Skeleton className="h-8 w-1/2 mx-auto mb-6" /> {/* Title */}
         <Skeleton className="h-10 w-full md:w-1/2 mx-auto" /> {/* Vacation Selector Skeleton */}
        {renderLoadingSkeletons(3)}
        <Skeleton className="h-10 w-full mt-6" /> {/* Generate Button */}
      </div>
    );
  }

   if (!selectedVacation && !loadingVacations) {
    return (
      <div className="p-4 pt-10 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
         <Card className="w-full max-w-md">
           <CardHeader>
             <CardTitle>No Vacation Plan Found</CardTitle>
             <CardDescription>Please create a vacation plan first.</CardDescription>
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
    <div className="p-4 pt-10 pb-20 md:pb-4">
      <h1 className="text-2xl font-bold mb-6 text-center text-primary">Your Vacation Plan</h1>

       {/* Vacation Selector Dropdown */}
      <div className="flex justify-center mb-4">
         {vacations.length > 0 && selectedVacation && (
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button variant="outline" className="w-full md:w-auto text-base md:text-sm truncate">
                 {selectedVacation.destination} ({selectedVacation.dates})
                 <MapPin className="ml-2 h-4 w-4 shrink-0" />
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="center" className="w-[--radix-dropdown-menu-trigger-width]">
               <DropdownMenuLabel>Select Plan</DropdownMenuLabel>
               <DropdownMenuSeparator />
               {vacations.map((vacation) => (
                 <DropdownMenuCheckboxItem
                   key={vacation.id}
                   checked={selectedVacation?.id === vacation.id}
                   onCheckedChange={() => setSelectedVacation(vacation)}
                   className="truncate"
                 >
                   {vacation.destination} ({vacation.dates})
                 </DropdownMenuCheckboxItem>
               ))}
                <DropdownMenuSeparator />
                 <DropdownMenuCheckboxItem onSelect={() => router.push('/vacation-details')}>
                    Create New Vacation...
                 </DropdownMenuCheckboxItem>
             </DropdownMenuContent>
           </DropdownMenu>
         )}
       </div>

      {loadingPlan ? renderLoadingSkeletons(3) : (
          plannedItems.length > 0 ? (
            <div className="space-y-4">
              {plannedItems.map((item) => (
                <Card key={item.id} className="flex items-center gap-4 p-4 shadow-sm">
                   <div className="relative w-16 h-16 shrink-0 rounded-md overflow-hidden">
                     <Image
                      src={item.locationImageUrl || `https://picsum.photos/seed/${item.locationId}/100/100`}
                      alt={item.locationName}
                      layout="fill"
                      objectFit="cover"
                      data-ai-hint={item.dataAiHint || 'planned location'}
                      className="bg-muted"
                      onError={(e) => {
                         const target = e.target as HTMLImageElement;
                         target.src = `https://picsum.photos/seed/${item.locationId}/100/100`; // Fallback placeholder
                         target.alt = `${item.locationName} (Placeholder Image)`;
                      }}
                     />
                   </div>
                  <div className="flex-grow">
                    <CardTitle className="text-md font-semibold">{item.locationName}</CardTitle>
                     <p className="text-sm text-muted-foreground line-clamp-1">{item.description || 'No description'}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveFromPlan(item.id, item.locationName)} aria-label={`Remove ${item.locationName} from plan`}>
                    <Trash2 className="h-5 w-5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </Card>
              ))}
              <Button onClick={handleGenerateItinerary} className="w-full mt-6 bg-accent hover:bg-accent/90">
                 Generate Itinerary <Route className="ml-2 h-4 w-4"/>
              </Button>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                 This plan is empty. Add places from Discover or Favorites!
                 <Button variant="link" onClick={() => router.push('/discover')} className="text-primary px-1">
                   Discover Places
                 </Button>
              </CardContent>
            </Card>
          )
      )}
    </div>
  );
}
