'use client'

import { useState } from 'react';
import type { PlayerConfig } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Clipboard, Check } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

type IntegrationCodeSectionProps = {
    playerConfig: PlayerConfig;
    placementSelector: string | null;
    websiteUrl: string;
};

const IntegrationCodeSection = ({ playerConfig, placementSelector, websiteUrl }: IntegrationCodeSectionProps) => {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);
    
    const { design, showAds, enableMetrics, audioFileName } = playerConfig;

    const codeSnippets = {
        html: `<instaread-player
  data-source="${websiteUrl}"
  data-placement-selector="${placementSelector || 'body'}"
  data-design="${design}"
  data-show-ads="${showAds}"
  data-enable-metrics="${enableMetrics}"
  data-audio-track-url="path/to/${audioFileName}"
></instaread-player>
<script async src="https://cdn.audioleap.com/player.js"></script>`,
        react: `import AudioLeapPlayer from '@audioleap/react-player';

const MyComponent = () => {
  return (
    <AudioLeapPlayer
      dataSource="${websiteUrl}"
      placementSelector="${placementSelector || 'body'}"
      design="${design}"
      showAds={${showAds}}
      enableMetrics={${enableMetrics}}
      audioTrackUrl="path/to/${audioFileName}"
    />
  );
};`,
        wordpress: `// 1. Install the "AudioLeap" plugin from the WordPress repository.
// 2. Go to the AudioLeap settings page in your WordPress admin.
// 3. Enter the following configuration:
Website URL: ${websiteUrl}
Placement Selector: ${placementSelector || 'body'}
Design: ${design}
Show Ads: ${showAds ? 'Enabled' : 'Disabled'}
Enable Metrics: ${enableMetrics ? 'Enabled' : 'Disabled'}
Audio Track URL: path/to/${audioFileName}`,
    };

    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        toast({ title: "Copied to clipboard!" });
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">4. Get Integration Code</CardTitle>
                <CardDescription>Copy the code to add the player to a website.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="html" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="html">HTML</TabsTrigger>
                        <TabsTrigger value="react">React</TabsTrigger>
                        <TabsTrigger value="wordpress">WordPress</TabsTrigger>
                    </TabsList>
                    {Object.entries(codeSnippets).map(([key, code]) => (
                        <TabsContent key={key} value={key}>
                            <div className="relative mt-4">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 h-7 w-7"
                                    onClick={() => handleCopy(code)}
                                >
                                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
                                </Button>
                                <pre className="bg-muted rounded-md p-4 text-sm overflow-x-auto">
                                    <code className="font-code text-muted-foreground">{code}</code>
                                </pre>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default IntegrationCodeSection;
