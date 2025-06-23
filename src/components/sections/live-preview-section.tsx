'use client'

import React, { useState, useRef, useEffect } from 'react';
import type { PlayerConfig } from '@/types';
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
  onIframeError: () => void;
  iframeError: boolean;
  placementSuggestions: string[];
  selectedPlacement: string | null;
  onSelectPlacement: (selector: string | null) => void;
  playerConfig: PlayerConfig;
};

const LivePreviewSection = (props: LivePreviewSectionProps) => {
  const { url, cloneHtml, isLoading, onIframeError, iframeError, placementSuggestions, selectedPlacement, onSelectPlacement, playerConfig } = props;
  const previewRef = useRef<HTMLDivElement>(null);
  const [playerStyle, setPlayerStyle] = useState<React.CSSProperties>({});
  
  useEffect(() => {
    if (selectedPlacement && previewRef.current) {
      const containerRect = previewRef.current.getBoundingClientRect();
      const targetElement = previewRef.current.querySelector(selectedPlacement);
      if (targetElement) {
        const targetRect = targetElement.getBoundingClientRect();
        setPlayerStyle({
          position: 'absolute',
          top: `${targetRect.top - containerRect.top}px`,
          left: `${targetRect.left - containerRect.left}px`,
          width: `${targetRect.width}px`,
          zIndex: 10,
        });
      }
    }
  }, [selectedPlacement, cloneHtml]);


  const renderPreviewContent = (isMobile: boolean) => {
    if (!url) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Info className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">Live Preview</h3>
            <p className="text-muted-foreground">Enter a URL to start generating your demo.</p>
        </div>
      );
    }

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
    
    if (iframeError && !cloneHtml) {
        return (
            <Alert variant="destructive" className="m-4">
                <AlertTitle>Clone Generation Failed</AlertTitle>
                <AlertDescription>We couldn't generate a visual clone for this website. Please try a different URL.</AlertDescription>
            </Alert>
        );
    }

    const previewContainerClasses = cn(
      "bg-white rounded-lg overflow-hidden w-full relative", 
      isMobile ? "h-[640px] w-[360px] shadow-2xl border-[10px] border-black rounded-[40px]" : "h-[600px] shadow-lg",
      "transition-all duration-300"
    );

    const iframeSrc = iframeError ? undefined : url;
    const iframeSrcDoc = iframeError && cloneHtml ? cloneHtml : undefined;

    return (
        <div className={previewContainerClasses}>
            <div ref={previewRef} className="w-full h-full">
                <iframe
                    title="Website Preview"
                    src={iframeSrc}
                    srcDoc={iframeSrcDoc}
                    className="w-full h-full border-0"
                    onError={onIframeError}
                    sandbox="allow-scripts allow-same-origin"
                />
            </div>
            {iframeError && cloneHtml && (
                <>
                    {placementSuggestions.map(selector => {
                        const targetElement = previewRef.current?.querySelector(selector);
                        if (!targetElement) return null;
                        const containerRect = previewRef.current!.getBoundingClientRect();
                        const targetRect = targetElement.getBoundingClientRect();
                        const style: React.CSSProperties = {
                            position: 'absolute',
                            top: targetRect.top - containerRect.top,
                            left: targetRect.left - containerRect.left,
                            width: targetRect.width,
                            height: targetRect.height,
                            zIndex: 5,
                        };
                        return (
                            <div
                                key={selector}
                                style={style}
                                className={cn(
                                    "border-2 border-dashed border-accent cursor-pointer transition-all duration-300 bg-accent/20 hover:bg-accent/40 flex items-center justify-center",
                                    selectedPlacement === selector && "border-solid border-primary bg-primary/30"
                                )}
                                onClick={() => onSelectPlacement(selector)}
                            >
                                <div className="bg-background/80 p-1 rounded-sm text-xs text-foreground">
                                    {selector}
                                </div>
                            </div>
                        )
                    })}
                    {selectedPlacement && (
                        <div style={playerStyle} className="transition-all duration-300">
                           <AudioPlayer config={playerConfig} />
                        </div>
                    )}
                </>
            )}
        </div>
    )
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline text-2xl">3. Live Preview & Placement</CardTitle>
                <CardDescription>
                    {iframeError ? "Visually place the player on the website clone." : "View a live preview of the website."}
                </CardDescription>
            </div>
            {iframeError && <Button variant="outline" size="sm" onClick={() => onSelectPlacement(null)}><Pointer className="mr-2 h-4 w-4"/>Clear Placement</Button>}
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
