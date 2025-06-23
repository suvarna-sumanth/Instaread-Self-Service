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

// Add these imports for the new dialog
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';

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

  // New state for the manual HTML paste dialog
  const [isPasteHtmlDialogOpen, setIsPasteHtmlDialogOpen] = useState(false);
  const [manualHtml, setManualHtml] = useState('');

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
            description: `We couldn't fetch the site automatically. Please try pasting the HTML source.`,
            variant: "destructive",
        });
        // Open the manual paste dialog on failure
        setIsPasteHtmlDialogOpen(true);
    } finally {
        setIsLoading(false);
    }
  };

  const handleManualHtmlSubmit = async () => {
    if (!manualHtml) {
        toast({
            title: "HTML Required",
            description: "Please paste the HTML content before submitting.",
            variant: "destructive",
        });
        return;
    }
    setIsLoading(true);
    setIsPasteHtmlDialogOpen(false);
    setCloneHtml(manualHtml);
    try {
        const suggestions = await getPlacementSuggestions(manualHtml);
        setPlacementSuggestions(suggestions.suggestedLocations);
    } catch (error) {
        toast({
            title: "HTML Analysis Failed",
            description: `We couldn't analyze the provided HTML. ${error instanceof Error ? error.message : ''}`,
            variant: "destructive",
        });
        setCloneHtml(null);
    } finally {
        setIsLoading(false);
        setManualHtml('');
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

      <Dialog open={isPasteHtmlDialogOpen} onOpenChange={setIsPasteHtmlDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
                <DialogTitle>Automatic Fetch Failed</DialogTitle>
                <DialogDescription>
                    The target website is protected and cannot be fetched automatically. You can provide the HTML source code manually to generate the visual preview.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="manual-html" className="text-left">HTML Source Code</Label>
                     <p className='text-sm text-muted-foreground'>
                        In a new tab, go to the website, right-click on the page, select "View Page Source", copy all the text, and paste it here.
                    </p>
                    <Textarea
                        id="manual-html"
                        placeholder="<!DOCTYPE html>..."
                        className="h-64 font-mono text-xs"
                        value={manualHtml}
                        onChange={(e) => setManualHtml(e.target.value)}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsPasteHtmlDialogOpen(false)}>Cancel</Button>
                <Button type="button" onClick={handleManualHtmlSubmit}>Submit HTML</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </div>
  );
}
