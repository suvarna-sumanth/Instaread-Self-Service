
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  const [placementCandidate, setPlacementCandidate] = useState<string | null>(null);
  const [playerContainer, setPlayerContainer] = useState<HTMLElement | null>(null);

  // This single effect manages all interactions with the iframe's content.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // We keep track of listeners to clean them up properly.
    const listeners: { element: HTMLElement; type: string; listener: EventListener }[] = [];

    const handleInteractionSetup = () => {
      const doc = iframe.contentDocument;
      if (!doc?.body) return;

      // --- Cleanup Phase ---
      // 1. Remove any old player instance.
      doc.querySelector('.audioleap-player-container')?.remove();
      setPlayerContainer(null);
      // 2. Remove old suggestion highlights and listeners.
      listeners.forEach(({ element, type, listener }) => element.removeEventListener(type, listener));
      listeners.length = 0;
      doc.querySelectorAll('[data-audioleap-suggestion]').forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.outline = '';
        htmlEl.style.cursor = '';
        htmlEl.removeAttribute('data-audioleap-suggestion');
      });

      // --- Setup Phase ---
      // 1. Add new suggestion highlights and listeners.
      placementSuggestions.forEach(selector => {
        try {
          const element = doc.querySelector(selector) as HTMLElement;
          if (element) {
            element.style.outline = '2px dashed hsl(var(--accent))';
            element.style.cursor = 'pointer';
            element.setAttribute('data-audioleap-suggestion', 'true');
            
            const clickListener = (e: Event) => {
              e.preventDefault();
              e.stopPropagation();
              handleSuggestionClick(selector);
            };

            element.addEventListener('click', clickListener);
            listeners.push({ element, type: 'click', listener: clickListener });
          }
        } catch (e) {
          // Ignore invalid selectors
        }
      });

      // 2. Place the player if a placement is selected.
      if (selectedPlacement) {
        try {
          const targetEl = doc.querySelector(selectedPlacement.selector) as HTMLElement;
          if (targetEl) {
            // Highlight the selected element
            targetEl.style.outline = '3px solid hsl(var(--primary))';
            
            // Create and inject the portal for the React player component.
            const portalRoot = doc.createElement('div');
            portalRoot.className = 'audioleap-player-container';
            if (selectedPlacement.position === 'before') {
              targetEl.parentNode?.insertBefore(portalRoot, targetEl);
            } else {
              targetEl.parentNode?.insertBefore(portalRoot, targetEl.nextSibling);
            }
            // This state update will trigger a re-render and activate the portal.
            setPlayerContainer(portalRoot);
          }
        } catch (e) {
          console.error("[LivePreview] Error placing player:", e);
          setPlayerContainer(null);
        }
      }
    };

    const onLoad = () => {
        handleInteractionSetup();
        // Re-run setup on internal iframe scroll to reposition if needed (rare)
        iframe.contentDocument?.addEventListener('scroll', handleInteractionSetup);
    }
    
    if (iframe.contentDocument?.readyState === 'complete') {
      onLoad();
    } else {
      iframe.addEventListener('load', onLoad);
    }

    return () => {
      if (iframe) {
        iframe.removeEventListener('load', onLoad);
        iframe.contentDocument?.removeEventListener('scroll', handleInteractionSetup);
        listeners.forEach(({ element, type, listener }) => element.removeEventListener(type, listener));
      }
    };
  }, [cloneHtml, placementSuggestions, selectedPlacement]);


  const handleSuggestionClick = (selector: string) => {
    setPlacementCandidate(selector);
  };
  
  const handlePlacementConfirm = (position: 'before' | 'after') => {
      if (!placementCandidate) return;
      onSelectPlacement({ selector: placementCandidate, position });
      setPlacementCandidate(null);
  };

  const handlePlacementCancel = () => {
    setPlacementCandidate(null);
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
        </div>
    )
  }

  const handleClear = () => {
    onSelectPlacement(null);
  }

  return (
    <>
      <Card className="shadow-md relative">
        <CardHeader>
          <div className="flex justify-between items-start">
              <div>
                  <CardTitle className="font-headline text-2xl">3. Live Preview & Placement</CardTitle>
                  <CardDescription>
                      Click a dashed box in the preview to choose a location for the player.
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
      
      <AlertDialog open={!!placementCandidate} onOpenChange={(isOpen) => !isOpen && handlePlacementCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Placement</AlertDialogTitle>
            <AlertDialogDescription>
              Where would you like to place the audio player relative to the selected element?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handlePlacementCancel}>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => handlePlacementConfirm('before')}>
              <ArrowUp className="mr-2 h-4 w-4" /> Place Above
            </Button>
            <Button onClick={() => handlePlacementConfirm('after')}>
              <ArrowDown className="mr-2 h-4 w-4" /> Place Below
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LivePreviewSection;
