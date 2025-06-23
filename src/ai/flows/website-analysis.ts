
'use server';

/**
 * @fileOverview A flow to analyze a website's design tokens and tech stack.
 *
 * - analyzeWebsite - A function that handles the website analysis process.
 * - WebsiteAnalysisInput - The input type for the analyzeWebsite function.
 * - WebsiteAnalysisOutput - The return type for the analyzeWebsite function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { fetchWebsite } from '@/lib/fetch-website';

const WebsiteAnalysisInputSchema = z.object({
  url: z.string().url().describe('The URL of the website to analyze.'),
});
export type WebsiteAnalysisInput = z.infer<typeof WebsiteAnalysisInputSchema>;

// Schema for the data we expect the LLM to generate.
const WebsiteAnalysisLLMOutputSchema = z.object({
  colors: z.object({
    primary: z.string().describe('The primary/accent color of the website as a hex code. e.g. #29ABE2'),
    background: z.string().describe('The main background color of the website as a hex code. e.g. #F0F0F0'),
    text: z.string().describe('The primary text color of the website as a hex code. e.g. #333333'),
  }),
  fonts: z.object({
    headline: z.string().describe('The main font family used for headlines.'),
    body: z.string().describe('The main font family used for body text.'),
  }),
  techStack: z.array(z.string()).describe('A list of technologies used to build the website.'),
});

// Schema for the entire flow's output, which includes the LLM output plus usage stats.
const WebsiteAnalysisOutputSchema = WebsiteAnalysisLLMOutputSchema.extend({
  usage: z.any().optional(),
});
export type WebsiteAnalysisOutput = z.infer<typeof WebsiteAnalysisOutputSchema>;


export async function analyzeWebsite(input: WebsiteAnalysisInput): Promise<WebsiteAnalysisOutput> {
  return websiteAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'websiteAnalysisPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: { schema: z.object({ htmlContent: z.string() }) },
  output: { schema: WebsiteAnalysisLLMOutputSchema }, // The prompt now uses the LLM-specific schema.
  prompt: `You are an expert web developer and designer. Analyze the provided HTML and any inline/linked CSS to identify the website's design system.
  
  Extract the following information:
  - Primary Color: The main accent or brand color.
  - Background Color: The dominant background color of the page.
  - Text Color: The primary color for body text.
  - Headline Font: The font family for main headings (e.g., h1, h2).
  - Body Font: The font family for paragraph text.
  - Tech Stack: Identify the frontend frameworks, libraries, or CMS used (e.g., React, Next.js, WordPress, Shopify, etc.) by looking at scripts, meta tags, and class names.

  Return the response in the specified JSON format.

  HTML Content:
  \`\`\`html
  {{{htmlContent}}}
  \`\`\`
  `,
});

const websiteAnalysisFlow = ai.defineFlow(
  {
    name: 'websiteAnalysisFlow',
    inputSchema: WebsiteAnalysisInputSchema,
    outputSchema: WebsiteAnalysisOutputSchema, // The flow returns the combined schema.
  },
  async (input) => {
    const htmlContent = await fetchWebsite(input.url);
    if (htmlContent.startsWith('Error')) {
      throw new Error(`Failed to fetch website: ${htmlContent}`);
    }

    const response = await prompt({ htmlContent });
    const llmOutput = response.output;
    
    if (!llmOutput) {
      throw new Error("Analysis failed: no output from LLM.");
    }
    
    // Combine the LLM's output with the usage metadata to create the final return object.
    return {
      ...llmOutput,
      usage: response.usage,
    };
  }
);
