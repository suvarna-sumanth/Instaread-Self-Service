
'use client'

import React, { useState, useRef, useEffect } from 'react';
import type { PlayerConfig, Placement } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Info, Pointer, MousePointerClick } from 'lucide-react';
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
        // Stop when we reach the top of the document tree (or shadow root)
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
  const previewRef = useRef<HTMLDivElement>(null);
  const [stagedPlacement, setStagedPlacement] = useState<{ selector: string } | null>(null);
  const [effectiveHtml, setEffectiveHtml] = useState<string | null>(null);
  
  // Effect to process the raw HTML and inject our scripts/styles
  useEffect(() => {
    if (!cloneHtml) {
      setEffectiveHtml(null);
      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(cloneHtml, 'text/html');

      // Inject CSS to fade in the player, hiding the initial loading text.
      const styleElement = doc.createElement('style');
      styleElement.textContent = `
        #instaread-player-instance {
          opacity: 0;
          animation: fadeInPlayer 0.3s ease-in 0.5s forwards;
        }
        @keyframes fadeInPlayer {
          to { opacity: 1; }
        }
      `;
      doc.head.appendChild(styleElement);


      // Directly add the script tag for the player web component.
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
            try {
              if (url) {
                const urlObject = new URL(url);
                const domain = urlObject.hostname.replace(/^www\./, '').split('.')[0];
                publication = domain || 'xyz';
              }
            } catch (e) {
              publication = 'xyz';
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
      setEffectiveHtml(cloneHtml); // Fallback to raw clone on error
    }
  }, [cloneHtml, selectedPlacement, playerConfig, url]);

  // Effect to render HTML into Shadow DOM and attach event listeners
  useEffect(() => {
    const previewEl = previewRef.current;
    if (!previewEl || !effectiveHtml) return;

    // Ensure we have a shadow root, create if not
    if (!previewEl.shadowRoot) {
        previewEl.attachShadow({ mode: 'open' });
    }

    // Set the content
    previewEl.shadowRoot!.innerHTML = effectiveHtml;

    // Attach listeners
    let lastHovered: HTMLElement | null = null;
    let originalOutline: string | null = null;

    const handleMouseOver = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target && target !== lastHovered) {
            if (lastHovered) {
                lastHovered.style.outline = originalOutline || '';
            }
            lastHovered = target;
            originalOutline = target.style.outline;
            if (target.id !== 'instaread-widget-wrapper' && !target.closest('instaread-player')) {
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

    const handleClick = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        
        const target = e.target as HTMLElement;

        if (target && target.id !== 'instaread-widget-wrapper' && !target.closest('instaread-player')) {
            const selector = generateSelector(target);
            if (selector) {
                setStagedPlacement({ selector });
            }
        }
    };
    
    const shadow = previewEl.shadowRoot!;
    shadow.addEventListener('mouseover', handleMouseOver);
    shadow.addEventListener('mouseout', handleMouseOut);
    // Use capture phase for reliability with nested elements
    shadow.addEventListener('click', handleClick, true); 

    // Clean up listeners when component unmounts or HTML changes
    return () => {
        shadow.removeEventListener('mouseover', handleMouseOver);
        shadow.removeEventListener('mouseout', handleMouseOut);
        shadow.removeEventListener('click', handleClick, true);
    }
}, [effectiveHtml, onSelectPlacement, setStagedPlacement]);


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
            <Skeleton className="h-full w-full max-w-lg" />
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
    
    // Render into a div container that will host the Shadow DOM.
    // The key ensures React re-creates the element when HTML changes, clearing old state.
    return (
      <div 
        ref={previewRef}
        key={effectiveHtml}
        id="instaread-widget-wrapper"
        className="w-full h-full bg-white rounded-lg shadow-lg border"
      />
    );
  }

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
                  <CardTitle className="font-headline text-2xl">Live Preview & Placement</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                     <MousePointerClick className="h-4 w-4" /> Click an element in the preview to place the player. Resize browser to test responsiveness.
                  </CardDescription>
              </div>
               <div className="flex items-center gap-4">
                {selectedPlacement && <Button variant="outline" size="sm" onClick={handleClearPlacement}><Pointer className="mr-2 h-4 w-4"/>Clear Placement</Button>}
              </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col flex-grow p-6 pt-0">
           <div className="bg-muted/50 rounded-lg flex-grow overflow-auto p-4 flex items-start justify-center h-full">
              {renderPreviewContent()}
            </div>
        </CardContent>
      </Card>
    </>
  );
};

export default LivePreviewSection;
