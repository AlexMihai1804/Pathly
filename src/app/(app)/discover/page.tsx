'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Plus, MapPin, Filter, BadgeAlert, ListPlus, X, Search as SearchIcon, Loader2 } from 'lucide-react';
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

const MAX_AUTO_FETCH_ATTEMPTS = 3; // Limit automatic retries if no new items are found

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
  const [loadingRecommendations, setLoadingRecommendations] = useState(false); // For initial load/search
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [submittedSearchTerm, setSubmittedSearchTerm] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [nextPageToken, setNextPageToken] = useState<string | null | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false); // Specifically for pagination/auto-load
  const { firestore } = getFirebase();
  const isFetchingRef = useRef(false); // Ref to prevent concurrent fetches
  const loadMoreRef = useRef<HTMLDivElement>(null); // Ref for the intersection observer sentinel
  const autoFetchAttemptRef = useRef(0); // Counter for automatic fetches when view is empty
  const contentRef = useRef<HTMLDivElement>(null); // Ref for the main content area to check visibility

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

  // Fetch Vacations
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, firestore, authLoading]);

  // Fetch Favorites
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

  // Fetch Planned Visits
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


  const filteredRecommendations = useMemo(() => {
    let filtered = recommendations;
    if (activeFilters.size > 0) {
      filtered = filtered.filter(rec =>
        rec.tags.some(tag => activeFilters.has(tag))
      );
    }
    // Keep this filter: do not show items already in the plan
    filtered = filtered.filter(rec => !plannedVisitIds.has(rec.id));
    return filtered;
  }, [recommendations, activeFilters, plannedVisitIds]);


  // Fetch Recommendations Function (Modified for auto-fetching)
  const fetchRecommendations = useCallback(async (searchQuery?: string, pageToken?: string, isRetry = false, isAutoFetch = false) => {
    if (!selectedVacation || !user || isFetchingRef.current) {
        if (!pageToken && !isRetry) {
             setRecommendations([]);
             setNextPageToken(undefined);
        }
        if (!isAutoFetch) setLoadingRecommendations(false); // Only reset main loader if not auto-fetching more
        setLoadingMore(false);
        return 0; // Return 0 new items found
    }

      isFetchingRef.current = true;

      if (!pageToken) { // Initial fetch or new search
          setLoadingRecommendations(true);
          setRecommendations([]); // Clear existing recommendations
          setError(null);
          autoFetchAttemptRef.current = 0; // Reset auto-fetch counter
      } else { // Pagination or auto-fetch
          setLoadingMore(true);
      }

      const interestsToUse = searchQuery ? [searchQuery] : selectedVacation.interests;
      const input = {
        destination: selectedVacation.destination,
        interests: interestsToUse,
        pageToken: pageToken,
      };

      let newDisplayableItemsCount = 0;

      try {
        console.log(`Fetching Places API with input:`, input); // Log input
        const result = await getPlacesRecommendations(input);
        const newRecs = result.recommendations;
        const existingIds = new Set(recommendations.map(r => r.id));
        const trulyNewRecs = newRecs.filter(r => !existingIds.has(r.id));

        // Calculate how many of the truly new recs will be displayed
        const displayableNewRecs = trulyNewRecs.filter(rec =>
           !plannedVisitIds.has(rec.id) && // Not already planned
           (activeFilters.size === 0 || rec.tags.some(tag => activeFilters.has(tag))) // Matches filters
        );
        newDisplayableItemsCount = displayableNewRecs.length;

         setRecommendations(prev => [...prev, ...trulyNewRecs]);
        setNextPageToken(result.nextPageToken);
        if (result.nextPageToken) {
           autoFetchAttemptRef.current = 0; // Reset counter if we get more results
        }

        console.log(`Fetched ${newRecs.length} items. ${trulyNewRecs.length} are new. ${displayableNewRecs.length} are displayable. Next token: ${result.nextPageToken}`);

      } catch (err) {
        console.error("Error fetching recommendations:", err);
        const errorMessage = err instanceof Error ? err.message : "Could not fetch recommendations.";
        if (!pageToken) {
           setError(errorMessage);
        } else {
             toast({ title: "Failed to load more recommendations.", description: errorMessage, variant: "destructive" });
             setNextPageToken(pageToken); // Keep token for manual retry? Or set to null? Keep for now.
        }
         newDisplayableItemsCount = -1; // Indicate error
      } finally {
         if (!pageToken) setLoadingRecommendations(false);
         setLoadingMore(false);
         isFetchingRef.current = false;
      }

       return newDisplayableItemsCount; // Return count of new *displayable* items
  }, [selectedVacation, user, toast, recommendations, plannedVisitIds, activeFilters]); // Added dependencies


  // Effect to trigger initial fetch or fetch on search term change
  useEffect(() => {
      if (selectedVacation && !isFetchingRef.current) {
          fetchRecommendations(submittedSearchTerm ?? undefined);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVacation, submittedSearchTerm]); // fetchRecommendations is memoized

    // Effect to trigger auto-fetching if the view becomes empty or nearly empty
    useEffect(() => {
        // Don't auto-fetch if currently loading, or if there's no next page, or if max attempts reached
        if (loadingRecommendations || loadingMore || !nextPageToken || autoFetchAttemptRef.current >= MAX_AUTO_FETCH_ATTEMPTS) {
            return;
        }

        // Check if filtered recommendations are empty or few
        const shouldAutoFetch = filteredRecommendations.length < 3; // Adjust threshold as needed

        if (shouldAutoFetch && nextPageToken && !isFetchingRef.current) {
            console.log(`Auto-fetching more... Attempt: ${autoFetchAttemptRef.current + 1}`);
            autoFetchAttemptRef.current += 1;
            fetchRecommendations(submittedSearchTerm ?? undefined, nextPageToken, false, true); // isAutoFetch = true
        } else if (filteredRecommendations.length > 0) {
            // Reset counter if we have enough items again
            autoFetchAttemptRef.current = 0;
        }

    }, [filteredRecommendations, nextPageToken, loadingRecommendations, loadingMore, fetchRecommendations, submittedSearchTerm]);


  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const termToSearch = searchTerm.trim();
     // Reset everything for a new search
     setRecommendations([]);
     setNextPageToken(undefined);
     setActiveFilters(new Set()); // Clear filters on new search
     setSubmittedSearchTerm(termToSearch || null);
    // Fetching is handled by the useEffect watching submittedSearchTerm
  };

  const handleLoadMore = useCallback(() => {
      if (nextPageToken && !loadingMore && !isFetchingRef.current) {
          console.log("Manual handleLoadMore triggered with token:", nextPageToken);
          fetchRecommendations(submittedSearchTerm ?? undefined, nextPageToken);
      }
  }, [nextPageToken, loadingMore, submittedSearchTerm, fetchRecommendations]);

   // Intersection Observer for infinite scroll
   useEffect(() => {
       if (!loadMoreRef.current || loadingRecommendations) {
           return;
       }

       const observer = new IntersectionObserver(
           (entries) => {
               if (entries[0].isIntersecting && nextPageToken && !loadingMore && !isFetchingRef.current) {
                   console.log("Intersection Observer triggered load more");
                   handleLoadMore();
               }
           },
           { threshold: 0.1 } // Trigger when 10% visible
       );

       observer.observe(loadMoreRef.current);

       return () => {
           if (loadMoreRef.current) {
               // Ensure loadMoreRef.current is not null before unsubscribing
               // eslint-disable-next-line react-hooks/exhaustive-deps
               observer.unobserve(loadMoreRef.current);
           }
       };
   }, [handleLoadMore, nextPageToken, loadingMore, loadingRecommendations]); // Rerun observer setup if dependencies change


  const handleFilterToggle = (tag: string) => {
    setActiveFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(tag)) {
        newFilters.delete(tag);
      } else {
        newFilters.add(tag);
      }
       // Trigger a re-evaluation for auto-fetching if needed
      setTimeout(() => { /* Allow state to update */ }, 0);
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
              const favData: Omit<FavoriteLocation, 'id'> = {
                 userId: user.uid,
                 locationId: locationId,
                 name: rec.name,
                 description: rec.description,
                 imageUrl: rec.imageUrl,
                 dataAiHint: rec.imageSearchHint
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
      const isInPlan = plannedVisitIds.has(rec.id);

      const plannedVisitsQuery = query(
         collection(firestore, `users/${user.uid}/plannedVisits`),
         where('vacationId', '==', selectedVacation.id),
         where('locationId', '==', locationId),
         limit(1)
       );

      try {
          const snapshot = await getDocs(plannedVisitsQuery);
          if (isInPlan && !snapshot.empty) {
               const docToDelete = snapshot.docs[0];
               await deleteDoc(doc(firestore, `users/${user.uid}/plannedVisits`, docToDelete.id));
               toast({ title: `${rec.name} removed from plan.` });
                setRecommendations(prev => [...prev]); // Force re-render if needed to show item again
          } else if (!isInPlan && snapshot.empty) {
               const planDocRef = doc(collection(firestore, `users/${user.uid}/plannedVisits`));
               const planData: PlannedVisit = {
                   id: planDocRef.id,
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
               console.warn("Inconsistent state between local plannedVisitIds and Firestore query result for:", locationId);
               toast({ title: `Action for ${rec.name} could not be completed due to inconsistent state.`, variant: "destructive" });
          }
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
    <div ref={contentRef} className="p-4 space-y-4 pb-20 md:pb-4">
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
                       setSubmittedSearchTerm(null); // Reset search on vacation change
                       setSearchTerm('');
                       setActiveFilters(new Set()); // Reset filters
                       setRecommendations([]); // Clear recommendations
                       setNextPageToken(undefined); // Reset token
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
          placeholder="Search for activities or places..."
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
             <Button variant="outline" size="sm" onClick={() => fetchRecommendations(submittedSearchTerm ?? undefined, undefined, true)}>
               Retry
             </Button>
           </CardContent>
         </Card>
       ) : (recommendations.length > 0 && filteredRecommendations.length === 0) ? (
          // Case: Recommendations exist, but none match the filters
          <Card className="col-span-full">
              <CardContent className="p-6 text-center text-muted-foreground">
                  No recommendations match your current filters.
                  <Button variant="link" onClick={() => setActiveFilters(new Set())} className="p-1 text-sm">
                      Clear Filters?
                  </Button>
              </CardContent>
          </Card>
       ) : (filteredRecommendations.length > 0 || loadingMore) ? ( // Show grid if items exist OR if loading more
        <>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           {filteredRecommendations.map((rec) => (
             <Card key={rec.id} className="overflow-hidden shadow-md flex flex-col group">
              <CardHeader className="p-0 relative aspect-video overflow-hidden bg-muted">
                {rec.imageUrl ? (
                    <Image
                      src={rec.imageUrl}
                      alt={rec.name}
                      width={400} // Provide explicit width
                      height={300} // Provide explicit height
                      style={{ objectFit: "cover", width: '100%', height: '100%' }} // Use style for layout="fill" equivalent
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
                       src={`https://picsum.photos/seed/${rec.id}/400/300`}
                       alt={`${rec.name} (Placeholder Image)`}
                       width={400} // Provide explicit width
                       height={300} // Provide explicit height
                       style={{ objectFit: "cover", width: '100%', height: '100%' }} // Use style for layout="fill" equivalent
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
                 {!plannedVisitIds.has(rec.id) && ( // Only show add button if not in plan
                     <Button variant="ghost" size="icon" onClick={() => handlePlanToggle(rec)} aria-label={`Add ${rec.name} to plan`}>
                       <ListPlus className="h-5 w-5 text-muted-foreground transition-colors hover:text-primary" />
                     </Button>
                 )}
              </CardFooter>
            </Card>
           ))}
         </div>
           {/* Load More Sentinel and Loader */}
            <div ref={loadMoreRef} className="h-10 flex justify-center items-center mt-6">
                {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
                {!nextPageToken && recommendations.length > 0 && !loadingMore && (
                    <p className="text-muted-foreground text-sm">No more recommendations.</p>
                )}
            </div>
         </>
       ) : (
        // Case: No recommendations found (and not loading)
        <Card className="col-span-full">
            <CardContent className="p-6 text-center text-muted-foreground">
              No recommendations found. Try broadening your search or interests.
              {submittedSearchTerm && (
                 <Button variant="link" onClick={() => { setSubmittedSearchTerm(null); setSearchTerm(''); }} className="p-1 text-sm">
                    Clear Search?
                 </Button>
              )}
            </CardContent>
          </Card>
       )}
    </div>
  );
}
