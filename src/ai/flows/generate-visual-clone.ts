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
  prompt: `You are an expert web developer tasked with creating a visual clone of a website.

  Your goal is to generate HTML that closely resembles the original website in appearance.

  Here is the URL of the website to clone: {{{websiteUrl}}}

  Please return the complete HTML content of the cloned website.
  The HTML should be self-contained and include all necessary CSS and images.
  `, // Consider adding instructions to use specific libraries or techniques if needed.
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
