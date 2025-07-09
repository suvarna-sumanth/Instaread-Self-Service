

import type { WebsiteAnalysisOutput } from '@/ai/flows/website-analysis';

export type PlayerType = 'shortdesign' | 'scrubandwaves' | 'scrub' | 'default' | 'newdesign';

export type PlayerConfig = {
  playerType: PlayerType;
  color: string;
};

export type AnalysisResult = WebsiteAnalysisOutput | null;

export type Placement = {
  selector: string;
  position: 'before' | 'after';
} | null;

export type DemoConfig = {
    id: string;
    websiteUrl: string;
    playerConfig: PlayerConfig;
    placement: NonNullable<Placement>;
    createdAt: string;
    updatedAt: string;
    viewCount?: number;
};
