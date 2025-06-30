
'use client'

import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { PlayerConfig, Placement } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import { Monitor, Smartphone, Loader2, Info, Pointer } from 'lucide-react';
import AudioPlayer from '@/components/ui/audio-player';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '../ui/button';

type LivePreviewSectionProps = {
  url: string;
  cloneHtml: string | null;
  isLoading: boolean;
  selectedPlacement: Placement;
  onSelectPlacement: (placement: Placement) => void;
  playerConfig: PlayerConfig;
};

const LivePreviewSection = (props: LivePreviewSectionProps) => {
  const { url, cloneHtml, isLoading, selectedPlacement, onSelectPlacement, playerConfig } = props;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [playerContainer, setPlayerContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const setupPlayer = () => {
        const doc = iframe.contentDocument;
        if (!doc?.body) {
            return;
        }

        // Clean up any old player instance and highlights
        doc.querySelector('.audioleap-player-container')?.remove();
        doc.querySelectorAll('[data-audioleap-placement-highlight]').forEach(el => {
            (el as HTMLElement).style.outline = '';
            el.removeAttribute('data-audioleap-placement-highlight');
        });
        setPlayerContainer(null);

        if (selectedPlacement) {
            try {
                const targetEl = doc.querySelector(selectedPlacement.selector) as HTMLElement;
                if (targetEl) {
                    targetEl.style.outline = '3px solid hsl(var(--primary))';
                    targetEl.setAttribute('data-audioleap-placement-highlight', 'true');
                    
                    const portalRoot = doc.createElement('div');
                    portalRoot.className = 'audioleap-player-container';
                    if (selectedPlacement.position === 'before') {
                        targetEl.parentNode?.insertBefore(portalRoot, targetEl);
                    } else {
                        targetEl.parentNode?.insertBefore(portalRoot, targetEl.nextSibling);
                    }
                    setPlayerContainer(portalRoot);
                } else {
                    console.error(`[LivePreview] Could not find target element for selector: "${selectedPlacement.selector}"`);
                }
            } catch (e) {
                console.error("[LivePreview] Error placing player:", e);
                setPlayerContainer(null);
            }
        }
    };

    const onLoad = () => {
        setupPlayer();
    };
    
    iframe.addEventListener('load', onLoad);
    
    if (iframe.contentDocument?.readyState === 'complete') {
        onLoad();
    }

    return () => {
      if (iframe) {
        iframe.removeEventListener('load', onLoad);
      }
    };
  }, [cloneHtml, selectedPlacement]);


  const handleClearPlacement = () => {
    onSelectPlacement(null);
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
                <AlertDescription>We couldn't generate a visual clone for this website. It may be protected or unreachable. Please try a different URL.</AlertDescription>
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

  return (
    <>
      <Card className="shadow-md relative">
        <CardHeader>
          <div className="flex justify-between items-start">
              <div>
                  <CardTitle className="font-headline text-2xl">3. Live Preview & Placement</CardTitle>
                  <CardDescription>
                      The player is automatically placed in a suggested location.
                  </CardDescription>
              </div>
              {url && <Button variant="outline" size="sm" onClick={handleClearPlacement}><Pointer className="mr-2 h-4 w-4"/>Clear Placement</Button>}
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
