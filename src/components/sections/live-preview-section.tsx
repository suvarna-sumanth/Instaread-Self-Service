"use client";

import React, { useState, useRef, useEffect } from "react";
import type { PlayerConfig, Placement } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Info,
  Pointer,
  MousePointerClick,
  Save,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { PLAYER_SCRIPT_URL } from "@/lib/constants";

type LivePreviewSectionProps = {
  url: string;
  cloneHtml: string | null;
  isLoading: boolean;
  statusText: string;
  selectedPlacement: Placement;
  onSelectPlacement: (placement: Placement, isFragile: boolean) => void;
  playerConfig: PlayerConfig;
  onSaveDemo: () => void;
  isSaving: boolean;
};

const LivePreviewSection = (props: LivePreviewSectionProps) => {
  const {
    url,
    cloneHtml,
    isLoading,
    statusText,
    selectedPlacement,
    onSelectPlacement,
    playerConfig,
    onSaveDemo,
    isSaving,
  } = props;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [stagedPlacement, setStagedPlacement] = useState<{
    selector: string;
    nth: number;
  } | null>(null);
  const [effectiveHtml, setEffectiveHtml] = useState<string | null>(null);
  const [isPlacementFragile, setIsPlacementFragile] = useState(false);

  // This function will be stringified and injected into the iframe to handle interactions.
  const generateSelector = (el: Element | null): string => {
    if (!el || !(el instanceof Element)) {
      return "";
    }

    const path: string[] = [];
    const keyClassNames = [
      /article/,
      /post/,
      /content/,
      /entry/,
      /main/,
      /body/,
      /story/,
      /wrapper/,
      /container/,
      /meat/,
      /news/,
    ];

    let currentEl: Element | null = el;
    while (currentEl && currentEl.nodeType === Node.ELEMENT_NODE) {
      let selector = currentEl.nodeName.toLowerCase();

      const hasNumericId = currentEl.id && /\d/.test(currentEl.id);

      // Prioritize stable, non-numeric IDs.
      if (currentEl.id && !hasNumericId) {
        selector = `#${currentEl.id.replace(/(:|\.|\[|\]|,|=|@)/g, "\\$1")}`;
        path.unshift(selector);
        break; // Found a strong anchor, we can stop.
      }

      const classList = Array.from(currentEl.classList);
      const significantClass = classList.find((cls) =>
        keyClassNames.some((regex) => regex.test(cls))
      );

      if (significantClass) {
        selector = `${currentEl.nodeName.toLowerCase()}.${significantClass.replace(
          /(:|\.|\[|\]|,|=|@)/g,
          "\\$1"
        )}`;
        path.unshift(selector);
      } else if (
        currentEl.parentElement &&
        currentEl.parentElement.children.length > 1
      ) {
        const siblings = Array.from(currentEl.parentElement.children);
        const sameTagSiblings = siblings.filter(
          (sibling) => sibling.nodeName === currentEl?.nodeName
        );
        if (sameTagSiblings.length > 1) {
          const index = sameTagSiblings.indexOf(currentEl) + 1;
          selector += `:nth-of-type(${index})`;
        }
        path.unshift(selector);
      } else {
        path.unshift(selector);
      }

      currentEl = currentEl.parentElement;
    }

    // Limit the depth of the selector to avoid being too specific.
    return path.slice(Math.max(path.length - 5, 0)).join(" > ");
  };

  const isSelectorFragile = (selector: string): boolean => {
    // Rule 1: Selector contains an ID with numbers, which is very likely to be dynamic.
    if (/#\S*\d/.test(selector)) {
      return true;
    }
    // Rule 2: Selector is too long or deeply nested
    if ((selector.match(/>/g) || []).length > 4) {
      return true;
    }
    // Rule 3: Selector relies on position, which can be brittle, and lacks a strong anchor
    if (selector.includes(":nth-of-type")) {
      if (
        !selector.includes("#") &&
        !selector.match(/\.(article|post|content|entry|main)/)
      ) {
        return true;
      }
    }
    // Rule 4: Selector lacks a stabilizing ID or a meaningful class name
    if (
      !selector.includes("#") &&
      !selector.match(
        /\.(article|post|content|entry|main|body|story|wrapper|container|news)/
      )
    ) {
      return true;
    }
    return false;
  };

  // This effect listens for messages (clicks) from the iframe
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "placement-click") {
        const { selector, nth } = event.data;
        if (selector) {
          setStagedPlacement({ selector, nth });
        }
      }
    };
    window.addEventListener("message", handleIframeMessage);
    return () => window.removeEventListener("message", handleIframeMessage);
  }, []);

  // Effect to process the raw HTML and inject our scripts/styles for the iframe
  useEffect(() => {
    if (!cloneHtml) {
      setEffectiveHtml(null);
      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(cloneHtml, "text/html");

      // Explicitly remove the unwanted widget.
      const unwantedWidget = doc.getElementById(
        "elevenlabs-audionative-widget"
      );
      if (unwantedWidget) {
        unwantedWidget.remove();
      }

      const { playerType, color } = playerConfig;

      if (selectedPlacement) {
        // Inject the player script ONLY when a placement is selected
        const playerScriptElement = doc.createElement("script");
        playerScriptElement.type = "module";
        playerScriptElement.setAttribute("crossorigin", "");
        playerScriptElement.src = PLAYER_SCRIPT_URL;
        doc.head.appendChild(playerScriptElement);

        const targetElements = doc.querySelectorAll(selectedPlacement.selector);
        // Use the 'nth' value to target the exact element instance
        const targetEl = targetElements[selectedPlacement.nth];

        if (targetEl) {
          // Always use 'xyz' for the live preview on the main page.
          // This provides a stable sandbox for testing player visual styles.
          // The final, shareable demo page (/demo/[id]) will use the correct publication name.
          const publication = "xyz";

          const playerHtml = `<instaread-player
              id="instaread-player-instance"
              publication="${publication}"
              playertype="${playerType}"
              colortype="${color}"
            ></instaread-player>`;

          const playerFragment = doc
            .createRange()
            .createContextualFragment(playerHtml);

          if (selectedPlacement.position === "before") {
            targetEl.parentNode?.insertBefore(playerFragment, targetEl);
          } else {
            targetEl.parentNode?.insertBefore(
              playerFragment,
              targetEl.nextSibling
            );
          }
        }
      }

      // Inject the interaction script for click-to-place
      const interactionScriptEl = doc.createElement("script");
      interactionScriptEl.textContent = `
        (function() {
          const generateSelector = ${generateSelector.toString()};
          let lastHovered = null;
          let originalOutline = null;
          
          // Create a tooltip element to show the selector
          const tooltip = document.createElement('div');
          tooltip.id = 'selector-tooltip';
          Object.assign(tooltip.style, {
            position: 'fixed',
            display: 'none',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '5px',
            fontSize: '12px',
            fontFamily: 'monospace',
            zIndex: '99999',
            pointerEvents: 'none', // Make sure it doesn't interfere with clicks
            whiteSpace: 'nowrap',
            maxWidth: '400px',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          });
          document.body.appendChild(tooltip);

          document.addEventListener('mousemove', (e) => {
            if (tooltip.style.display === 'block') {
              tooltip.style.left = (e.clientX + 15) + 'px';
              tooltip.style.top = (e.clientY + 15) + 'px';
            }
          });

          /* Logic to show fade-in player after a short delay */
          const instareadPlayer = document.querySelector('instaread-player');
          if (instareadPlayer) {
              // Add a class to trigger the animation
              setTimeout(() => {
                if (instareadPlayer) {
                    instareadPlayer.classList.add('instaread-player-fade-in');
                }
              }, 300); // Small delay to allow rendering
          }

          document.addEventListener('mouseover', (e) => {
              const target = e.target;
              if (target && target !== lastHovered && target.id !== 'selector-tooltip') {
                  if (lastHovered) {
                      lastHovered.style.outline = originalOutline || '';
                  }
                  lastHovered = target;
                  originalOutline = target.style.outline;
                  if (!target.closest('instaread-player')) {
                       target.style.outline = '2px dashed #FF8C00';
                       
                       // Update and show the tooltip
                       const selector = generateSelector(target);
                       tooltip.textContent = selector;
                       tooltip.style.display = 'block';
                  }
              }
          });

          document.addEventListener('mouseout', (e) => {
              if (lastHovered) {
                  lastHovered.style.outline = originalOutline || '';
                  lastHovered = null;
                  originalOutline = null;
                  
                  // Hide the tooltip
                  tooltip.style.display = 'none';
              }
          });
          
          document.addEventListener('click', (e) => {
            if (e.target && !e.target.closest('instaread-player')) {
              e.preventDefault();
              e.stopPropagation();
              const selector = generateSelector(e.target);
              
              // Calculate the 'nth' index of the clicked element among its siblings that match the selector
              const elements = Array.from(document.querySelectorAll(selector));
              const nth = elements.indexOf(e.target);

              window.parent.postMessage({ type: 'placement-click', selector: selector, nth: nth }, '*');
            }
          }, true);

          // Resize the iframe to fit its content
          const sendHeight = () => {
              const height = document.body.scrollHeight;
              window.parent.postMessage({ type: 'iframe-resize', height: height }, '*');
          };
          
          // Send height on load and on any mutations
          const observer = new MutationObserver(sendHeight);
          observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
          });

          window.addEventListener('load', sendHeight);
          sendHeight();

        })();
      `;
      doc.body.appendChild(interactionScriptEl);

      // Add fade-in styles for the player
      const styleEl = doc.createElement("style");
      styleEl.textContent = `
        instaread-player {
          opacity: 0;
          transition: opacity 0.5s ease-in-out;
        }
        instaread-player.instaread-player-fade-in {
          opacity: 1;
        }
      `;
      doc.head.appendChild(styleEl);

      const finalHtml = `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
      setEffectiveHtml(finalHtml);
    } catch (e) {
      console.error("[LivePreview] Error parsing or modifying HTML:", e);
      setEffectiveHtml(cloneHtml); // Fallback to raw clone on error
    }
  }, [cloneHtml, selectedPlacement, playerConfig, url]);

  // Effect to handle iframe height resizing
  useEffect(() => {
    const handleResizeMessage = (event: MessageEvent) => {
      if (
        event.data &&
        event.data.type === "iframe-resize" &&
        iframeRef.current
      ) {
        iframeRef.current.style.height = `${event.data.height}px`;
      }
    };
    window.addEventListener("message", handleResizeMessage);
    return () => window.removeEventListener("message", handleResizeMessage);
  }, []);

  const handleClearPlacement = () => {
    onSelectPlacement(null, false);
    setIsPlacementFragile(false);
  };

  const handlePlacementChoice = (position: "before" | "after") => {
    if (stagedPlacement) {
      const isFragile = isSelectorFragile(stagedPlacement.selector);
      setIsPlacementFragile(isFragile);
      onSelectPlacement(
        {
          selector: stagedPlacement.selector,
          nth: stagedPlacement.nth,
          position,
        },
        isFragile
      );
      setStagedPlacement(null);
    }
  };

  const renderPreviewContent = () => {
    if (isLoading) {
      return (
        <div className="p-4 space-y-4 w-full flex flex-col items-center justify-center min-h-[60vh]">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>{statusText || "Analyzing and rendering preview..."}</p>
          </div>
          <Skeleton className="h-[60vh] w-full flex-grow" />
        </div>
      );
    }

    if (!url) {
      return (
        <div className="flex flex-col items-center justify-center text-center p-8 min-h-[40vh]">
          <Info className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg">Live Preview</h3>
          <p className="text-muted-foreground">
            Enter a URL to start generating your demo.
          </p>
        </div>
      );
    }

    if (!effectiveHtml && url && !isLoading) {
      return (
        <div>
          <Alert variant="destructive" className="m-4">
            <AlertTitle>Preview Generation Failed</AlertTitle>
            <AlertDescription>
              We couldn't generate a visual clone for this website. It may be
              protected or unreachable. Please try a different URL.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return (
      <iframe
        id="outer_iframe"
        ref={iframeRef}
        srcDoc={effectiveHtml || ""}
        className="w-full h-full bg-white rounded-lg shadow-lg border"
        style={{ height: "100vh", transition: "height 0.3s ease-in-out" }}
        sandbox="allow-scripts allow-same-origin allow-forms"
        title="Live Preview"
      />
    );
  };

  return (
    <>
      <Dialog
        open={!!stagedPlacement}
        onOpenChange={() => setStagedPlacement(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Player Placement</DialogTitle>
            <DialogDescription>
              Where would you like to place the audio player relative to the
              selected element?
            </DialogDescription>
          </DialogHeader>
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md break-all">
            Selector: <code>{stagedPlacement?.selector}</code>
            {stagedPlacement && stagedPlacement.nth >= 0 && (
              <span> (Instance #{stagedPlacement.nth + 1})</span>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handlePlacementChoice("before")}
            >
              Place Before
            </Button>
            <Button onClick={() => handlePlacementChoice("after")}>
              Place After
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="shadow-md overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <CardTitle className="font-headline text-2xl">
                Live Preview &amp; Placement
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <MousePointerClick className="h-4 w-4" /> Click an element in
                the preview to place the player. Resize your browser to test
                responsiveness.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {selectedPlacement && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearPlacement}
                >
                  <Pointer className="mr-2 h-4 w-4" />
                  Clear Placement
                </Button>
              )}
              <Button
                onClick={onSaveDemo}
                disabled={!url || !selectedPlacement || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save &amp; Share
              </Button>
            </div>
          </div>
          {isPlacementFragile && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Potential Placement Issue</AlertTitle>
              <AlertDescription>
                This website has a complex structure. The selected placement
                might not work on all pages. For best results, a developer may
                need to adjust the generated WordPress plugin (the injection
                strategy has been set to "Custom" for you).
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="bg-muted/50 p-1 sm:p-2 md:p-4 border-t">
            {renderPreviewContent()}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default LivePreviewSection;
