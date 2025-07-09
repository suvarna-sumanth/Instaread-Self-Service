
'use server';

/**
 * @fileOverview A flow to analyze a website's design tokens and tech stack.
 * This flow acts as a dispatcher, selecting the appropriate AI provider
 * based on environment variables.
 *
 * - analyzeWebsite - A function that handles the website analysis process.
 * - WebsiteAnalysisInput - The input type for the analyzeWebsite function.
 * - WebsiteAnalysisOutput - The return type for the analyzeWebsite function.
 */

// Import provider-specific implementations
import { analyzeWithOpenAI } from '@/ai/providers/openai-analysis';
// Future: import { analyzeWithGemini } from '@/ai/providers/gemini-analysis';


// Define shared input and output types
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

// Define mock data for development or when AI is disabled
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

// --- Main Dispatcher Flow ---

/**
 * Analyzes a website by dispatching to the configured AI provider.
 * @param input The website URL to analyze.
 * @returns A promise that resolves to the website analysis output.
 */
export async function analyzeWebsite(input: WebsiteAnalysisInput): Promise<WebsiteAnalysisOutput> {
  const useAi = process.env.USE_AI_ANALYSIS === 'true';

  if (!useAi) {
    console.log('USE_AI_ANALYSIS is not set to true. Using mock data for website analysis.');
    return mockAnalysis;
  }
  
  const provider = process.env.AI_PROVIDER;

  switch (provider) {
    case 'openai':
      console.log(`Analyzing website with OpenAI: ${input.url}`);
      return analyzeWithOpenAI(input);
    
    // To add Gemini support in the future, you would add a new case here:
    // case 'gemini':
    //   console.log(`Analyzing website with Gemini: ${input.url}`);
    //   return analyzeWithGemini(input);

    default:
      console.warn(`Unsupported AI_PROVIDER "${provider}". Falling back to mock data.`);
      return mockAnalysis;
  }
}
