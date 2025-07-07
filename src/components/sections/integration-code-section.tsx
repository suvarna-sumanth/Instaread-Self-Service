
'use client'

import { useState } from 'react';
import type { PlayerConfig } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Clipboard, Check } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { PLAYER_SCRIPT_URL } from '@/lib/constants';

type IntegrationCodeSectionProps = {
    playerConfig: PlayerConfig;
    websiteUrl: string;
};

// Helper function to extract publication from URL
const getPublicationFromUrl = (url: string) => {
    if (!url) return 'your-publication';
    try {
        const hostname = new URL(url).hostname;
        // remove www. and get the first part of the domain
        return hostname.replace(/^www\./, '').split('.')[0];
    } catch (e) {
        return 'your-publication';
    }
};

const IntegrationCodeSection = ({ playerConfig, websiteUrl }: IntegrationCodeSectionProps) => {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);
    
    const { playerType, color } = playerConfig;
    const publication = getPublicationFromUrl(websiteUrl);

    const scriptSrc = PLAYER_SCRIPT_URL;

    const codeSnippets = {
        html: `<script type="module" crossorigin src="${scriptSrc}"></script>
<instaread-player
  publication="${publication}"
  playertype="${playerType}"
  colortype="${color}"
></instaread-player>`,
        react: `import { useEffect } from 'react';

// This component assumes the Instaread script has been added to your HTML file.
// <script type="module" crossorigin src="${scriptSrc}"></script>

const InstareadPlayer = ({ publication, playerType, colorType }) => {
  return (
    <instaread-player
      publication={publication}
      playertype={playerType}
      colortype={colorType}
    ></instaread-player>
  );
};

const MyComponent = () => {
  return (
    <InstareadPlayer
      publication="${publication}"
      playerType="${playerType}"
      colorType="${color}"
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
                <CardTitle className="font-headline text-2xl">3. Get Integration Code</CardTitle>
                <CardDescription>Copy the code snippet and place it in your website's HTML where you want the player to appear.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="html" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="html">HTML</TabsTrigger>
                        <TabsTrigger value="react">React</TabsTrigger>
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
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default IntegrationCodeSection;
