'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Plus, MapPin, Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { VacationDetails } from '@/firebase/types';
import Image from 'next/image'; // Using next/image
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


// Placeholder for Attraction Card
interface Attraction {
    id: string;
    name: string;
    description: string;
    images: string[]; // Now an array of potential image URLs (placeholders)
    dataAiHint?: string; // Optional AI hint for image search
    tags?: string[]; // Optional tags for filtering
}

// Placeholder data - replace with actual data fetching
const placeholderAttractions: Attraction[] = [
  { id: '1', name: 'Eiffel Tower', description: 'Iconic landmark in Paris.', images: ['eiffel_tower_1.jpg', 'eiffel_tower_2.jpg'], dataAiHint: 'eiffel tower', tags: ['landmark', 'outdoors'] },
  { id: '2', name: 'Louvre Museum', description: 'World-renowned art museum.', images: ['louvre_1.jpg'], dataAiHint: 'louvre museum', tags: ['museum', 'art', 'culture'] },
  { id: '3', name: 'Seine River Cruise', description: 'Enjoy the views from the water.', images: ['seine_cruise_1.jpg', 'seine_cruise_2.jpg'], dataAiHint: 'seine river', tags: ['outdoors', 'romantic'] },
  { id: '4', name: 'Notre Dame Cathedral', description: 'Historic Catholic cathedral.', images: ['notre_dame_1.jpg'], dataAiHint: 'notre dame', tags: ['landmark', 'culture', 'history'] },
  { id: '5', name: 'Local Parisian Cafe', description: 'Experience authentic French coffee culture.', images: ['cafe_1.jpg'], dataAiHint: 'paris cafe', tags: ['food', 'culture'] },
  { id: '6', name: 'Montmartre Walk', description: 'Explore the artistic hill with stunning views.', images: ['montmartre_1.jpg'], dataAiHint: 'montmartre paris', tags: ['outdoors', 'art', 'history'] },

];


export default function DiscoverPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [vacations, setVacations] = useState<VacationDetails[]>([]);
  const [selectedVacationId, setSelectedVacationId] = useState<string | null>(null);
  const [attractions, setAttractions] = useState<Attraction[]>([]); // State for attractions
  const [loadingVacations, setLoadingVacations] = useState(true);
  const [loadingAttractions, setLoadingAttractions] = useState(false); // Separate loading for attractions
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, boolean>>({
      museums: false,
      outdoors: false,
      food: false,
  }); // Filters state
  const { firestore } = getFirebase();


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
      getDocs(vacationsQuery)
        .then((snapshot) => {
          const fetchedVacations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VacationDetails));
          setVacations(fetchedVacations);
          if (fetchedVacations.length > 0) {
            setSelectedVacationId(fetchedVacations[0].id); // Select first vacation by default
          } else {
             // Redirect if no vacations found - handled by page.tsx now
          }
        })
        .catch(error => console.error("Error fetching vacations:", error))
        .finally(() => setLoadingVacations(false));
    } else if (!authLoading && !user) {
      setLoadingVacations(false); // Stop loading if user is confirmed absent
    }
  }, [user, firestore, authLoading]); // Added authLoading dependency

   // Fetch attractions based on selected vacation, search, and filters
  useEffect(() => {
    if (selectedVacationId) {
      setLoadingAttractions(true);
      // --- Placeholder Fetching & Filtering Logic ---
      console.log("Fetching/Filtering attractions for:", selectedVacationId, "Search:", searchTerm, "Filters:", filters);

      const timer = setTimeout(() => {
        let filteredAttractions = placeholderAttractions;

        // Apply search term filter
        if (searchTerm.trim()) {
          filteredAttractions = filteredAttractions.filter(att =>
            att.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            att.description.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        // Apply tag-based filters (example)
        const activeFilters = Object.entries(filters)
            .filter(([, isActive]) => isActive)
            .map(([key]) => key); // Get keys of active filters

        if (activeFilters.length > 0) {
             // Map filter keys to potential tags
             const filterTags: Record<string, string[]> = {
                museums: ['museum', 'art', 'history'],
                outdoors: ['outdoors', 'landmark', 'nature'],
                food: ['food', 'cafe', 'restaurant'],
             }
            filteredAttractions = filteredAttractions.filter(att =>
              activeFilters.some(filterKey =>
                 att.tags?.some(tag => filterTags[filterKey]?.includes(tag))
               )
            );
        }

        setAttractions(filteredAttractions);
        setLoadingAttractions(false);
      }, 500); // Reduced delay for faster feedback

       return () => clearTimeout(timer); // Cleanup timer
      // --- End Placeholder ---
    }
  }, [selectedVacationId, searchTerm, filters]); // Re-run when these change


  const handleFilterChange = (filterKey: string) => {
    setFilters(prev => ({ ...prev, [filterKey]: !prev[filterKey] }));
  };

  const handleFavorite = (attractionId: string) => {
    console.log(`Toggling favorite for attraction ${attractionId}`);
    // TODO: Implement Firestore logic to add/remove favorite
  };

  const handleAddToPlan = (attractionId: string) => {
    console.log(`Adding attraction ${attractionId} to plan`);
    // TODO: Implement Firestore logic to add to the visit plan
  };


  if (authLoading || loadingVacations) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-1/2 mx-auto" /> {/* Vacation Selector */}
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-grow" /> {/* Search */}
          <Skeleton className="h-10 w-10" /> {/* Filter */}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
              <CardFooter className="flex justify-between p-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-20 md:pb-4"> {/* Added padding-bottom */}
      {/* Vacation Selector Dropdown */}
      <div className="flex justify-center mb-4">
         {vacations.length > 0 && (
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button variant="outline" className="w-full md:w-auto">
                 {selectedVacationId ? vacations.find(v => v.id === selectedVacationId)?.destination : 'Select Vacation'} <MapPin className="ml-2 h-4 w-4" />
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="center">
               <DropdownMenuLabel>Your Vacations</DropdownMenuLabel>
               <DropdownMenuSeparator />
               {vacations.map((vacation) => (
                 <DropdownMenuCheckboxItem
                   key={vacation.id}
                   checked={selectedVacationId === vacation.id}
                   onCheckedChange={() => setSelectedVacationId(vacation.id)}
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
      <div className="flex gap-2">
        <Input
          type="search"
          placeholder="Search attractions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow"
        />
         <DropdownMenu>
           <DropdownMenuTrigger asChild>
             <Button variant="outline" size="icon">
               <Filter className="h-4 w-4" />
               <span className="sr-only">Filters</span>
             </Button>
           </DropdownMenuTrigger>
           <DropdownMenuContent align="end">
             <DropdownMenuLabel>Filter by Interest</DropdownMenuLabel>
             <DropdownMenuSeparator />
             <DropdownMenuCheckboxItem
               checked={filters.museums}
               onCheckedChange={() => handleFilterChange('museums')}
             >
               Museums/Art/Culture
             </DropdownMenuCheckboxItem>
             <DropdownMenuCheckboxItem
               checked={filters.outdoors}
                onCheckedChange={() => handleFilterChange('outdoors')}
             >
               Outdoors/Landmarks
             </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
               checked={filters.food}
                onCheckedChange={() => handleFilterChange('food')}
             >
               Food & Drink
             </DropdownMenuCheckboxItem>
           </DropdownMenuContent>
         </DropdownMenu>
      </div>

      {/* Attractions Grid/List */}
       {loadingAttractions ? (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {[...Array(4)].map((_, i) => (
               <Card key={i} className="overflow-hidden">
                 <Skeleton className="h-48 w-full" />
                 <CardContent className="p-4">
                   <Skeleton className="h-6 w-3/4 mb-2" />
                   <Skeleton className="h-4 w-full" />
                 </CardContent>
                 <CardFooter className="flex justify-between p-4">
                   <Skeleton className="h-8 w-8 rounded-full" />
                   <Skeleton className="h-8 w-8 rounded-full" />
                 </CardFooter>
               </Card>
             ))}
           </div>
       ) : attractions.length > 0 ? (
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           {attractions.map((attraction) => (
             <Card key={attraction.id} className="overflow-hidden shadow-md flex flex-col group"> {/* Added group class */}
              <CardHeader className="p-0 relative aspect-video overflow-hidden"> {/* Added overflow-hidden */}
                {/* Display first image */}
                <Image
                  src={`https://picsum.photos/seed/${attraction.id}img1/400/300`} // Use first image URL or placeholder
                  alt={attraction.name}
                  layout="fill" // Use fill layout for aspect ratio
                  objectFit="cover" // Cover the area
                  data-ai-hint={attraction.dataAiHint || 'landmark building'}
                  className="transition-transform duration-300 ease-in-out group-hover:scale-105" // Group hover effect
                />
                 {/* Placeholder for multiple images indicator */}
                {attraction.images.length > 1 && (
                  <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                    1 / {attraction.images.length}
                  </span>
                 )}
              </CardHeader>
              <CardContent className="p-4 flex-grow">
                <CardTitle className="text-lg font-semibold mb-1">{attraction.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{attraction.description}</p>
              </CardContent>
              <CardFooter className="flex justify-between p-4 bg-muted/50 border-t"> {/* Added border-t */}
                <Button variant="ghost" size="icon" onClick={() => handleFavorite(attraction.id)} aria-label={`Favorite ${attraction.name}`}>
                  <Heart className="h-5 w-5 text-muted-foreground hover:text-destructive hover:fill-destructive" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleAddToPlan(attraction.id)} aria-label={`Add ${attraction.name} to plan`}>
                  <Plus className="h-5 w-5 text-muted-foreground hover:text-primary" />
                </Button>
              </CardFooter>
            </Card>
           ))}
         </div>
       ) : (
        <p className="text-center text-muted-foreground col-span-full py-10">
          No attractions match your search or filters for this destination yet. Try broadening your search!
        </p>
       )}
    </div>
  );
}
