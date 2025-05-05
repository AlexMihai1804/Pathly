'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, Trash2, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image'; // Using next/image
import { getFirebase } from '@/firebase';
import { collection, query, onSnapshot, doc, deleteDoc, setDoc, where } from 'firebase/firestore'; // Import needed functions
import { FavoriteLocation, PlannedVisit, VacationDetails } from '@/firebase/types'; // Import types
import { useToast } from '@/hooks/use-toast'; // Import toast
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [vacations, setVacations] = useState<VacationDetails[]>([]);
  const [loadingVacations, setLoadingVacations] = useState(true);
  const { firestore } = getFirebase();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Fetch Favorites
  useEffect(() => {
    if (user && firestore) {
      setLoading(true);
      const favoritesQuery = query(collection(firestore, `users/${user.uid}/favoriteLocations`));
      const unsubscribe = onSnapshot(favoritesQuery, (snapshot) => {
        const fetchedFavorites = snapshot.docs.map(doc => ({
          id: doc.id, // Use Firestore doc ID as the main ID
          ...doc.data(),
        } as FavoriteLocation & { id: string })); // Ensure id is part of the type
        setFavorites(fetchedFavorites);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching favorites:", error);
        toast({ title: "Error loading favorites.", variant: "destructive" });
        setLoading(false);
      });
      return () => unsubscribe(); // Clean up listener
    } else if (!authLoading && !user) {
        setLoading(false); // Stop loading if user is confirmed absent
    }
  }, [user, firestore, authLoading, toast]);

  // Fetch Vacations for "Add to Plan" dropdown
  useEffect(() => {
    if (user && firestore) {
      setLoadingVacations(true);
      const vacationsQuery = query(collection(firestore, 'vacationDetails'), where('userId', '==', user.uid));
      const unsubscribe = onSnapshot(vacationsQuery, (snapshot) => {
          const fetchedVacations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VacationDetails));
          setVacations(fetchedVacations);
          setLoadingVacations(false);
      }, (error) => {
          console.error("Error fetching vacations:", error);
          toast({ title: "Failed to load vacation plans.", variant: "destructive" });
          setLoadingVacations(false);
      });
       return () => unsubscribe(); // Clean up listener
    } else if (!authLoading && !user) {
        setLoadingVacations(false);
        setVacations([]);
    }
  }, [user, firestore, authLoading, toast]);

  const handleRemoveFavorite = async (locationId: string, locationName: string) => {
    if (!user || !firestore) return;
    console.log(`Removing favorite ${locationId}`);
    const favRef = doc(firestore, `users/${user.uid}/favoriteLocations`, locationId);
    try {
      await deleteDoc(favRef);
      toast({ title: `${locationName} removed from favorites.` });
      // Optimistic update handled by listener, but could force a re-render if needed
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast({ title: `Could not remove ${locationName}.`, variant: "destructive" });
    }
  };

  const handleAddToPlan = async (vacation: VacationDetails, fav: FavoriteLocation) => {
      if (!user || !firestore) return;
       console.log(`Adding ${fav.name} to plan ${vacation.destination}`);

       const planDocRef = doc(collection(firestore, `users/${user.uid}/plannedVisits`)); // Auto-generate ID
       const planData: PlannedVisit = { // Ensure type includes id
           id: planDocRef.id, // Store the generated ID
           userId: user.uid,
           vacationId: vacation.id,
           locationId: fav.locationId,
           locationName: fav.name,
           locationImageUrl: fav.imageUrl || `https://picsum.photos/seed/${fav.locationId}/200/200`, // Use favorite image or placeholder
           description: fav.description,
           dataAiHint: fav.dataAiHint || fav.name.toLowerCase().split(' ').slice(0, 2).join(' '),
       };

      try {
          // Check if already exists (optional, could rely on user not adding duplicates)
          const q = query(collection(firestore, `users/${user.uid}/plannedVisits`),
                          where("vacationId", "==", vacation.id),
                          where("locationId", "==", fav.locationId),
                          limit(1));
          const existing = await getDocs(q);
          if (!existing.empty) {
              toast({ title: `${fav.name} is already in your plan for ${vacation.destination}.` });
              return;
          }

          await setDoc(planDocRef, planData);
          toast({
              title: `${fav.name} added to ${vacation.destination} plan!`,
              action: (
                  <Button variant="link" size="sm" onClick={() => router.push('/plan')}>
                      View Plan
                  </Button>
              ),
          });
      } catch (error) {
          console.error("Error adding to plan:", error);
          toast({ title: `Could not add ${fav.name} to plan.`, variant: "destructive" });
      }
  };

  if (authLoading || loading) {
    return (
      <div className="p-4 pt-10 space-y-4">
        <Skeleton className="h-8 w-1/2 mx-auto mb-6" />
        <div className="grid grid-cols-1 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="flex gap-4 p-4">
              <Skeleton className="h-20 w-20 rounded-md" />
              <div className="flex-grow space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-1/2" />
              </div>
               <div className="flex flex-col justify-between items-end">
                 <Skeleton className="h-8 w-8 rounded-full" />
                 <Skeleton className="h-8 w-8 rounded-full" />
               </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-10 pb-20 md:pb-4">
      <h1 className="text-2xl font-bold mb-6 text-center text-primary">Your Favorite Places</h1>

      {favorites.length > 0 ? (
        <div className="space-y-4">
          {favorites.map((fav) => (
            <Card key={fav.id} className="flex flex-col sm:flex-row gap-4 p-4 shadow-md overflow-hidden">
              <div className="relative w-full sm:w-24 h-24 sm:h-auto shrink-0 rounded-md overflow-hidden">
               <Image
                  src={fav.imageUrl || `https://picsum.photos/seed/${fav.locationId}/200/200`}
                  alt={fav.name}
                  layout="fill"
                  objectFit="cover"
                  data-ai-hint={fav.dataAiHint || fav.name.toLowerCase().split(' ').slice(0, 2).join(' ')}
                  className="bg-muted"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://picsum.photos/seed/${fav.locationId}/200/200`; // Fallback placeholder
                    target.alt = `${fav.name} (Placeholder Image)`;
                  }}
                />
              </div>
              <div className="flex-grow">
                <CardTitle className="text-lg font-semibold mb-1">{fav.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{fav.description || 'No description available.'}</p>
              </div>
              <div className="flex flex-row sm:flex-col justify-between items-center sm:items-end shrink-0 gap-2 mt-2 sm:mt-0">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                       <Button variant="ghost" size="icon" disabled={loadingVacations || vacations.length === 0} aria-label={`Add ${fav.name} to plan`}>
                           <ListChecks className="h-5 w-5 text-muted-foreground hover:text-primary" />
                       </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       <DropdownMenuLabel>Add to which plan?</DropdownMenuLabel>
                       <DropdownMenuSeparator />
                        {loadingVacations ? (
                             <DropdownMenuItem disabled>Loading plans...</DropdownMenuItem>
                        ) : vacations.length === 0 ? (
                             <DropdownMenuItem disabled>Create a vacation plan first.</DropdownMenuItem>
                        ) : (
                            vacations.map((vacation) => (
                               <DropdownMenuItem key={vacation.id} onSelect={() => handleAddToPlan(vacation, fav)}>
                                   <MapPin className="mr-2 h-4 w-4" />
                                   <span>{vacation.destination}</span>
                               </DropdownMenuItem>
                            ))
                        )}
                    </DropdownMenuContent>
                   </DropdownMenu>

                <Button variant="ghost" size="icon" onClick={() => handleRemoveFavorite(fav.locationId, fav.name)} aria-label={`Remove ${fav.name} from favorites`}>
                  <Trash2 className="h-5 w-5 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            You haven't saved any favorite places yet. Start discovering!
             <Button variant="link" onClick={() => router.push('/discover')} className="text-primary px-1">
               Discover Places
             </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
