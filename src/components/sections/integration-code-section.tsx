
'use client'

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import type { PlayerConfig, Placement } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Clipboard, Check, Wand2, AlertTriangle, PlusCircle, Trash2, Loader2, CheckCircle, ExternalLink, Eye, Download } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { PLAYER_SCRIPT_URL } from '@/lib/constants';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import type { WordPressConfigFormValues } from '@/lib/schemas';
import { generatePartnerPlugin, checkWorkflowRun, getReleaseDownloadUrl } from '@/lib/actions';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';

type CodeBlockProps = {
    content: string;
    language: string;
};

const CodeBlock = ({ content, language }: CodeBlockProps) => {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        toast({ title: "Copied to clipboard!" });
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative mt-2 max-h-96 overflow-auto">
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 z-10"
                onClick={handleCopy}
            >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
            </Button>
            <pre className="bg-muted rounded-md p-4 text-sm">
                <code className={`font-code text-muted-foreground language-${language}`}>{content}</code>
            </pre>
        </div>
    );
};

type IntegrationCodeSectionProps = {
    playerConfig: PlayerConfig;
    websiteUrl: string;
    selectedPlacement: Placement;
};

const IntegrationCodeSection = ({ playerConfig, websiteUrl, selectedPlacement }: IntegrationCodeSectionProps) => {
    const { toast } = useToast();
    const [isBuilding, setIsBuilding] = useState(false);
    
    const [buildStatus, setBuildStatus] = useState<'idle' | 'building' | 'polling' | 'success' | 'failed'>('idle');
    const [buildLog, setBuildLog] = useState<string[]>([]);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [previewContent, setPreviewContent] = useState<{ config: string; plugin: string } | null>(null);
    const [runId, setRunId] = useState<number | null>(null);
    
    const { playerType, color } = playerConfig;

    const form = useForm<WordPressConfigFormValues>({
        defaultValues: {
            partner_id: '',
            domain: '',
            publication: '',
            version: '1.0.0',
            injection_context: 'singular',
            injection_strategy: 'first',
            injection_rules: []
        }
    });

    const { control, reset, getValues, clearErrors } = form;

    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: "injection_rules"
    });

    useEffect(() => {
        const currentValues = getValues();
        let newPartnerId = '';
        let newDomain = '';
        let newPublication = '';

        if (websiteUrl) {
            try {
                const urlObject = new URL(websiteUrl);
                newDomain = urlObject.hostname;
                newPartnerId = newDomain.replace(/^www\./, '').split('.')[0] || 'website';
                newPublication = newPartnerId;
            } catch (e) {
                // If URL is invalid, values will remain empty strings
            }
        }
        
        reset({
            ...currentValues,
            domain: newDomain,
            partner_id: newPartnerId,
            publication: newPublication,
            injection_rules: currentValues.injection_rules || []
        });

    }, [websiteUrl, reset, getValues]);
    
    useEffect(() => {
        if (selectedPlacement?.selector) {
            const newRule = {
                target_selector: selectedPlacement.selector,
                insert_position: selectedPlacement.position === 'before' ? 'before_element' : 'after_element',
                exclude_slugs: ""
            };
            replace([newRule]);
        } else {
             replace([]);
        }
    }, [selectedPlacement, replace]);

    const generateJsonContent = () => {
        const data = getValues();
        const configContent = JSON.stringify(data, null, 2);
        
        const owner = process.env.NEXT_PUBLIC_GITHUB_REPO_OWNER;
        const repo = process.env.NEXT_PUBLIC_GITHUB_REPO_NAME;
        const pluginDownloadUrl = `https://github.com/${owner}/${repo}/releases/download/${data.partner_id}-v${data.version}/${data.partner_id}-v${data.version}.zip`;

        const pluginJsonContent = JSON.stringify({
            name: `Instaread Audio Player - ${data.publication || data.partner_id}`,
            version: data.version,
            download_url: pluginDownloadUrl,
            requires: "5.6",
            tested: "6.5",
            sections: {
                changelog: `<h4>${data.version}</h4><ul><li>Partner-specific build for ${data.publication || data.partner_id}</li></ul>`
            }
        }, null, 2);
        return { config: configContent, plugin: pluginJsonContent };
    };

    const handlePreview = () => {
        setPreviewContent(generateJsonContent());
    };

    const handleGeneratePlugin = async () => {
        clearErrors();
        const data = getValues();
        
        setIsBuilding(true);
        setBuildStatus('building');
        setBuildLog(['🚀 Starting process...', 'Generating plugin and creating pull request...']);
        
        try {
            const actionResult = await generatePartnerPlugin(data);

            if (!actionResult.success || !actionResult.runId) {
                setBuildStatus('failed');
                setBuildLog(prev => [...prev, `❌ Error: ${actionResult.message}`]);
                 toast({ title: "Build Failed", description: actionResult.message, variant: "destructive" });
            } else {
                setBuildLog(prev => [...prev, `✅ PR created and merged: ${actionResult.pullRequestUrl}`]);
                setBuildLog(prev => [...prev, `⏱️ Build triggered (Run ID: ${actionResult.runId}). Waiting for completion...`]);
                setRunId(actionResult.runId);
                setBuildStatus('polling');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "An unexpected client-side error occurred."
            setBuildStatus('failed');
            setBuildLog(prev => [...prev, `❌ Error: ${message}`]);
            toast({ title: "Build Failed", description: message, variant: "destructive" });
        } finally {
            setIsBuilding(false);
        }
    };
    
    useEffect(() => {
        if (buildStatus !== 'polling' || !runId) {
            return;
        }

        const data = getValues();
        const interval = setInterval(async () => {
            try {
                const statusResult = await checkWorkflowRun(runId);
                if (statusResult.status === 'completed') {
                    clearInterval(interval);
                    if (statusResult.conclusion === 'success') {
                        setBuildLog(prev => [...prev, '✅ Build workflow completed successfully.']);
                        setBuildLog(prev => [...prev, '⬇️ Fetching download link...']);
                        const url = await getReleaseDownloadUrl(data.partner_id, data.version);
                        setDownloadUrl(url);
                        setBuildStatus('success');
                        setBuildLog(prev => [...prev, '🎉 Download is ready!']);
                    } else {
                        setBuildLog(prev => [...prev, `❌ Build workflow failed with conclusion: ${statusResult.conclusion}. Check GitHub Actions for details.`]);
                        setBuildStatus('failed');
                    }
                } else {
                    const lastLog = buildLog[buildLog.length - 1];
                    const newLog = `...workflow status: ${statusResult.status}`;
                     if (!lastLog.startsWith('...workflow')) {
                       setBuildLog(prev => [...prev, newLog]);
                    }
                }
            } catch (error) {
                clearInterval(interval);
                setBuildStatus('failed');
                const message = error instanceof Error ? error.message : "An error occurred during polling."
                setBuildLog(prev => [...prev, `❌ Polling failed: ${message}`]);
            }
        }, 5000); // Poll every 5 seconds

        return () => clearInterval(interval);
    }, [buildStatus, runId, getValues, buildLog]);


    const publication = useMemo(() => {
        if (process.env.NODE_ENV === 'development') {
            return 'xyz';
        }
        if (!websiteUrl) return 'xyz';
        try {
            const url = new URL(websiteUrl);
            return url.hostname.replace(/^www\./, '').split('.')[0] || 'xyz';
        } catch (e) {
            console.warn(`Invalid URL provided for publication name: ${websiteUrl}`);
            return 'xyz';
        }
    }, [websiteUrl]);

    const { html, react } = useMemo(() => {
      const htmlContent = `<script type="module" crossorigin src="${PLAYER_SCRIPT_URL}"></script>
<instaread-player
  publication="${publication}"
  playertype="${playerType}"
  colortype="${color}"
></instaread-player>`;
      
      const reactContent = `import { useEffect } from 'react';

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
};`;
      return { html: htmlContent, react: reactContent };
    }, [publication, playerType, color]);

    const resetBuild = () => {
        setBuildStatus('idle');
        setBuildLog([]);
        setDownloadUrl(null);
        setRunId(null);
        setIsBuilding(false);
    }

    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">3. Get Integration Code</CardTitle>
                <CardDescription>Copy a code snippet or generate a full WordPress partner plugin solution.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="wordpress" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="html">HTML</TabsTrigger>
                        <TabsTrigger value="react">React</TabsTrigger>
                        <TabsTrigger value="wordpress">WordPress</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="html">
                        <CodeBlock content={html} language="html" />
                    </TabsContent>

                    <TabsContent value="react">
                         <CodeBlock content={react} language="jsx" />
                    </TabsContent>
                    
                    <TabsContent value="wordpress">
                        {buildStatus === 'idle' ? (
                        <Form {...form}>
                            <form onSubmit={(e) => e.preventDefault()} className="space-y-3 mt-4">
                                <div className="p-3 border rounded-lg space-y-3">
                                    <h4 className="font-semibold">Partner Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <FormField
                                            control={control}
                                            name="partner_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Partner ID</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. outdoornews" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                         <FormField
                                            control={control}
                                            name="domain"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Domain</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. outdoornews.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                         <FormField
                                            control={control}
                                            name="publication"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Publication</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. outdoornews" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                         <FormField
                                            control={control}
                                            name="version"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Version</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. 1.0.0" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                                
                                <div className="p-3 border rounded-lg space-y-3">
                                     <h4 className="font-semibold">Injection Details</h4>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <FormField
                                            control={control}
                                            name="injection_context"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Injection Context</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select context" />
                                                        </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="singular">Single Posts/Pages</SelectItem>
                                                            <SelectItem value="all">All Pages</SelectItem>
                                                            <SelectItem value="archive">Archive</SelectItem>
                                                            <SelectItem value="front_page">Front Page</SelectItem>
                                                            <SelectItem value="posts_page">Blog Index</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                         <FormField
                                            control={control}
                                            name="injection_strategy"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Injection Strategy</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select strategy" />
                                                        </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="first">First</SelectItem>
                                                            <SelectItem value="all">All</SelectItem>
                                                            <SelectItem value="none">None</SelectItem>
                                                            <SelectItem value="custom">Custom</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                     </div>
                                </div>

                                <div className="p-3 border rounded-lg space-y-3">
                                     <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold">Injection Rules</h4>
                                            <p className="text-sm text-muted-foreground">Define where the player should be injected.</p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => append({ target_selector: '', insert_position: 'after_element', exclude_slugs: '' })}
                                        >
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Add Rule
                                        </Button>
                                    </div>

                                    {fields.length === 0 && (
                                        <Alert variant="destructive">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertTitle>No Injection Rule</AlertTitle>
                                            <AlertDescription>
                                                Please select a placement in the live preview or add a rule manually.
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {fields.map((field, index) => (
                                        <div key={field.id} className="p-3 bg-muted/50 rounded-md border space-y-3 relative">
                                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => remove(index)}>
                                                <Trash2 className="text-destructive h-4 w-4"/>
                                                <span className="sr-only">Remove Rule</span>
                                            </Button>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                 <FormField
                                                    control={control}
                                                    name={`injection_rules.${index}.target_selector`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                        <FormLabel>Target Selector</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g. .article-body > p:first-of-type" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                        </FormItem>
                                                    )}
                                                    />
                                                <FormField
                                                    control={control}
                                                    name={`injection_rules.${index}.insert_position`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Insert Position</FormLabel>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select position" />
                                                                </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="before_element">Before Element</SelectItem>
                                                                    <SelectItem value="after_element">After Element</SelectItem>
                                                                    <SelectItem value="inside_first_child">Inside (First Child)</SelectItem>
                                                                    <SelectItem value="inside_last_child">Inside (Last Child)</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                             <FormField
                                                control={control}
                                                name={`injection_rules.${index}.exclude_slugs`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                    <FormLabel>Exclude Slugs (Optional)</FormLabel>
                                                    <FormControl>
                                                        <Textarea placeholder="Comma-separated list of slugs to exclude, e.g. about-us,contact" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <Separator />
                                <div className="flex justify-center gap-2">
                                     <Dialog onOpenChange={(open) => !open && setPreviewContent(null)}>
                                        <DialogTrigger asChild>
                                            <Button type="button" variant="outline" onClick={handlePreview} disabled={isBuilding}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                Preview & Verify
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-3xl">
                                            <DialogHeader>
                                                <DialogTitle>Preview Configuration Files</DialogTitle>
                                                <DialogDescription>
                                                    Verify the generated JSON files before creating the pull request.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <Tabs defaultValue="config" className="w-full">
                                                <TabsList>
                                                    <TabsTrigger value="config">config.json</TabsTrigger>
                                                    <TabsTrigger value="plugin">plugin.json</TabsTrigger>
                                                </TabsList>
                                                <TabsContent value="config">
                                                    <CodeBlock content={previewContent?.config ?? ''} language="json" />
                                                </TabsContent>
                                                <TabsContent value="plugin">
                                                    <CodeBlock content={previewContent?.plugin ?? ''} language="json" />
                                                </TabsContent>
                                            </Tabs>
                                        </DialogContent>
                                    </Dialog>
                                    <Button type="button" onClick={handleGeneratePlugin} disabled={isBuilding}>
                                        <Wand2 className="mr-2 h-4 w-4" />
                                        Generate Plugin
                                    </Button>
                                </div>
                            </form>
                        </Form>
                        ) : (
                        <Card className="mt-4 bg-muted/50">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3">
                                    {(buildStatus === 'building' || buildStatus === 'polling') && (
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    )}
                                    {buildStatus === 'success' && (
                                        <CheckCircle className="h-6 w-6 text-green-600" />
                                    )}
                                    {buildStatus === 'failed' && (
                                        <AlertTriangle className="h-6 w-6 text-destructive" />
                                    )}
                                    <div>
                                        <p className="font-semibold text-lg">
                                            {buildStatus === 'success' && 'Build Successful!'}
                                            {(buildStatus === 'building' || buildStatus === 'polling') && 'Building Plugin...'}
                                            {buildStatus === 'failed' && 'Build Failed'}
                                        </p>
                                        <p className="text-sm text-muted-foreground">Follow the progress below.</p>
                                    </div>
                                </div>
                                
                                <ScrollArea className="h-40 w-full rounded-md border bg-background p-3 mt-4">
                                     <div className="space-y-1.5 text-sm font-mono text-muted-foreground">
                                        {buildLog.map((log, i) => <p key={i}>{log}</p>)}
                                    </div>
                                </ScrollArea>
                                
                                <div className="mt-4 flex justify-end gap-2">
                                     {buildStatus === 'success' && downloadUrl && (
                                        <Button asChild size="lg">
                                            <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                                                <Download className="mr-2 h-5 w-5" />
                                                Download Plugin
                                            </a>
                                        </Button>
                                    )}
                                    {(buildStatus === 'success' || buildStatus === 'failed') && (
                                        <Button variant="outline" onClick={resetBuild}>Start Over</Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default IntegrationCodeSection;

    

    




