
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

// Sub-component for placement controls to keep the main render clean
const PlacementControl = ({ style, onPlace }: { style: React.CSSProperties; onPlace: (position: 'before' | 'after') => void }) => {
    return (
        <div
            style={style}
            // Add pointer-events-auto here so the controls are clickable
            className="absolute z-40 flex items-center gap-1 rounded-full bg-background p-1 shadow-lg border pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
        >
            <Button variant="ghost" size="sm" className="h-8 px-3" onClick={() => onPlace('before')}>
                <ArrowUp className="mr-2 h-4 w-4" /> Above
            </Button>
            <Separator orientation="vertical" className="h-4" />
            <Button variant="ghost" size="sm" className="h-8 px-3" onClick={() => onPlace('after')}>
                <ArrowDown className="mr-2 h-4 w-4" /> Below
            </Button>
        </div>
    );
};


const LivePreviewSection = (props: LivePreviewSectionProps) => {
  const { url, cloneHtml, isLoading, placementSuggestions, selectedPlacement, onSelectPlacement, playerConfig } = props;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [suggestionPositions, setSuggestionPositions] = useState<Record<string, DOMRect>>({});
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);
  const [playerContainer, setPlayerContainer] = useState<HTMLElement | null>(null);

  // Effect to calculate suggestion positions when iframe content or suggestions change
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    
    const calculatePositions = () => {
      const doc = iframe?.contentDocument;
      if (!doc) return;

      const newPositions: Record<string, DOMRect> = {};
      for (const selector of placementSuggestions) {
        try {
          const targetElement = doc.querySelector(selector) as HTMLElement;
          if (targetElement) {
            const targetRect = targetElement.getBoundingClientRect();
            // Filter out very small or off-screen elements
            if (targetRect.width > 20 && targetRect.height > 10 && targetRect.top >= 0 && targetRect.top < doc.documentElement.clientHeight) {
              newPositions[selector] = targetRect;
            }
          }
        } catch (e) {
          console.error(`Invalid selector: ${selector}`, e);
        }
      }
      setSuggestionPositions(newPositions);
    };

    const onLoad = () => {
        const doc = iframe.contentDocument;
        if (doc) { // Inject host styles into iframe for consistency
            const styleElement = doc.createElement('style');
            styleElement.textContent = Array.from(document.styleSheets)
                .map(ss => {
                    try {
                        return Array.from(ss.cssRules).map(rule => rule.cssText).join('\n');
                    } catch (e) { return ''; }
                })
                .join('\n');
            doc.head.appendChild(styleElement);
            doc.body.style.position = 'relative'; // Ensure body is a positioning context
        }
        calculatePositions();
        // Also listen for scrolls inside the iframe to recalculate
        doc?.addEventListener('scroll', calculatePositions);
    }
    
    if (iframe.contentDocument?.readyState === 'complete') {
      onLoad();
    } else {
      iframe.onload = onLoad;
    }

    const resizeObserver = new ResizeObserver(calculatePositions);
    if(iframe.contentDocument?.body) resizeObserver.observe(iframe.contentDocument.body);
    
    return () => {
        resizeObserver.disconnect();
        iframe.contentDocument?.removeEventListener('scroll', calculatePositions);
        if (iframe) iframe.onload = null;
    }
  }, [cloneHtml, placementSuggestions]);

  // Effect to place the player in the DOM when selectedPlacement changes
  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc?.body) return;

    // 1. Clean up old player instance
    const existingPlayer = doc.querySelector('.audioleap-player-container');
    existingPlayer?.remove();
    setPlayerContainer(null);

    // 2. If a placement is selected, create and inject the new player container
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
                // This state update will trigger a re-render and activate the portal
                setPlayerContainer(portalRoot);
            }
        } catch (e) {
            console.error("Error placing player:", e);
            setPlayerContainer(null);
        }
    }
  }, [selectedPlacement]);

  const handleSuggestionClick = (selector: string) => {
    setActiveSuggestion(prev => (prev === selector ? null : selector));
  };
  
  const handlePlacementDecision = (position: 'before' | 'after') => {
      if (!activeSuggestion) return;
      onSelectPlacement({ selector: activeSuggestion, position });
      setActiveSuggestion(null);
  };

  const getControlStyle = (targetRect: DOMRect): React.CSSProperties => {
    if (!iframeRef.current?.contentDocument) return {};
    const doc = iframeRef.current.contentDocument;
    return {
      position: 'absolute',
      top: `${targetRect.top + doc.documentElement.scrollTop - 45}px`,
      left: `${targetRect.left + doc.documentElement.scrollLeft + targetRect.width / 2}px`,
      transform: 'translateX(-50%)',
    }
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
            {playerContainer && ReactDOM.createPortal(
                <div className="p-2">
                    <AudioPlayer config={playerConfig} />
                </div>,
                playerContainer
            )}
            {/* 
              This overlay holds all interactive elements.
              `pointer-events-none` allows scrolling and interaction with the iframe below.
              Individual children (suggestion boxes, controls) will have `pointer-events-auto` to become clickable.
            */}
            <div className="absolute inset-0 z-30 pointer-events-none">
                {activeSuggestion && suggestionPositions[activeSuggestion] && (
                    <PlacementControl
                        style={getControlStyle(suggestionPositions[activeSuggestion])}
                        onPlace={handlePlacementDecision}
                    />
                )}
                {Object.entries(suggestionPositions).map(([selector, rect]) => {
                    const isSelected = selectedPlacement?.selector === selector;
                    const isActive = activeSuggestion === selector;
                    const doc = iframeRef.current?.contentDocument;

                    if (!doc) return null;

                    const style: React.CSSProperties = {
                        position: 'absolute',
                        top: `${rect.top + doc.documentElement.scrollTop}px`,
                        left: `${rect.left + doc.documentElement.scrollLeft}px`,
                        width: `${rect.width}px`,
                        height: `${rect.height}px`,
                    };

                    return (
                        <div
                            key={selector}
                            style={style}
                            // Add pointer-events-auto to make this div clickable
                            className={cn(
                                "pointer-events-auto cursor-pointer border-2 border-dashed border-accent hover:bg-accent/10",
                                { "bg-accent/20 border-solid": isActive, "border-primary border-solid": isSelected }
                            )}
                            onClick={() => handleSuggestionClick(selector)}
                        >
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
                      Click an orange box to select a location and place the player.
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
    </>
  );
};

export default LivePreviewSection;
