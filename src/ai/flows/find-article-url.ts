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
              // Simple filter: must be from the same domain and not be a file/resource link
              if (absoluteUrl.startsWith(baseUrl.origin) && !/\.(jpg|jpeg|png|gif|pdf|zip)$/i.test(absoluteUrl)) {
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

  const linkList = Array.from(links.entries()).slice(0, 150).map(([url, text]) => `"${text}": "${url}"`).join('\n');

  const prompt = `You are an expert web crawler. Your primary goal is to find one single URL that points to a news article or blog post from the provided list of links. The website is ${input.domainUrl}.

The list is formatted as "Link Text": "URL".

Analyze the list and select the single BEST option based on these criteria, in order of importance:
1.  **Prioritize Headline Text:** The link's text is the strongest indicator. It should be a sentence or a descriptive title, like a real headline.
2.  **Analyze URL Structure:** Good article URLs often have long paths, dates (e.g., /2024/05/20/), or topic words like 'article', 'post', or 'feature'.
3.  **Avoid List/Category Pages:** Do NOT choose links that clearly lead to a category, section, tag, or author page (e.g., text is "More Stories", "Travel", "Food & Drink" or URL contains '/category/', '/topic/').
4.  **Avoid Generic Links:** Do NOT choose links with generic text like "Read More", "Home", "About", or "Contact".

From the list below, pick the one URL that is most likely a specific article.

List of Links:
${linkList}

Return your answer as a valid JSON object with a single key "articleUrl". The value must be the full URL you selected. If, after careful analysis, you are certain that NO valid article link exists in this list, and only then, return null for the "articleUrl" value.
The JSON object must have this exact structure: { "articleUrl": "..." } or { "articleUrl": null }
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
