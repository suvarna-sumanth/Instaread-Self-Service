import type { WebsiteAnalysisOutput } from "@/ai/flows/website-analysis";

export type PlayerType =
  | "shortdesign"
  | "scrubandwaves"
  | "scrub"
  | "old"
  | "default";

export type PlayerConfig = {
  playerType: PlayerType;
  color: string;
};

export type AnalysisResult = WebsiteAnalysisOutput | null;

export type Placement = {
  selector: string;
  position: "before" | "after";
} | null;

export type DemoConfig = {
  id: string;
  websiteUrl: string;
  publication: string; // The unique identifier for the partner
  playerConfig: PlayerConfig;
  placement: NonNullable<Placement>;
  isInstalled: boolean; // Tracks if the player has been installed on the partner site
  installedAt: string | null; // The timestamp of the first installation
  createdAt: string;
  updatedAt: string;
};
