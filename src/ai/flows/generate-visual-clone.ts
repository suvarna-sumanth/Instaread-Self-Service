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
import * as cheerio from 'cheerio';

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
  input: {schema: z.object({ htmlContent: z.string() })},
  output: {schema: GenerateVisualCloneOutputSchema},
  prompt: `You are an expert web developer tasked with creating a high-fidelity visual clone of a website from its HTML.

  Your goal is to generate a single, self-contained HTML file that visually replicates the original site as closely as possible.
  
  The provided HTML has been pre-processed to use absolute URLs for assets like CSS and images, and all <script> tags have been removed.
  
  Analyze the provided HTML. Your main task is to inline any critical CSS from the <link> tags to ensure the clone renders correctly without needing external requests for stylesheets.
  Ensure all image sources and other asset paths remain as absolute URLs.
  Do not add any <script> tags to your final output.

  Return only the complete, final HTML content of the cloned website.
  
  HTML Content to clone:
  \`\`\`html
  {{{htmlContent}}}
  \`\`\`
  `,
});

const generateVisualCloneFlow = ai.defineFlow(
  {
    name: 'generateVisualCloneFlow',
    inputSchema: GenerateVisualCloneInputSchema,
    outputSchema: GenerateVisualCloneOutputSchema,
  },
  async (input) => {
    const htmlContent = await fetchWebsiteTool({ url: input.websiteUrl });
    if (htmlContent.startsWith('Error')) {
        throw new Error(`Failed to fetch website for cloning: ${htmlContent}`);
    }

    const $ = cheerio.load(htmlContent);
    const baseUrl = new URL(input.websiteUrl);

    // Remove script tags for security and simplicity
    $('script').remove();

    // Resolve relative URLs to absolute ones
    const resolveUrl = (selector: string, attribute: string) => {
      $(selector).each((i, el) => {
        const url = $(el).attr(attribute);
        if (url) {
            try {
                const absoluteUrl = new URL(url, baseUrl.href).href;
                $(el).attr(attribute, absoluteUrl);
            } catch (e) {
                // Ignore invalid URLs (e.g. mailto:, data:, etc.)
            }
        }
      });
    };
    
    resolveUrl('link[href]', 'href');
    resolveUrl('img[src]', 'src');
    resolveUrl('a[href]', 'href');
    
    const cleanedHtml = $.html();

    const {output} = await prompt({ htmlContent: cleanedHtml });
    return output!;
  }
);
