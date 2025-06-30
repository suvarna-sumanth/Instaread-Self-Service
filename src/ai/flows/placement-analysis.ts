'use server';

/**
 * @fileOverview A utility to analyze the DOM for player placement suggestions.
 *
 * - placementAnalysis - A function that handles the DOM analysis.
 * - PlacementAnalysisInput - The input type for the placementAnalysis function.
 * - PlacementAnalysisOutput - The return type for the placementAnalysis function.
 */
import * as cheerio from 'cheerio';
import OpenAI from 'openai';

export type PlacementAnalysisInput = {
  htmlContent: string;
};

export type PlacementAnalysisOutput = {
  suggestedLocations: string[];
  reasoning: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function cheerioAnalysis(htmlContent: string): Promise<PlacementAnalysisOutput> {
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


async function aiAnalysis(htmlContent: string): Promise<PlacementAnalysisOutput> {
    const truncatedHtml = htmlContent.substring(0, 100000);
    const prompt = `You are an expert web developer. Analyze the provided HTML and determine the single best CSS selector to insert an audio player.
The player should be placed immediately **before** the main article content begins. This is usually after any headlines, sub-headlines, author information, and introductory images, but **before the first paragraph of the actual article body.**

Return a valid JSON object with this exact structure: { "selector": "your-css-selector", "reasoning": "A brief explanation for your choice." }
Be as specific as possible with the selector to avoid ambiguity.

HTML Content:
\`\`\`html
${truncatedHtml}
\`\`\`
`;
    
    console.log("[aiAnalysis] Starting AI placement analysis.");
    try {
        console.log("[aiAnalysis] Calling OpenAI API...");
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: "json_object" },
        });

        console.log("[aiAnalysis] OpenAI response received.");
        const content = response.choices[0].message.content;
        if (!content) {
            console.error('[aiAnalysis] OpenAI returned an empty response.');
            throw new Error('OpenAI returned an empty response for placement analysis.');
        }

        console.log("[aiAnalysis] Raw content from OpenAI:", content);
        const result = JSON.parse(content) as { selector: string, reasoning: string };
        console.log("[aiAnalysis] Parsed result:", result);
        
        return {
            suggestedLocations: [result.selector],
            reasoning: result.reasoning,
        };
    } catch (error) {
        console.error("[aiAnalysis] Error analyzing placement with OpenAI:", error);
        throw new Error("Failed to analyze placement due to an OpenAI API error.");
    }
}


export async function placementAnalysis(
  input: PlacementAnalysisInput
): Promise<PlacementAnalysisOutput> {
    const useAiAnalysis = process.env.ENABLE_AI_PLACEMENT_ANALYSIS === 'true';

    if (useAiAnalysis) {
        console.log('[placementAnalysis] Using AI for placement analysis.');
        if (!process.env.OPENAI_API_KEY) {
            console.error('[placementAnalysis] OPENAI_API_KEY is not set, but AI placement analysis is enabled.');
            throw new Error('OPENAI_API_KEY is not set in the environment, but AI placement analysis is enabled.');
        }
        try {
            return await aiAnalysis(input.htmlContent);
        } catch (e) {
            console.error('[placementAnalysis] AI placement analysis failed, falling back to standard analysis.', e);
            // Fallback to cheerio if AI fails
            return await cheerioAnalysis(input.htmlContent);
        }
    }
    
    console.log('[placementAnalysis] Using standard (Cheerio) for placement analysis.');
    return await cheerioAnalysis(input.htmlContent);
}
