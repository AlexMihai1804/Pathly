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
  destination: z.string().describe('The destination of the vacation.'),
  dates: z.string().describe('The dates of the vacation.'),
  interests: z.string().describe('The interests of the user for the vacation.'),
});
export type VacationDetails = z.infer<typeof VacationDetailsSchema>;


// Represents a recommended location for a user to visit.
export const LocationRecommendationSchema = z.object({
  id: z.string().describe('Unique identifier for the LocationRecommendation entity.'),
  name: z.string().describe('The name of the recommended location.'),
  shortDescription: z.string().describe('A short description of the recommended location.'),
  pictures: z.array(z.string()).describe('An array of URLs pointing to pictures of the recommended location.'),
});
export type LocationRecommendation = z.infer<typeof LocationRecommendationSchema>;


// Represents a location that a user has saved as a favorite.
export const FavoriteLocationSchema = z.object({
  id: z.string().describe('Unique identifier for the FavoriteLocation entity.'),
  userId: z.string().describe('Reference to the unique identifier of the related User entity.'),
  locationId: z.string().describe('Reference to the unique identifier of the related LocationRecommendation entity.'),
});
export type FavoriteLocation = z.infer<typeof FavoriteLocationSchema>;
