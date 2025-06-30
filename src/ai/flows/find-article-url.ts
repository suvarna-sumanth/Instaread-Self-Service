'use server';

/**
 * @fileOverview A flow to find a single article URL from a homepage.
 *
 * - findArticleUrl - A function that takes a domain URL and returns a single article URL.
 * - FindArticleUrlInput - The input type for the findArticleUrl function.
 * - FindArticleUrlOutput - The return type for the findArticleUrl function.
 */

import OpenAI from 'openai';
import { fetchWebsite } from '@/lib/fetch-website';
import * as cheerio from 'cheerio';

export type FindArticleUrlInput = {
  domainUrl: string;
};

export type FindArticleUrlOutput = {
  articleUrl: string;
};

// Return null on failure to allow for fallback logic in the UI
export async function findArticleUrl(input: FindArticleUrlInput): Promise<FindArticleUrlOutput | null> {
  const useAiAnalysis = process.env.ENABLE_AI_ANALYSIS === 'true';

  if (!useAiAnalysis || !process.env.OPENAI_API_KEY) {
      if (useAiAnalysis) {
        console.warn("AI analysis is enabled, but OPENAI_API_KEY is missing. Cannot find article URL.");
      }
      return null;
  }
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const htmlContent = await fetchWebsite(input.domainUrl);
  if (htmlContent.startsWith('Error')) {
    console.error(`Failed to fetch homepage for article finding: ${htmlContent}`);
    return null;
  }

  // Use cheerio to extract all links with their text to reduce the payload and improve context for the LLM
  const $ = cheerio.load(htmlContent);
  const links = new Map<string, string>();
  const baseUrl = new URL(input.domainUrl);

  $('a').each((i, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().trim().replace(/\s+/g, ' '); // Clean up whitespace
      if (href && text && text.length > 10) { // Only consider links with meaningful text
          try {
              const absoluteUrl = new URL(href, baseUrl.href).href;
              // Simple filter: must be from the same domain, have a longer path, and not be a file
              if (absoluteUrl.startsWith(baseUrl.origin) && new URL(absoluteUrl).pathname.length > 5 && !/\.(jpg|jpeg|png|gif|pdf|zip)$/i.test(absoluteUrl)) {
                  // If we already have this URL, don't overwrite it. First one wins.
                  if (!links.has(absoluteUrl)) {
                      links.set(absoluteUrl, text);
                  }
              }
          } catch (e) {
            // Ignore invalid URLs
          }
      }
  });
  
  if (links.size === 0) {
      console.warn("Could not find any suitable links on the homepage.");
      return null;
  }

  const linkList = Array.from(links.entries()).slice(0, 100).map(([url, text]) => `"${text}": "${url}"`).join('\n');

  const prompt = `You are a web crawler expert. Your task is to analyze the following list of links from ${input.domainUrl} and identify the single best URL that points to a specific news article or blog post. Each line is formatted as "Link Text": "URL". The link text provides crucial context.

Follow these rules strictly:
1.  **Analyze Link Text:** The link text is the most important clue. It should sound like a headline (e.g., "Kia goes hard with tradie-friendly Tasman").
2.  **Select a Specific Article:** The URL must lead to a single, unique piece of content, not a list of articles.
3.  **Avoid Navigation & Generic Links:** Do NOT select URLs where the link text is generic like "Read More", "News", "Category", "Features", "Home", "All", "View More", or a single word.
4.  **Avoid Non-Article Paths:** Do NOT select URLs that are for categories, tags, archives, or sections (e.g., containing '/category/', '/section/', '/arts/', '/topic/', '/author/').
5.  **Return Only One URL:** Your final output must be the single best URL you found.
6.  **Handle Failure:** If you cannot confidently identify a valid article URL from the list, you MUST return null for the "articleUrl" value.

List of Links (Text and URL) to analyze:
${linkList}

Return the response as a valid JSON object with a single key "articleUrl". The JSON object must have this exact structure: { "articleUrl": "..." } or { "articleUrl": null }
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.error('OpenAI returned an empty response.');
      return null;
    }

    const result = JSON.parse(content) as { articleUrl: string | null };
    
    // Check if the AI returned null or an invalid URL
    if (!result || !result.articleUrl || !result.articleUrl.startsWith('http')) {
        console.warn('AI could not identify a valid article URL or returned null.');
        return null;
    }

    return { articleUrl: result.articleUrl };

  } catch (error) {
    console.error("Error finding article URL with OpenAI:", error);
    return null;
  }
}
