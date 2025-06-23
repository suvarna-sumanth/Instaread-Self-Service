import type { PlayerConfig } from "@/types";
import { Play, Pause, FastForward, Rewind, Mic2 } from "lucide-react";
import Image from 'next/image';
import { Slider } from "./slider";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";

type AudioPlayerProps = {
  config: PlayerConfig;
};

const AudioPlayer = ({ config }: AudioPlayerProps) => {
  const isDesignB = config.design === 'B';

  return (
    <div 
      className={cn(
        "bg-card text-card-foreground rounded-lg border shadow-lg p-4 w-full flex items-center gap-4 transition-all duration-300",
        isDesignB && "flex-col"
      )}
    >
      <Image
        src="https://placehold.co/100x100.png"
        alt="Album Art"
        width={isDesignB ? 80 : 60}
        height={isDesignB ? 80 : 60}
        className={cn("rounded-md", isDesignB ? "w-20 h-20" : "w-16 h-16")}
        data-ai-hint="album cover"
      />
      <div className="flex-grow w-full">
        <div className={cn("flex justify-between items-center", isDesignB && "text-center flex-col")}>
            <div className={cn(isDesignB && "mb-2")}>
                <h3 className="font-bold">Podcast Title</h3>
                <p className="text-sm text-muted-foreground">{config.audioFileName}</p>
            </div>
            <div className={cn("flex items-center gap-4", isDesignB ? "my-2" : "ml-4")}>
                <button className="text-muted-foreground hover:text-primary"><Rewind size={20}/></button>
                <button className="bg-primary text-primary-foreground rounded-full p-3 hover:bg-primary/90">
                    <Play size={24} className="ml-0.5" />
                </button>
                <button className="text-muted-foreground hover:text-primary"><FastForward size={20} /></button>
            </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">1:23</span>
            <Slider defaultValue={[33]} max={100} step={1} className="flex-grow" />
            <span className="text-xs text-muted-foreground">4:56</span>
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
