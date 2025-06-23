'use server';

/**
 * @fileOverview This file implements the DOM heuristic analysis.
 *
 * It analyzes the DOM structure of a website clone to identify suitable locations for an audio player.
 *
 * @remarks
 * - domHeuristicAnalysis - The main function that triggers the DOM analysis.
 * - DomHeuristicAnalysisInput - The input type for the domHeuristicAnalysis function.
 * - DomHeuristicAnalysisOutput - The output type for the domHeuristicAnalysis function.
 */

import * as cheerio from 'cheerio';

export type DomHeuristicAnalysisInput = {
  htmlContent: string;
};

export type DomHeuristicAnalysisOutput = {
  suggestedLocations: string[];
  reasoning: string;
};

export async function domHeuristicAnalysis(
  input: DomHeuristicAnalysisInput
): Promise<DomHeuristicAnalysisOutput> {
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
