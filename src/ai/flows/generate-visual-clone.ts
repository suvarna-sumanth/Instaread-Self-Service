'use server';

/**
 * @fileOverview A flow to generate a visual clone of a website if iframe embedding is blocked.
 *
 * - generateVisualClone - A function that handles the visual clone generation process.
 * - GenerateVisualCloneInput - The input type for the generateVisualClone function.
 * - GenerateVisualCloneOutput - The return type for the generateVisualClone function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { fetchWebsiteTool } from '@/ai/tools/fetch-website';

const GenerateVisualCloneInputSchema = z.object({
  websiteUrl: z.string().describe('The URL of the website to clone.'),
});
export type GenerateVisualCloneInput = z.infer<typeof GenerateVisualCloneInputSchema>;

const GenerateVisualCloneOutputSchema = z.object({
  cloneHtml: z.string().describe('The HTML content of the visual clone.'),
});
export type GenerateVisualCloneOutput = z.infer<typeof GenerateVisualCloneOutputSchema>;

export async function generateVisualClone(input: GenerateVisualCloneInput): Promise<GenerateVisualCloneOutput> {
  return generateVisualCloneFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateVisualClonePrompt',
  input: {schema: GenerateVisualCloneInputSchema},
  output: {schema: GenerateVisualCloneOutputSchema},
  tools: [fetchWebsiteTool],
  prompt: `You are an expert web developer tasked with creating a visual clone of a website.

  Your goal is to generate HTML that closely resembles the original website in appearance.

  First, use the 'fetchWebsite' tool to get the HTML content of the website at the given URL: {{{websiteUrl}}}

  Then, analyze the fetched HTML and generate a new, self-contained HTML document that is a visual clone.
  This means you should try to inline any critical CSS. You can use placeholder images if necessary.

  Please return the complete HTML content of the cloned website.
  `,
});

const generateVisualCloneFlow = ai.defineFlow(
  {
    name: 'generateVisualCloneFlow',
    inputSchema: GenerateVisualCloneInputSchema,
    outputSchema: GenerateVisualCloneOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
