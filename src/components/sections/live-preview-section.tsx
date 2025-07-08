
'use client'

import React, { useState, useRef, useEffect } from 'react';
import type { PlayerConfig, Placement } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Info, Pointer, MousePointerClick, Save } from 'lucide-react';
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
  onSaveDemo: () => void;
  isSaving: boolean;
};

const LivePreviewSection = (props: LivePreviewSectionProps) => {
  const { url, cloneHtml, isLoading, statusText, selectedPlacement, onSelectPlacement, playerConfig, onSaveDemo, isSaving } = props;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [stagedPlacement, setStagedPlacement] = useState<{ selector: string } | null>(null);
  const [effectiveHtml, setEffectiveHtml] = useState<string | null>(null);

  // This function will be stringified and injected into the iframe to handle interactions.
  const generateSelector = (el: Element): string => {
    if (!el || !(el instanceof Element)) {
        return '';
    }
    const path: string[] = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
        let selector = el.nodeName.toLowerCase();
        if (el.id) {
            const escapedId = el.id.replace(/([^\w\d_-]+)/g, '\\$1');
            selector += `#${escapedId}`;
            path.unshift(selector);
            break;
        } else {
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
  
  // This effect listens for messages (clicks) from the iframe
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'placement-click') {
            const selector = event.data.selector;
            if (selector) {
                setStagedPlacement({ selector });
            }
        }
    };
    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [setStagedPlacement]);


  // Effect to process the raw HTML and inject our scripts/styles for the iframe
  useEffect(() => {
    if (!cloneHtml) {
      setEffectiveHtml(null);
      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(cloneHtml, 'text/html');

      // Explicitly remove the unwanted widget.
      const unwantedWidget = doc.getElementById('elevenlabs-audionative-widget');
      if (unwantedWidget) {
        unwantedWidget.remove();
      }
      
      const { playerType, color } = playerConfig;

      // Create a style element for our overrides
      const styleEl = doc.createElement('style');
      let styleContent = `
          /* Initially hide the player to prevent seeing "loading" text */
          instaread-player {
              opacity: 0;
              transition: opacity 0.5s ease-in-out;
          }
      `;
      // Add specific override for mobile height on certain player types
      if (playerType === 'newdesign' || playerType === 'shortdesign') {
          styleContent += `
              @media (max-width: 1346px) {
                  .instaread-audio-player {
                      height: 224px !important;
                  }
              }
          `;
      }
      styleEl.textContent = styleContent;
      doc.head.appendChild(styleEl);

      if (selectedPlacement) {
        // Inject the player script ONLY when a placement is selected
        const playerScriptElement = doc.createElement('script');
        playerScriptElement.type = 'module';
        playerScriptElement.setAttribute('crossorigin', '');
        playerScriptElement.src = PLAYER_SCRIPT_URL;
        doc.head.appendChild(playerScriptElement);

        const targetEl = doc.querySelector(selectedPlacement.selector);

        if (targetEl) {
          let publication = 'xyz';
          if (process.env.NODE_ENV !== 'development') {
            try {
              if (url) {
                const urlObject = new URL(url);
                publication = urlObject.hostname.replace(/^www\./, '').split('.')[0] || 'xyz';
              }
            } catch (e) {
                console.warn(`Invalid URL provided for publication name: ${url}`);
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
        }
      }
      
      // Inject the interaction script for click-to-place
      const interactionScriptEl = doc.createElement('script');
      interactionScriptEl.textContent = `
        (function() {
          const generateSelector = ${generateSelector.toString()};
          let lastHovered = null;
          let originalOutline = null;

          /* Logic to show fade-in player after a short delay */
          const instareadPlayer = document.querySelector('instaread-player');
          if (instareadPlayer) {
              setTimeout(() => {
                  instareadPlayer.style.opacity = '1';
              }, 500);
          }

          document.addEventListener('mouseover', (e) => {
              const target = e.target;
              if (target && target !== lastHovered) {
                  if (lastHovered) {
                      lastHovered.style.outline = originalOutline || '';
                  }
                  lastHovered = target;
                  originalOutline = target.style.outline;
                  if (!target.closest('instaread-player')) {
                       target.style.outline = '2px dashed #F59E0B'; // accent color
                  }
              }
          });

          document.addEventListener('mouseout', (e) => {
              if (lastHovered) {
                  lastHovered.style.outline = originalOutline || '';
                  lastHovered = null;
                  originalOutline = null;
              }
          });
          
          document.addEventListener('click', (e) => {
            if (e.target && !e.target.closest('instaread-player')) {
              e.preventDefault();
              e.stopPropagation();
              const selector = generateSelector(e.target);
              window.parent.postMessage({ type: 'placement-click', selector: selector }, '*');
            }
          }, true);
        })();
      `;
      doc.body.appendChild(interactionScriptEl);

      const finalHtml = `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
      setEffectiveHtml(finalHtml);

    } catch (e) {
      console.error("[LivePreview] Error parsing or modifying HTML:", e);
      setEffectiveHtml(cloneHtml); // Fallback to raw clone on error
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
            <Skeleton className="h-full w-full" />
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
        id="outer_iframe"
        ref={iframeRef}
        srcDoc={effectiveHtml || ''}
        className="w-full h-full bg-white rounded-lg shadow-lg border"
        sandbox="allow-scripts allow-same-origin allow-forms"
        title="Live Preview"
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
      
      <Card className="shadow-md relative flex flex-col h-[80vh]">
        <CardHeader>
          <div className="flex justify-between items-start">
              <div>
                  <CardTitle className="font-headline text-2xl">Live Preview &amp; Placement</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <MousePointerClick className="h-4 w-4" /> Click an element in the preview to place the player. Resize your browser to test responsiveness.
                  </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                {selectedPlacement && <Button variant="outline" size="sm" onClick={handleClearPlacement}><Pointer className="mr-2 h-4 w-4"/>Clear Placement</Button>}
                <Button onClick={onSaveDemo} disabled={!url || !selectedPlacement || isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save &amp; Share
                </Button>
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
}

export default LivePreviewSection;
