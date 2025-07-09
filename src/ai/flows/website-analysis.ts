
'use server';

/**
 * @fileOverview A flow to analyze a website's design tokens and tech stack.
 *
 * - analyzeWebsite - A function that handles the website analysis process.
 * - WebsiteAnalysisInput - The input type for the analyzeWebsite function.
 * - WebsiteAnalysisOutput - The return type for the analyzeWebsite function.
 */

import OpenAI from 'openai';
import { fetchWebsite } from '@/lib/fetch-website';
import { WEBSITE_ANALYSIS_MODEL } from '@/lib/constants';

// Define input and output types directly
export type WebsiteAnalysisInput = {
  url: string;
};

export type WebsiteAnalysisOutput = {
  colors: {
    primary: string;
    background: string;
    text: string;
  };
  fonts: {
    headline: string;
    body: string;
  };
  techStack: string[];
};

const mockAnalysis: WebsiteAnalysisOutput = {
    colors: {
      primary: '#3B82F6', // A nice blue
      background: '#F9FAFB', // Light gray
      text: '#1F2937', // Dark gray
    },
    fonts: {
      headline: 'Poppins, sans-serif',
      body: 'Inter, sans-serif',
    },
    techStack: ['React', 'Next.js', 'Mock Data'],
};

export async function analyzeWebsite(input: WebsiteAnalysisInput): Promise<WebsiteAnalysisOutput> {
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, AI analysis is used. In development, we use mock data.
  if (!isProduction) {
    console.log('DEVELOPMENT: Using mock data for website analysis.');
    return mockAnalysis;
  }
  
  // From here, we are in PRODUCTION mode.
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Cannot analyze website in production: The OPENAI_API_KEY environment variable is not set. Please add it to your .env file.");
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
      model: WEBSITE_ANALYSIS_MODEL,
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
    console.error("[Website Analysis] Error analyzing with OpenAI:", error);
    throw new Error(`AI analysis failed. ${error instanceof Error ? error.message : 'An unexpected error occurred.'}`);
  }
}
