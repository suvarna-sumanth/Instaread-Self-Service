'use client';

import { useState } from 'react';
import type { PlayerConfig, AnalysisResult, Placement } from '@/types';
import Header from '@/components/layout/header';
import WebsiteAnalysisSection from '@/components/sections/website-analysis-section';
import PlayerConfigSection from '@/components/sections/player-config-section';
import IntegrationCodeSection from '@/components/sections/integration-code-section';
import LivePreviewSection from '@/components/sections/live-preview-section';
import { getVisualClone, getPlacementSuggestions, analyzeWebsite } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";

export default function DemoGenerator() {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult>(null);
  const [playerConfig, setPlayerConfig] = useState<PlayerConfig>({
    design: 'A',
    showAds: true,
    enableMetrics: true,
    audioFile: null,
    audioFileName: 'sample-track.mp3'
  });
  const [cloneHtml, setCloneHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [placementSuggestions, setPlacementSuggestions] = useState<string[]>([]);
  const [selectedPlacement, setSelectedPlacement] = useState<Placement>(null);

  const handleAnalyze = async (newUrl: string) => {
    if (!newUrl) {
        toast({
            title: "URL Required",
            description: "Please enter a website URL to analyze.",
            variant: "destructive",
        })
        return;
    };
    setIsLoading(true);
    setAnalysis(null);
    setUrl(newUrl);
    setCloneHtml(null);
    setSelectedPlacement(null);
    setPlacementSuggestions([]);
    
    console.log(`[DemoGenerator] Starting analysis for URL: ${newUrl}`);
    try {
      console.log("[DemoGenerator] Getting visual clone...");
      const html = await getVisualClone(newUrl);
      setCloneHtml(html);
      console.log("[DemoGenerator] Visual clone received.");

      const [analysisResult, suggestions] = await Promise.all([
        analyzeWebsite(newUrl),
        getPlacementSuggestions(html),
      ]);
      
      console.log("[DemoGenerator] Analysis and suggestions received.");
      console.log("[DemoGenerator] Placement suggestions:", suggestions);

      setAnalysis(analysisResult);
      setPlacementSuggestions(suggestions.suggestedLocations);
      if (suggestions.suggestedLocations.length > 0) {
        console.log(`[DemoGenerator] Setting selected placement to: ${suggestions.suggestedLocations[0]}`);
        setSelectedPlacement({ selector: suggestions.suggestedLocations[0], position: 'before' });
      } else {
        console.log("[DemoGenerator] No suggestions found, falling back to 'body'.");
        setSelectedPlacement({ selector: 'body', position: 'before' });
      }

      toast({
        title: "Analysis Complete",
        description: "Preview generated with the player automatically placed.",
      });

    } catch (error) {
       console.error("[DemoGenerator] Analysis failed:", error);
       const description = error instanceof Error ? error.message : "An unexpected error occurred.";
       toast({
        title: "Analysis Failed",
        description: `Could not generate a preview for the website. ${description}`,
        variant: "destructive",
      });
    } finally {
        console.log("[DemoGenerator] Analysis process finished.");
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="flex flex-col lg:flex-row gap-8 p-4 md:p-8">
        <aside className="lg:w-2/5 xl:w-1/3 flex flex-col gap-8">
          <WebsiteAnalysisSection onAnalyze={handleAnalyze} analysis={analysis} isLoading={isLoading} />
          <PlayerConfigSection config={playerConfig} setConfig={setPlayerConfig} />
          <IntegrationCodeSection playerConfig={playerConfig} selectedPlacement={selectedPlacement} websiteUrl={url} />
        </aside>
        <main className="lg:w-3/5 xl:w-2/3">
          <LivePreviewSection
            url={url}
            cloneHtml={cloneHtml}
            isLoading={isLoading}
            selectedPlacement={selectedPlacement}
            onSelectPlacement={setSelectedPlacement}
            playerConfig={playerConfig}
          />
        </main>
      </div>
    </div>
  );
}
