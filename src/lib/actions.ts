
'use server'

import { generateVisualClone as generateVisualCloneFlow } from '@/ai/flows/generate-visual-clone';
import { placementAnalysis } from '@/ai/flows/placement-analysis';
import { analyzeWebsite as analyzeWebsiteFlow, type WebsiteAnalysisOutput } from '@/ai/flows/website-analysis';

// In a real app, you would have error handling, etc.

export async function getVisualClone(url: string): Promise<string> {
    console.log(`Generating visual clone for: ${url}`);
    const result = await generateVisualCloneFlow({ websiteUrl: url });
    return result.cloneHtml;
}

export async function getPlacementSuggestions(html: string) {
    const result = await placementAnalysis({ htmlContent: html });
    return result;
}

export async function analyzeWebsite(url: string): Promise<WebsiteAnalysisOutput> {
    console.log(`Analyzing website: ${url}`);
    // MOCK: Bypassing the real AI call to avoid Google Cloud configuration issues.
    // In a real scenario, you would re-enable the line below.
    // const result = await analyzeWebsiteFlow({ url });
    
    // Returning mock data instead.
    const mockResult: WebsiteAnalysisOutput = {
        colors: {
            primary: '#1a73e8',
            background: '#ffffff',
            text: '#202124',
        },
        fonts: {
            headline: 'Google Sans, sans-serif',
            body: 'Roboto, sans-serif',
        },
        techStack: ['Mocked Data', 'React'],
        usage: {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
        }
    };

    // Simulate a network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return mockResult;
}
