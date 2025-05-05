'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, Trash2, Route } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

// Placeholder for Planned Item
interface PlannedItem {
    id: string; // Document ID for the planned item
    locationId: string;
    name: string;
    description: string;
    imageUrl: string;
    dataAiHint?: string;
    // Add estimated duration, user notes, etc. later
}

// Placeholder data - replace with actual Firestore fetching from a user's plan collection
const placeholderPlan: PlannedItem[] = [
  { id: 'plan1', locationId: '2', name: 'Louvre Museum', description: 'World-renowned art museum.', imageUrl: '/placeholder-3.jpg', dataAiHint: 'louvre museum' },
  { id: 'plan2', locationId: '1', name: 'Eiffel Tower', description: 'Iconic landmark in Paris.', imageUrl: '/placeholder-1.jpg', dataAiHint: 'eiffel tower'},
];

export default function PlanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [plannedItems, setPlannedItems] = useState<PlannedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    } else if (user) {
      // TODO: Fetch actual planned items from Firestore for the user
      setLoading(true);
      console.log(`Fetching plan for user ${user.uid}`);
      // Simulate fetch delay
      const timer = setTimeout(() => {
          setPlannedItems(placeholderPlan);
          setLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, router]);

  const handleRemoveFromPlan = (plannedItemId: string) => {
    console.log(`Removing item ${plannedItemId} from plan`);
    // TODO: Implement Firestore logic to remove item from the plan
    setPlannedItems(prev => prev.filter(item => item.id !== plannedItemId)); // Optimistic UI update
  };

  const handleGenerateItinerary = () => {
    console.log('Navigating to generate itinerary');
    router.push('/itinerary');
  };

  if (authLoading || loading) {
     return (
      <div className="p-4 pt-10 space-y-4">
        <Skeleton className="h-8 w-1/2 mx-auto mb-6" /> {/* Title */}
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
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
        <Skeleton className="h-10 w-full mt-6" /> {/* Generate Button */}
      </div>
    );
  }

  return (
    <div className="p-4 pt-10">
      <h1 className="text-2xl font-bold mb-6 text-center text-primary">Your Vacation Plan</h1>

      {plannedItems.length > 0 ? (
        <div className="space-y-4">
          {plannedItems.map((item) => (
            <Card key={item.id} className="flex items-center gap-4 p-4 shadow-sm">
               <div className="relative w-16 h-16 shrink-0 rounded-md overflow-hidden">
                 <Image
                  src={`https://picsum.photos/seed/${item.locationId}/100/100`}
                  alt={item.name}
                  layout="fill"
                  objectFit="cover"
                  data-ai-hint={item.dataAiHint || 'travel place'}
                 />
               </div>
              <div className="flex-grow">
                <CardTitle className="text-md font-semibold">{item.name}</CardTitle>
                {/* Add more details like duration later */}
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleRemoveFromPlan(item.id)} aria-label={`Remove ${item.name} from plan`}>
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
            Your plan is empty. Add some places from Discover or Favorites!
             <Button variant="link" onClick={() => router.push('/discover')} className="text-primary px-1">
               Discover Places
             </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
