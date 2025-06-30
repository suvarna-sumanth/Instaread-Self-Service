'use server';

/**
 * @fileOverview A utility to analyze the DOM for player placement suggestions.
 *
 * - placementAnalysis - A function that handles the DOM analysis.
 * - PlacementAnalysisInput - The input type for the placementAnalysis function.
 * - PlacementAnalysisOutput - The return type for the placementAnalysis function.
 */
import * as cheerio from 'cheerio';

export type PlacementAnalysisInput = {
  htmlContent: string;
};

export type PlacementAnalysisOutput = {
  suggestedLocations: string[];
  reasoning: string;
};

export async function placementAnalysis(
  input: PlacementAnalysisInput
): Promise<PlacementAnalysisOutput> {
    const { htmlContent } = input;
    const $ = cheerio.load(htmlContent);

    // Prioritized list of selectors to find the best placement for the player.
    const candidateSelectors = [
      'article',
      '.entry-content',
      '.post-content',
      '.post',
      'main[role="main"]',
      'main',
      '[role="main"]',
      '.content',
      '.entry-header',
      'header',
      'h1',
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
        'These locations were identified as primary content areas suitable for placing an audio player based on common HTML structures like articles, main content containers, and headings.',
    };
}
