
'use client';

import { useState, useRef, useEffect, type FC } from 'react';
import type { PlayerConfig } from '@/types';
import Image from 'next/image';
import { Play, Pause, Rewind, FastForward, BookAudio } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
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
    if (audioRef.current) audioRef.current.currentTime = 0;
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

  // Design A - Sleek Horizontal Bar
  if (config.design === 'A') {
    return (
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-3 w-full flex items-center justify-between gap-4">
        {audioElement}
        <div className="flex items-center gap-4">
          <Button size="icon" className="rounded-full h-12 w-12 flex-shrink-0" onClick={handlePlayPause} disabled={!audioSrc}>
            {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
          </Button>
          <div>
            <h3 className="font-headline text-lg font-bold">Listen to this Article</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <BookAudio className="h-3 w-3" />
              Powered by Instaread
            </p>
          </div>
        </div>
        {config.showAds && (
          <div className="hidden lg:block ml-auto pl-4">
            <Image
              src="https://placehold.co/240x60.png"
              alt="Advertisement"
              width={240}
              height={60}
              className="rounded-md object-cover"
              data-ai-hint="advertisement banner"
            />
          </div>
        )}
      </div>
    );
  }

  // Design B - Modern Vertical Card
  return (
    <div className="bg-card text-card-foreground rounded-xl border shadow-lg p-4 w-full flex flex-col items-center gap-4 max-w-xs mx-auto">
       {audioElement}
      <Image
        src="https://placehold.co/300x300.png"
        alt="Article visual"
        width={300}
        height={300}
        className="rounded-lg w-full aspect-square object-cover"
        data-ai-hint="abstract soundwave"
      />
      <div className="flex-grow w-full text-center">
        <div className="mb-4">
            <h3 className="font-headline text-xl font-bold truncate" title={config.audioFileName}>
              {config.audioFileName}
            </h3>
            <p className="text-sm text-muted-foreground">Instaread Audio</p>
        </div>

        <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground w-10 text-right">{formatTime(currentTime)}</span>
            <Slider value={[currentTime]} max={duration || 1} step={0.1} onValueChange={handleSeek} className="flex-grow" disabled={!audioSrc} />
            <span className="text-xs text-muted-foreground w-10 text-left">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-center gap-4 my-4">
            <Button variant="ghost" size="icon" className="rounded-full" disabled>
              <Rewind size={20}/>
            </Button>
            <Button size="icon" className="rounded-full h-16 w-16" onClick={handlePlayPause} disabled={!audioSrc}>
                {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full" disabled>
              <FastForward size={20} />
            </Button>
        </div>

        {config.showAds && (
            <div className="mt-4 bg-muted/50 p-2 rounded-md">
                <p className="text-xs text-muted-foreground">Advertisement</p>
                <div className="w-full h-16 bg-muted rounded-sm mt-1 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground/50">300x50</span>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default AudioPlayer;
