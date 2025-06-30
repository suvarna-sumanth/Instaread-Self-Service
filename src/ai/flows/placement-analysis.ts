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

// This function is now the single source of truth for placement.
// It uses a series of prioritized selectors to find the best spot.
async function cheerioAnalysis(htmlContent: string): Promise<PlacementAnalysisOutput> {
    const $ = cheerio.load(htmlContent);

    // Prioritized list of selectors to find the main content area.
    // The goal is to place the player *before* this main content block.
    const candidateSelectors = [
      // Most specific and common names for article content containers
      '.entry-content',
      '.post-content',
      '.article-body',
      '.article-content',
      'article.post',

      // Broader containers
      'article',
      'main',
    ];

    let bestSelector: string | null = null;

    for (const selector of candidateSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
          // Check if the element contains a reasonable amount of text to be considered "main content".
          // This helps avoid picking up small, irrelevant <article> or <main> tags.
          if (element.text().trim().length > 200) {
            bestSelector = selector;
            break; // Found a good candidate, stop searching.
          }
      }
    }

    // If no good candidate was found, fall back to the first one that exists.
    if (!bestSelector) {
        for (const selector of candidateSelectors) {
            if ($(selector).length > 0) {
                bestSelector = selector;
                break;
            }
        }
    }
    
    // As a final fallback, place it at the beginning of the body.
    const finalSelector = bestSelector || 'body > *:first-child';

    return {
      suggestedLocations: [finalSelector],
      reasoning:
        "We've automatically identified the main content block of the article and placed the player directly above it for optimal visibility.",
    };
}


export async function placementAnalysis(
  input: PlacementAnalysisInput
): Promise<PlacementAnalysisOutput> {
    // The AI-based analysis was proving unreliable due to the sanitized preview environment.
    // This deterministic approach is much more consistent.
    return await cheerioAnalysis(input.htmlContent);
}
