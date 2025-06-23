'use client'

import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { PlayerConfig, Placement } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import { Monitor, Smartphone, Loader2, Info, Pointer, ArrowUp, ArrowDown } from 'lucide-react';
import AudioPlayer from '@/components/ui/audio-player';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';

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
  const [playerContainer, setPlayerContainer] = useState<HTMLElement | null>(null);
  
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const calculatePositions = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      
      const newPositions: Record<string, React.CSSProperties> = {};
      for (const selector of placementSuggestions) {
        try {
          const targetElement = doc.querySelector(selector) as HTMLElement;
          if (targetElement) {
            const targetRect = targetElement.getBoundingClientRect();
             if (targetRect.width > 20 && targetRect.height > 10 && targetRect.top >= 0) {
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

    const setupPlayerAndSuggestions = () => {
        const doc = iframe.contentDocument;
        if (!doc?.body) return;
        
        // 1. Reset previous state by finding and removing any existing player
        const existingPlayer = doc.querySelector('.audioleap-player-container');
        existingPlayer?.remove();
        setPlayerContainer(null);
        
        // 2. Inject a portal container for the player if a placement is selected
        if (selectedPlacement) {
            try {
                const targetEl = doc.querySelector(selectedPlacement.selector) as HTMLElement;
                if (targetEl) {
                    const portalRoot = doc.createElement('div');
                    portalRoot.className = 'audioleap-player-container';
                    
                    if (selectedPlacement.position === 'before') {
                        targetEl.parentNode?.insertBefore(portalRoot, targetEl);
                    } else {
                        targetEl.parentNode?.insertBefore(portalRoot, targetEl.nextSibling);
                    }
                    setPlayerContainer(portalRoot);
                }
            } catch (e) {
                console.error("Error placing player:", e);
                setPlayerContainer(null);
            }
        }
        
        // 3. (Re)calculate suggestion box positions after DOM change
        calculatePositions();
        setTimeout(calculatePositions, 50); // Recalculate after DOM settles
    }


    const onLoad = () => {
        const doc = iframe.contentDocument;
        if (doc) {
            const styleElement = doc.createElement('style');
            styleElement.textContent = Array.from(document.styleSheets)
                .map(ss => {
                    try {
                        return Array.from(ss.cssRules).map(rule => rule.cssText).join('\n');
                    } catch (e) { return ''; }
                })
                .join('\n');
            doc.head.appendChild(styleElement);
        }
        setupPlayerAndSuggestions();
    }
    
    if (iframe.contentDocument?.readyState === 'complete') {
      onLoad();
    } else {
      iframe.onload = onLoad;
    }

    const resizeObserver = new ResizeObserver(calculatePositions);
    if(iframe.contentDocument?.body) resizeObserver.observe(iframe.contentDocument.body);
    
    iframe.contentDocument?.addEventListener('scroll', calculatePositions);
    
    return () => {
        resizeObserver.disconnect();
        iframe.contentDocument?.removeEventListener('scroll', calculatePositions);
        if (iframe?.contentDocument) {
            const existingPlayer = iframe.contentDocument.querySelector('.audioleap-player-container');
            existingPlayer?.remove();
        }
        if (iframe) iframe.onload = null;
    }
  }, [cloneHtml, selectedPlacement, placementSuggestions]);

  const handleSuggestionClick = (selector: string) => {
    setActiveSuggestion(prev => (prev === selector ? null : selector));
  };
  
  const handlePlacementDecision = (position: 'before' | 'after') => {
      if (!activeSuggestion) return;
      onSelectPlacement({ selector: activeSuggestion, position });
      setActiveSuggestion(null);
  };

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
            
            <div className="absolute inset-0 z-20">
                {Object.entries(suggestionPositions).map(([selector, style]) => {
                    const isSelected = selectedPlacement?.selector === selector;
                    const isActive = activeSuggestion === selector;

                    return (
                        <div
                            key={selector}
                            style={{ position: 'absolute', ...style }}
                            className={cn(
                                "transition-all duration-300 cursor-pointer group",
                                "border-2 border-dashed border-accent hover:bg-accent/10",
                                { "bg-accent/20 border-solid": isActive || isSelected }
                            )}
                            onClick={() => handleSuggestionClick(selector)}
                        >
                            {isActive && (
                                <div
                                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full py-2 z-30 flex justify-center"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex items-center gap-1 rounded-full bg-background p-1 shadow-lg border">
                                       <Button variant="ghost" size="sm" className="h-8 px-3" onClick={() => handlePlacementDecision('before')}>
                                          <ArrowUp className="mr-2 h-4 w-4" /> Above
                                       </Button>
                                       <Separator orientation="vertical" className="h-4" />
                                       <Button variant="ghost" size="sm" className="h-8 px-3" onClick={() => handlePlacementDecision('after')}>
                                          <ArrowDown className="mr-2 h-4 w-4" /> Below
                                       </Button>
                                    </div>
                                </div>
                            )}
                             
                             {!(isActive || isSelected) && (
                                <div className="absolute inset-0 flex items-center justify-center bg-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                    <span className="text-accent font-semibold text-sm bg-background/80 px-2 py-1 rounded-md">Click to select area</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    )
  }

  const handleClear = () => {
    onSelectPlacement(null);
    setActiveSuggestion(null);
  }

  return (
    <>
      <Card className="shadow-md relative">
        <CardHeader>
          <div className="flex justify-between items-start">
              <div>
                  <CardTitle className="font-headline text-2xl">3. Live Preview & Placement</CardTitle>
                  <CardDescription>
                      Visually place the player on the website clone. Click an orange box to move the player.
                  </CardDescription>
              </div>
              {url && <Button variant="outline" size="sm" onClick={handleClear}><Pointer className="mr-2 h-4 w-4"/>Clear Placement</Button>}
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
      {playerContainer && ReactDOM.createPortal(
        <div className="p-2">
          <AudioPlayer config={playerConfig} />
        </div>,
        playerContainer
      )}
    </>
  );
};

export default LivePreviewSection;
