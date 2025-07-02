'use client'

import { useState } from 'react';
import type { PlayerConfig, Placement } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Clipboard, Check } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import WordpressPluginForm from '@/components/wordpress-plugin-form';

type IntegrationCodeSectionProps = {
    playerConfig: PlayerConfig;
    selectedPlacement: Placement;
    websiteUrl: string;
};

const IntegrationCodeSection = ({ playerConfig, selectedPlacement, websiteUrl }: IntegrationCodesectionProps) => {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);
    
    const { design, showAds, enableMetrics, audioFileName } = playerConfig;
    
    const selector = selectedPlacement?.selector || 'body';
    const position = selectedPlacement?.position || 'before';

    const publication = design === 'A' ? 'usnews.com' : 'flyingmag';

    const codeSnippets = {
        html: `<instaread-player
  publication="${publication}"
  data-source="${websiteUrl}"
  data-placement-selector="${selector}"
  data-placement-position="${position}"
  data-design="${design}"
  data-show-ads="${showAds}"
  data-enable-metrics="${enableMetrics}"
  data-audio-track-url="path/to/${audioFileName}"
></instaread-player>
<script type="module" crossorigin src="https://instaread.co/js/instaread.player.js"></script>`,
        react: `import InstareadPlayer from '@instaread/react-player';

const MyComponent = () => {
  return (
    <InstareadPlayer
      publication="${publication}"
      dataSource="${websiteUrl}"
      placementSelector="${selector}"
      placementPosition="${position}"
      design="${design}"
      showAds={${showAds}}
      enableMetrics={${enableMetrics}}
      audioTrackUrl="path/to/${audioFileName}"
    />
  );
};`,
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
                <CardDescription>Copy a code snippet or generate a WordPress plugin.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="html" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="html">HTML</TabsTrigger>
                        <TabsTrigger value="react">React</TabsTrigger>
                        <TabsTrigger value="wordpress">WordPress</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="html">
                        <div className="relative mt-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7"
                                onClick={() => handleCopy(codeSnippets.html)}
                            >
                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
                            </Button>
                            <pre className="bg-muted rounded-md p-4 text-sm overflow-x-auto">
                                <code className="font-code text-muted-foreground">{codeSnippets.html}</code>
                            </pre>
                        </div>
                    </TabsContent>

                    <TabsContent value="react">
                         <div className="relative mt-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7"
                                onClick={() => handleCopy(codeSnippets.react)}
                            >
                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
                            </Button>
                            <pre className="bg-muted rounded-md p-4 text-sm overflow-x-auto">
                                <code className="font-code text-muted-foreground">{codeSnippets.react}</code>
                            </pre>
                        </div>
                    </TabsContent>

                    <TabsContent value="wordpress">
                        <div className="mt-4">
                           <WordpressPluginForm />
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default IntegrationCodeSection;