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
    // The goal is to place the player just before the main article content starts.
    const candidateSelectors = [
      // Common class names for the main content block. Placing BEFORE these is ideal.
      '.entry-content',
      '.post-content',
      '.article-content',
      '.article-body',

      // If no specific content div is found, try placing it AFTER the main headline.
      // We do this by selecting the element immediately following h1 and placing our player before it.
      'h1 + *',

      // Fallback: place as the first child inside a broader content container.
      'article > *:first-child',
      'main > *:first-child',
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
      if (suggestedLocations.length >= 3) { // Get a few options
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
        "Based on the website's structure, we suggest placing the player just before the main content begins. This is typically after the main headline or at the start of the primary article container.",
    };
}
