
'use client';

import { useState, useRef, useEffect, type FC } from 'react';
import type { PlayerConfig } from '@/types';
import Image from 'next/image';
import { Play, Pause, Rewind, FastForward } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from './button';
import { Skeleton } from './skeleton';

const formatTime = (time: number) => {
  if (isNaN(time) || time === 0) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// SVG for the Instaread icon in the player, based on the user's image
const InstareadPlayerIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground">
        <path d="M2.66602 14V1.33333H13.3327V14L7.99935 11.3333L2.66602 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const Waveform = () => {
    const [bars, setBars] = useState<number[]>([]);

    useEffect(() => {
        // Use a static array for a consistent and clean look, generated on the client to avoid hydration mismatch.
        const staticBars = [15, 30, 45, 25, 50, 60, 40, 25, 35, 50, 65, 75, 60, 45, 30, 20, 25, 35, 55, 70, 85, 70, 55, 40, 30, 22, 18, 25, 40, 60, 75, 65, 50, 35, 25, 20, 28, 42, 58, 72, 88, 75, 60, 40, 30, 45, 60, 70, 50, 35];
        setBars(staticBars);
    }, []);

    if (bars.length === 0) {
        // Render a skeleton placeholder during SSR and before client-side hydration for a smooth loading experience.
        return <div className="h-12 w-full min-w-0 rounded-md"><Skeleton className="h-full w-full" /></div>;
    }

    return (
        <div className="flex items-center h-12 gap-px w-full">
            {bars.map((height, i) => (
                <div key={i} className="flex-1 bg-foreground rounded-full" style={{ height: `${height}%` }} />
            ))}
        </div>
    );
};


const AudioPlayer: FC<{ config: PlayerConfig }> = ({ config }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);

  useEffect(() => {
    if (config.audioFile) {
      const url = URL.createObjectURL(config.audioFile);
      setAudioSrc(url);
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
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
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

  // Design A - Sleek Horizontal Bar (from user image)
  if (config.design === 'A') {
    return (
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6 w-full flex flex-col md:grid md:grid-cols-2 items-center gap-6">
          {audioElement}
          
          <div className="flex flex-col items-start justify-center w-full h-full gap-4">
              <h3 className="font-headline text-lg font-semibold text-left">Listen to audio version of this article</h3>
              <div className="flex items-center gap-2 w-full">
                  <Button size="icon" className="rounded-full h-14 w-14 flex-shrink-0 bg-primary hover:bg-primary/90" onClick={handlePlayPause} disabled={!audioSrc}>
                      {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                  </Button>
                  <div className="flex-grow min-w-0">
                    <Waveform />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                    <InstareadPlayerIcon />
                    <span>Instaread</span>
                  </div>
              </div>
          </div>

          {config.showAds && (
              <div className="w-full h-full flex flex-col items-start justify-center">
                   <h4 className="text-sm font-medium text-muted-foreground mb-2">Advertisement</h4>
                   <div className="w-full">
                      <Image
                          src="https://instaread.co/images/default_ad.png"
                          alt="Advertisement"
                          width={300}
                          height={250}
                          className="rounded-md object-cover w-full h-auto max-w-xs"
                          unoptimized
                          data-ai-hint="advertisement banner"
                      />
                   </div>
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
            <div className="mt-4 w-full">
                <p className="text-xs text-muted-foreground text-center mb-1">Advertisement</p>
                 <Image
                    src="https://instaread.co/images/default_ad.png"
                    alt="Advertisement"
                    width={300}
                    height={250}
                    className="rounded-md object-cover w-full h-24"
                    unoptimized
                    data-ai-hint="advertisement banner"
                />
            </div>
        )}
      </div>
    </div>
  );
};

export default AudioPlayer;
