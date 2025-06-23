'use client'

import React, { useState, useRef, useEffect } from 'react';
import type { PlayerConfig, Placement } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import { Monitor, Smartphone, Loader2, Info, Pointer, ArrowUp, ArrowDown } from 'lucide-react';
import AudioPlayer from '@/components/ui/audio-player';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '../ui/button';

type LivePreviewSectionProps = {
  url: string;
  cloneHtml: string | null;
  isLoading: boolean;
  placementSuggestions: string[];
  selectedPlacement: Placement;
  onSelectPlacement: (placement: Placement) => void;
  playerConfig: PlayerConfig;
};

const LivePreviewSection = (props: LivePreviewSectionProps) => {
  const { url, cloneHtml, isLoading, placementSuggestions, selectedPlacement, onSelectPlacement, playerConfig } = props;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [suggestionPositions, setSuggestionPositions] = useState<Record<string, React.CSSProperties>>({});
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);
  
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !cloneHtml || placementSuggestions.length === 0) {
      setSuggestionPositions({});
      return;
    };

    const calculatePositions = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      
      const newPositions: Record<string, React.CSSProperties> = {};
      for (const selector of placementSuggestions) {
        try {
          const targetElement = doc.querySelector(selector) as HTMLElement;
          if (targetElement) {
              const targetRect = targetElement.getBoundingClientRect();
              if (targetRect.width > 20 && targetRect.height > 20) {
                newPositions[selector] = {
                    top: `${targetRect.top + doc.documentElement.scrollTop}px`,
                    left: `${targetRect.left + doc.documentElement.scrollLeft}px`,
                    width: `${targetRect.width}px`,
                    height: `${targetRect.height}px`,
                };
              }
          }
        } catch (e) {
            console.error(`Invalid selector: ${selector}`, e);
        }
      }
      setSuggestionPositions(newPositions);
    };

    const handleResize = () => setTimeout(calculatePositions, 50);
    const resizeObserver = new ResizeObserver(handleResize);
    if(iframe) resizeObserver.observe(iframe);
    
    const iframeDoc = iframe.contentDocument;
    iframeDoc?.addEventListener('scroll', handleResize);
    
    if (iframe.contentDocument?.readyState === 'complete') {
        calculatePositions();
    } else {
        iframe.onload = calculatePositions;
    }

    return () => {
        resizeObserver.disconnect();
        iframeDoc?.removeEventListener('scroll', handleResize);
        if (iframe) iframe.onload = null;
    }
  }, [cloneHtml, placementSuggestions]);
  
  const handlePlacementDecision = (selector: string, position: 'before' | 'after', e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSelectPlacement({ selector, position });
      setActiveSuggestion(null);
  };
  
  const handleSuggestionClick = (selector: string) => {
    // Toggle the active suggestion. If user clicks the same one, it closes.
    setActiveSuggestion(current => (current === selector ? null : selector));
    // If a final placement was already made, clear it when choosing a new spot.
    if (selectedPlacement) {
        onSelectPlacement(null);
    }
  }

  const renderPreviewContent = (isMobile: boolean) => {
    if (isLoading) {
      return (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p>Analyzing and rendering preview...</p>
            </div>
            <Skeleton className="h-[400px] w-full" />
          </div>
      );
    }
    
    if (!url) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Info className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">Live Preview</h3>
            <p className="text-muted-foreground">Enter a URL to start generating your demo.</p>
        </div>
      );
    }

    if (!cloneHtml) {
        return (
            <Alert variant="destructive" className="m-4">
                <AlertTitle>Preview Generation Failed</AlertTitle>
                <AlertDescription>We couldn't generate a visual clone for this website. It may be protected. Please try a different URL.</AlertDescription>
            </Alert>
        );
    }

    const previewContainerClasses = cn(
      "bg-white rounded-lg overflow-hidden w-full relative", 
      isMobile ? "h-[640px] w-[360px] shadow-2xl border-[10px] border-black rounded-[40px]" : "h-[600px] shadow-lg",
      "transition-all duration-300"
    );

    return (
        <div className={previewContainerClasses}>
            <iframe
                ref={iframeRef}
                title="Website Preview"
                srcDoc={cloneHtml}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
            />
            {/* This container sits on top of the iframe to hold all interactive overlays */}
            <div className="absolute inset-0 z-50 pointer-events-none">
                {Object.entries(suggestionPositions).map(([selector, style]) => (
                    <div
                        key={selector}
                        style={{ position: 'absolute', ...style}}
                        className={cn(
                            "group border-2 border-dashed border-accent transition-all duration-300",
                            "flex flex-col items-center justify-center p-2 gap-4 pointer-events-auto cursor-pointer",
                            activeSuggestion === selector ? "bg-accent/20 border-solid" : "hover:bg-accent/20"
                        )}
                        onClick={() => handleSuggestionClick(selector)}
                    >
                         {activeSuggestion === selector ? (
                            <div 
                                className='flex flex-col gap-2 rounded-lg bg-background/90 backdrop-blur-sm p-2 shadow-lg'
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Button variant="secondary" size="sm" onClick={(e) => handlePlacementDecision(selector, 'before', e)}>
                                    <ArrowUp className="mr-2 h-4 w-4" /> Place Above
                                </Button>
                                <Button variant="secondary" size="sm" onClick={(e) => handlePlacementDecision(selector, 'after', e)}>
                                    <ArrowDown className="mr-2 h-4 w-4" /> Place Below
                                </Button>
                            </div>
                        ) : selectedPlacement?.selector !== selector && (
                             <div className="pointer-events-none m-auto rounded-md bg-background/80 p-2 text-xs font-medium text-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                                Click to place player here
                            </div>
                        )}
                    </div>
                ))}

                {selectedPlacement && suggestionPositions[selectedPlacement.selector] && (
                    <div style={{
                        position: 'absolute',
                        width: suggestionPositions[selectedPlacement.selector].width,
                        left: suggestionPositions[selectedPlacement.selector].left,
                        top: selectedPlacement.position === 'before'
                            ? `calc(${suggestionPositions[selectedPlacement.selector].top} - 80px)` // Approx height of player
                            : `calc(${suggestionPositions[selectedPlacement.selector].top} + ${suggestionPositions[selectedPlacement.selector].height})`,
                        height: 'auto',
                        zIndex: 40, // Below the suggestion overlays
                        pointerEvents: 'none'
                        }}
                        className="transition-all duration-300"
                    >
                        <div style={{pointerEvents: 'auto'}} className="p-2">
                            <AudioPlayer config={playerConfig} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
  }

  return (
    <Card className="shadow-md relative">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline text-2xl">3. Live Preview & Placement</CardTitle>
                <CardDescription>
                    Visually place the player on the website clone.
                </CardDescription>
            </div>
            {url && <Button variant="outline" size="sm" onClick={() => { onSelectPlacement(null); setActiveSuggestion(null); }}><Pointer className="mr-2 h-4 w-4"/>Clear Placement</Button>}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="desktop" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="desktop"><Monitor className="mr-2 h-4 w-4"/>Desktop</TabsTrigger>
            <TabsTrigger value="mobile"><Smartphone className="mr-2 h-4 w-4"/>Mobile</TabsTrigger>
          </TabsList>
          <TabsContent value="desktop">
            <div className="bg-muted/50 rounded-lg p-4 mt-4 flex items-center justify-center">
                {renderPreviewContent(false)}
            </div>
          </TabsContent>
          <TabsContent value="mobile">
            <div className="bg-muted/50 rounded-lg p-4 mt-4 flex items-center justify-center">
                {renderPreviewContent(true)}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default LivePreviewSection;
