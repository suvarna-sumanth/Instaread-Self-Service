
'use client'

import { useState } from 'react';
import type { PlayerConfig } from '@/types';
import type { WordPressConfigOutput } from '@/ai/flows/suggest-wordpress-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Clipboard, Check, Wand2, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { PLAYER_SCRIPT_URL } from '@/lib/constants';
import { getWordPressConfig } from '@/lib/actions';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

type IntegrationCodeSectionProps = {
    playerConfig: PlayerConfig;
    websiteUrl: string;
};

const CodeBlock = ({ content, language }: { content: string, language: string }) => {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        toast({ title: "Copied to clipboard!" });
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative mt-2">
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={handleCopy}
            >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
            </Button>
            <pre className="bg-muted rounded-md p-4 text-sm overflow-x-auto">
                <code className={`font-code text-muted-foreground language-${language}`}>{content}</code>
            </pre>
        </div>
    )
}

const IntegrationCodeSection = ({ playerConfig, websiteUrl }: IntegrationCodeSectionProps) => {
    const { toast } = useToast();
    const [copied, setCopied] = useState('');
    const [wpConfig, setWpConfig] = useState<WordPressConfigOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const { playerType, color } = playerConfig;

    let publication = 'xyz';
    if (process.env.NODE_ENV === 'production' && websiteUrl) {
      try {
        const urlObject = new URL(websiteUrl);
        const domain = urlObject.hostname.replace(/^www\./, '').split('.')[0];
        publication = domain || 'xyz';
      } catch (e) {
        publication = 'xyz';
      }
    }

    const codeSnippets = {
        html: `<script type="module" crossorigin src="${PLAYER_SCRIPT_URL}"></script>
<instaread-player
  publication="${publication}"
  playertype="${playerType}"
  colortype="${color}"
></instaread-player>`,
        react: `import { useEffect } from 'react';

// In your main HTML file, add the script tag:
// <script type="module" crossorigin src="${PLAYER_SCRIPT_URL}"></script>

const InstareadPlayer = ({ publication, playerType, colorType }) => {
  // This tells TypeScript to expect a custom element
  useEffect(() => {
    // You might need to declare the custom element type for TypeScript
    // if you haven't done so globally.
  }, []);

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
};`
    };

    const handleCopy = (content: string, type: string) => {
        navigator.clipboard.writeText(content);
        setCopied(type);
        toast({ title: "Copied to clipboard!" });
        setTimeout(() => setCopied(''), 2000);
    };

    const handleGenerateWpConfig = async () => {
        setIsLoading(true);
        setWpConfig(null);
        try {
            const result = await getWordPressConfig({ playerConfig, websiteUrl });
            setWpConfig(result);
            toast({ title: "WordPress Configuration Generated" });
        } catch (error) {
            console.error("Failed to generate WordPress config:", error);
            const description = error instanceof Error ? error.message : "An unexpected error occurred.";
            toast({
                title: "Generation Failed",
                description: `Could not generate the configuration. ${description}`,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">3. Get Integration Code</CardTitle>
                <CardDescription>Copy a code snippet or generate a full WordPress deployment solution.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="html" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="html">HTML</TabsTrigger>
                        <TabsTrigger value="react">React</TabsTrigger>
                        <TabsTrigger value="wordpress">WordPress</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="html">
                        <CodeBlock content={codeSnippets.html} language="html" />
                    </TabsContent>

                    <TabsContent value="react">
                         <CodeBlock content={codeSnippets.react} language="jsx" />
                    </TabsContent>
                    
                    <TabsContent value="wordpress">
                        <div className="text-center mt-4 p-4 border rounded-lg bg-muted/50">
                            <Wand2 className="mx-auto h-8 w-8 text-primary mb-2"/>
                            <h4 className="font-semibold">Advanced WordPress Generator</h4>
                            <p className="text-sm text-muted-foreground mb-4">Generate a plugin, deployment workflow, and instructions with one click.</p>
                            <Button onClick={handleGenerateWpConfig} disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    "Generate with AI"
                                )}
                            </Button>
                        </div>

                        {wpConfig && (
                            <div className="mt-6 space-y-6 animate-in fade-in duration-500">
                                <div>
                                    <h4 className="font-semibold text-lg">Deployment Instructions</h4>
                                    <Alert className="mt-2">
                                        <AlertDescription className="whitespace-pre-wrap">{wpConfig.instructions}</AlertDescription>
                                    </Alert>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-lg">WordPress Plugin Code</h4>
                                    <p className="text-sm text-muted-foreground">Save as <code className="bg-muted px-1 py-0.5 rounded-sm">instaread-plugin/instaread-plugin.php</code></p>
                                    <CodeBlock content={wpConfig.pluginCode} language="php" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-lg">GitHub Actions Workflow</h4>
                                     <p className="text-sm text-muted-foreground">Save as <code className="bg-muted px-1 py-0.5 rounded-sm">.github/workflows/deploy.yml</code></p>
                                    <CodeBlock content={wpConfig.githubActionYaml} language="yaml" />
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default IntegrationCodeSection;
