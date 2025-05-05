import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

// Represents a user of the Pathly application.
export const UserSchema = z.object({
  id: z.string().describe('Unique identifier for the User entity.'),
  email: z.string().email().describe("The user's email address used for authentication."),
});
export type User = z.infer<typeof UserSchema>;


// Represents the details of a user's planned vacation.
export const VacationDetailsSchema = z.object({
  id: z.string().describe('Unique identifier for the VacationDetails entity.'),
  userId: z.string().describe('Reference to the unique identifier of the related User entity.'),
  destination: z.string().min(1, "Destination cannot be empty").describe('The destination of the vacation.'),
  dates: z.string().min(1, "Dates cannot be empty").describe('The dates of the vacation (expected format like "YYYY-MM-DD to YYYY-MM-DD").'), // Add format expectation
  interests: z.array(z.string()).min(1, "Please select at least one interest.").describe('The interests of the user for the vacation.'), // Updated to array
});
export type VacationDetails = z.infer<typeof VacationDetailsSchema>;


// Represents a recommended location for a user to visit (potentially from Google Places).
export const LocationRecommendationSchema = z.object({
    id: z.string().describe("Unique identifier for the location (e.g., Google Place ID)."),
    name: z.string().describe("The name of the recommended location."),
    description: z.string().describe("A short description or address of the recommended location."),
    imageUrl: z.string().url().optional().describe("Optional URL for an image of the location."),
    imageSearchHint: z.string().describe("Keywords for searching an image if imageUrl is missing."),
    tags: z.array(z.string()).describe("Relevant tags or categories (e.g., ['museum', 'park', 'restaurant'])."),
    // dataAiHint is implicitly imageSearchHint for consistency with other types if needed
});
export type LocationRecommendation = z.infer<typeof LocationRecommendationSchema>;


// Represents a location that a user has saved as a favorite.
export const FavoriteLocationSchema = z.object({
  // id: z.string().optional(), // Firestore document ID will be the locationId
  userId: z.string().describe('Reference to the unique identifier of the related User entity.'),
  locationId: z.string().describe('The unique identifier of the favorited location (e.g., Google Place ID). Serves as the document ID.'),
  name: z.string().describe('Denormalized name of the location for easy display.'), // Denormalized
  description: z.string().optional().describe('Denormalized description.'), // Denormalized
  imageUrl: z.string().url().optional().describe('Denormalized image URL.'), // Denormalized
  dataAiHint: z.string().optional().describe("Hint for image generation/search."), // Denormalized
});
export type FavoriteLocation = z.infer<typeof FavoriteLocationSchema>;


// Represents an item selected by the user to potentially visit during a vacation.
export const PlannedVisitSchema = z.object({
    id: z.string().describe('Firestore document ID for the planned visit.'),
    userId: z.string().describe('Reference to the user planning the visit.'),
    vacationId: z.string().describe('Reference to the specific vacation this visit belongs to.'),
    locationId: z.string().describe('Reference to the LocationRecommendation being planned.'),
    locationName: z.string().describe('Name of the location (denormalized for easy display).'),
    locationImageUrl: z.string().url().optional().describe('Primary image URL (denormalized).'), // Optional for now
    description: z.string().optional().describe('Description of the location (denormalized).'),
    dataAiHint: z.string().optional().describe("Hint for image generation/search."),
    // Add fields like estimatedDuration, userNotes later if needed
});
export type PlannedVisit = z.infer<typeof PlannedVisitSchema>;


// Represents a single step within a generated itinerary day.
export const ItineraryStepSchema = z.object({
    type: z.enum(['visit', 'travel']).describe('The type of step: visiting a location or traveling between locations.'),
    locationName: z.string().optional().describe('The name of the location being visited (only for type "visit").'),
    locationId: z.string().optional().describe('The ID of the location being visited (only for type "visit").'),
    startTime: z.string().describe('The scheduled start time of the step (e.g., "9:00 AM").'),
    endTime: z.string().optional().describe('The scheduled end time of the step (e.g., "11:00 AM").'),
    durationMinutes: z.number().int().positive().describe('The estimated duration of the step in minutes.'),
    travelMode: z.enum(['walk', 'drive', 'transit']).optional().describe('The mode of travel (only for type "travel").'),
    travelDetails: z.string().optional().describe('Additional details about the travel leg (e.g., "Take Metro Line 1").'), // Added travel details
});
export type ItineraryStep = z.infer<typeof ItineraryStepSchema>;

// Represents the full generated itinerary for a vacation.
export const ItinerarySchema = z.object({
    id: z.string().describe('Unique identifier for the Itinerary document.'),
    userId: z.string().describe('Reference to the user this itinerary belongs to.'),
    vacationId: z.string().describe('Reference to the vacation this itinerary is for.'),
    days: z.record(z.string(), z.array(ItineraryStepSchema)).describe('An object where keys are day labels (e.g., "Day 1") and values are arrays of itinerary steps for that day.'),
    createdAt: z.instanceof(Timestamp).optional().describe('Timestamp when the itinerary was generated.'),
});
export type Itinerary = z.infer<typeof ItinerarySchema>;
