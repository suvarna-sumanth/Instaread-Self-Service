import type { WebsiteAnalysisOutput } from '@/ai/flows/website-analysis';

export type PlayerConfig = {
  design: 'A' | 'B';
  showAds: boolean;
  enableMetrics: boolean;
  audioFile: File | null;
  audioFileName: string;
};

export type AnalysisResult = WebsiteAnalysisOutput | null;

export type Placement = {
  selector: string;
  position: 'before' | 'after';
} | null;
