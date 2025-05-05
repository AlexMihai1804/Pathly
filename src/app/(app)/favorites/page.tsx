'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, ListChecks, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image'; // Using next/image

// Placeholder for Favorite Item
interface FavoriteItem {
    id: string; // Combined ID like 'userId_locationId' or separate doc ID
    locationId: string;
    name: string;
    description: string;
    imageUrl: string; // Assuming one primary image for simplicity
    dataAiHint?: string;
}

// Placeholder data - replace with actual Firestore fetching
const placeholderFavorites: FavoriteItem[] = [
  { id: 'fav1', locationId: '1', name: 'Eiffel Tower', description: 'Iconic landmark in Paris.', imageUrl: '/placeholder-1.jpg', dataAiHint: 'eiffel tower'},
  { id: 'fav2', locationId: '3', name: 'Seine River Cruise', description: 'Enjoy the views from the water.', imageUrl: '/placeholder-4.jpg', dataAiHint: 'seine river'},
];

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    } else if (user) {
      // TODO: Fetch actual favorites from Firestore /users/{userId}/favoriteLocations
      // For now, use placeholder data
       setLoading(true);
       console.log(`Fetching favorites for user ${user.uid}`);
       // Simulate fetch delay
       const timer = setTimeout(() => {
           setFavorites(placeholderFavorites);
           setLoading(false);
       }, 1200);
        return () => clearTimeout(timer);
    }
  }, [user, authLoading, router]);

  const handleRemoveFavorite = (favoriteId: string) => {
    console.log(`Removing favorite ${favoriteId}`);
    // TODO: Implement Firestore logic to remove favorite
    setFavorites(prev => prev.filter(fav => fav.id !== favoriteId)); // Optimistic UI update
  };

  const handleAddToPlan = (locationId: string) => {
    console.log(`Adding location ${locationId} from favorites to plan`);
    // TODO: Implement Firestore logic to add location to the visit plan
    // Maybe navigate to the Plan page or show a confirmation toast
  };

  if (authLoading || loading) {
    return (
      <div className="p-4 pt-10 space-y-4">
        <Skeleton className="h-8 w-1/2 mx-auto mb-6" /> {/* Title */}
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
    <div className="p-4 pt-10">
      <h1 className="text-2xl font-bold mb-6 text-center text-primary">Your Favorite Places</h1>

      {favorites.length > 0 ? (
        <div className="space-y-4">
          {favorites.map((fav) => (
            <Card key={fav.id} className="flex flex-col sm:flex-row gap-4 p-4 shadow-md overflow-hidden">
              <div className="relative w-full sm:w-24 h-24 sm:h-auto shrink-0 rounded-md overflow-hidden">
               <Image
                  src={`https://picsum.photos/seed/${fav.locationId}/200/200`}
                  alt={fav.name}
                  layout="fill"
                  objectFit="cover"
                  data-ai-hint={fav.dataAiHint || 'landmark building'}
                />
              </div>
              <div className="flex-grow">
                <CardTitle className="text-lg font-semibold mb-1">{fav.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{fav.description}</p>
              </div>
              <div className="flex flex-col sm:flex-col justify-between items-end shrink-0 gap-2 mt-2 sm:mt-0">
                 <Button variant="ghost" size="icon" onClick={() => handleAddToPlan(fav.locationId)} aria-label={`Add ${fav.name} to plan`}>
                  <ListChecks className="h-5 w-5 text-muted-foreground hover:text-primary" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveFavorite(fav.id)} aria-label={`Remove ${fav.name} from favorites`}>
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
