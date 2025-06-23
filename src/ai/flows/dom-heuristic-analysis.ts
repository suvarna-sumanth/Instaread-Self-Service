'use server';

/**
 * @fileOverview This file implements the DOM heuristic analysis flow.
 *
 * It analyzes the DOM structure of a website clone to identify suitable locations for an audio player.
 *
 * @remarks
 * - domHeuristicAnalysis - The main function that triggers the DOM analysis flow.
 * - DomHeuristicAnalysisInput - The input type for the domHeuristicAnalysis function.
 * - DomHeuristicAnalysisOutput - The output type for the domHeuristicAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DomHeuristicAnalysisInputSchema = z.object({
  htmlDataUri: z
    .string()
    .describe(
      "The HTML content of the website clone, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

export type DomHeuristicAnalysisInput = z.infer<typeof DomHeuristicAnalysisInputSchema>;

const DomHeuristicAnalysisOutputSchema = z.object({
  suggestedLocations: z
    .array(z.string())
    .describe(
      'A list of CSS selectors representing suggested locations within the DOM where the audio player could be placed.'
    ),
  reasoning: z
    .string()
    .describe(
      'Explanation of why these locations are suitable based on DOM analysis.'
    ),
});

export type DomHeuristicAnalysisOutput = z.infer<typeof DomHeuristicAnalysisOutputSchema>;

export async function domHeuristicAnalysis(
  input: DomHeuristicAnalysisInput
): Promise<DomHeuristicAnalysisOutput> {
  return domHeuristicAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'domHeuristicAnalysisPrompt',
  input: {schema: DomHeuristicAnalysisInputSchema},
  output: {schema: DomHeuristicAnalysisOutputSchema},
  prompt: `You are an AI assistant specializing in analyzing HTML DOM structures to suggest optimal locations for embedding an audio player.

  Given the HTML content of a website clone, your task is to identify potential locations where the audio player can be seamlessly integrated into the site's layout and design.

  Consider factors such as proximity to content, visual hierarchy, and overall site structure.

  Provide a list of CSS selectors that represent these suggested locations, along with a brief explanation of why each location is suitable.

  Here is the HTML content of the website clone:
  \n{{htmlDataUri}}
  \n  Please provide your analysis and suggestions:
  `, // using htmlDataUri directly in the prompt, not as media
});

const domHeuristicAnalysisFlow = ai.defineFlow(
  {
    name: 'domHeuristicAnalysisFlow',
    inputSchema: DomHeuristicAnalysisInputSchema,
    outputSchema: DomHeuristicAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
