'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, MapPin, ArrowRight, Car, Footprints } from 'lucide-react'; // Added Car and Footprints

// Placeholder for Itinerary Item
interface ItineraryStep {
  type: 'visit' | 'travel';
  locationName?: string; // Only for 'visit'
  locationId?: string; // Only for 'visit'
  startTime: string; // e.g., "9:00 AM"
  endTime?: string; // e.g., "11:00 AM", optional for travel
  durationMinutes: number;
  travelMode?: 'walk' | 'drive' | 'transit'; // Only for 'travel'
}

// Placeholder data - replace with actual AI generation logic
const placeholderItinerary: Record<string, ItineraryStep[]> = {
  "Day 1": [
    { type: 'visit', locationName: 'Louvre Museum', locationId: '2', startTime: '9:00 AM', endTime: '12:00 PM', durationMinutes: 180 },
    { type: 'travel', startTime: '12:00 PM', durationMinutes: 15, travelMode: 'walk' },
    { type: 'visit', locationName: 'Eiffel Tower', locationId: '1', startTime: '12:15 PM', endTime: '2:00 PM', durationMinutes: 105 },
     { type: 'travel', startTime: '2:00 PM', durationMinutes: 30, travelMode: 'transit' },
     { type: 'visit', locationName: 'Notre Dame Cathedral', locationId: '4', startTime: '2:30 PM', endTime: '3:30 PM', durationMinutes: 60 },
  ],
   "Day 2": [
      { type: 'visit', locationName: 'Seine River Cruise', locationId: '3', startTime: '10:00 AM', endTime: '11:30 AM', durationMinutes: 90 },
      // ... more steps
   ]
};

export default function ItineraryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [itinerary, setItinerary] = useState<Record<string, ItineraryStep[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    } else if (user) {
      setLoading(true);
      setError(null);
      // TODO: Trigger AI itinerary generation based on items in the user's plan
      console.log(`Generating itinerary for user ${user.uid}`);
       // Simulate AI generation delay
       const timer = setTimeout(() => {
         // In a real app, call your backend/AI flow here
         // Handle potential errors from the AI flow
         setItinerary(placeholderItinerary);
         setLoading(false);
       }, 1500);
       return () => clearTimeout(timer);
    }
  }, [user, authLoading, router]);

  const getTravelIcon = (mode?: 'walk' | 'drive' | 'transit') => {
     switch (mode) {
        case 'walk': return <Footprints className="h-4 w-4 text-muted-foreground" />;
        case 'drive': return <Car className="h-4 w-4 text-muted-foreground" />;
        case 'transit': return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bus"><path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg> ; // Example for transit
        default: return <ArrowRight className="h-4 w-4 text-muted-foreground" />;
     }
  };

  if (authLoading || loading) {
     return (
      <div className="p-4 pt-10 space-y-6">
        <Skeleton className="h-8 w-1/2 mx-auto mb-6" /> {/* Title */}
        {[...Array(2)].map((_, dayIndex) => ( // Skeleton for 2 days
          <Card key={`day-skel-${dayIndex}`}>
            <CardHeader>
              <Skeleton className="h-6 w-1/4" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(3)].map((_, stepIndex) => ( // Skeleton for 3 steps per day
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

   if (error) {
    return (
      <div className="p-4 pt-10 text-center">
        <h1 className="text-2xl font-bold mb-6 text-primary">Itinerary</h1>
        <Card>
          <CardContent className="p-6 text-destructive">
            <p>Error generating itinerary: {error}</p>
            <Button onClick={() => router.push('/plan')} className="mt-4">Back to Plan</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 pt-10 space-y-6">
      <h1 className="text-2xl font-bold mb-6 text-center text-primary">Your Generated Itinerary</h1>

      {itinerary && Object.keys(itinerary).length > 0 ? (
        Object.entries(itinerary).map(([day, steps]) => (
          <Card key={day}>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-secondary-foreground">{day}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-0">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                   <div className="w-20 text-sm font-medium text-muted-foreground tabular-nums">
                       {step.startTime} {step.endTime && `- ${step.endTime}`}
                   </div>
                   <div className="flex items-center justify-center w-6 shrink-0">
                      {step.type === 'visit' ? <MapPin className="h-4 w-4 text-primary" /> : getTravelIcon(step.travelMode)}
                   </div>
                  <div className="flex-grow">
                    {step.type === 'visit' ? (
                      <p className="font-semibold text-foreground">{step.locationName}</p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">Travel ({step.travelMode || '...' })</p>
                    )}
                  </div>
                   <div className="flex items-center text-xs text-muted-foreground shrink-0">
                       <Clock className="h-3 w-3 mr-1" /> {step.durationMinutes} min
                   </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      ) : (
         <Card>
           <CardContent className="p-6 text-center text-muted-foreground">
             Itinerary could not be generated. Make sure you have items in your plan.
           </CardContent>
         </Card>
      )}

       <Button variant="outline" onClick={() => router.push('/plan')} className="w-full mt-6">
         Back to Plan
       </Button>
    </div>
  );
}
