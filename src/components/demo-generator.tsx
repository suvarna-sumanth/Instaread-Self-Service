'use client';

import { useState } from 'react';
import type { PlayerConfig, AnalysisResult, Placement } from '@/types';
import Header from '@/components/layout/header';
import WebsiteAnalysisSection from '@/components/sections/website-analysis-section';
import PlayerConfigSection from '@/components/sections/player-config-section';
import IntegrationCodeSection from '@/components/sections/integration-code-section';
import LivePreviewSection from '@/components/sections/live-preview-section';
import { getVisualClone, analyzeWebsite } from '@/lib/actions';
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
  const [statusText, setStatusText] = useState('');
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
    setStatusText('Starting analysis...');
    setAnalysis(null);
    setCloneHtml(null);
    setSelectedPlacement(null);
    setUrl(newUrl);

    try {
        setStatusText('Generating visual preview...');
        const html = await getVisualClone(newUrl);
        setCloneHtml(html);

        setStatusText('Analyzing website design...');
        const analysisResult = await analyzeWebsite(newUrl);
        setAnalysis(analysisResult);
        
        toast({
            title: "Analysis Complete",
            description: "Click an element in the live preview to place the player.",
        });

    } catch (error) {
       console.error("[DemoGenerator] Analysis failed:", error);
       const description = error instanceof Error ? error.message : "An unexpected error occurred.";
       toast({
        title: "Analysis Failed",
        description: `Could not complete the process. ${description}`,
        variant: "destructive",
      });
    } finally {
        setIsLoading(false);
        setStatusText('');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="flex flex-col lg:flex-row gap-8 p-4 md:p-8">
        <aside className="lg:w-2/5 xl:w-1/3 flex flex-col gap-8">
          <WebsiteAnalysisSection 
            url={url}
            onAnalyze={handleAnalyze} 
            analysis={analysis} 
            isLoading={isLoading} 
            statusText={statusText}
          />
          <PlayerConfigSection config={playerConfig} setConfig={setPlayerConfig} />
          <IntegrationCodeSection playerConfig={playerConfig} selectedPlacement={selectedPlacement} websiteUrl={url} />
        </aside>
        <main className="lg:w-3/5 xl:w-2/3">
          <LivePreviewSection
            url={url}
            cloneHtml={cloneHtml}
            isLoading={isLoading}
            statusText={statusText}
            selectedPlacement={selectedPlacement}
            onSelectPlacement={setSelectedPlacement}
            playerConfig={playerConfig}
          />
        </main>
      </div>
    </div>
  );
}
