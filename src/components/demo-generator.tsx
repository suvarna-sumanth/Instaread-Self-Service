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
  const [iframeError, setIframeError] = useState(false);
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
    setIframeError(false);
    setSelectedPlacement(null);
    setPlacementSuggestions([]);
    
    try {
      const analysisResult = await analyzeWebsite(newUrl);
      setAnalysis(analysisResult);
      toast({
        title: "Analysis Complete",
        description: "Website styles and tech stack identified.",
      });
    } catch (error) {
       toast({
        title: "Analysis Failed",
        description: `Could not analyze the website. Attempting to load preview directly. ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleIframeError = async () => {
    setIframeError(true);
    setIsLoading(true);
    toast({
        title: "Iframe Blocked",
        description: "Attempting to generate a visual clone as a fallback.",
    });
    try {
        const html = await getVisualClone(url);
        setCloneHtml(html);
        const suggestions = await getPlacementSuggestions(html);
        setPlacementSuggestions(suggestions.suggestedLocations);
    } catch (error) {
        toast({
            title: "Automatic Clone Failed",
            description: `We couldn't automatically generate a preview for this site. It may be protected. ${error instanceof Error ? error.message : ''}`,
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
            onIframeError={handleIframeError}
            iframeError={iframeError}
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
