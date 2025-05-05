'use server';

/**
 * @fileOverview Generates location recommendations based on vacation details.
 *
 * - generateLocationRecommendations - A function that generates location recommendations.
 * - GenerateLocationRecommendationsInput - The input type for the generateLocationRecommendations function.
 * - GenerateLocationRecommendationsOutput - The return type for the generateLocationRecommendations function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

// Input remains the same
const GenerateLocationRecommendationsInputSchema = z.object({
  destination: z.string().describe('The desired vacation destination.'),
  dates: z.string().describe('The vacation dates.'),
  interests: z.string().describe('The user interests.'),
});

export type GenerateLocationRecommendationsInput = z.infer<typeof GenerateLocationRecommendationsInputSchema>;

// Define a schema for a single recommendation
const RecommendationSchema = z.object({
    id: z.string().describe("A unique identifier for the location (e.g., place name slugified)."),
    name: z.string().describe("The name of the recommended location or activity."),
    description: z.string().describe("A brief description of why this location/activity is recommended based on user interests."),
    imageSearchHint: z.string().describe("One or two keywords for searching an image of this location (e.g., 'eiffel tower', 'louvre museum')."),
    tags: z.array(z.string()).describe("Relevant tags for filtering (e.g., ['landmark', 'museum', 'outdoors', 'food', 'art', 'history', 'romantic']). Use lowercase."),
});

// Update output schema to use the RecommendationSchema
const GenerateLocationRecommendationsOutputSchema = z.object({
  recommendations: z.array(RecommendationSchema).describe('A list of detailed recommended locations or activities.'),
});

export type GenerateLocationRecommendationsOutput = z.infer<typeof GenerateLocationRecommendationsOutputSchema>;

export async function generateLocationRecommendations(
  input: GenerateLocationRecommendationsInput
): Promise<GenerateLocationRecommendationsOutput> {
  return generateLocationRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLocationRecommendationsPrompt',
  input: {
    schema: GenerateLocationRecommendationsInputSchema, // Use the same input schema
  },
  output: {
    schema: GenerateLocationRecommendationsOutputSchema, // Use the updated output schema
  },
  prompt: `You are a travel expert specializing in personalized recommendations. Based on the user's vacation details below, provide a diverse list of 5-10 specific location or activity recommendations within or very near the destination.

For each recommendation, provide:
1.  A unique 'id' (use the location name, lowercase, spaces replaced with hyphens).
2.  The 'name' of the location/activity.
3.  A concise 'description' (1-2 sentences) explaining why it fits the user's interests and the destination.
4.  An 'imageSearchHint' (1-2 relevant keywords) suitable for finding a representative image (e.g., 'eiffel tower', 'louvre museum', 'seine river cruise', 'parisian cafe').
5.  An array of relevant 'tags' from the allowed list: landmark, museum, outdoors, food, art, history, romantic, nature, culture.

Vacation Details:
Destination: {{{destination}}}
Dates: {{{dates}}}
Interests: {{{interests}}}

Generate the recommendations in the specified JSON output format. Ensure the 'tags' only include values from the allowed list.`,
});


const generateLocationRecommendationsFlow = ai.defineFlow<
  typeof GenerateLocationRecommendationsInputSchema,
  typeof GenerateLocationRecommendationsOutputSchema
>({
  name: 'generateLocationRecommendationsFlow',
  inputSchema: GenerateLocationRecommendationsInputSchema,
  outputSchema: GenerateLocationRecommendationsOutputSchema,
},
async input => {
  const {output} = await prompt(input);
   // Ensure output is not null and defaults recommendations to an empty array if nullish
  return { recommendations: output?.recommendations ?? [] };
});
