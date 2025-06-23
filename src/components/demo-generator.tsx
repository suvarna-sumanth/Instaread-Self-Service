'use client';

import { useState } from 'react';
import type { PlayerConfig, AnalysisResult } from '@/types';
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
  const [selectedPlacement, setSelectedPlacement] = useState<string | null>(null);

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
    
    try {
      // We now always generate the clone first.
      const html = await getVisualClone(newUrl);
      setCloneHtml(html);

      // Then, run analysis and placement suggestions in parallel.
      const [analysisResult, suggestions] = await Promise.all([
        analyzeWebsite(newUrl),
        getPlacementSuggestions(html),
      ]);
      
      setAnalysis(analysisResult);
      setPlacementSuggestions(suggestions.suggestedLocations);

      toast({
        title: "Analysis & Preview Ready",
        description: "Website preview is generated and ready for placement.",
      });

    } catch (error) {
       toast({
        title: "Preview Generation Failed",
        description: `Could not generate a preview for the website. It may be protected. ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 p-4 md:p-8">
        <aside className="lg:col-span-2 flex flex-col gap-8">
          <WebsiteAnalysisSection onAnalyze={handleAnalyze} analysis={analysis} isLoading={isLoading} />
          <PlayerConfigSection config={playerConfig} setConfig={setPlayerConfig} />
          <IntegrationCodeSection playerConfig={playerConfig} placementSelector={selectedPlacement} websiteUrl={url} />
        </aside>
        <main className="lg:col-span-3 lg:sticky top-8 self-start">
          <LivePreviewSection
            url={url}
            cloneHtml={cloneHtml}
            isLoading={isLoading}
            placementSuggestions={placementSuggestions}
            selectedPlacement={selectedPlacement}
            onSelectPlacement={setSelectedPlacement}
            playerConfig={playerConfig}
          />
        </main>
      </div>
    </div>
  );
}
