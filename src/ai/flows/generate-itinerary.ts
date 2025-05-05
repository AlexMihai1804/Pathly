'use server';
/**
 * @fileOverview Generates a structured vacation itinerary.
 *
 * - generateItinerary - Creates a day-by-day plan based on user's selected locations and dates.
 * - GenerateItineraryInput - Input schema for the itinerary generation.
 * - GenerateItineraryOutput - Output schema for the generated itinerary.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'zod';
import { ItineraryStepSchema } from '@/firebase/types'; // Import the step schema

// --- Input/Output Schemas ---

const PlannedVisitInputSchema = z.object({
    locationId: z.string().describe("Unique identifier for the location (e.g., Google Place ID)."),
    locationName: z.string().describe("Name of the location."),
    description: z.string().optional().describe("Optional description of the location."),
    // Consider adding estimated duration or opening hours if available
});

export const GenerateItineraryInputSchema = z.object({
  destination: z.string().describe('The main vacation destination city or region.'),
  dates: z.string().describe('The vacation dates (e.g., "July 10th - July 20th, 2024").'),
  plannedVisits: z.array(PlannedVisitInputSchema).min(1).describe('List of locations the user wants to visit.'),
  // preferences: z.string().optional().describe('Optional user preferences (e.g., pace, budget, specific interests not captured in visits).'),
});
export type GenerateItineraryInput = z.infer<typeof GenerateItineraryInputSchema>;

export const GenerateItineraryOutputSchema = z.object({
  days: z
    .record(
      z.string().describe('Day label (e.g., "Day 1", "July 10th")'),
      z.array(ItineraryStepSchema).describe('Array of itinerary steps for the day.')
    )
    .describe('An object where keys are day labels and values are arrays of itinerary steps.'),
});
export type GenerateItineraryOutput = z.infer<typeof GenerateItineraryOutputSchema>;


// --- Public Flow Function ---

export async function generateItinerary(input: GenerateItineraryInput): Promise<GenerateItineraryOutput> {
    // Basic validation before calling the flow
    const validation = GenerateItineraryInputSchema.safeParse(input);
    if (!validation.success) {
        throw new Error(`Invalid input for itinerary generation: ${validation.error.message}`);
    }
    return generateItineraryFlow(input);
}

// --- Genkit Prompt and Flow Definition ---

const prompt = ai.definePrompt({
  name: 'generateItineraryPrompt',
  input: { schema: GenerateItineraryInputSchema },
  output: { schema: GenerateItineraryOutputSchema },
  prompt: `
    You are an expert travel planner. Your task is to create a logical and efficient daily itinerary for a vacation based on the user's destination, dates, and planned visits.

    **Destination:** {{destination}}
    **Dates:** {{dates}}

    **Planned Visits (Locations/Activities):**
    {{#each plannedVisits}}
    - **{{locationName}}** (ID: {{locationId}}){{#if description}}: {{description}}{{/if}}
    {{/each}}

    **Instructions:**

    1.  **Determine Duration:** Figure out the number of full days available based on the provided dates.
    2.  **Group Visits:** Logically group the planned visits into daily schedules. Consider geographical proximity and potential opening hours (assume standard tourist hours if not specified). Avoid scheduling too much for one day.
    3.  **Estimate Timing:** For each visit ('visit' step), estimate a reasonable start time, end time, and duration in minutes.
    4.  **Plan Travel:** Between visits on the same day, add a 'travel' step. Estimate the travel time (durationMinutes) and choose a likely travelMode ('walk', 'drive', or 'transit'). Be realistic about travel times within the destination. Add brief travelDetails if helpful (e.g., "Walk", "Short taxi ride").
    5.  **Structure Output:** Organize the schedule into a JSON object where keys are day labels (e.g., "Day 1", "Day 2", or specific dates like "July 10th") and values are arrays of steps (visits and travel).
    6.  **Schema Adherence:** Ensure each step in the output strictly follows the ItineraryStepSchema:
        *   \`type\`: Must be "visit" or "travel".
        *   \`locationName\`, \`locationId\`: Required for "visit", optional for "travel".
        *   \`startTime\`: Required for all steps (e.g., "9:00 AM").
        *   \`endTime\`: Required for "visit", optional for "travel".
        *   \`durationMinutes\`: Required positive integer for all steps.
        *   \`travelMode\`: Optional for "travel" ('walk', 'drive', 'transit').
        *   \`travelDetails\`: Optional string for "travel".

    **Example Step (Visit):**
    { "type": "visit", "locationName": "Louvre Museum", "locationId": "ChIJLbZ-NFvHkcURFuf0uQCLPYw", "startTime": "9:30 AM", "endTime": "12:30 PM", "durationMinutes": 180 }

    **Example Step (Travel):**
    { "type": "travel", "startTime": "12:30 PM", "durationMinutes": 20, "travelMode": "walk", "travelDetails": "Walk along the Seine" }

    Generate the itinerary now based *only* on the provided planned visits. Ensure the output is a valid JSON object matching the GenerateItineraryOutputSchema.
  `,
});


const generateItineraryFlow = ai.defineFlow<
  typeof GenerateItineraryInputSchema,
  typeof GenerateItineraryOutputSchema
>(
  {
    name: 'generateItineraryFlow',
    inputSchema: GenerateItineraryInputSchema,
    outputSchema: GenerateItineraryOutputSchema,
  },
  async (input) => {
     console.log("Calling generateItineraryPrompt with:", JSON.stringify(input, null, 2));
    const { output } = await prompt(input);
     console.log("Received output from prompt:", JSON.stringify(output, null, 2));

     if (!output) {
        throw new Error("Itinerary generation failed to produce an output.");
     }
     // Additional validation could happen here if needed
     // e.g., check if days object is empty, or if steps have valid durations
     if (!output.days || Object.keys(output.days).length === 0) {
         console.warn("Generated itinerary has no days or steps.");
         // Depending on requirements, either throw error or return empty
         // For now, return empty days if generation was technically successful but produced nothing
         return { days: {} };
     }

    return output;
  }
);
