'use server';

import { z } from 'zod';

// --- Input/Output Schemas ---

const GetPlacesRecommendationsInputSchema = z.object({
  destination: z.string().describe('The desired vacation destination.'),
  // dates: z.string().describe('The vacation dates.'), // Currently unused by Places API query
  interests: z.array(z.string()).min(1).describe('The user interests (array of strings), used for the search query.'), // Updated to array
  pageToken: z.string().optional().describe('Token for fetching the next page of results.'),
});

export type GetPlacesRecommendationsInput = z.infer<typeof GetPlacesRecommendationsInputSchema>;

// Interface matching the structure expected by the Discover page component
interface Recommendation {
    id: string;         // place_id from Google Places
    name: string;
    description: string; // Formatted address or summary
    imageUrl?: string;   // Optional photo URL (constructed server-side)
    imageSearchHint: string; // Fallback hint
    tags: string[];     // Mapped from place types
    dataAiHint?: string; // Added for consistency
}

// Matches the structure expected by the Discover page component
const RecommendationSchema = z.object({
    id: z.string().describe("A unique identifier for the location (using place_id)."),
    name: z.string().describe("The name of the recommended location or activity."),
    description: z.string().describe("A brief description (often the address or type)."),
    imageUrl: z.string().url().optional().describe("URL for an image of the location."), // Use optional for now
    imageSearchHint: z.string().describe("Keywords for searching an image (uses place name)."),
    tags: z.array(z.string()).describe("Relevant tags derived from place types (e.g., ['museum', 'park', 'restaurant'])."),
    dataAiHint: z.string().optional().describe("AI hint for image generation/search."),
});


const GetPlacesRecommendationsOutputSchema = z.object({
  recommendations: z.array(RecommendationSchema).describe('A list of recommended locations from Google Places API.'),
  nextPageToken: z.string().optional().describe('Token for fetching the next page of results, if available.'),
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
    'hiking_area': 'hiking', // Added hiking
    'beach': 'beach', // Added beach
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
const getPlacePhotoUrl = (photoReference: string | undefined, apiKey: string | undefined): string | undefined => {
  if (!photoReference || !apiKey) {
    return undefined;
  }
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${apiKey}`;
};


// --- Server Action ---

export async function getPlacesRecommendations(
  input: GetPlacesRecommendationsInput
): Promise<GetPlacesRecommendationsOutput> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error("Google Maps API Key is missing from environment variables (GOOGLE_MAPS_API_KEY).");
    throw new Error("Server configuration error: Missing Google Maps API Key.");
  }

  const validation = GetPlacesRecommendationsInputSchema.safeParse(input);
  if (!validation.success) {
      throw new Error(`Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}`);
  }
  const { destination, interests, pageToken } = validation.data;

  // Construct the Places API Text Search query using interests array
  const interestsQuery = interests.join(' OR '); // Combine interests for the query
  const query = encodeURIComponent(`(${interestsQuery}) in ${destination}`);
  const fields = 'place_id,name,formatted_address,types,photos,editorial_summary,business_status,rating,user_ratings_total';
  let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}&fields=${fields}`;

  if (pageToken) {
      // Important: Google Places API requires a short delay before using a page token
      // https://developers.google.com/maps/documentation/places/web-service/search-text#pagetoken
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay
      url += `&pagetoken=${pageToken}`;
  }


  try {
    console.log(`Fetching Places API: ${url}`); // Log the URL being fetched
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Google Places API error:", errorData);
      throw new Error(`Google Places API request failed: ${response.statusText} - ${errorData?.error_message || ''}`);
    }

    const data = await response.json();
    console.log("Google Places API response status:", data.status);
    // console.log("Google Places API response data:", JSON.stringify(data, null, 2)); // Log full response if needed

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error("Google Places API non-OK status:", data);
        throw new Error(`Google Places API Error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    const recommendations: Recommendation[] = (data.results || []).map((place: any) => {
       const photoRef = place.photos?.[0]?.photo_reference;
       const description = place.editorial_summary?.overview || place.formatted_address || place.types?.join(', ') || 'Place of interest';
       const imageSearchHint = place.name ? place.name.toLowerCase().split(' ').slice(0, 2).join(' ') : 'attraction';

      return {
        id: place.place_id,
        name: place.name || 'Unknown Place',
        description: description,
        imageUrl: getPlacePhotoUrl(photoRef, apiKey),
        imageSearchHint: imageSearchHint,
        tags: mapPlaceTypesToTags(place.types || []),
        dataAiHint: imageSearchHint,
      };
    }).filter((rec: Recommendation | null): rec is Recommendation => rec !== null);

    console.log(`Found ${recommendations.length} recommendations.`);
    console.log("Next page token:", data.next_page_token);

    return {
        recommendations,
        nextPageToken: data.next_page_token // Return the next page token
     };

  } catch (error) {
    console.error("Error fetching from Google Places API:", error);
    throw new Error(`Failed to fetch recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
