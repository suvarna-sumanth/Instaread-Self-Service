
import type { WebsiteAnalysisOutput } from "@/ai/flows/website-analysis";

export type PlayerType =
  | "default"
  | "shortdesign"
  | "scrubandwaves"
  | "scrub"
  | "old";

export type PlayerConfig = {
  playerType: PlayerType;
  color: string;
};

export type AnalysisResult = WebsiteAnalysisOutput | null;

export type Placement = {
  selector: string;
  position: "before" | "after";
  nth: number; // The 0-based index of the element if the selector matches multiple elements
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
