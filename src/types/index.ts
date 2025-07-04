import type { WebsiteAnalysisOutput } from '@/ai/flows/website-analysis';
import type { SuggestWordpressConfigOutput } from '@/ai/flows/suggest-wordpress-config';

export type PlayerConfig = {
  design: 'A' | 'B';
  showAds: boolean;
  enableMetrics: boolean;
  audioFile: File | null;
  audioFileName: string;
};

export type AnalysisResult = WebsiteAnalysisOutput | null;

export type WordpressSuggestion = SuggestWordpressConfigOutput | null;

export type Placement = {
  selector: string;
  position: 'before' | 'after';
} | null;
