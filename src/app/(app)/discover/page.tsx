
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Plus, MapPin, Filter, BadgeAlert, ListPlus, X, Search as SearchIcon } from 'lucide-react'; // Added SearchIcon
import { Skeleton } from '@/components/ui/skeleton';
import { getFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { VacationDetails, FavoriteLocation, PlannedVisit } from '@/firebase/types';
import Image from 'next/image';
import { getPlacesRecommendations } from '@/actions/get-places-recommendations'; // Import the server action
import { useToast } from "@/hooks/use-toast"


import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Interface matching the structure returned by the server action
interface Recommendation {
    id: string;         // place_id from Google Places
    name: string;
    description: string; // Formatted address or summary
    imageUrl?: string;   // Optional photo URL (constructed server-side)
    imageSearchHint: string; // Fallback hint
    tags: string[];     // Mapped from place types
}

export default function DiscoverPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [vacations, setVacations] = useState<VacationDetails[]>([]);
  const [selectedVacation, setSelectedVacation] = useState<VacationDetails | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set()); // Store place_ids of favorited locations
  const [plannedVisitIds, setPlannedVisitIds] = useState<Set<string>>(new Set()); // Store place_ids of planned locations
  const [loadingVacations, setLoadingVacations] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [submittedSearchTerm, setSubmittedSearchTerm] = useState<string | null>(null); // Track submitted search term
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set()); // Store active filter tags
  const { firestore } = getFirebase();

  const allTags = useMemo(() => {
      const tags = new Set<string>();
      recommendations.forEach(rec => rec.tags.forEach(tag => tags.add(tag)));
      return Array.from(tags).sort();
  }, [recommendations]);


  // Redirect if not logged in
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
           // If no vacation is selected or the selected one is deleted, select the first one
           if (!selectedVacation || !fetchedVacations.some(v => v.id === selectedVacation?.id)) {
               setSelectedVacation(fetchedVacations.length > 0 ? fetchedVacations[0] : null);
           }
          setLoadingVacations(false);
      }, (error) => {
          console.error("Error fetching vacations:", error);
          setError("Failed to load vacation plans.");
          setLoadingVacations(false);
      });
       return () => unsubscribe(); // Clean up listener
    } else if (!authLoading && !user) {
      setLoadingVacations(false); // Stop loading if user is confirmed absent
      setSelectedVacation(null); // Clear selection if user logs out
      setVacations([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, firestore, authLoading]); // selectedVacation removed to prevent loop

   // Fetch favorites
  useEffect(() => {
    if (user && firestore) {
      const favoritesQuery = query(collection(firestore, `users/${user.uid}/favoriteLocations`));
      const unsubscribe = onSnapshot(favoritesQuery, (snapshot) => {
        const favIds = new Set(snapshot.docs.map(doc => doc.id)); // locationId (place_id) is the doc id
        setFavorites(favIds);
      }, (error) => {
        console.error("Error fetching favorites:", error);
      });
       return () => unsubscribe(); // Clean up listener
    } else {
       setFavorites(new Set()); // Clear favorites if no user
    }
  }, [user, firestore]);

   // Fetch planned visits for the *selected* vacation
   useEffect(() => {
     if (user && firestore && selectedVacation) {
       const plannedVisitsQuery = query(
         collection(firestore, `users/${user.uid}/plannedVisits`),
         where('vacationId', '==', selectedVacation.id)
       );
       const unsubscribe = onSnapshot(plannedVisitsQuery, (snapshot) => {
         const visitIds = new Set(snapshot.docs.map(doc => (doc.data() as PlannedVisit).locationId));
         setPlannedVisitIds(visitIds);
       }, (error) => {
         console.error("Error fetching planned visits:", error);
       });
       return () => unsubscribe(); // Clean up listener
     } else {
       setPlannedVisitIds(new Set()); // Clear planned visits if no vacation selected or no user
     }
   }, [user, firestore, selectedVacation]); // Re-run when selectedVacation changes


  // Fetch recommendations based on vacation details or submitted search term
  const fetchRecommendations = useCallback(async (searchQuery?: string) => {
    // Use selectedVacation for destination context, even if searching
    if (selectedVacation && user) {
      setLoadingRecommendations(true);
      setError(null);
      setRecommendations([]); // Clear previous recommendations

      const input = {
        destination: selectedVacation.destination,
        // Use search query if provided, otherwise default interests
        interests: searchQuery ?? selectedVacation.interests,
      };

      try {
        const result = await getPlacesRecommendations(input); // Call the server action
        setRecommendations(result.recommendations);
      } catch (err) {
        console.error("Error fetching recommendations:", err);
        setError(err instanceof Error ? err.message : "Could not fetch recommendations. Please try again later.");
      } finally {
        setLoadingRecommendations(false);
      }
    } else {
      setRecommendations([]); // Clear recommendations if no vacation selected
      setLoadingRecommendations(false); // Ensure loading stops
    }
  }, [selectedVacation, user]); // Dependencies for the fetch function itself

  // Initial fetch when vacation changes
  useEffect(() => {
    if (selectedVacation && submittedSearchTerm === null) { // Only fetch based on vacation if no search is active
        fetchRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVacation, submittedSearchTerm]); // Re-run when selected vacation changes or search term is cleared

  // Handle search form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const termToSearch = searchTerm.trim();
    if (termToSearch) {
       setSubmittedSearchTerm(termToSearch); // Set the submitted term
       fetchRecommendations(termToSearch); // Fetch based on search term
    } else {
        // If search is cleared, revert to fetching based on vacation details
        setSubmittedSearchTerm(null);
        fetchRecommendations();
    }
  };

  // Apply client-side filtering (e.g., by tags) AFTER recommendations are fetched
  const filteredRecommendations = useMemo(() => {
     let filtered = recommendations;

      // Apply tag filters (search term filter is now handled by API call)
      if (activeFilters.size > 0) {
          filtered = filtered.filter(rec =>
              rec.tags.some(tag => activeFilters.has(tag))
          );
      }

     return filtered;
  }, [recommendations, activeFilters]);


  const handleFilterToggle = (tag: string) => {
    setActiveFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(tag)) {
        newFilters.delete(tag);
      } else {
        newFilters.add(tag);
      }
      return newFilters;
    });
  };

  const handleFavoriteToggle = async (rec: Recommendation) => {
      if (!user || !firestore) return;
      const locationId = rec.id; // place_id
      const isFavorited = favorites.has(locationId);
      const favRef = doc(firestore, `users/${user.uid}/favoriteLocations`, locationId);

      try {
          if (isFavorited) {
              await deleteDoc(favRef);
               toast({ title: `${rec.name} removed from favorites.` });
          } else {
              const favData: Omit<FavoriteLocation, 'id' | 'imageUrl' | 'description' | 'dataAiHint'> & { // Ensure required fields match schema
                 userId: string;
                 locationId: string;
                 name: string;
                 imageUrl?: string; // Add optional fields if needed in Favorites
                 description?: string;
                 dataAiHint?: string;
              } = { // Assuming 'id' is locationId
                 userId: user.uid,
                 locationId: locationId,
                 name: rec.name, // Denormalize name
                 imageUrl: rec.imageUrl, // Optional: store image URL
                 description: rec.description, // Optional: store description
                 dataAiHint: rec.imageSearchHint // Optional: store hint
              };
              await setDoc(favRef, favData); // Use locationId (place_id) as doc ID
               toast({ title: `${rec.name} added to favorites!` });
          }
          // Local state update is handled by the onSnapshot listener
      } catch (error) {
          console.error("Error updating favorite:", error);
           toast({ title: `Could not update favorite for ${rec.name}.`, variant: "destructive" });
      }
  };

  const handlePlanToggle = async (rec: Recommendation) => {
      if (!user || !firestore || !selectedVacation) return;
      const locationId = rec.id; // place_id
      const isInPlan = plannedVisitIds.has(locationId);
      // Generate a unique ID for the plan item, perhaps combining vacation and location ID
       const planItemId = `${selectedVacation.id}_${locationId}`;
      const planRef = doc(firestore, `users/${user.uid}/plannedVisits`, planItemId);

      try {
          if (isInPlan) {
               await deleteDoc(planRef);
               toast({ title: `${rec.name} removed from plan.` });
          } else {
               const planData: Omit<PlannedVisit, 'id'> = { // Assuming 'id' will be planItemId
                   userId: user.uid,
                   vacationId: selectedVacation.id,
                   locationId: locationId,
                   locationName: rec.name, // Denormalize
                   locationImageUrl: rec.imageUrl || `https://picsum.photos/seed/${locationId}/200/200`, // Use API image or placeholder
                   description: rec.description, // Denormalize description
                   dataAiHint: rec.imageSearchHint, // Store hint
               };
               await setDoc(planRef, planData);
                toast({ title: `${rec.name} added to plan!` });
          }
          // Local state update handled by onSnapshot listener
      } catch (error) {
          console.error("Error updating plan:", error);
           toast({ title: `Could not update plan for ${rec.name}.`, variant: "destructive" });
      }
  };


  const renderLoadingSkeletons = (count: number) => (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(count)].map((_, i) => (
          <Card key={`skel-${i}`} className="overflow-hidden shadow-md">
            <Skeleton className="aspect-video w-full" />
            <CardContent className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2 mt-1" />
               <div className="flex gap-2 mt-3">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                </div>
            </CardContent>
            <CardFooter className="flex justify-between p-3 bg-muted/50 border-t">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
  );

  if (authLoading || loadingVacations) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-full md:w-1/2 mx-auto" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-grow" />
          <Skeleton className="h-10 w-10" />
        </div>
        {renderLoadingSkeletons(6)}
      </div>
    );
  }

   if (!selectedVacation && !loadingVacations) {
    return (
      <div className="p-4 pt-10 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
         <Card className="w-full max-w-md">
           <CardHeader>
             <CardTitle>No Vacation Selected</CardTitle>
             <CardDescription>Please create or select a vacation plan to see recommendations.</CardDescription>
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
    <div className="p-4 space-y-4 pb-20 md:pb-4">
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
               <DropdownMenuLabel>Switch Vacation Plan</DropdownMenuLabel>
               <DropdownMenuSeparator />
               {vacations.map((vacation) => (
                 <DropdownMenuCheckboxItem
                   key={vacation.id}
                   checked={selectedVacation?.id === vacation.id}
                   onCheckedChange={() => {
                       setSelectedVacation(vacation);
                       setSubmittedSearchTerm(null); // Reset search when switching vacation
                       setSearchTerm(''); // Clear search input
                   }}
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

      {/* Search and Filter Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2 sticky top-0 bg-background py-2 z-10">
        <Input
          type="search"
          placeholder="Search for places..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow"
          aria-label="Search for places"
        />
        <Button type="submit" size="icon" aria-label="Submit search">
           <SearchIcon className="h-4 w-4" />
        </Button>
         <DropdownMenu>
           <DropdownMenuTrigger asChild>
             <Button variant="outline" size="icon" disabled={loadingRecommendations || allTags.length === 0} aria-label="Filter results by tag">
               <Filter className="h-4 w-4" />
               {activeFilters.size > 0 && (
                   <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
                    {activeFilters.size}
                  </Badge>
               )}
             </Button>
           </DropdownMenuTrigger>
           <DropdownMenuContent align="end">
             <DropdownMenuLabel>Filter by Tag</DropdownMenuLabel>
             <DropdownMenuSeparator />
             {allTags.map(tag => (
                 <DropdownMenuCheckboxItem
                   key={tag}
                   checked={activeFilters.has(tag)}
                   onCheckedChange={() => handleFilterToggle(tag)}
                   className="capitalize" // Capitalize first letter for display
                 >
                   {tag}
                 </DropdownMenuCheckboxItem>
             ))}
              {activeFilters.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                   <DropdownMenuCheckboxItem onSelect={() => setActiveFilters(new Set())} className="text-destructive">
                     Clear Filters
                   </DropdownMenuCheckboxItem>
                </>
               )}
           </DropdownMenuContent>
         </DropdownMenu>
      </form>

       {/* Active Filters Display */}
        {activeFilters.size > 0 && (
            <div className="flex flex-wrap gap-1">
                {Array.from(activeFilters).map(tag => (
                    <Badge key={tag} variant="secondary" className="capitalize">
                        {tag}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 ml-1 p-0"
                            onClick={() => handleFilterToggle(tag)}
                            aria-label={`Remove ${tag} filter`}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </Badge>
                ))}
            </div>
        )}

      {/* Recommendations Grid */}
       {loadingRecommendations ? (
          renderLoadingSkeletons(6)
       ) : error ? (
         <Card className="col-span-full">
           <CardContent className="p-6 text-center text-destructive flex flex-col items-center gap-2">
             <BadgeAlert className="h-8 w-8" />
             <p>{error}</p>
             <Button variant="outline" size="sm" onClick={() => fetchRecommendations(submittedSearchTerm ?? undefined)}>
               Retry
             </Button>
           </CardContent>
         </Card>
       ) : filteredRecommendations.length > 0 ? (
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           {filteredRecommendations.map((rec) => (
             <Card key={rec.id} className="overflow-hidden shadow-md flex flex-col group">
              <CardHeader className="p-0 relative aspect-video overflow-hidden bg-muted">
                {rec.imageUrl ? (
                    <Image
                      src={rec.imageUrl} // Use the URL from Google Places API
                      alt={rec.name}
                      layout="fill"
                      objectFit="cover"
                      data-ai-hint={rec.imageSearchHint}
                      className="transition-transform duration-300 ease-in-out group-hover:scale-105"
                      unoptimized // Consider if optimization is needed/possible with Maps API URLs
                       // Add error handling for images
                       onError={(e) => {
                           const target = e.target as HTMLImageElement;
                           target.src = `https://picsum.photos/seed/${rec.id}/400/300`; // Fallback placeholder
                           target.alt = `${rec.name} (Placeholder Image)`;
                         }}
                    />
                ) : (
                   <Image
                       src={`https://picsum.photos/seed/${rec.id}/400/300`} // Fallback placeholder
                       alt={`${rec.name} (Placeholder Image)`}
                       layout="fill"
                       objectFit="cover"
                       data-ai-hint={rec.imageSearchHint || 'attraction'}
                       className="transition-transform duration-300 ease-in-out group-hover:scale-105"
                       />
                )}
              </CardHeader>
              <CardContent className="p-4 flex-grow">
                <CardTitle className="text-lg font-semibold mb-1">{rec.name}</CardTitle>
                <p className="text-sm text-muted-foreground mb-2 line-clamp-3">{rec.description}</p>
                 <div className="flex flex-wrap gap-1">
                    {rec.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs capitalize">{tag}</Badge>
                    ))}
                 </div>
              </CardContent>
              <CardFooter className="flex justify-between p-3 bg-muted/50 border-t">
                <Button variant="ghost" size="icon" onClick={() => handleFavoriteToggle(rec)} aria-label={`Favorite ${rec.name}`}>
                   <Heart className={cn(
                     "h-5 w-5 text-muted-foreground transition-colors",
                      favorites.has(rec.id) ? "text-destructive fill-destructive" : "hover:text-destructive hover:fill-destructive/50"
                   )} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handlePlanToggle(rec)} aria-label={`Add ${rec.name} to plan`}>
                   <ListPlus className={cn(
                     "h-5 w-5 text-muted-foreground transition-colors",
                     plannedVisitIds.has(rec.id) ? "text-primary" : "hover:text-primary"
                     )} />
                 </Button>
              </CardFooter>
            </Card>
           ))}
         </div>
       ) : (
        <Card className="col-span-full">
            <CardContent className="p-6 text-center text-muted-foreground">
              {recommendations.length === 0 && !submittedSearchTerm && activeFilters.size === 0
                ? "No recommendations found based on your vacation details."
                : "No recommendations match your current search or filters."
              }
              {activeFilters.size > 0 && (
                 <Button variant="link" onClick={() => setActiveFilters(new Set())} className="p-1 text-sm">
                    Clear Filters?
                 </Button>
              )}
               {submittedSearchTerm && (
                 <Button variant="link" onClick={() => { setSubmittedSearchTerm(null); setSearchTerm(''); fetchRecommendations(); }} className="p-1 text-sm">
                    Clear Search?
                 </Button>
              )}
            </CardContent>
          </Card>
       )}
    </div>
  );
}

    