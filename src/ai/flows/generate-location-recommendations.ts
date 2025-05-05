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

const GenerateLocationRecommendationsInputSchema = z.object({
  destination: z.string().describe('The desired vacation destination.'),
  dates: z.string().describe('The vacation dates.'),
  interests: z.string().describe('The user interests.'),
});

export type GenerateLocationRecommendationsInput = z.infer<typeof GenerateLocationRecommendationsInputSchema>;

const GenerateLocationRecommendationsOutputSchema = z.object({
  recommendations: z.array(z.string()).describe('A list of recommended locations.'),
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
    schema: z.object({
      destination: z.string().describe('The desired vacation destination.'),
      dates: z.string().describe('The vacation dates.'),
      interests: z.string().describe('The user interests.'),
    }),
  },
  output: {
    schema: z.object({
      recommendations: z.array(z.string()).describe('A list of recommended locations.'),
    }),
  },
  prompt: `You are a travel expert. Based on the user's vacation details, provide a list of location recommendations.

Vacation Details:
Destination: {{{destination}}}
Dates: {{{dates}}}
Interests: {{{interests}}}

Recommendations:`,    
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
  return output!;
});

