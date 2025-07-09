
'use client';

import { useState } from 'react';
import type { PlayerConfig, AnalysisResult, Placement } from '@/types';
import WebsiteAnalysisSection from '@/components/sections/website-analysis-section';
import PlayerConfigSection from '@/components/sections/player-config-section';
import IntegrationCodeSection from '@/components/sections/integration-code-section';
import LivePreviewSection from '@/components/sections/live-preview-section';
import { getVisualClone, analyzeWebsite, saveDemo } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, Link as LinkIcon } from 'lucide-react';

export default function DemoGenerator() {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult>(null);
  const [playerConfig, setPlayerConfig] = useState<PlayerConfig>({
    playerType: 'newdesign',
    color: '#3B82F6',
  });
  const [cloneHtml, setCloneHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [selectedPlacement, setSelectedPlacement] = useState<Placement>(null);

  const [shareableLink, setShareableLink] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
        
        if (analysisResult?.colors?.primary) {
          setPlayerConfig(prev => ({ ...prev, color: analysisResult.colors.primary }));
        }
        
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
  
  const handlePlacementSelect = (placement: Placement) => {
    setSelectedPlacement(placement);
  };

  const handleSaveDemo = async () => {
    if (!url || !selectedPlacement) {
        toast({
            title: "Configuration Incomplete",
            description: "Please analyze a URL and select a placement for the player before saving.",
            variant: "destructive",
        });
        return;
    }
    setIsSaving(true);
    try {
        const result = await saveDemo(url, playerConfig, selectedPlacement);
        if (result.success && result.demoId) {
            const link = `${window.location.origin}/demo/${result.demoId}`;
            setShareableLink(link);
        } else {
             toast({
                title: "Save Failed",
                description: result.message,
                variant: "destructive",
            });
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unexpected error occurred.";
        toast({
            title: "Save Failed",
            description: message,
            variant: "destructive",
        });
    } finally {
        setIsSaving(false);
    }
  };

  const copyLinkToClipboard = () => {
    if (shareableLink) {
        navigator.clipboard.writeText(shareableLink);
        toast({ title: "Link copied to clipboard!" });
    }
  }

  return (
    <>
    <Dialog open={!!shareableLink} onOpenChange={() => setShareableLink(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><LinkIcon /> Shareable Demo Link</DialogTitle>
                <DialogDescription>
                    Anyone with this link can view the generated demo.
                </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2">
                <Input value={shareableLink || ''} readOnly />
                <Button type="button" size="icon" onClick={copyLinkToClipboard}>
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
        </DialogContent>
    </Dialog>

    <div className="flex flex-col gap-8 p-4 md:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <WebsiteAnalysisSection 
            url={url}
            onAnalyze={handleAnalyze} 
            analysis={analysis} 
            isLoading={isLoading} 
            statusText={statusText}
          />
          <PlayerConfigSection 
            config={playerConfig} 
            setConfig={setPlayerConfig} 
            analysis={analysis}
          />
          <IntegrationCodeSection 
            playerConfig={playerConfig} 
            websiteUrl={url}
            selectedPlacement={selectedPlacement}
          />
      </div>
      <main className="min-h-[80vh]">
        <LivePreviewSection
          url={url}
          cloneHtml={cloneHtml}
          isLoading={isLoading}
          statusText={statusText}
          selectedPlacement={selectedPlacement}
          onSelectPlacement={handlePlacementSelect}
          playerConfig={playerConfig}
          onSaveDemo={handleSaveDemo}
          isSaving={isSaving}
        />
      </main>
    </div>
    </>
  );
}
