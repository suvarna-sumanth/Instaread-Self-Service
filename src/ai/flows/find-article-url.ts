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

export async function findArticleUrl(input: FindArticleUrlInput): Promise<FindArticleUrlOutput> {
  const useAiAnalysis = process.env.ENABLE_AI_ANALYSIS === 'true';

  if (!useAiAnalysis || !process.env.OPENAI_API_KEY) {
      if (useAiAnalysis) {
        console.warn("AI analysis is enabled, but OPENAI_API_KEY is missing. Cannot find article URL.");
      }
      throw new Error("AI analysis is not enabled or configured, so I can't find an article automatically.");
  }
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const htmlContent = await fetchWebsite(input.domainUrl);
  if (htmlContent.startsWith('Error')) {
    throw new Error(`Failed to fetch homepage: ${htmlContent}`);
  }

  // Use cheerio to extract all links to reduce the payload to the LLM
  const $ = cheerio.load(htmlContent);
  const links = new Set<string>();
  const baseUrl = new URL(input.domainUrl);

  $('a').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href) {
          try {
              const absoluteUrl = new URL(href, baseUrl.href).href;
              // Simple filter: must be from the same domain, have a longer path, and not be an image/file
              if (absoluteUrl.startsWith(baseUrl.origin) && new URL(absoluteUrl).pathname.length > 5 && !/\.(jpg|jpeg|png|gif|pdf|zip)$/i.test(absoluteUrl)) {
                  links.add(absoluteUrl);
              }
          } catch (e) {
            // Ignore invalid URLs
          }
      }
  });

  const linkList = Array.from(links).slice(0, 150).join('\n'); // Limit links to save tokens

  const prompt = `You are a web crawler expert. Your task is to analyze the following list of URLs from ${input.domainUrl} and identify the single best URL that points to a specific news article or blog post.

  Follow these rules strictly:
  1.  **Select a specific article:** The URL must lead to a single, unique piece of content, not a list of articles.
  2.  **Avoid index/category pages:** Do NOT select URLs that are for categories, tags, archives, or sections (e.g., containing '/category/', '/section/', '/arts/', '/food-drink/', '/topic/').
  3.  **Prioritize article-like paths:** Good article URLs often have long, descriptive path segments that look like a headline (e.g., '/feature/how-to-make-the-best-burger/'). URLs with dates like '/2024/05/21/' are also strong candidates.
  4.  **Return only one URL:** Your final output must be the single best URL you found.

  List of URLs to analyze:
  ${linkList}

  Return the response as a valid JSON object with a single key "articleUrl". The JSON object must have this exact structure: { "articleUrl": "..." }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }

    const result = JSON.parse(content) as FindArticleUrlOutput;
    
    if (!result.articleUrl || !result.articleUrl.startsWith('http')) {
        throw new Error('AI could not identify a valid article URL.');
    }

    return result;

  } catch (error) {
    console.error("Error finding article URL with OpenAI:", error);
    throw new Error("AI failed to identify an article URL from the homepage.");
  }
}
