
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
    console.log(`Analyzing website with OpenAI: ${url}`);
    const result = await analyzeWebsiteFlow({ url });
    return result;
}
