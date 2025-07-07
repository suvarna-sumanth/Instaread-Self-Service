
'use client'

import React, { useState, useRef, useEffect } from 'react';
import type { PlayerConfig, Placement } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import { Monitor, Smartphone, Loader2, Info, Pointer, MousePointerClick } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { PLAYER_SCRIPT_URL } from '@/lib/constants';

type LivePreviewSectionProps = {
  url: string;
  cloneHtml: string | null;
  isLoading: boolean;
  statusText: string;
  selectedPlacement: Placement;
  onSelectPlacement: (placement: Placement) => void;
  playerConfig: PlayerConfig;
};

// Helper function to generate a stable CSS selector for an element.
const generateSelector = (el: Element): string => {
    // The `while` loop's `nodeType` check is more robust than `instanceof` across iframe boundaries.
    const path: string[] = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
        let selector = el.nodeName.toLowerCase();
        if (el.id) {
            // IDs are supposed to be unique, so we can stop here.
            // Escape special characters for use in querySelector
            const escapedId = el.id.replace(/([^\w\d_-]+)/g, '\\$1');
            selector += `#${escapedId}`;
            path.unshift(selector);
            break;
        } else {
            // Find the element's position among its siblings of the same type
            let sib: Element | null = el;
            let nth = 1;
            while ((sib = sib.previousElementSibling)) {
                if (sib.nodeName.toLowerCase() === selector) {
                    nth++;
                }
            }
            if (nth !== 1) {
                selector += `:nth-of-type(${nth})`;
            }
        }
        path.unshift(selector);
        if (el.parentElement) {
           el = el.parentElement;
        } else {
           break;
        }
    }
    return path.join(' > ');
};


const LivePreviewSection = (props: LivePreviewSectionProps) => {
  const { url, cloneHtml, isLoading, statusText, selectedPlacement, onSelectPlacement, playerConfig } = props;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [stagedPlacement, setStagedPlacement] = useState<{ selector: string } | null>(null);
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop');
  const [effectiveHtml, setEffectiveHtml] = useState<string | null>(null);
  
  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    const doc = iframe.contentWindow.document;
    if (!doc?.body) return;

    let lastHovered: HTMLElement | null = null;
    let originalOutline: string | null = null;

    const handleMouseOver = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target && target !== lastHovered) {
            if (lastHovered) {
                lastHovered.style.outline = originalOutline || '';
            }
            lastHovered = target;
            originalOutline = target.style.outline;
            if (!target.closest('instaread-player')) {
                target.style.outline = '2px dashed hsl(var(--accent))';
            }
        }
    };

    const handleMouseOut = () => {
        if (lastHovered) {
            lastHovered.style.outline = originalOutline || '';
            lastHovered = null;
            originalOutline = null;
        }
    };

    const handleClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const doc = iframeRef.current?.contentWindow?.document;
        if (!doc) return;
        
        const clickedEl = doc.elementFromPoint(e.clientX, e.clientY);

        if (clickedEl && !clickedEl.closest('instaread-player')) {
            const selector = generateSelector(clickedEl);
            if (selector) {
                setStagedPlacement({ selector });
            }
        }
    };
    
    doc.body.addEventListener('mouseover', handleMouseOver);
    doc.body.addEventListener('mouseout', handleMouseOut);
    doc.body.addEventListener('click', handleClick);
  };

  useEffect(() => {
    if (!cloneHtml) {
      setEffectiveHtml(null);
      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(cloneHtml, 'text/html');

      // The script must be injected into the head to be loaded
      const scriptElement = doc.createElement('script');
      scriptElement.type = 'module';
      scriptElement.setAttribute('crossorigin', '');
      scriptElement.src = PLAYER_SCRIPT_URL;
      doc.head.appendChild(scriptElement);

      if (selectedPlacement) {
        const targetEl = doc.querySelector(selectedPlacement.selector);

        if (targetEl) {
          const { playerType, color } = playerConfig;
          
          let publication = 'xyz';
          if (process.env.NODE_ENV === 'production' && url) {
            try {
              const urlObject = new URL(url);
              const domain = urlObject.hostname.replace(/^www\./, '').split('.')[0];
              publication = domain || 'xyz';
            } catch (e) {
              // Invalid URL, fallback to 'xyz'
              publication = 'xyz';
            }
          }
          
          const playerHtml = `<instaread-player
            id="instaread-player-instance"
            publication="${publication}"
            playertype="${playerType}"
            colortype="${color}"
          ></instaread-player>`;
          
          const playerFragment = doc.createRange().createContextualFragment(playerHtml);

          if (selectedPlacement.position === 'before') {
            targetEl.parentNode?.insertBefore(playerFragment, targetEl);
          } else {
            targetEl.parentNode?.insertBefore(playerFragment, targetEl.nextSibling);
          }

          (targetEl as HTMLElement).style.outline = '3px solid hsl(var(--primary))';
          (targetEl as HTMLElement).setAttribute('data-instaread-placement-highlight', 'true');
        }
      }
      
      const finalHtml = `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
      setEffectiveHtml(finalHtml);

    } catch (e) {
      console.error("[LivePreview] Error parsing or modifying HTML:", e);
      // Fallback to the original clone if parsing fails
      setEffectiveHtml(cloneHtml);
    }
  }, [cloneHtml, selectedPlacement, playerConfig, url]);


  const handleClearPlacement = () => {
    onSelectPlacement(null);
  };

  const handlePlacementChoice = (position: 'before' | 'after') => {
    if (stagedPlacement) {
        onSelectPlacement({ selector: stagedPlacement.selector, position });
        setStagedPlacement(null);
    }
  };

  const renderPreviewContent = () => {
    if (isLoading) {
      return (
          <div className="p-4 space-y-4 h-full w-full flex flex-col items-center justify-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p>{statusText || 'Analyzing and rendering preview...'}</p>
            </div>
            <Skeleton className="h-[400px] w-full max-w-lg" />
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

    if (!effectiveHtml && url && !isLoading) {
        return (
            <Alert variant="destructive" className="m-4">
                <AlertTitle>Preview Generation Failed</AlertTitle>
                <AlertDescription>We couldn't generate a visual clone for this website. It may be protected or unreachable. Please try a different URL.</AlertDescription>
            </Alert>
        );
    }
    
    return (
        <iframe
            ref={iframeRef}
            key={effectiveHtml} // Force re-render on HTML change
            title="Website Preview"
            srcDoc={effectiveHtml || ''}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            onLoad={handleIframeLoad}
        />
    )
  }

  const isMobile = view === 'mobile';
  const previewContainerClasses = cn(
    "bg-white rounded-lg overflow-hidden w-full relative", 
    isMobile ? "h-[640px] w-[360px] shadow-2xl border-[10px] border-black rounded-[40px]" : "h-full shadow-lg",
    "transition-all duration-300"
  );


  return (
    <>
        <Dialog open={!!stagedPlacement} onOpenChange={() => setStagedPlacement(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Player Placement</DialogTitle>
                    <DialogDescription>
                        Where would you like to place the audio player relative to the selected element?
                    </DialogDescription>
                </DialogHeader>
                 <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md break-all">
                   Selector: <code>{stagedPlacement?.selector}</code>
                 </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => handlePlacementChoice('before')}>
                        Place Before
                    </Button>
                    <Button onClick={() => handlePlacementChoice('after')}>
                        Place After
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      <Card className="shadow-md relative h-full flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-start">
              <div>
                  <CardTitle className="font-headline text-2xl">3. Live Preview & Placement</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                     <MousePointerClick className="h-4 w-4" /> Click an element in the preview to place the player.
                  </CardDescription>
              </div>
              {selectedPlacement && <Button variant="outline" size="sm" onClick={handleClearPlacement}><Pointer className="mr-2 h-4 w-4"/>Clear Placement</Button>}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col flex-grow p-6 pt-0">
          <Tabs defaultValue="desktop" className="w-full flex flex-col flex-grow" onValueChange={(v) => setView(v as 'desktop' | 'mobile')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="desktop"><Monitor className="mr-2 h-4 w-4"/>Desktop</TabsTrigger>
              <TabsTrigger value="mobile"><Smartphone className="mr-2 h-4 w-4"/>Mobile</TabsTrigger>
            </TabsList>
            <div className={cn(
              "bg-muted/50 rounded-lg p-4 mt-4 flex-grow",
              view === 'mobile' && "flex items-center justify-center"
            )}>
              <div className={previewContainerClasses}>
                {renderPreviewContent()}
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
};

export default LivePreviewSection;
