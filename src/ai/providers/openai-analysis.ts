
'use server';

/**
 * @fileOverview OpenAI-specific implementation for website analysis.
 */

import OpenAI from 'openai';
import { fetchWebsite } from '@/lib/fetch-website';
import { OPENAI_WEBSITE_ANALYSIS_MODEL } from '@/lib/constants';
import type { WebsiteAnalysisInput, WebsiteAnalysisOutput } from '@/ai/flows/website-analysis';

export async function analyzeWithOpenAI(input: WebsiteAnalysisInput): Promise<WebsiteAnalysisOutput> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is missing. Please set OPENAI_API_KEY in your environment variables.');
  }
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  const htmlContent = await fetchWebsite(input.url);
  if (htmlContent.startsWith('Error')) {
    throw new Error(`Failed to fetch website: ${htmlContent}`);
  }

  const truncatedHtml = htmlContent.substring(0, 100000);

  const prompt = `You are an expert web developer and designer. Analyze the provided HTML to identify the website's design system.
  
  Extract the following information:
  - Primary Color: The main accent or brand color as a hex code.
  - Background Color: The dominant background color of the page as a hex code.
  - Text Color: The primary color for body text as a hex code.
  - Headline Font: The font family for main headings (e.g., h1, h2).
  - Body Font: The font family for paragraph text.
  - Tech Stack: Identify the frontend frameworks, libraries, or CMS used (e.g., React, Next.js, WordPress, Shopify, etc.).

  Return the response as a valid JSON object, without any markdown formatting (like \`\`\`json). The JSON object must have this exact structure: { "colors": { "primary": "...", "background": "...", "text": "..." }, "fonts": { "headline": "...", "body": "..." }, "techStack": ["...", "..."] }

  HTML Content:
  \`\`\`html
  ${truncatedHtml}
  \`\`\`
  `;
  
  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_WEBSITE_ANALYSIS_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }

    const analysisResult = JSON.parse(content) as WebsiteAnalysisOutput;
    return analysisResult;

  } catch (error) {
    console.error("[OpenAI Analysis Error]:", error);
    throw new Error(`AI analysis failed. ${error instanceof Error ? error.message : 'An unexpected error occurred.'}`);
  }
}
