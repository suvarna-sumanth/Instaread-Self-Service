'use server';

/**
 * @fileOverview A flow to analyze the DOM for player placement suggestions.
 *
 * - placementAnalysis - A function that handles the DOM analysis.
 * - PlacementAnalysisInput - The input type for the placementAnalysis function.
 * - PlacementAnalysisOutput - The return type for the placementAnalysis function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as cheerio from 'cheerio';

export const PlacementAnalysisInputSchema = z.object({
  htmlContent: z.string().describe('The HTML content of the website clone.'),
});
export type PlacementAnalysisInput = z.infer<typeof PlacementAnalysisInputSchema>;

export const PlacementAnalysisOutputSchema = z.object({
  suggestedLocations: z.array(z.string()).describe('A list of CSS selectors for suggested placement locations.'),
  reasoning: z.string().describe('The reasoning behind the suggestions.'),
});
export type PlacementAnalysisOutput = z.infer<typeof PlacementAnalysisOutputSchema>;


export async function placementAnalysis(
  input: PlacementAnalysisInput
): Promise<PlacementAnalysisOutput> {
  return placementAnalysisFlow(input);
}


const placementAnalysisFlow = ai.defineFlow(
  {
    name: 'placementAnalysisFlow',
    inputSchema: PlacementAnalysisInputSchema,
    outputSchema: PlacementAnalysisOutputSchema,
  },
  async (input) => {
    const { htmlContent } = input;
    const $ = cheerio.load(htmlContent);

    const candidateSelectors = [
      'h1',
      'header',
      '.entry-header',
      'main',
      '[role="main"]',
      'article',
      '.content',
      '.post',
      '.entry-content',
    ];

    const suggestedLocations: string[] = [];
    const addedElements = new Set<cheerio.Element>();

    for (const selector of candidateSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
          const firstElement = elements.get(0);
          if (firstElement && !addedElements.has(firstElement)) {
              suggestedLocations.push(selector);
              addedElements.add(firstElement);
          }
      }
      if (suggestedLocations.length >= 5) {
          break;
      }
    }

    // Ensure there's at least one fallback suggestion
    if (suggestedLocations.length === 0) {
      suggestedLocations.push('body');
    }

    return {
      suggestedLocations: [...new Set(suggestedLocations)], // Remove potential duplicates
      reasoning:
        'These locations were identified as primary content areas suitable for placing an audio player based on common HTML structures like headings and main content containers.',
    };
  }
);
