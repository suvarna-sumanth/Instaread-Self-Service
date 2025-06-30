
'use client';

import { useState, useRef, useEffect, type FC } from 'react';
import type { PlayerConfig } from '@/types';
import Image from 'next/image';
import { Play, Pause, Rewind, FastForward } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Button } from './button';

const formatTime = (time: number) => {
  if (isNaN(time) || time === 0) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const AudioPlayer: FC<{ config: PlayerConfig }> = ({ config }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);

  useEffect(() => {
    // When the audio file changes, create a new object URL for it.
    if (config.audioFile) {
      const url = URL.createObjectURL(config.audioFile);
      setAudioSrc(url);
      // Clean up the object URL when the component unmounts or the file changes.
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioSrc(null);
    }
  }, [config.audioFile]);

  const handlePlayPause = () => {
    if (!audioRef.current || !audioSrc) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };
  
  const handleEnded = () => {
    setIsPlaying(false);
    // Optional: reset to beginning when finished
    // if (audioRef.current) audioRef.current.currentTime = 0;
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const audioElement = audioSrc ? (
    <audio
      ref={audioRef}
      src={audioSrc}
      onLoadedMetadata={handleLoadedMetadata}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleEnded}
      preload="metadata"
    />
  ) : null;

  // Design A - Horizontal Bar
  if (config.design === 'A') {
    return (
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-3 w-full flex items-center justify-between gap-4">
        {audioElement}
        <div className="flex items-center gap-4">
          <Button size="icon" className="rounded-full h-12 w-12" onClick={handlePlayPause} disabled={!audioSrc}>
            {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
          </Button>
          <div>
            <h3 className="text-lg font-semibold">Listen to this Article</h3>
            <p className="text-xs text-muted-foreground">Instaread</p>
          </div>
        </div>
        {config.showAds && (
          <div className="hidden sm:block">
            <Image
              src="https://placehold.co/300x60.png"
              alt="Advertisement"
              width={300}
              height={60}
              className="rounded-md object-cover"
              data-ai-hint="advertisement banner"
            />
          </div>
        )}
      </div>
    );
  }

  // Design B - Vertical Card
  return (
    <div className="bg-card text-card-foreground rounded-lg border shadow-lg p-4 w-full flex flex-col items-center gap-4 max-w-sm mx-auto">
       {audioElement}
      <Image
        src="https://placehold.co/100x100.png"
        alt="Album Art"
        width={80}
        height={80}
        className="rounded-md w-20 h-20"
        data-ai-hint="album cover"
      />
      <div className="flex-grow w-full text-center">
        <div className="mb-2">
            <h3 className="font-bold">Podcast Title</h3>
            <p className="text-sm text-muted-foreground">{config.audioFileName}</p>
        </div>
        <div className="flex items-center justify-center gap-4 my-2">
            <button className="text-muted-foreground hover:text-primary" disabled><Rewind size={20}/></button>
            <Button size="icon" className="rounded-full h-12 w-12" onClick={handlePlayPause} disabled={!audioSrc}>
                {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </Button>
            <button className="text-muted-foreground hover:text-primary" disabled><FastForward size={20} /></button>
        </div>
        <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground w-10 text-right">{formatTime(currentTime)}</span>
            <Slider value={[currentTime]} max={duration || 1} step={0.1} onValueChange={handleSeek} className="flex-grow" disabled={!audioSrc} />
            <span className="text-xs text-muted-foreground w-10 text-left">{formatTime(duration)}</span>
        </div>
        {config.showAds && (
            <div className="mt-3 bg-muted/50 p-2 rounded-md text-center text-xs text-muted-foreground">
                Advertisement Space
            </div>
        )}
      </div>
    </div>
  );
};

export default AudioPlayer;
