'use client'

import React from 'react';
import type { PlayerConfig } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

type PlayerConfigSectionProps = {
  config: PlayerConfig;
  setConfig: React.Dispatch<React.SetStateAction<PlayerConfig>>;
};

const PlayerConfigSection = ({ config, setConfig }: PlayerConfigSectionProps) => {
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setConfig(prev => ({
        ...prev,
        audioFile: file,
        audioFileName: file ? file.name : 'sample-track.mp3'
    }));
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);


  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">2. Player Configuration</CardTitle>
        <CardDescription>Customize the player's appearance and features.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
            <Label>Player Design</Label>
            <Tabs value={config.design} onValueChange={(value) => setConfig(prev => ({...prev, design: value as 'A' | 'B'}))}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="A">Design A</TabsTrigger>
                    <TabsTrigger value="B">Design B</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
        <div className="flex items-center justify-between">
            <Label htmlFor="ads-switch">Show Ads</Label>
            <Switch id="ads-switch" checked={config.showAds} onCheckedChange={(checked) => setConfig(prev => ({...prev, showAds: checked}))} />
        </div>
        <div className="flex items-center justify-between">
            <Label htmlFor="metrics-switch">Enable Metrics</Label>
            <Switch id="metrics-switch" checked={config.enableMetrics} onCheckedChange={(checked) => setConfig(prev => ({...prev, enableMetrics: checked}))} />
        </div>
        <div>
            <Label>Audio Track</Label>
            <div className="flex items-center gap-2 mt-2">
                <Button variant="outline" className="w-full justify-start text-left" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    {config.audioFileName}
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*" className="hidden" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Upload a custom audio file for the demo.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerConfigSection;
