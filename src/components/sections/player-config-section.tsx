
'use client'

import React from 'react';
import type { PlayerConfig, PlayerType, AnalysisResult } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';

type PlayerConfigSectionProps = {
  config: PlayerConfig;
  setConfig: React.Dispatch<React.SetStateAction<PlayerConfig>>;
  analysis: AnalysisResult;
  disabled: boolean;
};

const playerTypes: { value: PlayerType; label: string }[] = [
    { value: 'newdesign', label: 'New Design' },
    { value: 'shortdesign', label: 'Short Design' },
    { value: 'scrubandwaves', label: 'Scrub & Waves' },
    { value: 'scrub', label: 'Scrub' },
    { value: 'default', label: 'Default' },
];

const PlayerConfigSection = ({ config, setConfig, analysis, disabled }: PlayerConfigSectionProps) => {
  
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig(prev => ({ ...prev, color: e.target.value }));
  };

  return (
    <Card className={cn("shadow-md transition-opacity", disabled && "opacity-50 pointer-events-none")}>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">2. Player Configuration</CardTitle>
        <CardDescription>Customize the player's appearance and features.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="player-type">Player Type</Label>
            <Select 
                value={config.playerType} 
                onValueChange={(value) => setConfig(prev => ({...prev, playerType: value as PlayerType}))}
                disabled={disabled}
            >
                <SelectTrigger id="player-type">
                    <SelectValue placeholder="Select a player type" />
                </SelectTrigger>
                <SelectContent>
                    {playerTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                            {type.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="color-picker">Accent Color</Label>
          <div className="flex items-center gap-2">
            <Input 
                id="color-picker-text"
                value={config.color}
                onChange={handleColorChange}
                className="w-24"
                disabled={disabled}
            />
            <Input
              id="color-picker"
              type="color"
              value={config.color}
              onChange={handleColorChange}
              className="h-10 w-10 p-1 cursor-pointer"
              disabled={disabled}
            />
            {analysis?.colors.primary && (
                <Button variant="outline" size="sm" onClick={() => setConfig(prev => ({...prev, color: analysis!.colors.primary}))} disabled={disabled}>
                    Use Analyzed Color
                </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Determines the player's main color.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerConfigSection;
