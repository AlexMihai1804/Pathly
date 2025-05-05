'use server';
/**
 * @fileOverview Generates location recommendations for a vacation.
 *
 * - generateLocationRecommendations - Generates a list of recommended locations.
 * - GenerateLocationRecsInput - Input schema for the recommendation generation.
 * - GenerateLocationRecsOutput - Output schema for the generated recommendations.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'zod';
import { LocationRecommendationSchema } from '@/firebase/types'; // Import the base schema

// --- Input/Output Schemas ---

export const GenerateLocationRecsInputSchema = z.object({
  destination: z.string().describe('The desired vacation destination.'),
  dates: z.string().describe('The vacation dates (e.g., "July 10th - July 20th, 2024"). Helps provide context for seasonality or events.'),
  interests: z.string().describe('User interests relevant to the vacation (e.g., "hiking, museums, local food").'),
  // Add optional fields like budget, travel style, etc. later if needed
});
export type GenerateLocationRecsInput = z.infer<typeof GenerateLocationRecsInputSchema>;


// Use the existing LocationRecommendationSchema for the items in the array
export const GenerateLocationRecsOutputSchema = z.object({
  recommendations: z.array(LocationRecommendationSchema).describe('A list of recommended locations.'),
});
export type GenerateLocationRecsOutput = z.infer<typeof GenerateLocationRecsOutputSchema>;


// --- Public Flow Function ---

export async function generateLocationRecommendations(input: GenerateLocationRecsInput): Promise<GenerateLocationRecsOutput> {
   // Basic validation before calling the flow
   const validation = GenerateLocationRecsInputSchema.safeParse(input);
   if (!validation.success) {
     throw new Error(`Invalid input for recommendations: ${validation.error.message}`);
   }
  return generateLocationRecommendationsFlow(input);
}


// --- Genkit Prompt and Flow Definition ---

const prompt = ai.definePrompt({
  name: 'generateLocationRecommendationsPrompt',
  input: { schema: GenerateLocationRecsInputSchema },
  output: { schema: GenerateLocationRecsOutputSchema }, // Use the output schema
  prompt: `
    You are a helpful travel assistant. Generate a list of 5 diverse location recommendations for a vacation based on the following details:

    **Destination:** {{destination}}
    **Dates:** {{dates}}
    **Interests:** {{interests}}

    For each recommendation, provide:
    - A unique ID (use a short, descriptive slug like 'louvre-museum' or generate a simple ID like 'rec-1').
    - The name of the location.
    - A short description (1-2 sentences).
    - An array of relevant picture URLs (find 1-2 good, publicly accessible image URLs if possible, otherwise provide an empty array []).
    - An 'imageSearchHint' (2-3 keywords) for finding images if URLs are unavailable.
    - An array of relevant tags (e.g., ['museum', 'art', 'history']).

    Focus on variety and relevance to the stated interests. Ensure the output is a valid JSON object matching the GenerateLocationRecsOutputSchema.
  `,
});


const generateLocationRecommendationsFlow = ai.defineFlow<
  typeof GenerateLocationRecsInputSchema,
  typeof GenerateLocationRecsOutputSchema // Use the specific output schema type
>(
  {
    name: 'generateLocationRecommendationsFlow',
    inputSchema: GenerateLocationRecsInputSchema,
    outputSchema: GenerateLocationRecsOutputSchema, // Use the specific output schema
  },
  async (input) => {
     console.log("Calling generateLocationRecommendationsPrompt with:", JSON.stringify(input, null, 2));
    const { output } = await prompt(input);
     console.log("Received output from prompt:", JSON.stringify(output, null, 2));

     if (!output || !output.recommendations) {
        throw new Error("Recommendation generation failed to produce an output.");
     }
     // Ensure imageSearchHint is present if pictures array is empty
      output.recommendations = output.recommendations.map(rec => ({
         ...rec,
          pictures: rec.pictures || [], // Ensure pictures is always an array
          imageSearchHint: (rec.pictures && rec.pictures.length > 0) ? rec.imageSearchHint : (rec.name?.toLowerCase().split(' ').slice(0, 2).join(' ') || 'attraction'), // Generate hint if no pics
          tags: rec.tags || [], // Ensure tags is always an array
      }));


    return output;
  }
);
