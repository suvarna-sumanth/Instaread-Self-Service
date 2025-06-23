export type PlayerConfig = {
  design: 'A' | 'B';
  showAds: boolean;
  enableMetrics: boolean;
  audioFile: File | null;
  audioFileName: string;
};

export type AnalysisResult = {
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
} | null;


export type PlacementSuggestion = {
  selector: string;
  element: HTMLElement;
};
