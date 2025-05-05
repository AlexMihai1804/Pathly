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
    images: string[];
    dataAiHint?: string; // Optional AI hint for image search
}

// Placeholder data - replace with actual data fetching
const placeholderAttractions: Attraction[] = [
  { id: '1', name: 'Eiffel Tower', description: 'Iconic landmark in Paris.', images: ['/placeholder-1.jpg', '/placeholder-2.jpg'], dataAiHint: 'eiffel tower' },
  { id: '2', name: 'Louvre Museum', description: 'World-renowned art museum.', images: ['/placeholder-3.jpg'], dataAiHint: 'louvre museum' },
  { id: '3', name: 'Seine River Cruise', description: 'Enjoy the views from the water.', images: ['/placeholder-4.jpg', '/placeholder-5.jpg'], dataAiHint: 'seine river' },
   { id: '4', name: 'Notre Dame Cathedral', description: 'Historic Catholic cathedral.', images: ['/placeholder-6.jpg'], dataAiHint: 'notre dame' },
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
  }); // Example filters
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
             router.replace('/vacation-details'); // Redirect if no vacations found
          }
        })
        .catch(error => console.error("Error fetching vacations:", error))
        .finally(() => setLoadingVacations(false));
    }
  }, [user, firestore, router]);

   // Fetch attractions based on selected vacation, search, and filters (placeholder logic)
  useEffect(() => {
    if (selectedVacationId) {
      setLoadingAttractions(true);
      // --- Placeholder Fetching Logic ---
      // In a real app, you'd fetch attractions based on selectedVacationId, searchTerm, filters
      // from your backend or an external API.
      console.log("Fetching attractions for:", selectedVacationId, "Search:", searchTerm, "Filters:", filters);
      // Simulating network delay
      const timer = setTimeout(() => {
        // Filter placeholder data based on search term (simple example)
        const filteredAttractions = placeholderAttractions.filter(att =>
          att.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          att.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setAttractions(filteredAttractions);
        setLoadingAttractions(false);
      }, 1000);
       return () => clearTimeout(timer); // Cleanup timer
      // --- End Placeholder ---
    }
  }, [selectedVacationId, searchTerm, filters]); // Re-fetch when these change


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
    <div className="p-4 space-y-4">
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
               Museums
             </DropdownMenuCheckboxItem>
             <DropdownMenuCheckboxItem
               checked={filters.outdoors}
                onCheckedChange={() => handleFilterChange('outdoors')}
             >
               Outdoors
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
             <Card key={attraction.id} className="overflow-hidden shadow-md flex flex-col">
              <CardHeader className="p-0 relative aspect-video">
                {/* Basic Image Carousel Placeholder - Implement with a library later */}
                <Image
                  // Use picsum for placeholders if local images aren't available yet
                  src={`https://picsum.photos/seed/${attraction.id}/400/300`}
                  alt={attraction.name}
                  layout="fill" // Use fill layout for aspect ratio
                  objectFit="cover" // Cover the area
                  data-ai-hint={attraction.dataAiHint || 'landmark'}
                  className="transition-transform duration-300 ease-in-out group-hover:scale-105"
                />
                 {/* Add navigation buttons if multiple images */}
              </CardHeader>
              <CardContent className="p-4 flex-grow">
                <CardTitle className="text-lg font-semibold mb-1">{attraction.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{attraction.description}</p>
              </CardContent>
              <CardFooter className="flex justify-between p-4 bg-muted/50">
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
