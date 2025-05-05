
'use server';

import { z } from 'zod';

// --- Input/Output Schemas ---

const GetPlacesRecommendationsInputSchema = z.object({
  destination: z.string().describe('The desired vacation destination.'),
  // dates: z.string().describe('The vacation dates.'), // Currently unused by Places API query
  interests: z.string().describe('The user interests, used for the search query.'),
});

export type GetPlacesRecommendationsInput = z.infer<typeof GetPlacesRecommendationsInputSchema>;

// Matches the structure expected by the Discover page component
const RecommendationSchema = z.object({
    id: z.string().describe("A unique identifier for the location (using place_id)."),
    name: z.string().describe("The name of the recommended location or activity."),
    description: z.string().describe("A brief description (often the address or type)."),
    imageUrl: z.string().url().optional().describe("URL for an image of the location."), // Use optional for now
    imageSearchHint: z.string().describe("Keywords for searching an image (uses place name)."),
    tags: z.array(z.string()).describe("Relevant tags derived from place types (e.g., ['museum', 'park', 'restaurant'])."),
});

const GetPlacesRecommendationsOutputSchema = z.object({
  recommendations: z.array(RecommendationSchema).describe('A list of recommended locations from Google Places API.'),
});

export type GetPlacesRecommendationsOutput = z.infer<typeof GetPlacesRecommendationsOutputSchema>;

// --- Helper Functions ---

// Maps Google Place types to simpler tags used in the app
const mapPlaceTypesToTags = (types: string[]): string[] => {
  const tagMap: { [key: string]: string } = {
    'museum': 'museum',
    'park': 'outdoors',
    'restaurant': 'food',
    'cafe': 'food',
    'art_gallery': 'art',
    'landmark': 'landmark',
    'tourist_attraction': 'landmark',
    'church': 'history',
    'hindu_temple': 'history',
    'mosque': 'history',
    'synagogue': 'history',
    'place_of_worship': 'history',
    'store': 'shopping',
    'shopping_mall': 'shopping',
    'natural_feature': 'nature',
    'zoo': 'outdoors',
    'amusement_park': 'entertainment',
    'movie_theater': 'entertainment',
    'night_club': 'entertainment',
    // Add more mappings as needed
  };
  const tags = new Set<string>();
  types.forEach(type => {
    if (tagMap[type]) {
      tags.add(tagMap[type]);
    }
  });
  // Add a generic tag if no specific match
  if (tags.size === 0 && types.length > 0) {
      tags.add('attraction');
  }
  return Array.from(tags);
};


// Constructs the Google Places Photo URL
// IMPORTANT: Requires API Key to be exposed client-side if used directly in component.
// It's better to have the component call this server action which returns the full URL.
const getPlacePhotoUrl = (photoReference: string | undefined, apiKey: string | undefined): string | undefined => {
  if (!photoReference || !apiKey) {
    return undefined;
  }
  // Max width can be adjusted
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${apiKey}`;
};


// --- Server Action ---

export async function getPlacesRecommendations(
  input: GetPlacesRecommendationsInput
): Promise<GetPlacesRecommendationsOutput> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error("Google Maps API Key is missing.");
    throw new Error("Server configuration error: Missing Google Maps API Key.");
  }

  // Validate input
  const validation = GetPlacesRecommendationsInputSchema.safeParse(input);
  if (!validation.success) {
      throw new Error(`Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}`);
  }
  const { destination, interests } = validation.data;

  // Construct the Places API Text Search query
  const query = encodeURIComponent(`${interests} in ${destination}`);
   // Request specific fields to potentially reduce cost and data size
   const fields = 'place_id,name,formatted_address,types,photos,editorial_summary,business_status,rating,user_ratings_total';
   // See: https://developers.google.com/maps/documentation/places/web-service/text-search
   const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}&fields=${fields}`;


  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Google Places API error:", errorData);
      throw new Error(`Google Places API request failed: ${response.statusText} - ${errorData?.error_message || ''}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error("Google Places API non-OK status:", data);
        throw new Error(`Google Places API Error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }


    // Transform results into the Recommendation format
    const recommendations: Recommendation[] = (data.results || []).map((place: any) => {
       const photoRef = place.photos?.[0]?.photo_reference;
        // Use editorial summary if available, otherwise formatted address, fallback to types
       const description = place.editorial_summary?.overview || place.formatted_address || place.types?.join(', ') || 'Place of interest';

      return {
        id: place.place_id, // Use place_id as the unique ID
        name: place.name || 'Unknown Place',
        description: description,
         // Construct the photo URL server-side to avoid exposing API key client-side
         imageUrl: getPlacePhotoUrl(photoRef, apiKey),
        // Use place name as a hint for image search if no photo available
        imageSearchHint: place.name ? place.name.toLowerCase().split(' ').slice(0, 2).join(' ') : 'attraction',
        tags: mapPlaceTypesToTags(place.types || []),
      };
    }).filter((rec: Recommendation | null): rec is Recommendation => rec !== null); // Filter out any null results if mapping fails

    return { recommendations };

  } catch (error) {
    console.error("Error fetching from Google Places API:", error);
    // Re-throw a generic error or the specific error
    throw new Error(`Failed to fetch recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
