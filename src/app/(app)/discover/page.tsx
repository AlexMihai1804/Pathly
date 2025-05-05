'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Plus, MapPin, Filter, BadgeAlert, ListPlus, X, Search as SearchIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { VacationDetails, FavoriteLocation, PlannedVisit } from '@/firebase/types';
import Image from 'next/image';
import { getPlacesRecommendations } from '@/actions/get-places-recommendations';
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

interface Recommendation {
    id: string;
    name: string;
    description: string;
    imageUrl?: string;
    imageSearchHint: string;
    tags: string[];
}

export default function DiscoverPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [vacations, setVacations] = useState<VacationDetails[]>([]);
  const [selectedVacation, setSelectedVacation] = useState<VacationDetails | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [plannedVisitIds, setPlannedVisitIds] = useState<Set<string>>(new Set());
  const [loadingVacations, setLoadingVacations] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [submittedSearchTerm, setSubmittedSearchTerm] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const { firestore } = getFirebase();

  const allTags = useMemo(() => {
      const tags = new Set<string>();
      recommendations.forEach(rec => rec.tags.forEach(tag => tags.add(tag)));
      return Array.from(tags).sort();
  }, [recommendations]);


  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && firestore) {
      setLoadingVacations(true);
      const vacationsQuery = query(collection(firestore, 'vacationDetails'), where('userId', '==', user.uid));
      const unsubscribe = onSnapshot(vacationsQuery, (snapshot) => {
          const fetchedVacations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VacationDetails));
          setVacations(fetchedVacations);
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
      setSelectedVacation(null);
      setVacations([]);
    }
  }, [user, firestore, authLoading]); // Removed selectedVacation dependency

   useEffect(() => {
    if (user && firestore) {
      const favoritesQuery = query(collection(firestore, `users/${user.uid}/favoriteLocations`));
      const unsubscribe = onSnapshot(favoritesQuery, (snapshot) => {
        const favIds = new Set(snapshot.docs.map(doc => doc.id));
        setFavorites(favIds);
      }, (error) => {
        console.error("Error fetching favorites:", error);
      });
       return () => unsubscribe();
    } else {
       setFavorites(new Set());
    }
  }, [user, firestore]);

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
       return () => unsubscribe();
     } else {
       setPlannedVisitIds(new Set());
     }
   }, [user, firestore, selectedVacation]);


  // Fetch recommendations based on vacation details or submitted search term
  const fetchRecommendations = useCallback(async (searchQuery?: string) => {
    if (selectedVacation && user) {
      setLoadingRecommendations(true);
      setError(null);
      setRecommendations([]);

      // Use search term if provided, otherwise use interests from selected vacation
      const interestsToUse = searchQuery ? [searchQuery] : selectedVacation.interests;

      const input = {
        destination: selectedVacation.destination,
        interests: interestsToUse, // Pass the array of interests or the search query as an array
      };

      try {
        const result = await getPlacesRecommendations(input);
        setRecommendations(result.recommendations);
      } catch (err) {
        console.error("Error fetching recommendations:", err);
        setError(err instanceof Error ? err.message : "Could not fetch recommendations. Please try again later.");
      } finally {
        setLoadingRecommendations(false);
      }
    } else {
      setRecommendations([]);
      setLoadingRecommendations(false);
    }
  }, [selectedVacation, user]);

  // Initial fetch when vacation changes or search term is cleared
  useEffect(() => {
    if (selectedVacation && submittedSearchTerm === null) {
        fetchRecommendations(); // Fetch based on vacation details
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVacation, submittedSearchTerm]); // Re-run when selected vacation changes or search term is cleared

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const termToSearch = searchTerm.trim();
    if (termToSearch) {
       setSubmittedSearchTerm(termToSearch);
       fetchRecommendations(termToSearch); // Fetch based on search term
    } else {
        setSubmittedSearchTerm(null);
        fetchRecommendations(); // Revert to fetching based on vacation details
    }
  };

  const filteredRecommendations = useMemo(() => {
     let filtered = recommendations;
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
      const locationId = rec.id;
      const isFavorited = favorites.has(locationId);
      const favRef = doc(firestore, `users/${user.uid}/favoriteLocations`, locationId);

      try {
          if (isFavorited) {
              await deleteDoc(favRef);
               toast({ title: `${rec.name} removed from favorites.` });
          } else {
              const favData: Omit<FavoriteLocation, 'id'> = { // Use Omit as ID is the doc key
                 userId: user.uid,
                 locationId: locationId,
                 name: rec.name,
                 description: rec.description, // Store description
                 imageUrl: rec.imageUrl, // Store image URL
                 dataAiHint: rec.imageSearchHint // Store hint
              };
              await setDoc(favRef, favData);
               toast({ title: `${rec.name} added to favorites!` });
          }
      } catch (error) {
          console.error("Error updating favorite:", error);
           toast({ title: `Could not update favorite for ${rec.name}.`, variant: "destructive" });
      }
  };

  const handlePlanToggle = async (rec: Recommendation) => {
      if (!user || !firestore || !selectedVacation) return;
      const locationId = rec.id;
      const isInPlan = plannedVisitIds.has(locationId);
      // Use a consistent query method to find the existing doc if it exists
      const plannedVisitsQuery = query(
         collection(firestore, `users/${user.uid}/plannedVisits`),
         where('vacationId', '==', selectedVacation.id),
         where('locationId', '==', locationId),
         limit(1)
       );

      try {
          const snapshot = await getDocs(plannedVisitsQuery);
          if (isInPlan && !snapshot.empty) {
               // Item exists, delete it
               const docToDelete = snapshot.docs[0];
               await deleteDoc(doc(firestore, `users/${user.uid}/plannedVisits`, docToDelete.id));
               toast({ title: `${rec.name} removed from plan.` });
          } else if (!isInPlan && snapshot.empty) {
                // Item doesn't exist, add it
               const planDocRef = doc(collection(firestore, `users/${user.uid}/plannedVisits`)); // Auto-generate ID
               const planData: PlannedVisit = { // Ensure type includes id
                   id: planDocRef.id, // Store the generated ID
                   userId: user.uid,
                   vacationId: selectedVacation.id,
                   locationId: locationId,
                   locationName: rec.name,
                   locationImageUrl: rec.imageUrl || `https://picsum.photos/seed/${locationId}/200/200`,
                   description: rec.description,
                   dataAiHint: rec.imageSearchHint,
               };
               await setDoc(planDocRef, planData);
                toast({ title: `${rec.name} added to plan!` });
          } else {
               // Inconsistent state, log warning
               console.warn("Inconsistent state between local plannedVisitIds and Firestore query result for:", locationId);
               // Optionally force refresh local state
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
                       setSubmittedSearchTerm(null);
                       setSearchTerm('');
                       setActiveFilters(new Set()); // Reset filters when switching vacation
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
                   className="capitalize"
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
                      src={rec.imageUrl}
                      alt={rec.name}
                      layout="fill"
                      objectFit="cover"
                      data-ai-hint={rec.imageSearchHint}
                      className="transition-transform duration-300 ease-in-out group-hover:scale-105"
                      unoptimized
                       onError={(e) => {
                           const target = e.target as HTMLImageElement;
                           target.src = `https://picsum.photos/seed/${rec.id}/400/300`;
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
